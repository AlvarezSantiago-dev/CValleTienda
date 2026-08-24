import { listarVentas } from '@/lib/ventas/queries'
import { formatYmdLong, hoyArgentinaYmd } from '@/lib/datetime'
import { Pagination } from '@/components/ui/Pagination'
import { createClient } from '@/lib/supabase/server'
import { TablaVentas } from '@/components/ventas/TablaVentas'
import { ResumenGananciaDia } from '@/components/ventas/ResumenGananciaDia'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { obtenerGananciaDia } from '@/lib/dashboard/queries'

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
  const hayFiltros = Boolean(q || fecha)
  const busquedaSinFecha = Boolean(q && !fechaValida)
  const ymdGanancia = fechaValida ?? (busquedaSinFecha ? null : hoyArgentinaYmd())

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
    : { data: null }
  const esCajero = perfil?.rol === 'vendedor'
  const verGanancia = !esCajero && ymdGanancia !== null

  const [{ ventas, total, prefijo_ticket }, ganancia] = await Promise.all([
    listarVentas({
      page,
      pageSize,
      soloHoy: true,
      fecha: fecha || undefined,
      query: q || undefined,
    }),
    verGanancia ? obtenerGananciaDia(ymdGanancia) : Promise.resolve(null),
  ])

  const titulo = fechaValida
    ? `Ventas del ${formatYmdLong(fechaValida)}`
    : busquedaSinFecha
      ? 'Búsqueda de ventas'
      : esCajero
        ? 'Ventas de hoy'
        : 'Ventas'

  const descripcion = fechaValida
    ? `Ventas registradas el ${formatYmdLong(fechaValida)}.`
    : busquedaSinFecha
      ? 'Tickets y comprobantes de cualquier día. Elegí una fecha si querés acotar.'
      : esCajero
        ? 'Ventas registradas hoy en tu tienda.'
        : 'Ventas de hoy. Cambiá la fecha o buscá un ticket de otro día.'

  return (
    <div className="space-y-6">
      <PageHeader title={titulo} description={descripcion} className="mb-0" />

      <form
        method="get"
        action="/ventas"
        className="grid gap-3 sm:grid-cols-[1fr_240px_auto] items-end bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-4 shadow-xs"
      >
        <Input
          id="q"
          name="q"
          type="search"
          label="Buscar por ticket o comprobante"
          defaultValue={q}
          placeholder="Ej. 12, 1002, ticket, factura"
          hint="No hace falta elegir fecha: busca en todos los días."
        />
        <Input id="fecha" name="fecha" type="date" label="Fecha" defaultValue={fecha} />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1 sm:flex-none">
            Aplicar
          </Button>
          {hayFiltros && (
            <LinkButton href="/ventas" variant="ghost">
              Limpiar
            </LinkButton>
          )}
        </div>
      </form>

      {ganancia && ymdGanancia && (
        <ResumenGananciaDia
          ymd={ymdGanancia}
          data={ganancia}
          esHoy={ymdGanancia === hoyArgentinaYmd()}
        />
      )}

      <TablaVentas ventas={ventas} prefijoTicket={prefijo_ticket} />

      {!(ventas.length === 0 && page === 1) && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/ventas"
          searchParams={{ q: q || undefined, fecha: fecha || undefined }}
        />
      )}
    </div>
  )
}
