'use client'

import { useState, useTransition } from 'react'
import {
  obtenerPayloadVenta,
  obtenerPayloadDevolucion,
} from '@/app/actions/impresion'
import { usePrint } from '@/lib/impresion/usePrint'
import { rubroTieneVale } from '@/lib/rubro/config'
import { TicketVentaRenderer } from '@/components/impresion/TicketVentaRenderer'
import { TicketDevolucionRenderer } from '@/components/impresion/TicketDevolucionRenderer'
import { ValeCambioRenderer } from '@/components/impresion/ValeCambioRenderer'

interface Props {
  tipo?: 'venta' | 'devolucion'
  id?: string
  /** Cuando tipo === 'venta' y dias_cambio > 0 y rubro aplica, muestra el botón extra de vale */
  diasCambio?: number | null
  /** Rubro del negocio — restringe el vale a rubros que aplican */
  rubro?: string | null
}

/**
 * Botón de reimpresión client-side: pide el payload al servidor y dispara
 * window.print() con el ticket renderizado en un stage oculto.
 */
export function PrintButtonClient({ tipo, id, diasCambio, rubro }: Props) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const { contenido, imprimir, imprimirConPayload } = usePrint({ tipo: 'ticket' })

  if (!tipo || !id) {
    return (
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
      >
        Imprimir
      </button>
    )
  }

  const onClick = () => {
    setMsg(null)
    startTransition(async () => {
      if (tipo === 'venta') {
        const r = await obtenerPayloadVenta(id)
        if (r.ok && r.data) {
          imprimirConPayload('ticket', r.data, <TicketVentaRenderer payload={r.data} />)
        } else {
          setMsg({ tipo: 'error', texto: r.error ?? 'Error' })
        }
      } else {
        const r = await obtenerPayloadDevolucion(id)
        if (r.ok && r.data) {
          imprimirConPayload('devolucion', r.data, <TicketDevolucionRenderer payload={r.data} />)
        } else {
          setMsg({ tipo: 'error', texto: r.error ?? 'Error' })
        }
      }
    })
  }

  const onClickVale = () => {
    setMsg(null)
    startTransition(async () => {
      const r = await obtenerPayloadVenta(id)
      if (r.ok && r.data) {
        const dias = r.data.tienda.dias_cambio
        if (dias && dias > 0) {
          imprimirConPayload('vale', r.data, <ValeCambioRenderer payload={r.data} diasCambio={dias} />)
        }
      } else {
        setMsg({ tipo: 'error', texto: r.error ?? 'Error' })
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium text-gray-700 transition-colors"
      >
        {pending ? 'Imprimiendo…' : 'Reimprimir'}
      </button>
      {tipo === 'venta' && diasCambio && diasCambio > 0 && rubroTieneVale(rubro) && (
        <button
          type="button"
          onClick={onClickVale}
          disabled={pending}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-amber-200 hover:bg-amber-50 disabled:opacity-50 text-sm font-medium text-amber-800 transition-colors"
        >
          Reimprimir vale (sin precios)
        </button>
      )}
      {msg && (
        <span
          className={`text-xs ${msg.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}
        >
          {msg.texto}
        </span>
      )}
      {contenido}
    </div>
  )
}
