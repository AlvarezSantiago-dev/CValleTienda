// =============================================================
// lib/cajero/propuesta.ts
// Lógica pura para armar la propuesta de venta del Cajero Hablado.
// Los números se calculan acá (server), nunca en el LLM.
// Sin I/O — testeable con node:test.
// =============================================================

import { round2 } from '../format-cantidad'
import { totalLinea } from '../pos/totales-carrito'
import { desgloseVueltoEfectivo } from '../pos/redondeo-efectivo'
import type { ItemResuelto, PropuestaVenta } from './tipos'

export interface OpcionesPropuesta {
  recibido?: number
  /** Redondeo de vuelto a múltiplos de $100 (default true, como el POS) */
  redondeoActivo?: boolean
  cliente_id?: string | null
  cliente_nombre?: string | null
}

export function armarPropuestaVenta(
  items: ItemResuelto[],
  opts: OpcionesPropuesta = {}
): PropuestaVenta {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La propuesta debe tener al menos un ítem')
  }
  for (const it of items) {
    const cant = Number(it.cantidad)
    const precio = Number(it.precio_unitario)
    if (!Number.isFinite(cant) || cant <= 0) {
      throw new Error(`Cantidad inválida para ${it.etiqueta}`)
    }
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error(`Precio inválido para ${it.etiqueta}`)
    }
  }

  const conSubtotal = items.map((it) => ({
    ...it,
    cantidad: Number(it.cantidad),
    precio_unitario: round2(Number(it.precio_unitario)),
    subtotal: totalLinea(it.precio_unitario, it.cantidad),
  }))
  const total = round2(conSubtotal.reduce((acc, it) => acc + it.subtotal, 0))

  const propuesta: PropuestaVenta = {
    tipo: 'venta',
    items: conSubtotal,
    total,
    cliente_id: opts.cliente_id ?? null,
    cliente_nombre: opts.cliente_nombre ?? null,
  }

  const recibido = opts.recibido != null ? round2(Number(opts.recibido)) : undefined
  if (recibido != null && Number.isFinite(recibido) && recibido > 0) {
    propuesta.recibido = recibido
    if (recibido < total) {
      propuesta.faltante = round2(total - recibido)
    } else {
      const { vuelto, ajuste } = desgloseVueltoEfectivo(recibido, total, {
        activo: opts.redondeoActivo !== false,
      })
      propuesta.vuelto = vuelto
      propuesta.ajusteRedondeo = ajuste
    }
  }

  return propuesta
}

/** Resumen compacto de la propuesta para devolverle a la tool / al modelo */
export function resumenPropuestaVenta(p: PropuestaVenta): string {
  const lineas = p.items
    .map((it) => `${it.cantidad} x ${it.etiqueta} = $${it.subtotal}`)
    .join('; ')
  let extra = ''
  if (p.faltante != null) {
    extra = ` Recibido $${p.recibido} — FALTAN $${p.faltante}.`
  } else if (p.vuelto != null) {
    extra = ` Recibido $${p.recibido}, vuelto $${p.vuelto}.`
    if (p.ajusteRedondeo && p.ajusteRedondeo > 0) {
      extra += ` (quedan $${p.ajusteRedondeo} por redondeo)`
    }
  }
  return `${lineas}. Total $${p.total}.${extra}`
}
