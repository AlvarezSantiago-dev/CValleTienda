'use client'

// =============================================================
// CajeroProvider — push-to-talk del Cajero Hablado.
// Mantener F10 (o el FAB) graba; al soltar, envía a /api/cajero.
// La respuesta se muestra en el HUD y se lee con TTS.
// =============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTts } from './useTts'
import {
  estadoVacio,
  type EstadoConversacion,
  type RespuestaCajero,
  type ResultadoEjecucion,
} from '@/lib/cajero/tipos'

export type FaseCajero =
  | 'inactivo'
  | 'grabando'
  | 'procesando'
  | 'hablando'
  | 'error'

const EXPIRA_CONVERSACION_MS = 60_000
const MAX_GRABACION_MS = 25_000

function getSpeechRecognitionClass(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

interface CajeroContextValue {
  /** false si no hay API key en el server o no hay micrófono / voz */
  disponible: boolean
  fase: FaseCajero
  transcript: string
  respuesta: string
  error: string | null
  conversacion: EstadoConversacion
  /** true cuando hay una propuesta esperando confirmación */
  esperandoConfirmacion: boolean
  ultimoResultado: ResultadoEjecucion | null
  empezarGrabacion(): void
  terminarYEnviar(): void
  confirmar(): void
  cancelar(): void
  /** cierra el HUD y descarta la conversación */
  cerrar(): void
}

const CajeroContext = createContext<CajeroContextValue | null>(null)

export function useCajero(): CajeroContextValue {
  const ctx = useContext(CajeroContext)
  if (!ctx) throw new Error('useCajero debe usarse dentro de CajeroProvider')
  return ctx
}

/** Variante tolerante para componentes que pueden montarse fuera del provider */
export function useCajeroOptional(): CajeroContextValue | null {
  return useContext(CajeroContext)
}

interface CajeroProviderProps {
  /** Flag server: hay ANTHROPIC_API_KEY u OPENAI_API_KEY (nunca la key) */
  activo: boolean
  children: React.ReactNode
}

export function CajeroProvider({ activo, children }: CajeroProviderProps) {
  const router = useRouter()
  const { hablar, callar } = useTts()

  const [fase, setFase] = useState<FaseCajero>('inactivo')
  const [transcript, setTranscript] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conversacion, setConversacion] = useState<EstadoConversacion>(estadoVacio)
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoEjecucion | null>(null)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const textoVozRef = useRef('')
  const grabandoRef = useRef(false)
  const soltandoRef = useRef(false)
  const ignorarFinRef = useRef(false)
  const timeoutGrabacionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimaActividadRef = useRef(0)
  const conversacionRef = useRef<EstadoConversacion>(estadoVacio())

  // Solo el flag del server. Mic/Speech se chequen al grabar — no en render
  // (window en el cliente hidrataba el FAB y rompía SSR).
  const disponible = activo

  // mantener ref sincronizada para usar el estado actual dentro de callbacks async
  useEffect(() => {
    conversacionRef.current = conversacion
  }, [conversacion])

  const procesarRespuesta = useCallback(
    (data: RespuestaCajero) => {
      setTranscript(data.transcript)
      setRespuesta(data.hablar)
      setConversacion(data.estado)
      ultimaActividadRef.current = Date.now()

      if (data.resultado) {
        setUltimoResultado(data.resultado)
        if (data.resultado.tipo === 'venta') {
          toast.success(`Venta registrada — ticket #${data.resultado.numeroTicket}`)
        } else if (data.resultado.tipo === 'producto') {
          toast.success(`Producto "${data.resultado.nombre}" creado`)
        } else if (data.resultado.tipo === 'precio') {
          toast.success('Precio actualizado')
        }
      }

      setFase('hablando')
      hablar(data.hablar, () => {
        setFase((f) => (f === 'hablando' ? 'inactivo' : f))
      })

      if (data.navegarA) {
        router.push(data.navegarA)
      }
    },
    [hablar, router]
  )

  const enviar = useCallback(
    async (payload: { audio?: Blob; texto?: string }) => {
      setFase('procesando')
      setError(null)
      try {
        let res: Response
        const estadoActual = conversacionRef.current
        if (payload.audio) {
          const form = new FormData()
          form.append('audio', payload.audio, 'audio.webm')
          form.append('estado', JSON.stringify(estadoActual))
          res = await fetch('/api/cajero', { method: 'POST', body: form })
        } else {
          res = await fetch('/api/cajero', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: payload.texto ?? '', estado: estadoActual }),
          })
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? `Error ${res.status}`)
        }
        const data = (await res.json()) as RespuestaCajero
        procesarRespuesta(data)
      } catch (e) {
        setError((e as Error).message)
        setFase('error')
      }
    },
    [procesarRespuesta]
  )

  const terminarYEnviar = useCallback(() => {
    if (!grabandoRef.current) return
    grabandoRef.current = false
    soltandoRef.current = true
    if (timeoutGrabacionRef.current) {
      clearTimeout(timeoutGrabacionRef.current)
      timeoutGrabacionRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* already stopped */
      }
      return
    }
    mediaRef.current?.stop()
  }, [])

  const empezarGrabacion = useCallback(async () => {
    if (!disponible || grabandoRef.current || fase === 'procesando') return

    if (
      ultimaActividadRef.current > 0 &&
      Date.now() - ultimaActividadRef.current > EXPIRA_CONVERSACION_MS
    ) {
      setConversacion(estadoVacio())
      conversacionRef.current = estadoVacio()
      setTranscript('')
      setRespuesta('')
      setUltimoResultado(null)
    }

    callar()
    setError(null)
    setUltimoResultado(null)
    textoVozRef.current = ''
    soltandoRef.current = false
    ignorarFinRef.current = false

    const SR = getSpeechRecognitionClass()
    if (SR) {
      const rec = new SR()
      rec.lang = 'es-AR'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript ?? ''
          if (event.results[i].isFinal) final += piece
          else interim += piece
        }
        textoVozRef.current = (final || interim).trim()
        setTranscript(textoVozRef.current)
      }
      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return
        setError(
          event.error === 'not-allowed'
            ? 'Permiso de micrófono denegado.'
            : `Error de voz: ${event.error}`
        )
        setFase('error')
        grabandoRef.current = false
      }
      rec.onend = () => {
        recognitionRef.current = null
        if (ignorarFinRef.current) {
          ignorarFinRef.current = false
          return
        }
        if (grabandoRef.current && !soltandoRef.current) {
          try {
            rec.start()
            recognitionRef.current = rec
          } catch {
            grabandoRef.current = false
            setFase('inactivo')
          }
          return
        }
        const texto = textoVozRef.current.trim()
        if (!texto) {
          setFase('inactivo')
          return
        }
        void enviar({ texto })
      }
      try {
        rec.start()
        recognitionRef.current = rec
        grabandoRef.current = true
        setFase('grabando')
        timeoutGrabacionRef.current = setTimeout(() => {
          terminarYEnviar()
        }, MAX_GRABACION_MS)
      } catch {
        setError('No pude iniciar el reconocimiento de voz. Probá Chrome.')
        setFase('error')
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        if (blob.size < 1000) {
          setFase('inactivo')
          return
        }
        void enviar({ audio: blob })
      }
      mediaRef.current = recorder
      grabandoRef.current = true
      recorder.start()
      setFase('grabando')

      timeoutGrabacionRef.current = setTimeout(() => {
        terminarYEnviar()
      }, MAX_GRABACION_MS)
    } catch {
      setError('No pude acceder al micrófono. Revisá los permisos.')
      setFase('error')
    }
  }, [disponible, fase, callar, enviar, terminarYEnviar])

  const confirmar = useCallback(() => {
    if (fase === 'procesando') return
    callar()
    void enviar({ texto: 'sí, confirmo' })
  }, [fase, callar, enviar])

  const cancelar = useCallback(() => {
    callar()
    // descartar propuesta localmente — el server no guarda nada entre turnos
    setConversacion((c) => ({ ...c, propuestaPendiente: null }))
    setRespuesta('Cancelado.')
    setFase('inactivo')
    ultimaActividadRef.current = Date.now()
  }, [callar])

  const cerrar = useCallback(() => {
    callar()
    if (grabandoRef.current) {
      grabandoRef.current = false
      soltandoRef.current = true
      ignorarFinRef.current = true
      try {
        recognitionRef.current?.abort()
      } catch {
        /* noop */
      }
      mediaRef.current?.stop()
    }
    setConversacion(estadoVacio())
    conversacionRef.current = estadoVacio()
    setTranscript('')
    setRespuesta('')
    setError(null)
    setUltimoResultado(null)
    setFase('inactivo')
    ultimaActividadRef.current = 0
  }, [callar])

  // Push-to-talk: F8 (F10 en Chrome/Edge Windows se lo come el menú del browser).
  useEffect(() => {
    if (!disponible) return

    function esPtt(e: KeyboardEvent): boolean {
      if (e.code === 'F8' || e.key === 'F8') return true
      if (e.code === 'F10' || e.key === 'F10') return true
      if ((e.code === 'Space' || e.key === ' ') && e.ctrlKey && !e.altKey && !e.metaKey) {
        return true
      }
      return false
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!esPtt(e) || e.repeat) return
      e.preventDefault()
      e.stopPropagation()
      void empezarGrabacion()
    }
    function onKeyUp(e: KeyboardEvent) {
      if (!esPtt(e)) return
      e.preventDefault()
      e.stopPropagation()
      terminarYEnviar()
    }

    const opts: AddEventListenerOptions = { capture: true }
    window.addEventListener('keydown', onKeyDown, opts)
    window.addEventListener('keyup', onKeyUp, opts)
    return () => {
      window.removeEventListener('keydown', onKeyDown, opts)
      window.removeEventListener('keyup', onKeyUp, opts)
    }
  }, [disponible, empezarGrabacion, terminarYEnviar])

  const value: CajeroContextValue = {
    disponible,
    fase,
    transcript,
    respuesta,
    error,
    conversacion,
    esperandoConfirmacion: conversacion.propuestaPendiente !== null,
    ultimoResultado,
    empezarGrabacion: () => void empezarGrabacion(),
    terminarYEnviar,
    confirmar,
    cancelar,
    cerrar,
  }

  return <CajeroContext.Provider value={value}>{children}</CajeroContext.Provider>
}
