'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reabrirCaja } from '@/app/actions/caja'

interface Props {
  sesionId: string
}

export function ReopenCajaButton({ sesionId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await reabrirCaja(sesionId)
      if (!res.ok) {
        setError(res.error ?? 'Error al reabrir la caja')
        return
      }
      router.push('/caja')
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setMostrar(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
      >
        ↩ Anular cierre y reabrir
      </button>

      {mostrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Anular cierre y reabrir caja</h3>
              <p className="text-sm text-gray-500 mt-1">
                Esto eliminará el cierre registrado y dejará la sesión abierta nuevamente, como si no se hubiera cerrado.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Solo disponible mientras no haya otra sesión abierta. Usalo únicamente si el cierre fue un error.
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setMostrar(false); setError(null) }}
                disabled={isPending}
                className="h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="h-10 px-4 text-sm font-semibold text-white bg-amber-600 rounded-full hover:bg-amber-700 disabled:opacity-60"
              >
                {isPending ? 'Reabriendo…' : 'Confirmar reapertura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
