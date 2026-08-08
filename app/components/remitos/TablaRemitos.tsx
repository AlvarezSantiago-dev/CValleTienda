'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import type { RemitoListItem } from '@/lib/remitos/queries'
import { formatDate } from '@/lib/format'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  borrador: 'neutral',
  emitido: 'info',
  entregado: 'success',
  anulado: 'danger',
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  emitido: 'Emitido',
  entregado: 'Entregado',
  anulado: 'Anulado',
}

interface Props {
  remitos: RemitoListItem[]
}

export function TablaRemitos({ remitos }: Props) {
  const router = useRouter()

  if (remitos.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={20} aria-hidden />}
        title="Todavía no hay remitos"
        description="Creá el primer remito de entrega desde acá o desde el detalle de una venta."
        cta={{ label: 'Crear remito', href: '/remitos/nuevo' }}
      />
    )
  }

  const columns: DataTableColumn<RemitoListItem>[] = [
    {
      id: 'numero',
      header: 'N°',
      mobilePrimary: true,
      cell: (r) => (
        <span className="font-semibold text-fg">#{String(r.numero_remito).padStart(4, '0')}</span>
      ),
    },
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (r) => formatDate(r.created_at),
    },
    {
      id: 'destinatario',
      header: 'Destinatario',
      cell: (r) => <span className="font-medium text-fg">{r.destinatario}</span>,
    },
    {
      id: 'direccion',
      header: 'Dirección',
      cell: (r) => (
        <span className="text-fg-muted max-w-[160px] truncate block">
          {r.direccion_entrega ?? '—'}
        </span>
      ),
    },
    {
      id: 'venta',
      header: 'Venta',
      cell: (r) =>
        r.venta_numero ? (
          <Link
            href={`/ventas/${r.venta_numero}`}
            className="text-fg-brand hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            #{r.venta_numero}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      id: 'entrega',
      header: 'Entrega',
      cell: (r) => (r.fecha_entrega ? formatDate(r.fecha_entrega) : '—'),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (r) => (
        <Badge variant={ESTADO_VARIANT[r.estado] ?? 'neutral'}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </Badge>
      ),
    },
    {
      id: 'cobro',
      header: 'Cobro',
      cell: (r) => {
        if (r.tipo !== 'cuenta_corriente') return <span className="text-fg-subtle">—</span>
        if (r.estado_cobro === 'cobrado') return <Badge variant="success">Cobrado</Badge>
        const debe = (r.monto_total ?? 0) - (r.monto_cobrado ?? 0)
        return (
          <Badge variant="warning">
            Debe $
            {debe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </Badge>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={remitos}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/remitos/${r.id}`)}
      rowActions={(r) => (
        <Link
          href={`/remitos/${r.id}`}
          className="text-xs font-medium text-fg-brand hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Ver →
        </Link>
      )}
    />
  )
}
