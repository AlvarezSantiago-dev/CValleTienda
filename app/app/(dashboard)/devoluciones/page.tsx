import { listarDevoluciones } from '@/lib/devoluciones/queries'
import { obtenerPrefijoTicket } from '@/lib/ventas/queries'
import { TablaDevoluciones } from '@/components/devoluciones/TablaDevoluciones'
import { FiltrosDevoluciones } from '@/components/devoluciones/FiltrosDevoluciones'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import type { TipoDevolucion } from '@/types/database'

interface DevolucionesPageProps {
  searchParams: Promise<{
    q?: string
    desde?: string
    hasta?: string
    tipo?: string
    page?: string
  }>
}

export default async function DevolucionesPage({ searchParams }: DevolucionesPageProps) {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'devoluciones')) {
    return <UpgradeBanner feature="devoluciones" />
  }
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const tipo: TipoDevolucion | undefined =
    sp.tipo === 'total' || sp.tipo === 'parcial' ? sp.tipo : undefined

  const [{ items, total, pageSize }, prefijoTicket] = await Promise.all([
    listarDevoluciones({
      search: sp.q,
      desde: sp.desde,
      hasta: sp.hasta,
      tipo,
      page,
    }),
    obtenerPrefijoTicket(),
  ])

  const sinFiltros = !sp.q && !sp.desde && !sp.hasta && !sp.tipo

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devoluciones"
        description="Historial de devoluciones registradas. Las devoluciones se crean desde el detalle de cada venta."
        className="mb-0"
      />

      <FiltrosDevoluciones />

      {total === 0 && sinFiltros ? (
        <EmptyState
          title="Sin devoluciones aún"
          description="Cuando un cliente devuelva algo, registralo desde la vista de la venta y lo verás acá."
        />
      ) : (
        <TablaDevoluciones items={items} prefijoTicket={prefijoTicket} />
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/devoluciones"
        searchParams={{ q: sp.q, desde: sp.desde, hasta: sp.hasta, tipo: sp.tipo }}
      />
    </div>
  )
}
