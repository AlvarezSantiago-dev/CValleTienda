'use client'

import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function VentaDetalleError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[VentaDetalle] error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
      <div className="text-4xl">⚠️</div>
      <h1 className="text-xl font-bold text-gray-900">No se pudo cargar el detalle de la venta</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        Hubo un error al cargar esta página. Podés intentar de nuevo o volver al listado de ventas.
      </p>
      {error?.digest && (
        <p className="text-xs text-gray-400 font-mono">Código: {error.digest}</p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          Reintentar
        </button>
        <Link
          href="/ventas"
          className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-lime-600 hover:bg-lime-700 text-sm font-medium text-white"
        >
          ← Volver a Ventas
        </Link>
      </div>
    </div>
  )
}
