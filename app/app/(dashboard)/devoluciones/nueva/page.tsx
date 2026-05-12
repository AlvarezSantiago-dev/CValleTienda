import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { obtenerVentaParaDevolucion } from '@/lib/ventas/queries'
import { listarMetodosPago } from '@/lib/configuracion/queries'
import { DevolucionForm } from '@/components/devoluciones/DevolucionForm'
import { formatARS, formatDateTime } from '@/lib/format'

interface NuevaDevolucionPageProps {
  searchParams: Promise<{ venta_id?: string }>
}

export default async function NuevaDevolucionPage({
  searchParams,
}: NuevaDevolucionPageProps) {
  const { venta_id } = await searchParams
  if (!venta_id) {
    redirect('/ventas')
  }

  const venta = await obtenerVentaParaDevolucion(venta_id)
  if (!venta) notFound()

  const metodos = await listarMetodosPago(true)

  const sinSaldo = venta.total_disponible_devolver === 0

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/ventas/${venta.id}`}
          className="text-sm text-lime-700 hover:text-lime-800 hover:underline"
        >
          ← Volver a venta #{venta.numero_ticket}
        </Link>
        <h1 className="mt-2 text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
          Nueva devolución — Venta #{venta.numero_ticket}
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          {formatDateTime(venta.created_at)} · Total venta {formatARS(venta.total)}
          {venta.cliente_nombre && ` · Cliente: ${venta.cliente_nombre}`}
        </p>
      </div>

      {sinSaldo ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-700 font-medium">
            Esta venta ya fue devuelta en su totalidad.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            No queda nada por devolver.
          </p>
        </div>
      ) : metodos.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-900">
          No tenés métodos de pago activos configurados. Necesitás al menos uno para
          poder registrar el egreso de la devolución.{' '}
          <Link href="/configuracion" className="font-medium underline">
            Ir a configuración →
          </Link>
        </div>
      ) : (
        <DevolucionForm venta={venta} metodos={metodos} />
      )}
    </div>
  )
}
