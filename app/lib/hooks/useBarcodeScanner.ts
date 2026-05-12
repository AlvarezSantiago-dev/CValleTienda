'use client'

import { useEffect, useRef } from 'react'

interface Options {
  onScan: (code: string) => void
  enabled?: boolean
  /** Longitud mínima del código válido. Default 8 (EAN-8). */
  minLength?: number
  /** Intervalo máximo entre teclas para considerar escaneo (ms). Default 30. */
  maxIntervalMs?: number
}

/**
 * Detecta secuencias rápidas de teclado terminadas en Enter, típicas de
 * escáneres USB-HID. Solo dispara cuando el foco NO está en un input/textarea
 * (esos casos los maneja el handler local del componente).
 *
 * Heurística:
 *  - cada keydown se acumula en un buffer
 *  - si el delta entre teclas > maxIntervalMs, se resetea el buffer
 *  - al recibir Enter, si el buffer cumple minLength y es alfanumérico,
 *    se llama onScan(buffer)
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 8,
  maxIntervalMs = 30,
}: Options) {
  const bufferRef = useRef('')
  const lastTsRef = useRef(0)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) return

    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      )
    }

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return

      const now = performance.now()
      const dt = now - lastTsRef.current
      if (dt > maxIntervalMs) bufferRef.current = ''
      lastTsRef.current = now

      if (e.key === 'Enter') {
        const code = bufferRef.current
        bufferRef.current = ''
        if (code.length >= minLength && /^[A-Za-z0-9_-]+$/.test(code)) {
          e.preventDefault()
          onScanRef.current(code)
        }
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, minLength, maxIntervalMs])
}
