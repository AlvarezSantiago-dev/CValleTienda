'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Boxes } from 'lucide-react'
import type { ProductoListItem } from '@/lib/productos/queries'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/components/ui/cn'
import { useRubro } from '@/components/layout/RubroProvider'
import { LinkButton } from '@/components/ui/Button'

interface ListaProductosProps {
  items: ProductoListItem[]
}

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function ListaProductos({ items }: ListaProductosProps) {
  const router = useRouter()
  const { rubro } = useRubro()

  if (items.length === 0) {
    return (
      <EmptyState
        title="No hay productos todavía"
        description={
          rubro === 'ropa'
            ? 'Empezá con Carga express: nombre, colores, talles y stock en una sola pantalla.'
            : 'Empezá creando tu primer producto. Podés agregar variantes con opciones personalizables y código de barras propio.'
        }
        cta={
          rubro === 'ropa'
            ? { label: 'Carga express', href: '/productos/carga-express' }
            : { label: 'Crear producto', href: '/productos/nuevo' }
        }
        action={
          rubro === 'ropa' ? (
            <LinkButton href="/productos/nuevo" variant="ghost" size="sm" className="mt-2">
              O formulario clásico
            </LinkButton>
          ) : undefined
        }
      />
    )
  }

  const columns: DataTableColumn<ProductoListItem>[] = [
    {
      id: 'imagen',
      header: '',
      mobile: false,
      className: 'w-14',
      cell: (p) =>
        p.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen_url}
            alt=""
            className="w-9 h-9 object-cover rounded-[var(--radius-md)] bg-surface-sunken"
          />
        ) : (
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-surface-sunken" />
        ),
    },
    {
      id: 'producto',
      header: 'Producto',
      mobilePrimary: true,
      cell: (p) => (
        <div>
          <Link
            href={`/productos/${p.id}`}
            className="font-medium text-fg hover:text-fg-brand"
            onClick={(e) => e.stopPropagation()}
          >
            {p.nombre}
          </Link>
          {p.codigo_base && (
            <div className="text-xs text-fg-muted font-mono">{p.codigo_base}</div>
          )}
          <div className="mt-0.5 flex flex-wrap gap-1">
            {p.pack_info && (
              <Badge variant="brand">
                <Package size={11} aria-hidden />
                Pack ×{p.pack_info.cantidad} — {formatARS(p.pack_info.precio)}
              </Badge>
            )}
            {p.es_kit && (
              <Badge variant="info">
                <Boxes size={11} aria-hidden />
                Kit
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'categoria',
      header: 'Categoría',
      cell: (p) => p.categoria?.nombre ?? '—',
    },
    {
      id: 'precio',
      header: 'Precio venta',
      align: 'right',
      cell: (p) => (
        <span className="font-mono tabular-nums text-fg-brand font-semibold">
          {formatARS(p.precio_venta)}
        </span>
      ),
    },
    {
      id: 'variantes',
      header: 'Variantes',
      align: 'right',
      cell: (p) => <span className="font-mono tabular-nums">{p.variantes_count}</span>,
    },
    {
      id: 'stock',
      header: 'Stock total',
      align: 'right',
      cell: (p) => (
        <span
          className={cn(
            'font-mono tabular-nums font-medium',
            p.stock_total === 0 ? 'text-danger-soft-fg' : 'text-fg'
          )}
        >
          {p.stock_total}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(p) => p.id}
      onRowClick={(p) => router.push(`/productos/${p.id}`)}
      emptyTitle="No hay productos"
    />
  )
}
