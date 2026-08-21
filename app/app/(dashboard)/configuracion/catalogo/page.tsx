import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { CatalogoForm } from '@/components/configuracion/CatalogoForm'
import { obtenerConfigCatalogoTienda } from '@/lib/catalogo/queries-interno'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import { slugifyNombre } from '@/lib/catalogo/slug'

export const dynamic = 'force-dynamic'

export default async function ConfigCatalogoPage() {
  const [ctx, data] = await Promise.all([getContextoTienda(), obtenerConfigCatalogoTienda()])
  if (ctx && !puedeUsar(ctx.planEfectivo, 'catalogo_publico')) {
    return (
      <ConfiguracionShell title="Catálogo" description="Link público para que tus clientes pidan por WhatsApp.">
        <UpgradeBanner feature="catalogo_publico" />
      </ConfiguracionShell>
    )
  }
  if (!data) {
    return (
      <ConfiguracionShell title="Catálogo">
        <p className="text-sm text-fg-muted">No se pudo cargar la tienda.</p>
      </ConfiguracionShell>
    )
  }

  const row = data as {
    nombre: string
    direccion: string | null
    catalogo_slug: string | null
    catalogo_activo: boolean
    whatsapp_pedidos: string | null
    catalogo_retiro: boolean
    catalogo_envio: boolean
    catalogo_mensaje_bienvenida: string | null
  }

  return (
    <ConfiguracionShell
      title="Catálogo"
      description="Compartí el link con tus clientes. El pedido llega por WhatsApp y queda en Pedidos."
    >
      <CatalogoForm
        initial={{
          nombre: row.nombre,
          direccion: row.direccion,
          catalogo_slug: row.catalogo_slug || slugifyNombre(row.nombre),
          catalogo_activo: row.catalogo_activo,
          whatsapp_pedidos: row.whatsapp_pedidos,
          catalogo_retiro: row.catalogo_retiro,
          catalogo_envio: row.catalogo_envio,
          catalogo_mensaje_bienvenida: row.catalogo_mensaje_bienvenida,
        }}
      />
    </ConfiguracionShell>
  )
}
