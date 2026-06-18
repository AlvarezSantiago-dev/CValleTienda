'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { mesLabelCorto } from '@/lib/reportes/parse-params'

interface GraficosMesSelectorProps {
  meses: number
  mesSeleccionado: string
  opciones: string[]
}

export function GraficosMesSelector({ meses, mesSeleccionado, opciones }: GraficosMesSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function onChange(mes: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('mes', mes)
    params.set('meses', String(meses))
    router.push(`/graficos?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">Mes:</span>
      <select
        value={mesSeleccionado}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-lime-500/40"
        aria-label="Seleccionar mes"
      >
        {opciones.map((m) => (
          <option key={m} value={m}>
            {mesLabelCorto(m)}
          </option>
        ))}
      </select>
    </div>
  )
}
