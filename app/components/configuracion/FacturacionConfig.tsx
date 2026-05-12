'use client'

import { useState, useTransition } from 'react'
import { guardarConfigFacturacion } from '@/app/actions/facturacion'
import type { CondicionIVAEmisor } from '@/types/database'

interface FacturacionConfigProps {
  initial: {
    condicion_iva_emisor: CondicionIVAEmisor
    punto_de_venta: number | null
    activo: boolean
    usertoken_configurado: boolean
    apitoken_configurado: boolean
    apikey_configurado: boolean
  }
}

export function FacturacionConfig({ initial }: FacturacionConfigProps) {
  const [condicion, setCondicion] = useState<CondicionIVAEmisor>(
    initial.condicion_iva_emisor
  )
  const [puntoDeVenta, setPuntoDeVenta] = useState<string>(
    initial.punto_de_venta ? String(initial.punto_de_venta) : ''
  )
  const [usertoken, setUsertoken] = useState('')
  const [apitoken, setApitoken] = useState('')
  const [apikey, setApikey] = useState('')
  const [activo, setActivo] = useState(initial.activo)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function guardar() {
    const pvNum = parseInt(puntoDeVenta, 10)
    if (!puntoDeVenta || isNaN(pvNum) || pvNum < 1) {
      setMensaje({ tipo: 'error', texto: 'Ingresá un número de Punto de Venta válido (ej. 1)' })
      return
    }

    // Si no se ingresaron nuevas keys, no podemos guardar sin las existentes
    // El servidor valida. Si están vacías y no están configuradas → error del server.
    startTransition(async () => {
      const res = await guardarConfigFacturacion({
        condicion_iva_emisor: condicion,
        punto_de_venta: pvNum,
        api_usertoken: usertoken,
        api_apitoken: apitoken,
        api_apikey: apikey,
        activo,
      })
      if (res.ok) {
        setMensaje({ tipo: 'ok', texto: 'Configuración guardada correctamente.' })
        setUsertoken('')
        setApitoken('')
        setApikey('')
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'Error al guardar' })
      }
    })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Facturación Electrónica</h2>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Integración con AFIP/ARCA a través de{' '}
          <a
            href="https://www.tusfacturas.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-700 underline hover:text-lime-800"
          >
            TusFacturasAPP
          </a>
          . El cliente gestiona su propia cuenta.
        </p>
      </div>

      {/* Estado actual */}
      <div className="flex items-center gap-3 text-sm">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            initial.activo ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className={initial.activo ? 'text-green-700 font-medium' : 'text-gray-500'}>
          {initial.activo ? 'Activo' : 'Inactivo'}
        </span>
        {initial.usertoken_configurado && initial.apitoken_configurado && initial.apikey_configurado && (
          <span className="text-xs text-gray-400">· Credenciales configuradas</span>
        )}
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">Cómo obtener las credenciales:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
          <li>Registrate en <strong>tusfacturas.app</strong> con tu CUIT</li>
          <li>Configurá tu empresa y el Punto de Venta AFIP</li>
          <li>Andá a <strong>Mi Cuenta → API</strong> y copiá los 3 tokens</li>
          <li>Pegá los tokens acá abajo y guardá</li>
        </ol>
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Condición IVA del emisor
          </label>
          <select
            value={condicion}
            onChange={(e) => setCondicion(e.target.value as CondicionIVAEmisor)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Monotributista">Monotributista</option>
            <option value="Responsable Inscripto">Responsable Inscripto</option>
            <option value="Exento">Exento</option>
            <option value="No Responsable">No Responsable</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Punto de Venta AFIP
          </label>
          <input
            type="number"
            min={1}
            value={puntoDeVenta}
            onChange={(e) => setPuntoDeVenta(e.target.value)}
            placeholder="1"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Número registrado en AFIP (ej. 1)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Credenciales TusFacturasAPP
          {(initial.usertoken_configurado || initial.apitoken_configurado || initial.apikey_configurado) && (
            <span className="ml-2 normal-case font-normal text-gray-400">
              (dejá vacío para mantener las actuales)
            </span>
          )}
        </p>

        <div>
          <label className="block text-xs text-gray-600 mb-1">User Token</label>
          <input
            type="password"
            value={usertoken}
            onChange={(e) => setUsertoken(e.target.value)}
            placeholder={initial.usertoken_configurado ? '••••••••••••' : 'Pegá tu User Token'}
            autoComplete="off"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">API Token</label>
          <input
            type="password"
            value={apitoken}
            onChange={(e) => setApitoken(e.target.value)}
            placeholder={initial.apitoken_configurado ? '••••••••••••' : 'Pegá tu API Token'}
            autoComplete="off"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">API Key (empresa)</label>
          <input
            type="password"
            value={apikey}
            onChange={(e) => setApikey(e.target.value)}
            placeholder={initial.apikey_configurado ? '••••••••••••' : 'Pegá tu API Key'}
            autoComplete="off"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Toggle activo */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"
        />
        <div>
          <span className="text-sm font-medium text-gray-900">Habilitar facturación electrónica</span>
          <p className="text-xs text-gray-500">
            Aparecerá el toggle &quot;Emitir factura&quot; en el POS al cobrar.
          </p>
        </div>
      </label>

      {mensaje && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-lime-50 border-lime-200 text-lime-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={isPending}
        className="w-full sm:w-auto h-10 px-4 text-sm font-semibold bg-[#0A0A0A] text-white rounded-full hover:bg-gray-800 disabled:opacity-60 transition-colors"
      >
        {isPending ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </div>
  )
}
