'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button, LinkButton } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { claveLineaCarrito, guardarCarrito, leerCarrito, qtyCarrito, qtyGrupoFicha, recostearCarrito } from '@/lib/catalogo/carrito'
import { consumoFisicoVariante, maxQtyCatalogoNueva, textoStockCatalogo } from '@/lib/catalogo/stock'
import type {
  CartItem,
  ProductoCatalogoPublico,
  TiendaCatalogoPublica,
  VarianteCatalogoPublica,
} from '@/lib/catalogo/types'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'
import { CatalogoQtyStepper } from './CatalogoQtyStepper'
import { precioConTramo, textoDtoAplicado, textoTramos } from '@/lib/precios/tramos-cantidad'
import { resolverVariante, valoresEje1, valoresEje2ParaEje1 } from '@/lib/catalogo/pick-variante'
import { labelPack } from '@/lib/packs/virtual'
import { precioConRecargoCc, recargoCascada } from '@/lib/pos/precio-cc'

function dispatchCart() {
  window.dispatchEvent(new Event('cvalle-cat-cart'))
}

function chipClass(activo: boolean) {
  return `min-h-11 px-3 rounded-[var(--radius-full)] border text-sm focus-ring ${
    activo ? 'border-primary bg-primary-soft text-fg-brand' : 'border-border-default text-fg'
  }`
}

