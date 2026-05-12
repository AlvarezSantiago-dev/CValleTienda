import { listarClientes } from '@/lib/clientes/queries'
import { TablaClientes } from '@/components/clientes/TablaClientes'
import { FiltrosClientes } from '@/components/clientes/FiltrosClientes'
import { Pagination } from '@/components/ui/Pagination'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'

interface ClientesPageProps {
  searchParams: Promise<{
    q?: string
    inactivos?: string
    page?: string
  }>
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const { items, total, pageSize } = await listarClientes({
    search: sp.q,
    incluirInactivos: sp.inactivos === '1',
    page,
  })

  const sinFiltros = !sp.q && !sp.inactivos

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Clientes</h1>
          <p className="text-[13px] text-gray-400 mt-1">
            CRM básico — alta, búsqueda, edición e historial de compras.
          </p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="inline-flex items-center h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full transition-colors flex-shrink-0"
        >
          + Nuevo cliente
        </Link>
      </div>

      <FiltrosClientes />

      {total === 0 && sinFiltros ? (
        <EmptyState
          title="Aún no tenés clientes"
          description="Cargá tu primer cliente para empezar a registrar compras y construir tu CRM."
          cta={{ label: 'Crear cliente', href: '/clientes/nuevo' }}
        />
      ) : (
        <TablaClientes items={items} />
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/clientes"
        searchParams={{ q: sp.q, inactivos: sp.inactivos }}
      />
    </div>
  )
}
