'use client'

import { useState, useTransition } from 'react'
import { actualizarRubroTienda } from '@/app/actions/configuracion'
import { TODOS_LOS_RUBROS, LABEL_RUBRO, CONFIG_RUBROS } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'

interface RubroFormProps {
  rubroActual: Rubro
}

export function RubroForm({ rubroActual }: RubroFormProps) {
  const [selected, setSelected] = useState<Rubro>(rubroActual)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (selected === rubroActual) {
      setSuccess(true)
      return
    }

    startTransition(async () => {
      const res = await actualizarRubroTienda(selected)
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido')
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-1">Tipo de negocio</p>
          <p className="text-[13px] text-gray-400 mb-4">
            Define los labels de variantes (ej. “Talla”/“Color”), las unidades de medida disponibles y las categorías que se precargaron al crear la tienda.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TODOS_LOS_RUBROS.map((rubro) => {
            const cfg = CONFIG_RUBROS[rubro]
            const isSelected = selected === rubro
            return (
              <button
                key={rubro}
                type="button"
                onClick={() => setSelected(rubro)}
                className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-lime-600 bg-lime-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{LABEL_RUBRO[rubro].split(' ')[0]}</span>
                <span className={`text-sm font-medium ${isSelected ? 'text-lime-700' : 'text-gray-800'}`}>
                  {LABEL_RUBRO[rubro].slice(LABEL_RUBRO[rubro].indexOf(' ') + 1)}
                </span>
                <span className="text-xs text-gray-500 leading-tight">{cfg.descripcion}</span>
              </button>
            )
          })}
        </div>

        {selected !== rubroActual && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
            <p>
              <strong>Atención:</strong> Al cambiar el rubro se actualizan los labels de variantes
              ({CONFIG_RUBROS[selected].labelVar1} / {CONFIG_RUBROS[selected].labelVar2})
              y se agregan automáticamente los {CONFIG_RUBROS[selected].labelVar1.toLowerCase()}s
              y {CONFIG_RUBROS[selected].labelVar2.toLowerCase()}s sugeridas del nuevo rubro.
            </p>
            <p>Los datos existentes (productos, variantes, ventas) no se modifican ni eliminan.</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Labels de variantes actuales</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Variante 1</p>
            <p className="text-sm font-medium text-gray-900">{CONFIG_RUBROS[selected].labelVar1}</p>
          </div>
          {CONFIG_RUBROS[selected].usarVar2 && (
            <div>
              <p className="text-xs text-gray-500">Variante 2</p>
              <p className="text-sm font-medium text-gray-900">{CONFIG_RUBROS[selected].labelVar2}</p>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Unidades de medida disponibles</p>
          <div className="flex flex-wrap gap-1">
            {CONFIG_RUBROS[selected].unidadesDisponibles.map((u) => (
              <span key={u} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {u}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-lime-50 border border-lime-200 px-4 py-3 text-sm text-lime-800">
          Rubro actualizado correctamente.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60 transition-colors"
        >
          {pending ? 'Guardando...' : 'Guardar rubro'}
        </button>
      </div>
    </form>
  )
}
