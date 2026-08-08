import Link from 'next/link'
import { listarMovimientos } from '@/lib/stock/queries'
import { MovimientosTabla } from '@/components/stock/MovimientosTabla'
import { Pagination } from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Button, LinkButton } from '@/components/ui/Button'
import type { TipoMovimientoStock } from '@/types/database'

const TIPOS: TipoMovimientoStock[] = [
  'entrada',
  'salida',
  'ajuste',
  'devolucion',
  'inicial',
]

interface MovimientosPageProps {
  searchParams: Promise<{
    tipo?: string
    varianteId?: string
    desde?: string
    hasta?: string
    page?: string
  }>
}

export default async function MovimientosPage({ searchParams }: MovimientosPageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const tipoValido = TIPOS.includes(sp.tipo as TipoMovimientoStock)
    ? (sp.tipo as TipoMovimientoStock)
    : undefined

  const { items, total, pageSize } = await listarMovimientos({
    tipo: tipoValido,
    varianteId: sp.varianteId,
    desde: sp.desde ? new Date(sp.desde).toISOString() : undefined,
    hasta: sp.hasta ? new Date(`${sp.hasta}T23:59:59`).toISOString() : undefined,
    page,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos de stock"
        breadcrumb={<Breadcrumbs />}
        description="Historial de auditoría — entradas, ajustes, ventas y devoluciones."
        className="mb-0"
      />

      <form
        method="GET"
        className="bg-surface rounded-[var(--radius-lg)] border border-border-subtle p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end shadow-xs"
      >
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle mb-1">
            Tipo
          </label>
          <select
            name="tipo"
            defaultValue={sp.tipo ?? ''}
            className="w-full h-control-md rounded-[var(--radius-md)] border border-border-default bg-surface px-3 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
          >
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle mb-1">
            Desde
          </label>
          <input
            type="date"
            name="desde"
            defaultValue={sp.desde ?? ''}
            className="w-full h-control-md rounded-[var(--radius-md)] border border-border-default bg-surface px-3 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle mb-1">
            Hasta
          </label>
          <input
            type="date"
            name="hasta"
            defaultValue={sp.hasta ?? ''}
            className="w-full h-control-md rounded-[var(--radius-md)] border border-border-default bg-surface px-3 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
          />
        </div>
        <div className="flex gap-2">
          {sp.varianteId && <input type="hidden" name="varianteId" value={sp.varianteId} />}
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          <LinkButton href="/stock/movimientos" variant="outline" size="sm">
            Limpiar
          </LinkButton>
        </div>
      </form>

      {sp.varianteId && (
        <div className="text-sm text-fg-muted bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-3 py-2">
          Mostrando movimientos de una variante específica.{' '}
          <Link href="/stock/movimientos" className="text-fg-brand hover:underline font-medium">
            Ver todos
          </Link>
        </div>
      )}

      <MovimientosTabla items={items} />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/stock/movimientos"
        searchParams={{
          tipo: sp.tipo,
          varianteId: sp.varianteId,
          desde: sp.desde,
          hasta: sp.hasta,
        }}
      />
    </div>
  )
}
