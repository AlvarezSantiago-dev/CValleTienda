import { listarVentas } from '@/lib/ventas/queries'
import { formatYmdLong } from '@/lib/datetime'
import { Pagination } from '@/components/ui/Pagination'
import { createClient } from '@/lib/supabase/server'
import { TablaVentas } from '@/components/ventas/TablaVentas'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface VentasPageProps {
  searchParams: Promise<{ page?: string; fecha?: string; q?: string }>
}

function isYmd(fecha?: string): fecha is string {
  return Boolean(fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha))
}

export default async function VentasPage({ searchParams }: VentasPageProps) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const pageSize = 20
  const fecha = sp.fecha?.trim() || ''
  const q = sp.q?.trim() || ''
  const fechaValida = isYmd(fecha) ? fecha : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
    : { data: null }
  const esCajero = perfil?.rol === 'vendedor'

  const { ventas, total, prefijo_ticket } = await listarVentas({
    page,
    pageSize,
    soloHoy: true,
    fecha: fecha || undefined,
    query: q || undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          fechaValida
            ? `Ventas del ${formatYmdLong(fechaValida)}`
            : esCajero
              ? 'Ventas de hoy'
              : 'Ventas'
        }
        description={
          fechaValida
            ? `Ventas registradas el ${formatYmdLong(fechaValida)}.`
            : esCajero
              ? 'Ventas registradas hoy en tu tienda.'
              : 'Historial de ventas registradas.'
        }
        className="mb-0"
      />

      <form
        method="get"
        action="/ventas"
        className="grid gap-3 sm:grid-cols-[1fr_240px_140px] items-end bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-4 shadow-xs"
      >
        <Input
          id="q"
          name="q"
          type="search"
          label="Buscar por ticket o comprobante"
          defaultValue={q}
          placeholder="Ej. 12, 1002, ticket, factura"
        />
        <Input id="fecha" name="fecha" type="date" label="Fecha" defaultValue={fecha} />
        <Button type="submit" className="w-full">
          Aplicar
        </Button>
      </form>

      <TablaVentas ventas={ventas} prefijoTicket={prefijo_ticket} />

      {!(ventas.length === 0 && page === 1) && (
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/ventas" />
      )}
    </div>
  )
}
