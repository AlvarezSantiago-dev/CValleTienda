'use client'

import { usePlan } from '@/components/layout/PlanProvider'

export function AvisoAccesoPorVencer() {
  const { estadoAcceso, diasAcceso, acceso_hasta } = usePlan()

  if (estadoAcceso !== 'por_vencer' || diasAcceso <= 0) return null

  const fecha = acceso_hasta
    ? new Date(acceso_hasta).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="mx-4 md:mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-900">
      <strong className="font-semibold">Tu acceso vence en {diasAcceso} día{diasAcceso === 1 ? '' : 's'}</strong>
      {fecha ? <> ({fecha}).</> : '.'}
      {' '}
      Renová la suscripción para no perder el acceso al sistema.
    </div>
  )
}
