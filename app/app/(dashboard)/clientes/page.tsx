import { listarClientes } from '@/lib/clientes/queries'
import { getContextoTienda } from '@/lib/supabase/context'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'
import { TablaClientes } from '@/components/clientes/TablaClientes'
import { FiltrosClientes } from '@/components/clientes/FiltrosClientes'
import { Pagination } from '@/components/ui/Pagination'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Users } from 'lucide-react'

interface ClientesPageProps {
  searchParams: Promise<{
    q?: string
    inactivos?: string
    deuda?: string
    page?: string
  }>
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const ctx = await getContextoTienda()
  const config = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)
  const soloDeuda = sp.deuda === '1'

  const { items, total, pageSize } = await listarClientes({
    search: sp.q,
    incluirInactivos: sp.inactivos === '1',
    soloDeuda,
    page,
  })

  const mostrarDeuda = config.usarPedidoCc || items.some((c) => c.saldo_cc > 0)
  const sinFiltros = !sp.q && !sp.inactivos && !soloDeuda

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Clientes"
        description="CRM básico — alta, búsqueda, edición e historial de compras."
        actions={
          <Link
            href="/clientes/nuevo"
            className="inline-flex items-center h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] transition-colors shrink-0"
          >
            + Nuevo cliente
          </Link>
        }
      />

      <FiltrosClientes />

      {total === 0 && sinFiltros ? (
        <EmptyState
          icon={<Users size={20} aria-hidden />}
          title="Aún no tenés clientes"
          description="Cargá tu primer cliente para empezar a registrar compras y construir tu CRM."
          cta={{ label: 'Crear cliente', href: '/clientes/nuevo' }}
        />
      ) : (
        <TablaClientes items={items} mostrarDeuda={mostrarDeuda} />
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/clientes"
        searchParams={{ q: sp.q, inactivos: sp.inactivos, deuda: sp.deuda }}
      />
    </div>
  )
}
