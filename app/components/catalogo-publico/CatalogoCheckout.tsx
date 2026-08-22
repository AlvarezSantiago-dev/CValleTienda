'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { formatARS } from '@/lib/format'
import {
  claveLineaCarrito,
  leerCarrito,
  recostearItemCarrito,
  totalCarrito,
  totalCarritoCc,
  vaciarCarrito,
} from '@/lib/catalogo/carrito'
import { MAX_NOTAS, MIN_DIRECCION, PEDIDO_ENVIADO_KEY } from '@/lib/catalogo/const'
import type { CartItem, PedidoEnviadoPayload, TiendaCatalogoPublica } from '@/lib/catalogo/types'
import type { CondicionPago } from '@/types/database'

export function CatalogoCheckout({
  slug,
  tienda,
}: {
  slug: string
  tienda: TiendaCatalogoPublica
}) {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const soloRetiro = tienda.catalogo_retiro && !tienda.catalogo_envio
  const soloEnvio = tienda.catalogo_envio && !tienda.catalogo_retiro
  const [tipo, setTipo] = useState<'retiro' | 'envio'>(soloEnvio ? 'envio' : 'retiro')
  const [condicion, setCondicion] = useState<CondicionPago>('contado')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => {
    setItems(leerCarrito(slug).map(recostearItemCarrito))
    setReady(true)
  }, [slug])

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cart = leerCarrito(slug)
    if (cart.length === 0) {
      setError('El carrito está vacío')
      return
    }
    if (tipo === 'envio' && direccion.trim().length < MIN_DIRECCION) {
      setError('Ingresá la dirección de entrega')
      return
    }
    start(async () => {
      const res = await fetch(`/api/catalogo/${encodeURIComponent(slug)}/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: nombre,
          cliente_telefono: tel,
          tipo_entrega: tipo,
          direccion_entrega: direccion,
          notas,
          website,
          condicion_pago: tienda.usarPedidoCc ? condicion : 'contado',
          items: cart.map((it) => ({
            variante_id: it.varianteId,
            cantidad: it.qty,
            pack_id: it.packId ?? null,
          })),
        }),
      })
      const json = (await res.json()) as { ok?: boolean; numero?: number; waUrl?: string; error?: string }
      if (!res.ok || !json.waUrl || !json.numero) {
        setError(json.error ?? 'No se pudo crear el pedido')
        return
      }
      const payload: PedidoEnviadoPayload = {
        slug,
        numero: json.numero,
        waUrl: json.waUrl,
      }
      sessionStorage.setItem(PEDIDO_ENVIADO_KEY, JSON.stringify(payload))
      vaciarCarrito(slug)
      window.dispatchEvent(new Event('cvalle-cat-cart'))
      router.push(`/c/${slug}/pedido-enviado`)
    })
  }

  const totalContado = totalCarrito(items)
  const totalCc = tienda.usarPedidoCc
    ? totalCarritoCc(items, tienda.recargoCcDefault)
    : totalContado
  const totalMostrado =
    tienda.usarPedidoCc && condicion === 'cuenta_corriente' ? totalCc : totalContado

  const opciones = [
    ...(tienda.catalogo_retiro
      ? [{ value: 'retiro', label: 'Retiro en el local', description: tienda.direccion ?? undefined }]
      : []),
    ...(tienda.catalogo_envio
      ? [{ value: 'envio', label: 'Envío a domicilio', description: 'Indicá la dirección' }]
      : []),
  ]

  if (!ready) return null

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-fg font-medium">Tu pedido está vacío</p>
        <LinkButton href={`/c/${slug}`} variant="secondary">
          Ver catálogo
        </LinkButton>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      {error && (
        <p className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
          {error}
        </p>
      )}

      <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">Tu pedido</h2>
          <LinkButton href={`/c/${slug}/carrito`} variant="ghost" size="sm">
            Editar pedido
          </LinkButton>
        </div>
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={claveLineaCarrito(it)} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block text-fg line-clamp-2 leading-snug">{it.nombre}</span>
                <span className="block text-xs text-fg-muted">
                  ×{it.qty}
                  {it.packLabel ? ` · ${it.packLabel}` : ''}
                </span>
              </span>
              <span className="tabular-nums shrink-0 text-right">
                {(it.precioLista ?? it.precio) > it.precio && (
                  <span className="block text-xs text-fg-muted line-through">
                    {formatARS((it.precioLista ?? it.precio) * it.qty)}
                  </span>
                )}
                <span className="font-medium">{formatARS(it.precio * it.qty)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm flex justify-between border-t border-border-subtle pt-2">
          <span className="text-fg-muted">Total mercadería</span>
          <span className="font-semibold tabular-nums">{formatARS(totalContado)}</span>
        </p>
      </section>

      <Input
        label="Tu nombre"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoComplete="name"
      />
      <Input
        label="WhatsApp / teléfono"
        required
        value={tel}
        onChange={(e) => setTel(e.target.value)}
        autoComplete="tel"
        inputMode="tel"
        hint="Para que el local te contacte"
      />

      {tienda.usarPedidoCc && (
        <RadioGroup
          name="condicion_pago"
          label="¿Cómo pagás?"
          value={condicion}
          onChange={(v) => setCondicion(v as CondicionPago)}
          options={[
            {
              value: 'contado',
              label: 'Contado',
              description: formatARS(totalContado),
            },
            {
              value: 'cuenta_corriente',
              label: 'A cuenta',
              description:
                totalCc > totalContado
                  ? `Con recargo · ${formatARS(totalCc)}`
                  : formatARS(totalCc),
            },
          ]}
        />
      )}

      {!(soloRetiro || soloEnvio) && (
        <RadioGroup
          name="tipo_entrega"
          label="¿Cómo lo querés?"
          value={tipo}
          onChange={(v) => setTipo(v as 'retiro' | 'envio')}
          options={opciones}
        />
      )}
      {(soloRetiro || soloEnvio) && (
        <p className="text-sm text-fg-muted">
          {soloEnvio ? 'Este pedido se entrega a domicilio.' : 'Este pedido se retira en el local.'}
        </p>
      )}

      {tipo === 'envio' && (
        <Textarea
          label="Dirección de entrega"
          required
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          hint="Calle, número, piso, localidad"
        />
      )}
      <Textarea
        label="Notas (opcional)"
        value={notas}
        maxLength={MAX_NOTAS}
        onChange={(e) => setNotas(e.target.value)}
      />

      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <p className="text-xs text-fg-subtle pb-32">
        El pedido se envía por WhatsApp al local. El pago se coordina ahí; no hay cobro online.
        {tienda.usarPedidoCc && condicion === 'cuenta_corriente'
          ? ' A cuenta aplica el recargo del local.'
          : ''}
      </p>

      <div className="fixed bottom-0 inset-x-0 z-(--z-nav) border-t border-border-default bg-surface/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto px-4 pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">
              {condicion === 'cuenta_corriente' ? 'Total a cuenta' : 'Total mercadería'}
            </span>
            <span className="font-semibold tabular-nums text-fg">{formatARS(totalMostrado)}</span>
          </div>
          <Button type="submit" className="w-full" isLoading={pending}>
            Enviar pedido por WhatsApp
          </Button>
        </div>
      </div>
    </form>
  )
}
