'use client'

import { useEffect, useState } from 'react'

const MIN_PRINTBRIDGE_VERSION = '3.1.6'
const PRINTBRIDGE_DOWNLOAD_URL =
  'https://joptfhktuokqpsbblmkt.supabase.co/storage/v1/object/public/printbridge/releases/CValle-PrintBridge-v3.1.6.exe'
const PANEL_URL = 'http://127.0.0.1:9100/'

interface BridgeStatus {
  ok: boolean
  version: string
  printerName: string
  paperWidthMm: number
  printerOnline: boolean
}

function parseSemver(v: string): [number, number, number] {
  const match = v.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return [0, 0, 0]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isOlderVersion(current: string, minimum: string): boolean {
  const a = parseSemver(current)
  const b = parseSemver(minimum)
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return true
    if (a[i] > b[i]) return false
  }
  return false
}

/**
 * Badge que verifica si CValle PrintBridge está corriendo en localhost:9100.
 */
export function PrintBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('http://127.0.0.1:9100/status', {
          signal: AbortSignal.timeout(8000),
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
    return () => {
      cancelled = true
    }
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
          Descargá <strong>CValle PrintBridge v3.1.6</strong> en la PC de caja. Ejecutalo y abrí el
          panel en{' '}
          <a href={PANEL_URL} target="_blank" rel="noopener noreferrer" className="text-lime-600 hover:underline">
            http://127.0.0.1:9100/
          </a>
          . Preferí esa URL si <code className="text-[11px]">localhost</code> falla.{' '}
          <a
            href={PRINTBRIDGE_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-600 hover:underline"
          >
            Descargar CValle-PrintBridge-v3.1.6.exe →
          </a>
        </p>
      </div>
    )
  }

  const online = status.printerOnline
  const configured = Boolean(status.printerName)
  const outdated = isOlderVersion(status.version, MIN_PRINTBRIDGE_VERSION)

  return (
    <div
      className={`mt-3 rounded-lg border p-3 ${
        online ? 'border-lime-200 bg-lime-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
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
          href={PANEL_URL}
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
      {outdated && (
        <p className="mt-2 text-xs text-amber-800 bg-amber-100/80 rounded-md px-2 py-1.5 leading-relaxed">
          Hay una versión más nueva ({MIN_PRINTBRIDGE_VERSION}): panel en 127.0.0.1, perfiles
          58/80mm y fix del .exe. Reemplazá el exe — sin reconfigurar.{' '}
          <a
            href={PRINTBRIDGE_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-900 hover:underline"
          >
            Descargar actualización →
          </a>
        </p>
      )}
    </div>
  )
}
