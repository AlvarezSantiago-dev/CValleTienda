import Link from 'next/link'
import { listarPedidosCatalogo } from '@/lib/catalogo/queries-interno'
import { TablaPedidos } from '@/components/pedidos/TablaPedidos'
import { PageHeader } from '@/components/ui/PageHeader'
import type { FiltroPedidos } from '@/lib/catalogo/types'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const FILTROS: { id: FiltroPedidos; label: string }[] = [
  { id: 'activos', label: 'Activos' },
  { id: 'nuevos', label: 'Nuevos' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'convertidos', label: 'Ventas' },
  { id: 'cancelados', label: 'Cancelados' },
  { id: 'todos', label: 'Todos' },
]

interface Props {
  searchParams: Promise<{ f?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const sp = await searchParams
  const filtro = (FILTROS.some((x) => x.id === sp.f) ? sp.f : 'activos') as FiltroPedidos
  const pedidos = await listarPedidosCatalogo(filtro)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Inbox del catálogo. Al aceptar se emite el remito; el stock se descuenta al confirmar el remito y cobrar."
        className="mb-0"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'activos' ? '/pedidos' : `/pedidos?f=${f.id}`}
            className={cn(
              'h-8 px-3 rounded-[var(--radius-full)] border text-sm',
              filtro === f.id
                ? 'border-primary bg-primary-soft text-fg-brand'
                : 'border-border-default text-fg-muted hover:text-fg'
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <TablaPedidos pedidos={pedidos} />
    </div>
  )
}
