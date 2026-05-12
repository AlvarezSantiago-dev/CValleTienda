'use client'

import { LABEL_RUBRO } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'

interface Props {
  rubro: Rubro
}

export function DescargaTemplateCSV({ rubro }: Props) {
  const handleDescargar = () => {
    window.location.href = `/api/productos/template-csv?rubro=${rubro}`
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
      <div className="text-3xl shrink-0">📥</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-indigo-900">
          Plantilla para {LABEL_RUBRO[rubro]}
        </p>
        <p className="text-xs text-indigo-600 mt-0.5">
          Incluye las columnas y unidades de medida correctas para tu rubro.
        </p>
        <button
          type="button"
          onClick={handleDescargar}
          className="mt-3 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          Descargar plantilla CSV
        </button>
      </div>
    </div>
  )
}
