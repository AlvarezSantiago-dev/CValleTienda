'use client'

import { useCallback, useRef } from 'react'

/**
 * TTS del navegador (speechSynthesis) para el Cajero Hablado.
 * Preferencia de voz: es-AR > es-419 > es-*. Corta lo anterior al hablar.
 */
export function useTts() {
  const vozRef = useRef<SpeechSynthesisVoice | null>(null)

  const elegirVoz = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null
    if (vozRef.current) return vozRef.current
    const voces = window.speechSynthesis.getVoices()
    const voz =
      voces.find((v) => v.lang === 'es-AR') ??
      voces.find((v) => v.lang === 'es-419') ??
      voces.find((v) => v.lang.startsWith('es')) ??
      null
    vozRef.current = voz
    return voz
  }, [])

  const callar = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const hablar = useCallback(
    (texto: string, onFin?: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !texto.trim()) {
        onFin?.()
        return
      }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(texto)
      const voz = elegirVoz()
      if (voz) u.voice = voz
      u.lang = voz?.lang ?? 'es-AR'
      u.rate = 1.05
      if (onFin) {
        u.onend = onFin
        u.onerror = onFin
      }
      window.speechSynthesis.speak(u)
    },
    [elegirVoz]
  )

  return { hablar, callar }
}
