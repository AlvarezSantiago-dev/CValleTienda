'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  EJEMPLO_PASO1_DATOS,
  EJEMPLO_PASO2_STOCK,
  EJEMPLOS_PASO1,
  EJEMPLOS_PASO2,
} from '@/lib/productos/carga-express/ejemplos'
import { cn } from '@/components/ui/cn'

interface NlPasteBoxProps {
  onInterpretarDatos: (texto: string) => void
  onInterpretarStock: (texto: string) => void
  coloresListos: boolean
  coloresLabel?: string
}

type SpeechRec = SpeechRecognition

function getSpeechRecognitionClass(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function useDictado(onAppend: (finalTexto: string) => void) {
  const [escuchando, setEscuchando] = useState(false)
  const [interim, setInterim] = useState('')
  const [soportado, setSoportado] = useState<boolean | null>(null)
  const [errorMic, setErrorMic] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRec | null>(null)
  const escuchandoRef = useRef(false)

  useEffect(() => {
    setSoportado(getSpeechRecognitionClass() !== null)
  }, [])

  const stopListening = useCallback(() => {
    escuchandoRef.current = false
    setEscuchando(false)
    setInterim('')
    const rec = recognitionRef.current
    if (rec) {
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognitionClass()
    if (!SpeechRecognitionClass) {
      setErrorMic('Tu navegador no soporta dictado. Usá Chrome o Edge, o pegá el texto.')
      return
    }
    setErrorMic(null)
    stopListening()

    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finales = ''
      let parcial = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        const t = r[0]?.transcript?.trim() ?? ''
        if (!t) continue
        if (r.isFinal) finales += (finales ? ' ' : '') + t
        else parcial += (parcial ? ' ' : '') + t
      }
      if (finales) {
        onAppend(finales)
        setInterim('')
      } else {
        setInterim(parcial)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      if (event.error === 'not-allowed') {
        setErrorMic('Permiso de micrófono denegado.')
        stopListening()
        return
      }
      setErrorMic(`Error de voz: ${event.error}`)
    }

    recognition.onend = () => {
      if (escuchandoRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start()
        } catch {
          /* race */
        }
      } else {
        setEscuchando(false)
        setInterim('')
      }
    }

    recognitionRef.current = recognition
    escuchandoRef.current = true
    setEscuchando(true)
    try {
      recognition.start()
    } catch {
      setErrorMic('No se pudo iniciar el micrófono')
      stopListening()
    }
  }, [onAppend, stopListening])

  useEffect(() => () => stopListening(), [stopListening])

  return {
    escuchando,
    interim,
    soportado,
    errorMic,
    toggle: () => (escuchando ? stopListening() : startListening()),
    stop: stopListening,
  }
}

