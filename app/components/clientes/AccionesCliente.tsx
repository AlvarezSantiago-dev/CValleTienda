'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { desactivarCliente, reactivarCliente } from '@/app/actions/clientes'

interface AccionesClienteProps {
  id: string
  activo: boolean
}

export function AccionesCliente({ id, activo }: AccionesClienteProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const confirmar = activo
      ? '¿Desactivar este cliente? Se conserva el historial pero no aparecerá en búsquedas.'
      : '¿Reactivar este cliente?'
    if (!window.confirm(confirmar)) return
    startTransition(async () => {
      const res = activo ? await desactivarCliente(id) : await reactivarCliente(id)
      if (!res.ok) {
        window.alert(res.error ?? 'Error desconocido')
        return
      }
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={activo
        ? 'h-10 px-4 text-sm font-medium border border-red-200 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-60'
        : 'h-10 px-4 text-sm font-medium border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 disabled:opacity-60'
      }
    >
      {isPending ? 'Procesando…' : activo ? 'Desactivar' : 'Reactivar'}
    </button>
  )
}
