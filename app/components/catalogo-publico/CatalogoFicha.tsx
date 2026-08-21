'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { guardarCarrito, leerCarrito } from '@/lib/catalogo/carrito'
import { MAX_QTY_LINEA } from '@/lib/catalogo/const'
import type { ProductoCatalogoPublico, VarianteCatalogoPublica } from '@/lib/catalogo/types'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'
import { precioConTramo, textoTramos } from '@/lib/precios/tramos-cantidad'

function dispatchCart() {
  window.dispatchEvent(new Event('cvalle-cat-cart'))
}

export function CatalogoFicha({
  slug,
  producto,
}: {
  slug: string
  producto: ProductoCatalogoPublico
}) {
  const router = useRouter()
  const variantes = producto.variantes
  const [varianteId, setVarianteId] = useState(variantes[0]?.id ?? '')
  const [qty, setQty] = useState(1)

  const sel: VarianteCatalogoPublica | undefined = useMemo(
    () => variantes.find((v) => v.id === varianteId) ?? variantes[0],
    [variantes, varianteId]
  )

  const tallas = [...new Set(variantes.map((v) => v.talla).filter(Boolean))] as string[]
  const colores = [...new Set(variantes.map((v) => v.color).filter(Boolean))] as string[]
  const tallaSel = sel?.talla ?? null
  const colorSel = sel?.color ?? null

  function pick(talla: string | null, color: string | null) {
    const hit =
      variantes.find((v) => v.talla === talla && v.color === color) ??
      variantes.find((v) => (talla ? v.talla === talla : true) && (color ? v.color === color : true))
    if (hit) setVarianteId(hit.id)
  }

  function agregar() {
    if (!sel) return
    const cart = leerCarrito(slug)
    const i = cart.findIndex((c) => c.varianteId === sel.id)
    const nextQty = Math.min(MAX_QTY_LINEA, (i >= 0 ? cart[i].qty : 0) + qty)
    const precioLista = sel.precio_venta
    const item = {
      varianteId: sel.id,
      productoId: producto.id,
      nombre: producto.nombre,
      talla: sel.talla,
      color: sel.color,
      qty: nextQty,
      precioLista,
      tramos: producto.tramos ?? [],
      precio: precioConTramo(precioLista, producto.tramos ?? [], nextQty),
      imagen: sel.imagen_url,
    }
    if (i >= 0) cart[i] = item
    else cart.push(item)
    guardarCarrito(slug, cart)
    dispatchCart()
    router.push(`/c/${slug}/carrito`)
  }

  const img = sel?.imagen_url || producto.imagen_url

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="aspect-[4/5] rounded-[var(--radius-lg)] overflow-hidden border border-border-subtle bg-surface-sunken">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <CatalogoPlaceholder nombre={producto.nombre} />
        )}
      </div>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-fg">{producto.nombre}</h1>
          {producto.descripcion && (
            <p className="mt-1 text-sm text-fg-muted whitespace-pre-wrap">{producto.descripcion}</p>
          )}
          <p className="mt-2 text-lg font-semibold text-fg-brand tabular-nums">
            {formatARS(
              precioConTramo(sel?.precio_venta ?? producto.precio_venta, producto.tramos ?? [], qty)
            )}
          </p>
          {producto.tramos.length > 0 && (
            <p className="mt-1 text-xs text-fg-muted">{textoTramos(producto.tramos)}</p>
          )}
        </div>

        {tallas.length > 1 && (
          <div>
            <p className="text-xs font-medium text-fg-muted mb-1.5">Talle</p>
            <div className="flex flex-wrap gap-1.5">
              {tallas.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pick(t, colorSel)}
                  className={`h-9 px-3 rounded-[var(--radius-full)] border text-sm ${
                    tallaSel === t
                      ? 'border-primary bg-primary-soft text-fg-brand'
                      : 'border-border-default text-fg'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {colores.length > 1 && (
          <div>
            <p className="text-xs font-medium text-fg-muted mb-1.5">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {colores.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pick(tallaSel, c)}
                  className={`h-9 px-3 rounded-[var(--radius-full)] border text-sm ${
                    colorSel === c
                      ? 'border-primary bg-primary-soft text-fg-brand'
                      : 'border-border-default text-fg'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {variantes.length > 1 && tallas.length <= 1 && colores.length <= 1 && (
          <div className="flex flex-wrap gap-1.5">
            {variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVarianteId(v.id)}
                className={`h-9 px-3 rounded-[var(--radius-full)] border text-sm ${
                  varianteId === v.id
                    ? 'border-primary bg-primary-soft text-fg-brand'
                    : 'border-border-default text-fg'
                }`}
              >
                {[v.color, v.talla].filter(Boolean).join(' ') || 'Único'}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-sm text-fg-muted">Cantidad</label>
          <input
            type="number"
            min={1}
            max={MAX_QTY_LINEA}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(MAX_QTY_LINEA, Number(e.target.value) || 1)))}
            className="h-10 w-20 rounded-[var(--radius-md)] border border-border-default bg-surface px-2 text-sm"
          />
        </div>

        <Button type="button" className="w-full" onClick={agregar} disabled={!sel}>
          Agregar al pedido
        </Button>
      </div>
    </div>
  )
}
