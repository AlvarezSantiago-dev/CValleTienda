'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SesionListItem } from '@/lib/caja/queries'
import type { ResumenMesCaja } from '@/lib/caja/queries'
import { nombreUsuario } from '@/lib/caja/types'
import { formatDateTime, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { cn } from '@/components/ui/cn'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function parseMes(mes: string): { anio: number; mes: number } {
  const [a, m] = mes.split('-').map(Number)
  return { anio: a, mes: m }
}

function mesLabel(mesStr: string): string {
  const { anio, mes } = parseMes(mesStr)
  return formatDate(`${anio}-${String(mes).padStart(2, '0')}-01T12:00:00-03:00`, {
    month: 'long',
    year: 'numeric',
  })
}

interface Props {
  sesiones: SesionListItem[]
  resumen: ResumenMesCaja
  mesActual: string
  mesesDisponibles: string[]
}

function EstadoBadge({ s }: { s: SesionListItem }) {
  if (s.estado === 'abierta') {
    return <Badge variant="brand">Abierta</Badge>
  }
  if (s.tipo_cierre === 'emergencia') {
    return (
      <Badge variant="warning">
        <AlertTriangle size={12} aria-hidden />
        Emergencia
      </Badge>
    )
  }
  return <Badge variant="neutral">Cerrada</Badge>
}

function DifEfectivo({ n }: { n: number | null | undefined }) {
  if (n == null) return <span className="text-fg-subtle">—</span>
  return (
    <span
      className={cn(
        'font-semibold font-mono tabular-nums',
        n === 0
          ? 'text-success-soft-fg'
          : n > 0
            ? 'text-fg'
            : 'text-danger-soft-fg'
      )}
    >
      {n > 0 ? '+' : ''}
      {formatARS(n)}
    </span>
  )
}

export function HistorialCajaMes({ sesiones, resumen, mesActual, mesesDisponibles }: Props) {
  const router = useRouter()

  const idxActual = mesesDisponibles.indexOf(mesActual)
  const mesSiguiente = idxActual > 0 ? mesesDisponibles[idxActual - 1] : null
  const mesAnterior = idxActual < mesesDisponibles.length - 1 ? mesesDisponibles[idxActual + 1] : null

  function navegar(mes: string) {
    router.push(`/caja?tab=historial&mes=${mes}`)
  }

  const columns: DataTableColumn<SesionListItem>[] = [
    {
      id: 'apertura',
      header: 'Apertura',
      mobilePrimary: true,
      cell: (s) => formatDateTime(s.fecha_apertura),
    },
    {
      id: 'cierre',
      header: 'Cierre',
      cell: (s) => (s.fecha_cierre ? formatDateTime(s.fecha_cierre) : '—'),
    },
    {
      id: 'usuario',
      header: 'Usuario',
      cell: (s) => nombreUsuario(s.usuario_apertura) ?? '—',
    },
    {
      id: 'ventas',
      header: 'Ventas',
      align: 'right',
      cell: (s) => (
        <span className="font-mono tabular-nums">
          {s.total_ventas_cantidad}{' '}
          <span className="text-fg-subtle">({formatARS(s.total_ventas_monto)})</span>
        </span>
      ),
    },
    {
      id: 'dif',
      header: 'Diferencia efectivo',
      align: 'right',
      cell: (s) => <DifEfectivo n={s.diferencia_efectivo} />,
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (s) => <EstadoBadge s={s} />,
    },
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[15px] font-semibold text-fg">Historial de sesiones</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => mesAnterior && navegar(mesAnterior)}
            disabled={!mesAnterior}
            className="h-11 w-11 flex items-center justify-center rounded-full border border-border-default text-fg-muted hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer focus-ring"
            title="Mes anterior"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-fg capitalize px-2">
            {mesLabel(mesActual)}
          </span>
          <button
            type="button"
            onClick={() => mesSiguiente && navegar(mesSiguiente)}
            disabled={!mesSiguiente}
            className="h-11 w-11 flex items-center justify-center rounded-full border border-border-default text-fg-muted hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer focus-ring"
            title="Mes siguiente"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      {resumen.total_sesiones > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MesStat label="Sesiones" value={String(resumen.total_sesiones)} />
          <MesStat label="Ventas" value={String(resumen.total_ventas_cantidad)} />
          <MesStat label="Facturado" value={formatARS(resumen.total_ventas_monto)} />
          <MesStat label="Neto del mes" value={formatARS(resumen.total_neto)} highlight />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={sesiones}
        rowKey={(s) => s.id}
        emptyTitle={`No hay turnos en ${mesLabel(mesActual)}`}
        emptyDescription="Cuando cierres cajas este mes, van a aparecer acá. Podés abrir un turno desde la pestaña Turno."
        onRowClick={(s) => router.push(`/caja/sesiones/${s.id}`)}
        rowActions={(s) => (
          <Link
            href={`/caja/sesiones/${s.id}`}
            className="text-xs font-medium text-fg-brand hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver →
          </Link>
        )}
      />
    </section>
  )
}

function MesStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border px-4 py-3',
        highlight
          ? 'border-primary-border bg-primary-soft'
          : 'border-border-subtle bg-surface shadow-xs'
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">{label}</p>
      <p
        className={cn(
          'text-[15px] font-semibold font-mono tabular-nums mt-0.5',
          highlight ? 'text-primary-soft-fg' : 'text-fg'
        )}
      >
        {value}
      </p>
    </div>
  )
}
