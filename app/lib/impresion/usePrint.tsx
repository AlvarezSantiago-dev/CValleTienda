'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface UsePrintOptions {
  /** 'ticket' o 'etiqueta' — controla los estilos @media print */
  tipo: 'ticket' | 'etiqueta'
  /** Callback al terminar (afterprint o timeout). */
  onDone?: () => void
  /** Timeout de seguridad por si afterprint no se dispara (ms). */
  timeoutMs?: number
}

/**
 * Hook que orquesta una impresión client-side.
 *
 * Uso:
 *   const { contenido, imprimir, imprimiendo } = usePrint({ tipo: 'ticket' })
 *   imprimir(<TicketVentaRenderer payload={...} />)
 *   {contenido}  // este nodo debe renderizarse en algún lugar del DOM
 *
 * Internamente:
 *   1. Monta el JSX en un wrapper con clase `print-stage` (oculto en pantalla,
 *      visible solo en @media print, según print.css).
 *   2. Setea body.printing-active y data-print-type para activar reglas CSS.
 *   3. Llama window.print() tras un microtick para asegurar el render.
 *   4. Limpia todo en `afterprint` o por timeout.
 */
export function usePrint({ tipo, onDone, timeoutMs = 15_000 }: UsePrintOptions) {
  const [nodo, setNodo] = useState<React.ReactNode>(null)
  const [imprimiendo, setImprimiendo] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const cleanup = useCallback(() => {
    document.body.classList.remove('printing-active')
    delete document.body.dataset.printType
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setImprimiendo(false)
    setNodo(null)
    onDoneRef.current?.()
  }, [])

  const imprimir = useCallback(
    (jsx: React.ReactNode) => {
      if (imprimiendo) return
      setImprimiendo(true)
      setNodo(jsx)

      document.body.classList.add('printing-active')
      document.body.dataset.printType = tipo

      const onAfter = () => {
        window.removeEventListener('afterprint', onAfter)
        cleanup()
      }
      window.addEventListener('afterprint', onAfter)

      timeoutRef.current = setTimeout(() => {
        window.removeEventListener('afterprint', onAfter)
        cleanup()
      }, timeoutMs)

      // Microtick para que React monte el JSX antes de print.
      // Doble rAF garantiza al menos un commit de pintura.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            window.print()
          } catch {
            window.removeEventListener('afterprint', onAfter)
            cleanup()
          }
        })
      })
    },
    [tipo, imprimiendo, cleanup, timeoutMs]
  )

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      document.body.classList.remove('printing-active')
      delete document.body.dataset.printType
    }
  }, [])

  // Nodo a renderizar dentro del componente que usa el hook.
  // Lo portaleamos a <body> para que sea HIJO DIRECTO y la regla CSS
  // `body.printing-active > *:not(.print-stage) { display: none }` no lo oculte.
  const contenido =
    nodo && typeof document !== 'undefined'
      ? createPortal(
          <div className="print-stage" aria-hidden="true">
            {nodo}
          </div>,
          document.body
        )
      : null

  return { contenido, imprimir, imprimiendo }
}