export function CatalogoFicha({
  slug,
  producto,
  tienda,
}: {
  slug: string
  producto: ProductoCatalogoPublico
  tienda?: Pick<
    TiendaCatalogoPublica,
    'usarPedidoCc' | 'recargoCcDefault' | 'labelVar1' | 'labelVar2' | 'usarVar1' | 'usarVar2'
  >
}) {
  const variantes = producto.variantes
  const packs = producto.packs ?? []
  const [varianteId, setVarianteId] = useState(variantes[0]?.id ?? '')
  const [packId, setPackId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [tienePedido, setTienePedido] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    function sync() {
      const next = leerCarrito(slug)
      setCart(next)
      setTienePedido(qtyCarrito(next) > 0)
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('cvalle-cat-cart', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('cvalle-cat-cart', sync)
    }
  }, [slug])

  const sel: VarianteCatalogoPublica | undefined = useMemo(
    () => variantes.find((v) => v.id === varianteId) ?? variantes[0],
    [variantes, varianteId]
  )
  const packSel = packs.find((p) => p.id === packId) ?? null

  const labelVar1 = tienda?.labelVar1 ?? 'Talla'
  const labelVar2 = tienda?.labelVar2 ?? 'Color'
  const usarVar1 = tienda?.usarVar1 !== false
  const usarVar2 = tienda?.usarVar2 !== false
  const tallaSel = sel?.talla ?? null
  const colorSel = sel?.color ?? null
  const tallas = usarVar1 ? valoresEje1(variantes) : []
  const colores = usarVar2 ? valoresEje2ParaEje1(variantes, tallaSel) : []
  const mostrarEje1 = usarVar1 && tallas.length > 1
  const mostrarEje2 = usarVar2 && colores.length > 1

  const tramos = packSel ? packSel.tramos : (producto.tramos ?? [])
  const precioLista = packSel ? packSel.precio : (sel?.precio_venta ?? producto.precio_venta)
  const qtyTramo = sel
    ? qtyGrupoFicha(cart, producto.id, packSel?.id ?? null, qty)
    : qty
  const precioMostrado = precioConTramo(precioLista, tramos, qtyTramo)
  const recargoLinea = recargoCascada(
    packSel?.recargo_cc_pct,
    producto.recargo_cc_pct,
    tienda?.recargoCcDefault ?? 0
  )
  const precioCc =
    tienda?.usarPedidoCc ? precioConRecargoCc(precioMostrado, recargoLinea) : null
  const hayDto = precioLista > precioMostrado
  const textoDto = textoDtoAplicado(tramos, qtyTramo)
  const img = packSel?.imagen_url || sel?.imagen_url || producto.imagen_url
  const stockFisico = sel?.stock_actual ?? 0
  const enPedidoFisico = sel ? consumoFisicoVariante(cart, sel.id) : 0
  const maxAdd = sel
    ? maxQtyCatalogoNueva(cart, sel.id, stockFisico, packSel?.unidades ?? null)
    : 0
  const sinStockPresentacion = maxAdd <= 0
  const stockHint = textoStockCatalogo({
    stockFisico,
    enPedidoFisico,
    packUnidades: packSel?.unidades ?? null,
    packLabel: packSel ? labelPack(packSel.unidades, packSel.nombre) : null,
  })
  const stockHintClass =
    stockHint?.tono === 'agotado'
      ? 'text-danger-soft-fg'
      : stockHint?.tono === 'aviso'
        ? 'text-warning-soft-fg'
        : 'text-fg-muted'

  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, maxAdd)))
  }, [maxAdd, varianteId, packId])

  function pick(talla: string | null, color: string | null, eje: 'talla' | 'color') {
    const hit = resolverVariante(variantes, talla, color, eje)
    if (hit) setVarianteId(hit.id)
  }

  function agregar() {
    if (!sel) return
    const actual = leerCarrito(slug)
    const packLabel = packSel ? labelPack(packSel.unidades, packSel.nombre) : null
    const clave = claveLineaCarrito({ varianteId: sel.id, packId: packSel?.id ?? null })
    const i = actual.findIndex((c) => claveLineaCarrito(c) === clave)
    const tope = maxQtyCatalogoNueva(
      actual,
      sel.id,
      sel.stock_actual,
      packSel?.unidades ?? null,
      clave
    )
    if (tope <= 0) {
      const hint = textoStockCatalogo({
        stockFisico: sel.stock_actual,
        enPedidoFisico: consumoFisicoVariante(actual, sel.id),
        packUnidades: packSel?.unidades ?? null,
        packLabel,
      })
      toast.error(hint?.texto ?? 'No hay stock suficiente')
      return
    }
    const nextQty = Math.min(tope, (i >= 0 ? actual[i].qty : 0) + qty)
    if (i >= 0 && nextQty <= actual[i].qty) {
      toast.error(stockHint?.texto ?? 'No hay más stock de este producto')
      return
    }
    const item = {
      varianteId: sel.id,
      productoId: producto.id,
      nombre: packLabel ? `${producto.nombre} · ${packLabel}` : producto.nombre,
      talla: sel.talla,
      color: sel.color,
      qty: nextQty,
      stockActual: sel.stock_actual,
      precioLista,
      tramos,
      precio: precioConTramo(precioLista, tramos, nextQty),
      imagen: img ?? null,
      recargo_cc_pct:
        packSel?.recargo_cc_pct != null ? packSel.recargo_cc_pct : producto.recargo_cc_pct,
      packId: packSel?.id ?? null,
      packUnidades: packSel?.unidades ?? null,
      packLabel,
    }
    if (i >= 0) actual[i] = item
    else actual.push(item)
    guardarCarrito(slug, recostearCarrito(actual))
    dispatchCart()
    toast.success('Agregado al pedido')
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/c/${slug}`}
        className="inline-flex min-h-11 items-center text-sm text-fg-brand focus-ring rounded-[var(--radius-md)]"
      >
        ← Catálogo
      </Link>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative aspect-square sm:aspect-[4/5] rounded-[var(--radius-lg)] overflow-hidden border border-border-subtle bg-surface-sunken">
          {img ? (
            <Image
              src={img}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
              quality={80}
              priority
            />
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
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {hayDto && (
                <span className="text-base text-fg-muted line-through tabular-nums">
                  {formatARS(precioLista)}
                </span>
              )}
              <span className="text-lg font-semibold text-fg-brand tabular-nums">
                {formatARS(precioMostrado)}
                {packSel ? (
                  <span className="text-sm font-normal text-fg-muted"> / pack</span>
                ) : null}
              </span>
            </p>
            {precioCc != null && precioCc > precioMostrado && (
              <p className="mt-0.5 text-sm text-fg-muted tabular-nums">
                A cuenta {formatARS(precioCc)}
                {packSel ? ' / pack' : ''}
                {recargoLinea > 0 ? ` (+${recargoLinea}%)` : ''}
              </p>
            )}
            {qty > 1 && (
              <p className="mt-1 text-sm tabular-nums text-fg">
                Total ×{qty}
                {packSel ? ' packs' : ''}: {formatARS(precioMostrado * qty)}
                {precioCc != null && precioCc > precioMostrado ? (
                  <span className="text-fg-muted">
                    {' '}
                    · a cuenta {formatARS(precioCc * qty)}
                  </span>
                ) : null}
              </p>
            )}
            {textoDto && (
              <p className="mt-1 text-xs font-medium text-success-soft-fg">{textoDto}</p>
            )}
            {tramos.length > 0 && (
              <p className="mt-1 text-xs text-fg-muted">
                {textoTramos(tramos, packSel ? 'packs' : 'u.')}
                {producto.variantes.length > 1 ? ' · se suman las variantes' : ''}
              </p>
            )}
            {stockHint && (
              <p className={`mt-1 text-xs ${stockHintClass}`}>{stockHint.texto}</p>
            )}
          </div>

          {packs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-fg-muted mb-1.5">Pack o caja</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setPackId(null)} className={chipClass(packId == null)}>
                  Unidad
                </button>
                {packs.map((p) => {
                  const packsOk = maxQtyCatalogoNueva(cart, sel?.id ?? '', stockFisico, p.unidades)
                  const sinPack = packsOk <= 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPackId(p.id)}
                      className={`${chipClass(packId === p.id)} ${sinPack ? 'opacity-50' : ''}`}
                      title={
                        sinPack
                          ? textoStockCatalogo({
                              stockFisico,
                              enPedidoFisico,
                              packUnidades: p.unidades,
                              packLabel: labelPack(p.unidades, p.nombre),
                            })?.texto
                          : undefined
                      }
                    >
                      {labelPack(p.unidades, p.nombre)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {mostrarEje1 && (
            <div>
              <p className="text-xs font-medium text-fg-muted mb-1.5">{labelVar1}</p>
              <div className="flex flex-wrap gap-1.5">
                {tallas.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pick(t, colorSel, 'talla')}
                    className={chipClass(tallaSel === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mostrarEje2 && (
            <div>
              <p className="text-xs font-medium text-fg-muted mb-1.5">{labelVar2}</p>
              <div className="flex flex-wrap gap-1.5">
                {colores.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pick(tallaSel, c, 'color')}
                    className={chipClass(colorSel === c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variantes.length > 1 && !mostrarEje1 && !mostrarEje2 && (
            <div className="flex flex-wrap gap-1.5">
              {variantes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVarianteId(v.id)}
                  className={chipClass(varianteId === v.id)}
                >
                  {[v.color, v.talla].filter(Boolean).join(' ') || 'Único'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-muted">Cantidad</span>
            <CatalogoQtyStepper
              value={qty}
              onChange={setQty}
              max={Math.max(1, maxAdd)}
              disabled={sinStockPresentacion}
            />
          </div>

          <div className="space-y-2">
            <Button type="button" className="w-full" onClick={agregar} disabled={!sel || sinStockPresentacion}>
              {sinStockPresentacion ? 'Sin stock' : 'Agregar al pedido'}
            </Button>
            {tienePedido ? (
              <LinkButton href={`/c/${slug}/carrito`} variant="secondary" className="w-full">
                Ver pedido
              </LinkButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
