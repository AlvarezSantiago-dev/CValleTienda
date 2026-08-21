'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { formatARS } from '@/lib/format'
import { leerCarrito, totalCarrito, vaciarCarrito } from '@/lib/catalogo/carrito'
import { MAX_NOTAS, MIN_DIRECCION, PEDIDO_ENVIADO_KEY } from '@/lib/catalogo/const'
import type { CartItem, PedidoEnviadoPayload, TiendaCatalogoPublica } from '@/lib/catalogo/types'

export function CatalogoCheckout({
  slug,
  tienda,
}: {
  slug: string
  tienda: TiendaCatalogoPublica
}) {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const soloRetiro = tienda.catalogo_retiro && !tienda.catalogo_envio
  const soloEnvio = tienda.catalogo_envio && !tienda.catalogo_retiro
  const [tipo, setTipo] = useState<'retiro' | 'envio'>(soloEnvio ? 'envio' : 'retiro')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => {
    setItems(leerCarrito(slug))
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
          items: cart.map((it) => ({ variante_id: it.varianteId, cantidad: it.qty })),
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

  const opciones = [
    ...(tienda.catalogo_retiro
      ? [{ value: 'retiro', label: 'Retiro en el local', description: tienda.direccion ?? undefined }]
      : []),
    ...(tienda.catalogo_envio
      ? [{ value: 'envio', label: 'Envío a domicilio', description: 'Indicá la dirección' }]
      : []),
  ]

  return (
    <form onSubmit={enviar} className="space-y-5">
      {error && (
        <p className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
          {error}
        </p>
      )}
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
        hint="Para que el local te contacte"
      />

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

      <p className="text-sm flex justify-between">
        <span className="text-fg-muted">Total mercadería</span>
        <span className="font-semibold tabular-nums">{formatARS(totalCarrito(items))}</span>
      </p>
      <p className="text-xs text-fg-subtle">
        El pedido se envía por WhatsApp al local. El pago se coordina ahí; no hay cobro online.
      </p>
      <Button type="submit" className="w-full" isLoading={pending}>
        Enviar pedido por WhatsApp
      </Button>
    </form>
  )
}
