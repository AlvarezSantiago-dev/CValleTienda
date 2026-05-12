'use client'

import { useState, useTransition } from 'react'
import { completarOnboarding, type DatosOnboarding } from '@/app/actions/onboarding'
import { LABEL_RUBRO, getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'

interface Props {
  tiendaNombre: string
  rubro: Rubro
  prefijoActual: string
}

const TOTAL_PASOS = 4

export function OnboardingWizard({ tiendaNombre, rubro, prefijoActual }: Props) {
  const config = getConfigRubro(rubro)
  const [paso, setPaso] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [datos, setDatos] = useState<DatosOnboarding>({
    razon_social: '',
    cuit: '',
    telefono: '',
    prefijo_ticket: prefijoActual || 'T',
    texto_pie: '¡Gracias por su compra!',
  })

  const actualizar = (campo: keyof DatosOnboarding, valor: string) =>
    setDatos((d) => ({ ...d, [campo]: valor }))

  const siguiente = () => setPaso((p) => Math.min(p + 1, TOTAL_PASOS))
  const anterior  = () => setPaso((p) => Math.max(p - 1, 1))

  const handleFinalizar = () => {
    startTransition(async () => {
      await completarOnboarding(datos)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: TOTAL_PASOS }, (_, i) => {
              const n = i + 1
              const activo = n === paso
              const completado = n < paso
              return (
                <div key={n} className="flex items-center flex-1">
                  <div className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                    activo    ? 'bg-indigo-600 text-white'              : '',
                    completado? 'bg-indigo-200 text-indigo-700'         : '',
                    !activo && !completado ? 'bg-gray-200 text-gray-400' : '',
                  ].join(' ')}>
                    {completado ? '✓' : n}
                  </div>
                  {n < TOTAL_PASOS && (
                    <div className={`flex-1 h-0.5 mx-1 ${completado ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 text-center">Paso {paso} de {TOTAL_PASOS}</p>
        </div>

        {/* Contenido del paso */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* PASO 1: Bienvenida */}
          {paso === 1 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h1 className="text-2xl font-bold text-gray-900">
                ¡Bienvenido a CValleTienda!
              </h1>
              <p className="text-gray-600">
                Tu tienda <strong>{tiendaNombre}</strong> fue creada exitosamente como{' '}
                <span className="text-indigo-600 font-medium">{LABEL_RUBRO[rubro]}</span>.
              </p>
              <div className="bg-indigo-50 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm font-semibold text-indigo-700">Con tu rubro tenés habilitado:</p>
                <ul className="text-sm text-indigo-600 space-y-1">
                  <li>✓ Variante principal: <strong>{config.labelVar1}</strong></li>
                  {config.usarVar2 && (
                    <li>✓ Variante secundaria: <strong>{config.labelVar2}</strong></li>
                  )}
                  <li>✓ Unidades: <strong>{config.unidadesDisponibles.join(', ')}</strong></li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                Configuremos tu tienda en 3 pasos rápidos (podés hacerlo después desde Configuración).
              </p>
            </div>
          )}

          {/* PASO 2: Datos fiscales */}
          {paso === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Datos de la tienda</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Se usan en los tickets y comprobantes. Podés editarlos después.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón social
                </label>
                <input
                  type="text"
                  value={datos.razon_social}
                  onChange={(e) => actualizar('razon_social', e.target.value)}
                  placeholder={tiendaNombre}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT
                </label>
                <input
                  type="text"
                  value={datos.cuit}
                  onChange={(e) => actualizar('cuit', e.target.value)}
                  placeholder="XX-XXXXXXXX-X"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de contacto
                </label>
                <input
                  type="text"
                  value={datos.telefono}
                  onChange={(e) => actualizar('telefono', e.target.value)}
                  placeholder="+54 9 299 XXX-XXXX"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-400">
                Todos los campos son opcionales en este momento.
              </p>
            </div>
          )}

          {/* PASO 3: Configuración de ticket */}
          {paso === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ticket de venta</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Personalizá cómo se verán los tickets impresos.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefijo del número de ticket
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={datos.prefijo_ticket}
                    onChange={(e) => actualizar('prefijo_ticket', e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="T"
                    maxLength={6}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-500">
                    → los tickets serán <strong className="font-mono">{datos.prefijo_ticket || 'T'}0001</strong>, <strong className="font-mono">{datos.prefijo_ticket || 'T'}0002</strong>…
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje al pie del ticket
                </label>
                <input
                  type="text"
                  value={datos.texto_pie}
                  onChange={(e) => actualizar('texto_pie', e.target.value)}
                  placeholder="¡Gracias por su compra!"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300 text-sm font-mono text-gray-600 space-y-0.5">
                <p className="text-center font-semibold">{datos.razon_social || tiendaNombre}</p>
                {datos.cuit && <p className="text-center text-xs">CUIT: {datos.cuit}</p>}
                <p className="text-center text-xs mt-1">──────────────</p>
                <p>Ticket #{datos.prefijo_ticket || 'T'}0001</p>
                <p className="text-xs text-gray-400">Item 1 .............. $100</p>
                <p className="text-xs text-gray-400">Item 2 .............. $200</p>
                <p className="text-center text-xs mt-1">──────────────</p>
                <p className="text-center text-xs">{datos.texto_pie}</p>
              </div>
            </div>
          )}

          {/* PASO 4: Listo */}
          {paso === 4 && (
            <div className="text-center space-y-5">
              <div className="text-5xl">🚀</div>
              <h2 className="text-2xl font-bold text-gray-900">¡Todo listo!</h2>
              <p className="text-gray-600">
                Tu tienda <strong>{tiendaNombre}</strong> está configurada y lista para usar.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">Próximos pasos sugeridos:</p>
                <ul className="space-y-1.5">
                  <li>📦 <a href="/productos/nuevo" className="text-indigo-600 hover:underline">Agregar tu primer producto</a></li>
                  <li>💰 <a href="/caja" className="text-indigo-600 hover:underline">Abrir la caja del día</a></li>
                  <li>🛒 <a href="/pos" className="text-indigo-600 hover:underline">Registrar tu primera venta</a></li>
                  <li>⚙️ <a href="/configuracion" className="text-indigo-600 hover:underline">Configurar métodos de pago y más</a></li>
                </ul>
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="mt-8 flex justify-between items-center">
            {paso > 1 ? (
              <button
                type="button"
                onClick={anterior}
                disabled={isPending}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                ← Atrás
              </button>
            ) : (
              <div />
            )}

            {paso < TOTAL_PASOS ? (
              <button
                type="button"
                onClick={siguiente}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
              >
                Continuar →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={isPending}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isPending ? 'Guardando…' : 'Ir al dashboard →'}
              </button>
            )}
          </div>

          {/* Skip */}
          {paso < TOTAL_PASOS && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={isPending}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                Saltar configuración inicial
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
