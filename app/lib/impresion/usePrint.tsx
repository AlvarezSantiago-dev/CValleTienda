'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Puerto del agente PrintBridge local */
const PRINTBRIDGE_URL = 'http://127.0.0.1:9100'

/**
 * Intenta enviar el payload al agente PrintBridge local.
 * Si no está disponible (ECONNREFUSED, timeout) devuelve false silenciosamente
 * y el caller cae al window.print() como fallback.
 */
async function tryPrintBridge(
  tipo: 'ticket' | 'devolucion' | 'cierre' | 'etiqueta' | 'vale',
  payload: unknown
): Promise<boolean> {
  try {
    console.log(`[PrintBridge] Enviando ${tipo} a ${PRINTBRIDGE_URL}/print/${tipo}`)
    const res = await fetch(`${PRINTBRIDGE_URL}/print/${tipo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    console.log(`[PrintBridge] Respuesta: ${res.status} ok=${res.ok}`)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[PrintBridge] Error body:`, body)
    }
    return res.ok
  } catch (err) {
    console.warn(`[PrintBridge] Falló (fallback a window.print):`, err)
    return false
  }
}

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

  /**
   * Imprime usando PrintBridge si está disponible, con fallback a window.print().
   * A diferencia de `imprimir(jsx)`, recibe el payload JSON directamente.
   * Usar para tickets de venta/devolución/cierre donde el payload ya existe.
   *
   * @param tipo - Tipo de documento: 'ticket' | 'devolucion' | 'cierre' | 'etiqueta'
   * @param payload - Payload JSON del documento (mismo formato que usa el renderer)
   * @param fallbackJsx - JSX a usar si PrintBridge no está disponible
   */
  const imprimirConPayload = useCallback(
    async (
      tipo: 'ticket' | 'devolucion' | 'cierre' | 'etiqueta' | 'vale',
      payload: unknown,
      fallbackJsx: React.ReactNode
    ) => {
      if (imprimiendo) return
      setImprimiendo(true)

      const usedBridge = await tryPrintBridge(tipo, payload)

      if (usedBridge) {
        // PrintBridge se encargó — solo limpiar estado
        setImprimiendo(false)
        onDoneRef.current?.()
        return
      }

      // Fallback: window.print() con el JSX
      setNodo(fallbackJsx)
      document.body.classList.add('printing-active')
      document.body.dataset.printType = tipo === 'etiqueta' ? 'etiqueta' : 'ticket'

      // Inyectar el tamaño de página correcto según el tipo de documento
      const pageSize = (() => {
        if (tipo === 'etiqueta') {
          const p = payload as { plantilla?: { ancho_mm?: number; alto_mm?: number } }
          const w = p?.plantilla?.ancho_mm ?? 50
          const h = p?.plantilla?.alto_mm ?? 25
          return `${w}mm ${h}mm`
        }
        const anchoMm = (payload as { tienda?: { ancho_mm?: number } })?.tienda?.ancho_mm ?? 80
        return `${anchoMm}mm auto`
      })()
      const removePageStyle = () => document.getElementById('cvalle-page-size')?.remove()
      const injectPageStyle = () => {
        removePageStyle()
        const el = document.createElement('style')
        el.id = 'cvalle-page-size'
        el.textContent = `@page { size: ${pageSize}; margin: 0; }`
        document.head.appendChild(el)
      }

      const onAfter = () => {
        window.removeEventListener('afterprint', onAfter)
        removePageStyle()
        cleanup()
      }
      window.addEventListener('afterprint', onAfter)

      timeoutRef.current = setTimeout(() => {
        window.removeEventListener('afterprint', onAfter)
        removePageStyle()
        cleanup()
      }, timeoutMs)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            injectPageStyle()
            window.print()
          } catch {
            window.removeEventListener('afterprint', onAfter)
            removePageStyle()
            cleanup()
          }
        })
      })
    },
    [imprimiendo, cleanup, timeoutMs]
  )

  return { contenido, imprimir, imprimirConPayload, imprimiendo }
}
