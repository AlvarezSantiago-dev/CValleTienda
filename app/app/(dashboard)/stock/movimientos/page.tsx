import Link from 'next/link'
import { listarMovimientos } from '@/lib/stock/queries'
import { MovimientosTabla } from '@/components/stock/MovimientosTabla'
import { Pagination } from '@/components/ui/Pagination'
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

export default async function MovimientosPage({
  searchParams,
}: MovimientosPageProps) {
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/stock" className="text-sm text-lime-700 hover:text-lime-800 hover:underline">
            ← Volver a stock
          </Link>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-1">
            Movimientos de stock
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            Historial de auditoría — entradas, ajustes, ventas y devoluciones.
          </p>
        </div>
      </div>

      <form
        method="GET"
        className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-1">
            Tipo
          </label>
          <select
            name="tipo"
            defaultValue={sp.tipo ?? ''}
            className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
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
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-1">
            Desde
          </label>
          <input
            type="date"
            name="desde"
            defaultValue={sp.desde ?? ''}
            className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-1">
            Hasta
          </label>
          <input
            type="date"
            name="hasta"
            defaultValue={sp.hasta ?? ''}
            className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
          />
        </div>
        <div className="flex gap-2">
          {sp.varianteId && (
            <input type="hidden" name="varianteId" value={sp.varianteId} />
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-[#0A0A0A] text-white text-sm font-semibold hover:bg-gray-800"
          >
            Filtrar
          </button>
          <Link
            href="/stock/movimientos"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {sp.varianteId && (
        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Mostrando movimientos de una variante específica.{' '}
          <Link
            href="/stock/movimientos"
            className="text-lime-700 hover:underline"
          >
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
