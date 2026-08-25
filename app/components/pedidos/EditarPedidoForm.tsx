'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarPedidoCatalogo } from '@/app/actions/catalogo'
import { buscarVariantesAction } from '@/app/actions/ventas'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { CatalogoQtyStepper } from '@/components/catalogo-publico/CatalogoQtyStepper'
import { CondicionPagoToggle } from '@/components/pos/CondicionPagoToggle'
import { formatARS } from '@/lib/format'
import { precioConTramo, qtyParaTramo } from '@/lib/precios/tramos-cantidad'
import { parseIdVirtualPack, varianteIdDeEntrada } from '@/lib/packs/virtual'
import { unidadesFisicas, maxPresentaciones } from '@/lib/stock/consumo'
import { tieneStockSuficiente } from '@/lib/stock/infinito'
import { precioConRecargoCc, recargoEfectivo } from '@/lib/pos/precio-cc'
import { useRubro } from '@/components/layout/RubroProvider'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import type { CondicionPago, PedidoCatalogo, PedidoCatalogoItem, TipoEntregaCatalogo } from '@/types/database'
import type { VarianteResultado } from '@/lib/pos/queries'

type LineaEdit = {
  variante_id: string
  producto_id?: string | null
  pack_id: string | null
  pack_unidades: number | null
  producto_nombre: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_lista: number
  precio_unitario: number
  imagen_url: string | null
  tramos: { cantidad_desde: number; descuento_pct: number }[]
  stock_fisico?: number | null
  recargo_cc_pct?: number | null
}

function claveLinea(l: { variante_id: string; pack_id?: string | null }) {
  return l.pack_id ? `${l.variante_id}::${l.pack_id}` : l.variante_id
}

function recostearTodas(
  lineas: LineaEdit[],
  condicion: CondicionPago,
  recargoDefault: number
): LineaEdit[] {
  const grupos = lineas.map((l) => ({
    productoId: l.producto_id,
    packId: l.pack_id,
    cantidad: l.cantidad,
    esPack: Boolean(l.pack_id),
  }))
  return lineas.map((l) => {
    const qty = qtyParaTramo(grupos, {
      productoId: l.producto_id,
      packId: l.pack_id,
      cantidad: l.cantidad,
      esPack: Boolean(l.pack_id),
    })
    const contado = precioConTramo(l.precio_lista, l.tramos, qty)
    const recargo = recargoEfectivo(l.recargo_cc_pct, recargoDefault)
    const unit =
      condicion === 'cuenta_corriente' ? precioConRecargoCc(contado, recargo) : contado
    return { ...l, precio_unitario: unit }
  })
}

function recostear(l: LineaEdit, condicion: CondicionPago, recargoDefault: number): LineaEdit {
  return recostearTodas([l], condicion, recargoDefault)[0]
}

function maxDeLinea(
  l: LineaEdit,
  todas: LineaEdit[],
  permiteInfinito: boolean
): number {
  const otros = todas
    .filter((x) => x.variante_id === l.variante_id && claveLinea(x) !== claveLinea(l))
    .reduce((acc, x) => acc + unidadesFisicas(x.cantidad, x.pack_unidades), 0)
  if (l.stock_fisico == null) return l.cantidad
  return maxPresentaciones(l.stock_fisico - otros, l.pack_unidades, permiteInfinito)
}

function lineaDesdeItem(
  it: PedidoCatalogoItem,
  condicion: CondicionPago,
  recargoDefault: number
): LineaEdit {
  const base: LineaEdit = {
    variante_id: it.variante_id ?? '',
    producto_id: it.producto_id ?? null,
    pack_id: it.pack_id ?? null,
    pack_unidades: it.pack_unidades ?? null,
    producto_nombre: it.producto_nombre,
    talla: it.talla,
    color: it.color,
    cantidad: Number(it.cantidad),
    precio_lista: Number(it.precio_lista ?? it.precio_unitario),
    precio_unitario: Number(it.precio_unitario),
    imagen_url: it.imagen_url,
    tramos: it.tramos ?? [],
    stock_fisico: it.stock_actual ?? null,
    recargo_cc_pct: it.recargo_cc_pct ?? null,
  }
  return recostear(base, condicion, recargoDefault)
}

