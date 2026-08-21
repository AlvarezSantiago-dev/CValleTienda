// =============================================================
// /api/cajero — endpoint del Cajero Hablado.
// Recibe audio (multipart) o texto (JSON) + estado de conversación,
// transcribe, corre el router LLM con tools y devuelve la respuesta
// a hablar + el estado actualizado.
// =============================================================

import { NextRequest, NextResponse } from 'next/server'
import { cargarContextoCajero } from '@/lib/cajero/contexto'
import {
  cajeroDisponible,
  whisperDisponible,
  transcribirAudio,
  chatConTools,
  type ChatMessage,
} from '@/lib/cajero/openai'
import { TOOLS_CAJERO, ejecutarToolCajero, type SesionCajero } from '@/lib/cajero/tools'
import { systemPromptCajero } from '@/lib/cajero/prompts'
import { rateLimitOk } from '@/lib/catalogo/rate-limit'
import { parsearComandoNav } from '@/lib/voz/comandos'
import {
  estadoVacio,
  type EstadoConversacion,
  type MensajeCajero,
  type PropuestaPendiente,
  type CandidatoProducto,
  type RespuestaCajero,
} from '@/lib/cajero/tipos'

const MAX_AUDIO_BYTES = 2 * 1024 * 1024
const MAX_MENSAJES = 12
const MAX_CANDIDATOS_ESTADO = 24
const RATE_MAX = 30
const RATE_VENTANA_MS = 60_000

/** Sanea el estado que viene del cliente (defensivo, sin confiar en el shape) */
function sanearEstado(raw: unknown): EstadoConversacion {
  const vacio = estadoVacio()
  if (!raw || typeof raw !== 'object') return vacio
  const e = raw as Record<string, unknown>

  const mensajes: MensajeCajero[] = Array.isArray(e.mensajes)
    ? (e.mensajes as Array<Record<string, unknown>>)
        .filter((m) => (m?.rol === 'usuario' || m?.rol === 'agente') && typeof m?.texto === 'string')
        .slice(-MAX_MENSAJES)
        .map((m) => ({ rol: m.rol as 'usuario' | 'agente', texto: String(m.texto).slice(0, 600) }))
    : []

  const candidatos: CandidatoProducto[] = Array.isArray(e.candidatos)
    ? (e.candidatos as Array<Record<string, unknown>>)
        .filter((c) => typeof c?.variante_id === 'string' && typeof c?.producto_id === 'string')
        .slice(-MAX_CANDIDATOS_ESTADO)
        .map((c) => ({
          variante_id: String(c.variante_id),
          producto_id: String(c.producto_id),
          etiqueta: String(c.etiqueta ?? ''),
          precio: Number(c.precio) || 0,
          stock_efectivo: Number(c.stock_efectivo) || 0,
          unidad: String(c.unidad ?? 'unidad'),
        }))
    : []

  const p = e.propuestaPendiente as Record<string, unknown> | null | undefined
  const propuestaPendiente =
    p && (p.tipo === 'venta' || p.tipo === 'producto' || p.tipo === 'precio')
      ? (p as unknown as PropuestaPendiente)
      : null

  return { mensajes, propuestaPendiente, candidatos }
}

export async function POST(req: NextRequest) {
  if (!cajeroDisponible()) {
    return NextResponse.json({ error: 'Cajero hablado no configurado' }, { status: 503 })
  }

  const contexto = await cargarContextoCajero()
  if (!contexto) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (!rateLimitOk(`cajero:${contexto.tiendaId}`, RATE_MAX, RATE_VENTANA_MS)) {
    return NextResponse.json({ error: 'Demasiadas consultas, esperá un momento' }, { status: 429 })
  }

  // ---- Input: audio (multipart) o texto (JSON, para pruebas) ----
  let transcript = ''
  let estado: EstadoConversacion = estadoVacio()

  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const audio = form.get('audio')
      if (!(audio instanceof Blob) || audio.size === 0) {
        return NextResponse.json({ error: 'Falta el audio' }, { status: 400 })
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Audio demasiado largo' }, { status: 413 })
      }
      const estadoRaw = form.get('estado')
      if (typeof estadoRaw === 'string') {
        try {
          estado = sanearEstado(JSON.parse(estadoRaw))
        } catch {
          estado = estadoVacio()
        }
      }
      if (!whisperDisponible()) {
        return NextResponse.json(
          { error: 'Sin Whisper: hablá con F10 (el navegador transcribe) o agregá OPENAI_API_KEY' },
          { status: 400 }
        )
      }
      transcript = await transcribirAudio(audio)
    } else {
      const body = (await req.json()) as { texto?: string; estado?: unknown }
      transcript = String(body.texto ?? '').trim().slice(0, 500)
      estado = sanearEstado(body.estado)
    }
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!transcript) {
    const resp: RespuestaCajero = {
      transcript: '',
      hablar: 'No te escuché. Mantené apretado y hablá de nuevo.',
      estado,
    }
    return NextResponse.json(resp)
  }

  // ---- Navegación local sin LLM (solo al inicio de conversación) ----
  if (estado.mensajes.length === 0 && !estado.propuestaPendiente) {
    const ruta = parsearComandoNav(transcript)
    if (ruta) {
      const resp: RespuestaCajero = {
        transcript,
        hablar: 'Voy.',
        estado,
        navegarA: ruta,
      }
      return NextResponse.json(resp)
    }
  }

  // ---- Router LLM con tools ----
  const sesion: SesionCajero = { contexto, estado }
  const mensajes: ChatMessage[] = [
    { role: 'system', content: systemPromptCajero(contexto, estado.propuestaPendiente) },
    ...estado.mensajes.map(
      (m): ChatMessage => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.texto,
      })
    ),
    { role: 'user', content: transcript },
  ]

  let hablar: string
  try {
    hablar = await chatConTools(mensajes, TOOLS_CAJERO, (nombre, args) =>
      ejecutarToolCajero(sesion, nombre, args)
    )
  } catch {
    const resp: RespuestaCajero = {
      transcript,
      hablar: 'Se me complicó procesar eso. Probá de nuevo en un momento.',
      estado,
    }
    return NextResponse.json(resp)
  }

  const nuevosMensajes: MensajeCajero[] = [
    ...estado.mensajes,
    { rol: 'usuario', texto: transcript },
    { rol: 'agente', texto: hablar },
  ]
  const nuevoEstado: EstadoConversacion = {
    mensajes: nuevosMensajes.slice(-MAX_MENSAJES),
    propuestaPendiente: sesion.estado.propuestaPendiente,
    candidatos: sesion.estado.candidatos.slice(-MAX_CANDIDATOS_ESTADO),
  }

  const resp: RespuestaCajero = { transcript, hablar, estado: nuevoEstado }
  if (sesion.resultado) resp.resultado = sesion.resultado
  return NextResponse.json(resp)
}
