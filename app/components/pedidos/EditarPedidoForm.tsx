'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarPedidoCatalogo } from '@/app/actions/catalogo'
import { buscarVariantesAction } from '@/app/actions/ventas'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { formatARS } from '@/lib/format'
import { precioConTramo } from '@/lib/precios/tramos-cantidad'
import type { PedidoCatalogo, PedidoCatalogoItem, TipoEntregaCatalogo } from '@/types/database'
import type { VarianteResultado } from '@/lib/pos/queries'

type LineaEdit = {
  variante_id: string
  producto_nombre: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_lista: number
  precio_unitario: number
  imagen_url: string | null
  tramos: { cantidad_desde: number; descuento_pct: number }[]
}

function lineaDesdeItem(it: PedidoCatalogoItem): LineaEdit {
  return {
    variante_id: it.variante_id ?? '',
    producto_nombre: it.producto_nombre,
    talla: it.talla,
    color: it.color,
    cantidad: Number(it.cantidad),
    precio_lista: Number(it.precio_unitario),
    precio_unitario: Number(it.precio_unitario),
    imagen_url: it.imagen_url,
    tramos: [],
  }
}

function recostear(l: LineaEdit): LineaEdit {
  const unit = precioConTramo(l.precio_lista, l.tramos, l.cantidad)
  return { ...l, precio_unitario: unit }
}

export function EditarPedidoForm({
  pedido,
  items,
}: {
  pedido: PedidoCatalogo
  items: PedidoCatalogoItem[]
}) {
  const router = useRouter()
  const [lineas, setLineas] = useState<LineaEdit[]>(() => items.map(lineaDesdeItem).filter((l) => l.variante_id))
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

  function setCantidad(varianteId: string, cantidad: number) {
    const cant = Math.max(1, Math.floor(cantidad) || 1)
    setLineas((prev) =>
      prev.map((l) => (l.variante_id === varianteId ? recostear({ ...l, cantidad: cant }) : l))
    )
  }

  function agregar(v: VarianteResultado) {
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.variante_id === v.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = recostear({ ...next[i], cantidad: next[i].cantidad + 1 })
        return next
      }
      return [
        ...prev,
        recostear({
          variante_id: v.id,
          producto_nombre: v.producto_nombre,
          talla: v.talla,
          color: v.color,
          cantidad: 1,
          precio_lista: v.precio_venta,
          precio_unitario: v.precio_venta,
          imagen_url: v.imagen_url,
          tramos: v.tramos ?? [],
        }),
      ]
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
        })),
        notas,
        tipo_entrega: tipoEntrega,
        direccion_entrega: direccion,
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
      <p className="text-sm font-medium text-fg">Editar pedido</p>
      <ul className="space-y-2">
        {lineas.map((l) => (
          <li key={l.variante_id} className="flex items-center gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{l.producto_nombre}</p>
              <p className="text-xs text-fg-muted">
                {[l.color, l.talla].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <input
              type="number"
              min={1}
              value={l.cantidad}
              onChange={(e) => setCantidad(l.variante_id, Number(e.target.value))}
              className="h-8 w-16 rounded-[var(--radius-md)] border border-border-default bg-surface px-1 text-sm"
            />
            <span className="w-24 text-right tabular-nums">
              {formatARS(l.precio_unitario * l.cantidad)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLineas((prev) => prev.filter((x) => x.variante_id !== l.variante_id))}
            >
              Quitar
            </Button>
          </li>
        ))}
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
                  {v.producto_nombre} {[v.color, v.talla].filter(Boolean).join(' ')} —{' '}
                  {formatARS(v.precio_venta)}
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
      <p className="text-right font-semibold tabular-nums">{formatARS(total)}</p>
      {error && <p className="text-sm text-danger-soft-fg">{error}</p>}
      <Button type="button" onClick={guardar} disabled={pending || lineas.length === 0}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