export function EditarPedidoForm({
  pedido,
  items,
  recargoCcDefault = 0,
}: {
  pedido: PedidoCatalogo
  items: PedidoCatalogoItem[]
  recargoCcDefault?: number
}) {
  const { rubro, usarPedidoCc } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const router = useRouter()
  const [condicion, setCondicion] = useState<CondicionPago>(
    usarPedidoCc && pedido.condicion_pago === 'cuenta_corriente'
      ? 'cuenta_corriente'
      : 'contado'
  )
  const [lineas, setLineas] = useState<LineaEdit[]>(() =>
    recostearTodas(
      items
        .map((it) =>
          lineaDesdeItem(
            it,
            usarPedidoCc && pedido.condicion_pago === 'cuenta_corriente'
              ? 'cuenta_corriente'
              : 'contado',
            recargoCcDefault
          )
        )
        .filter((l) => l.variante_id),
      usarPedidoCc && pedido.condicion_pago === 'cuenta_corriente'
        ? 'cuenta_corriente'
        : 'contado',
      recargoCcDefault
    )
  )
  const [notas, setNotas] = useState(pedido.notas ?? '')
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntregaCatalogo>(pedido.tipo_entrega)
  const [direccion, setDireccion] = useState(pedido.direccion_entrega ?? '')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<VarianteResultado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const total = useMemo(
    () => lineas.reduce((acc, l) => acc + l.precio_unitario * l.cantidad, 0),
    [lineas]
  )

  function aplicarCondicion(next: CondicionPago) {
    setCondicion(next)
    setLineas((prev) => recostearTodas(prev, next, recargoCcDefault))
  }

  function setCantidad(clave: string, cantidad: number) {
    const cantIn = Math.max(1, Math.floor(cantidad) || 1)
    setLineas((prev) => {
      const next = prev.map((l) => {
        if (claveLinea(l) !== clave) return l
        const max = maxDeLinea(l, prev, permiteInfinito)
        const cant = Math.min(cantIn, Math.max(0, max))
        if (cant < 1) {
          setError('Sin stock suficiente para esta presentación')
          return l
        }
        setError(null)
        return { ...l, cantidad: cant }
      })
      return recostearTodas(next, condicion, recargoCcDefault)
    })
  }

  function agregar(v: VarianteResultado) {
    setError(null)
    const parsed = parseIdVirtualPack(v.id)
    const varianteId = varianteIdDeEntrada(v.id)
    const packId = v.pack_id ?? parsed?.packId ?? null
    const packU = v.es_pack ? v.pack_cantidad : null
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.variante_id === varianteId && (l.pack_id ?? null) === packId)
      const consumoOtros = prev
        .filter((l) => l.variante_id === varianteId && !(i >= 0 && claveLinea(l) === claveLinea(prev[i])))
        .reduce((acc, l) => acc + unidadesFisicas(l.cantidad, l.pack_unidades), 0)
      const qtyNueva = (i >= 0 ? prev[i].cantidad : 0) + 1
      if (
        !tieneStockSuficiente(
          v.stock_actual,
          consumoOtros + unidadesFisicas(qtyNueva, packU),
          permiteInfinito
        )
      ) {
        setError('Sin stock suficiente')
        return prev
      }
      if (i >= 0) {
        const next = [...prev]
        next[i] = {
          ...next[i],
          cantidad: next[i].cantidad + 1,
          stock_fisico: v.stock_actual,
          producto_id: next[i].producto_id ?? v.producto_id,
        }
        return recostearTodas(next, condicion, recargoCcDefault)
      }
      return recostearTodas(
        [
          ...prev,
          {
            variante_id: varianteId,
            producto_id: v.producto_id,
            pack_id: packId,
            pack_unidades: packU,
            producto_nombre:
              v.es_pack && v.pack_label
                ? `${v.producto_nombre} · ${v.pack_label}`
                : v.producto_nombre,
            talla: v.talla,
            color: v.color,
            cantidad: 1,
            precio_lista: v.precio_venta,
            precio_unitario: v.precio_venta,
            imagen_url: v.imagen_url,
            tramos: v.tramos ?? [],
            stock_fisico: v.stock_actual,
            recargo_cc_pct: v.recargo_cc_pct,
          },
        ],
        condicion,
        recargoCcDefault
      )
    })
    setHits([])
    setQ('')
  }

  function guardar() {
    setError(null)
    start(async () => {
      const res = await actualizarPedidoCatalogo({
        pedidoId: pedido.id,
        items: lineas.map((l) => ({
          variante_id: l.variante_id,
          cantidad: l.cantidad,
          producto_nombre: l.producto_nombre,
          talla: l.talla,
          color: l.color,
          imagen_url: l.imagen_url,
          precio_unitario: l.precio_lista,
          pack_id: l.pack_id,
          pack_unidades: l.pack_unidades,
        })),
        notas,
        tipo_entrega: tipoEntrega,
        direccion_entrega: direccion,
        condicion_pago: condicion,
      })
      if (!res.ok) {
        setError(res.error ?? 'No se pudo guardar')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4">
      <p className="text-sm font-medium text-fg">Productos</p>
      {usarPedidoCc && (
        <div className="max-w-sm space-y-1">
          <p className="text-xs font-medium text-fg-muted">Condición de pago</p>
          <CondicionPagoToggle value={condicion} onChange={aplicarCondicion} />
          {condicion === 'cuenta_corriente' && (
            <p className="text-xs text-fg-muted">
              Los precios incluyen recargo a cuenta (pack → producto → tienda).
            </p>
          )}
        </div>
      )}
      <ul className="space-y-3">
        {lineas.map((l) => {
          const max = maxDeLinea(l, lineas, permiteInfinito)
          const tope = Math.max(0, max)
          return (
            <li
              key={claveLinea(l)}
              className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-border-subtle bg-surface-sunken/40 p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm text-fg">{l.producto_nombre}</p>
                <p className="text-xs text-fg-muted">
                  {[l.color, l.talla].filter(Boolean).join(' · ') || '—'}
                  {l.stock_fisico != null && (
                    <>
                      {' · '}
                      {tope <= 0 ? 'Sin stock' : `Máx. ${tope}`}
                    </>
                  )}
                </p>
                <p className="text-xs tabular-nums text-fg-muted">
                  {formatARS(l.precio_unitario)} c/u
                </p>
              </div>
              <CatalogoQtyStepper
                value={l.cantidad}
                onChange={(n) => setCantidad(claveLinea(l), n)}
                max={tope}
                min={1}
              />
              <span className="w-24 text-right text-sm font-medium tabular-nums">
                {formatARS(l.precio_unitario * l.cantidad)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setLineas((prev) =>
                    recostearTodas(
                      prev.filter((x) => claveLinea(x) !== claveLinea(l)),
                      condicion,
                      recargoCcDefault
                    )
                  )
                }
              >
                Quitar
              </Button>
            </li>
          )
        })}
      </ul>
      <div className="relative">
        <Input
          label="Agregar producto"
          value={q}
          onChange={async (e) => {
            const val = e.target.value
            setQ(val)
            if (val.trim().length < 2) {
              setHits([])
              return
            }
            const res = await buscarVariantesAction(val)
            if (res.ok && res.data) setHits(res.data.slice(0, 8))
          }}
          placeholder="Nombre o código"
        />
        {hits.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-[var(--radius-md)] border border-border-default bg-surface shadow-md max-h-56 overflow-auto">
            {hits.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-sunken"
                  onClick={() => agregar(v)}
                >
                  {v.producto_nombre}
                  {v.pack_label ? ` · ${v.pack_label}` : ''}{' '}
                  {[v.color, v.talla].filter(Boolean).join(' ')} — {formatARS(v.precio_venta)}
                  {v.stock_actual != null ? ` · ${v.stock_actual} u.` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={tipoEntrega === 'retiro' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTipoEntrega('retiro')}
        >
          Retiro
        </Button>
        <Button
          type="button"
          variant={tipoEntrega === 'envio' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTipoEntrega('envio')}
        >
          Envío
        </Button>
      </div>
      {tipoEntrega === 'envio' && (
        <Input
          label="Dirección de entrega"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
        />
      )}
      <Textarea label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
      <p className="text-right text-sm">
        <span className="text-fg-muted mr-2">
          {condicion === 'cuenta_corriente' ? 'Total a cuenta' : 'Total'}
        </span>
        <span className="font-semibold tabular-nums">{formatARS(total)}</span>
      </p>
      {error && <p className="text-sm text-danger-soft-fg">{error}</p>}
      <Button type="button" onClick={guardar} disabled={pending || lineas.length === 0}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