export function NlPasteBox({
  onInterpretarDatos,
  onInterpretarStock,
  coloresListos,
  coloresLabel,
}: NlPasteBoxProps) {
  const [textoDatos, setTextoDatos] = useState('')
  const [textoStock, setTextoStock] = useState('')

  const dictDatos = useDictado(
    useCallback((chunk: string) => {
      setTextoDatos((prev) => (prev.trim() ? `${prev.trim()} ${chunk}` : chunk))
    }, [])
  )

  const dictStock = useDictado(
    useCallback((chunk: string) => {
      setTextoStock((prev) => (prev.trim() ? `${prev.trim()} ${chunk}` : chunk))
    }, [])
  )

  function interpretarDatos() {
    const full = [textoDatos.trim(), dictDatos.interim.trim()].filter(Boolean).join(' ')
    if (!full) return
    dictDatos.stop()
    if (dictDatos.interim.trim()) setTextoDatos(full)
    onInterpretarDatos(full)
  }

  function interpretarStock() {
    const full = [textoStock.trim(), dictStock.interim.trim()].filter(Boolean).join(' ')
    if (!full) return
    dictStock.stop()
    if (dictStock.interim.trim()) setTextoStock(full)
    onInterpretarStock(full)
  }

  return (
    <div className="space-y-4">
      {/* Paso 1 */}
      <section className="rounded-[var(--radius-lg)] border border-primary-border bg-primary-soft/40 p-4 md:p-5 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-fg-brand">Paso 1</p>
          <h2 className="text-sm font-semibold text-fg">Datos del producto</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Nombre, colores, precios y categoría. Todavía no digas cantidades ni talles.
          </p>
        </div>

        <textarea
          value={textoDatos}
          onChange={(e) => setTextoDatos(e.target.value)}
          rows={3}
          placeholder={EJEMPLO_PASO1_DATOS}
          className="w-full rounded-[var(--radius-md)] border border-border-default bg-surface text-fg text-sm p-3 focus-ring resize-y min-h-[88px]"
        />
        {dictDatos.interim && (
          <p className="text-xs text-fg-muted italic">Escuchando: …{dictDatos.interim}</p>
        )}
        {dictDatos.errorMic && (
          <p className="text-xs text-danger" role="alert">
            {dictDatos.errorMic}
          </p>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {dictDatos.soportado !== false && (
            <Button
              type="button"
              size="sm"
              variant={dictDatos.escuchando ? 'danger' : 'secondary'}
              onClick={dictDatos.toggle}
              className={cn(dictDatos.escuchando && 'animate-pulse')}
            >
              {dictDatos.escuchando ? (
                <>
                  <MicOff size={14} aria-hidden />
                  Detener
                </>
              ) : (
                <>
                  <Mic size={14} aria-hidden />
                  Hablar
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={interpretarDatos}
            disabled={!textoDatos.trim() && !dictDatos.interim.trim()}
          >
            Interpretar datos
          </Button>
          {EJEMPLOS_PASO1.map((ej) => (
            <button
              key={ej.id}
              type="button"
              onClick={() => setTextoDatos(ej.texto)}
              className="text-xs text-fg-muted hover:text-fg underline-offset-2 hover:underline"
            >
              Ej: {ej.label}
            </button>
          ))}
        </div>
      </section>

      {/* Paso 2 */}
      <section
        className={cn(
          'rounded-[var(--radius-lg)] border p-4 md:p-5 space-y-3',
          coloresListos
            ? 'border-primary-border bg-surface'
            : 'border-border-subtle bg-surface-sunken/40 opacity-80'
        )}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-fg-brand">Paso 2</p>
          <h2 className="text-sm font-semibold text-fg">Stock por color y talle</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            {coloresListos
              ? `Colores listos${coloresLabel ? `: ${coloresLabel}` : ''}. Dictá cantidades con talle.`
              : 'Primero interpretá los datos del paso 1 (hace falta al menos un color).'}
          </p>
        </div>

        <textarea
          value={textoStock}
          onChange={(e) => setTextoStock(e.target.value)}
          rows={3}
          placeholder={EJEMPLO_PASO2_STOCK}
          disabled={!coloresListos}
          className="w-full rounded-[var(--radius-md)] border border-border-default bg-surface text-fg text-sm p-3 focus-ring resize-y min-h-[88px] disabled:opacity-50"
        />
        {dictStock.interim && (
          <p className="text-xs text-fg-muted italic">Escuchando: …{dictStock.interim}</p>
        )}
        {dictStock.errorMic && (
          <p className="text-xs text-danger" role="alert">
            {dictStock.errorMic}
          </p>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {dictStock.soportado !== false && (
            <Button
              type="button"
              size="sm"
              variant={dictStock.escuchando ? 'danger' : 'secondary'}
              onClick={dictStock.toggle}
              disabled={!coloresListos}
              className={cn(dictStock.escuchando && 'animate-pulse')}
            >
              {dictStock.escuchando ? (
                <>
                  <MicOff size={14} aria-hidden />
                  Detener
                </>
              ) : (
                <>
                  <Mic size={14} aria-hidden />
                  Hablar
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={interpretarStock}
            disabled={!coloresListos || (!textoStock.trim() && !dictStock.interim.trim())}
          >
            Interpretar stock
          </Button>
          {EJEMPLOS_PASO2.map((ej) => (
            <button
              key={ej.id}
              type="button"
              onClick={() => setTextoStock(ej.texto)}
              disabled={!coloresListos}
              className="text-xs text-fg-muted hover:text-fg underline-offset-2 hover:underline disabled:opacity-40"
            >
              Ej: {ej.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-fg-subtle leading-relaxed">
          Formato claro: “1 rojo XS, 2 rojos M, 3 azules XXL”. Después podés corregir la matriz a
          mano.
        </p>
      </section>
    </div>
  )
}
