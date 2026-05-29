'use client'

import { useEffect, useState } from 'react'

interface BridgeStatus {
  ok: boolean
  version: string
  printerName: string
  paperWidthMm: number
  printerOnline: boolean
}

/**
 * Badge que verifica si CValle PrintBridge está corriendo en localhost:9100.
 * Muestra estado de conexión y link para configurar.
 * No bloquea el render — carga en background.
 */
export function PrintBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('http://localhost:9100/status', {
          signal: AbortSignal.timeout(2000),
        })
        if (!cancelled) {
          const data = await res.json()
          setStatus(data)
        }
      } catch {
        if (!cancelled) setStatus(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
        <span className="inline-block w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        Verificando PrintBridge...
      </div>
    )
  }

  if (!status) {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          <span className="font-medium">PrintBridge no detectado</span>
        </div>
        <p className="mt-1 text-xs text-gray-400 leading-relaxed">
          Descargá <strong>CValle PrintBridge v2</strong> en la PC de caja. Es una app con
          ícono en la bandeja del sistema — no necesita instalación ni permisos de administrador.
          Los tickets y etiquetas se impriman automáticamente sin diálogo.{' '}
          <a
            href="https://github.com/cvalle/printbridge/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-600 hover:underline"
          >
            Descargar CValle-PrintBridge-v2.exe →
          </a>
        </p>
      </div>
    )
  }

  const online = status.printerOnline
  const configured = Boolean(status.printerName)

  return (
    <div className={`mt-3 rounded-lg border p-3 ${online ? 'border-lime-200 bg-lime-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              online ? 'bg-lime-500' : configured ? 'bg-amber-400' : 'bg-gray-400'
            }`}
          />
          <span className={`font-medium ${online ? 'text-lime-800' : 'text-amber-800'}`}>
            {online
              ? `PrintBridge conectado — ${status.printerName} (${status.paperWidthMm}mm)`
              : configured
                ? `PrintBridge activo — impresora offline`
                : 'PrintBridge activo — sin impresora configurada'}
          </span>
          <span className="text-[11px] text-gray-400">v{status.version}</span>
        </div>
        <a
          href="http://localhost:9100"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-lime-700 hover:underline flex-shrink-0"
        >
          Configurar →
        </a>
      </div>
      {!configured && (
        <p className="mt-1 text-xs text-amber-700">
          Abrí el panel de PrintBridge para seleccionar tu impresora.
        </p>
      )}
    </div>
  )
}
