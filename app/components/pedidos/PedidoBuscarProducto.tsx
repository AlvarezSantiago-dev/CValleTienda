'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { formatARS } from '@/lib/format'
import { buscarVariantesAction } from '@/app/actions/ventas'
import type { VarianteResultado } from '@/lib/pos/queries'

function HitRow({
  v,
  onPick,
}: {
  v: VarianteResultado
  onPick: (v: VarianteResultado) => void
}) {
  return (
    <button
      type="button"
      className="w-full min-h-11 text-left px-3 py-2.5 text-sm text-fg hover:bg-surface-sunken focus-ring rounded-[var(--radius-md)]"
      onClick={() => onPick(v)}
    >
      {v.producto_nombre}
      {v.pack_label ? ` · ${v.pack_label}` : ''}{' '}
      {[v.color, v.talla].filter(Boolean).join(' ')} — {formatARS(v.precio_venta)}
      {v.stock_actual != null ? ` · ${v.stock_actual} u.` : ''}
    </button>
  )
}

export function PedidoBuscarProducto({
  onAgregar,
}: {
  onAgregar: (v: VarianteResultado) => void
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<VarianteResultado[]>([])
  const [focused, setFocused] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  async function onChange(val: string) {
    setQ(val)
    if (val.trim().length < 2) {
      setHits([])
      return
    }
    const res = await buscarVariantesAction(val)
    if (res.ok && res.data) setHits(res.data.slice(0, 8))
  }

  function pick(v: VarianteResultado) {
    onAgregar(v)
    setHits([])
    setQ('')
    setFocused(false)
  }

  const showDrawer = isMobile && focused && (hits.length > 0 || q.trim().length >= 2)

  return (
    <div className="relative">
      <Input
        label="Agregar producto"
        value={q}
        onChange={(e) => void onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          if (!isMobile) {
            window.setTimeout(() => setFocused(false), 150)
          }
        }}
        placeholder="Nombre o código"
        autoComplete="off"
      />
      {!isMobile && focused && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-[var(--radius-md)] border border-border-default bg-surface shadow-md max-h-56 overflow-auto">
          {hits.map((v) => (
            <li key={v.id}>
              <HitRow v={v} onPick={pick} />
            </li>
          ))}
        </ul>
      )}
      <Drawer
        open={showDrawer}
        onClose={() => {
          setFocused(false)
        }}
        title="Agregar al pedido"
        side="bottom"
      >
        {hits.length === 0 ? (
          <p className="text-sm text-fg-muted">Escribí al menos 2 letras para buscar.</p>
        ) : (
          <ul className="space-y-1 pb-4">
            {hits.map((v) => (
              <li key={v.id}>
                <HitRow v={v} onPick={pick} />
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  )
}
