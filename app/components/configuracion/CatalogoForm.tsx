'use client'

import { useMemo, useState, useTransition } from 'react'
import { Switch } from '@/components/ui/Switch'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { guardarConfigCatalogo } from '@/app/actions/catalogo'
import { slugifyNombre } from '@/lib/catalogo/slug'
import { normalizarWhatsappAR } from '@/lib/catalogo/whatsapp'

export interface CatalogoFormInitial {
  nombre: string
  direccion: string | null
  catalogo_slug: string | null
  catalogo_activo: boolean
  whatsapp_pedidos: string | null
  catalogo_retiro: boolean
  catalogo_envio: boolean
  catalogo_mensaje_bienvenida: string | null
}

export function CatalogoForm({ initial }: { initial: CatalogoFormInitial }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [nombre, setNombre] = useState(initial.nombre)
  const [direccion, setDireccion] = useState(initial.direccion ?? '')
  const [slug, setSlug] = useState(initial.catalogo_slug || slugifyNombre(initial.nombre))
  const [activo, setActivo] = useState(initial.catalogo_activo)
  const [wa, setWa] = useState(initial.whatsapp_pedidos ?? '')
  const [retiro, setRetiro] = useState(initial.catalogo_retiro)
  const [envio, setEnvio] = useState(initial.catalogo_envio)
  const [mensaje, setMensaje] = useState(initial.catalogo_mensaje_bienvenida ?? '')
  const [copiado, setCopiado] = useState(false)

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? '')
  const url = useMemo(() => {
    const host = origin || 'https://app.cvalletienda.com'
    return slug ? `${host}/c/${slug}` : ''
  }, [origin, slug])

  const waOk = Boolean(normalizarWhatsappAR(wa))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    start(async () => {
      const res = await guardarConfigCatalogo({
        nombre_publico: nombre,
        direccion_retiro: direccion,
        catalogo_slug: slug,
        catalogo_activo: activo,
        whatsapp_pedidos: wa,
        catalogo_retiro: retiro,
        catalogo_envio: envio,
        catalogo_mensaje_bienvenida: mensaje,
      })
      setMsg(
        res.ok
          ? { tipo: 'ok', texto: 'Catálogo guardado' }
          : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  async function copiar() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {msg && (
        <div
          className={`rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
            msg.tipo === 'ok'
              ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
              : 'bg-danger-soft text-red-800 border border-danger-border'
          }`}
        >
          {msg.texto}
        </div>
      )}

      <Switch
        checked={activo}
        onChange={setActivo}
        disabled={!waOk || !slug}
        label="Catálogo activo"
        description="Si está apagado, el link muestra que no está disponible. Necesitás WhatsApp y un link."
      />

      <Input
        label="Nombre público"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />
      <Input
        label="Dirección de retiro"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        hint="Se muestra a quienes eligen retirar en el local"
      />
      <Input
        label="Link del catálogo"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        hint="Solo letras, números y guiones. No cambia solo si editás el nombre."
      />

      <div className="flex flex-wrap items-center gap-2">
        <code className="text-xs bg-surface-sunken border border-border-subtle rounded-[var(--radius-md)] px-2 py-1 break-all">
          {url || '—'}
        </code>
        <Button type="button" variant="secondary" size="sm" onClick={copiar} disabled={!slug}>
          {copiado ? 'Copiado' : 'Copiar link'}
        </Button>
        {activo && slug && (
          <a
            href={`/c/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-fg-brand"
          >
            Ver catálogo
          </a>
        )}
      </div>

      <Input
        label="WhatsApp para pedidos"
        value={wa}
        onChange={(e) => setWa(e.target.value)}
        placeholder="299 123-4567"
        hint="Se guarda con 549… para wa.me. No uses el número de CValle."
      />

      <div className="space-y-3">
        <p className="text-xs font-medium text-fg-muted">Entrega</p>
        <Switch checked={retiro} onChange={setRetiro} label="Retiro en el local" />
        <Switch checked={envio} onChange={setEnvio} label="Envío a domicilio" />
      </div>

      <Textarea
        label="Mensaje de bienvenida (opcional)"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
      />

      <p className="text-xs text-fg-subtle">
        Los productos aparecen solo si los marcás en Productos (apagado por defecto). El stock se
        descuenta cuando confirmás el envío o retiro desde Pedidos, no cuando el cliente encarga.
      </p>

      <div className="flex justify-end">
        <Button type="submit" isLoading={pending}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
