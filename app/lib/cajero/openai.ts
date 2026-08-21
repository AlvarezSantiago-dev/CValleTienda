// =============================================================
// lib/cajero/openai.ts
// Cliente fino sobre fetch a la API de OpenAI: transcripción
// (Whisper) y chat completions con tool calling. Sin dependencias.
// Server-only — la API key nunca sale de acá.
// =============================================================

const OPENAI_BASE = 'https://api.openai.com/v1'
const MAX_ITERACIONES_TOOLS = 6
const TIMEOUT_MS = 30_000

export type ProveedorCajero = 'anthropic' | 'openai'

function anthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || process.env.ANTROPOPEDIA_API_KEY
}

/** Preferí Anthropic si hay key (Claude Console); si no, OpenAI. */
export function proveedorCajero(): ProveedorCajero | null {
  const forzar = (process.env.CAJERO_PROVEEDOR ?? '').toLowerCase()
  const hasAnthropic = !!anthropicKey()
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  if ((forzar === 'anthropic' || forzar === 'claude') && hasAnthropic) return 'anthropic'
  if (forzar === 'openai' && hasOpenAI) return 'openai'
  if (hasAnthropic) return 'anthropic'
  if (hasOpenAI) return 'openai'
  return null
}

export function cajeroDisponible(): boolean {
  return proveedorCajero() !== null
}

export function whisperDisponible(): boolean {
  return !!process.env.OPENAI_API_KEY
}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY no configurada')
  return key
}

function modeloChat(): string {
  return process.env.CAJERO_MODELO || 'gpt-4o-mini'
}

// ------------------------------------------------------------------
// Transcripción (Whisper)
// ------------------------------------------------------------------

export async function transcribirAudio(audio: Blob, filename = 'audio.webm'): Promise<string> {
  const form = new FormData()
  form.append('file', audio, filename)
  form.append('model', process.env.CAJERO_MODELO_STT || 'whisper-1')
  form.append('language', 'es')
  form.append('temperature', '0')

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`Transcripción falló (${res.status})`)
  }
  const json = (await res.json()) as { text?: string }
  return (json.text ?? '').trim().slice(0, 500)
}

// ------------------------------------------------------------------
// Chat con tool calling
// ------------------------------------------------------------------

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export type EjecutorTool = (
  nombre: string,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>

/**
 * Loop de chat completions con tools. Ejecuta tool calls vía `ejecutar`
 * hasta obtener una respuesta de texto o agotar iteraciones.
 * Enruta a Anthropic (Haiku) u OpenAI según las env keys.
 */
export async function chatConTools(
  mensajes: ChatMessage[],
  tools: ToolDef[],
  ejecutar: EjecutorTool
): Promise<string> {
  const proveedor = proveedorCajero()
  if (!proveedor) throw new Error('Cajero hablado no configurado')
  if (proveedor === 'anthropic') {
    const { chatConToolsAnthropic } = await import('./anthropic')
    return chatConToolsAnthropic(mensajes, tools, ejecutar)
  }

  const historial: ChatMessage[] = [...mensajes]

  for (let i = 0; i < MAX_ITERACIONES_TOOLS; i++) {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modeloChat(),
        temperature: 0.2,
        messages: historial,
        tools: tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      throw new Error(`El modelo no respondió (${res.status})`)
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: ChatMessage }>
    }
    const msg = json.choices?.[0]?.message
    if (!msg) throw new Error('Respuesta vacía del modelo')

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return (msg.content ?? '').trim() || 'No entendí, ¿me lo repetís?'
    }

    historial.push(msg)
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
      } catch {
        // args inválidos → la tool recibe objeto vacío y devuelve error legible
      }
      let resultado: Record<string, unknown>
      try {
        resultado = await ejecutar(call.function.name, args)
      } catch (e) {
        resultado = { error: (e as Error).message }
      }
      historial.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(resultado),
      })
    }
  }

  return 'Me perdí con ese pedido. Probá de nuevo con una frase más corta.'
}
