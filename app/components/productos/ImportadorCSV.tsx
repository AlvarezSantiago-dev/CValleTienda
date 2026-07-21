'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { importarProductosCSV, type FilaCSVImport, type ResultadoImportacion } from '@/app/actions/productos'
import { ImportPreviewTable } from './ImportPreviewTable'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FilaCSVParsed extends FilaCSVImport {
  filaOriginal: number
  errorCliente?: string
}

type Estado = 'idle' | 'preview' | 'importing' | 'done'

const COLUMNAS_REQUERIDAS = ['nombre', 'precio_venta']
const COLUMNAS_VALIDAS = [
  'nombre', 'descripcion', 'categoria', 'codigo_base',
  'precio_compra', 'precio_venta', 'unidad',
  'talla', 'color', 'codigo_barras', 'stock_actual', 'stock_minimo',
]

// ─── Parser CSV cliente ────────────────────────────────────────────────────────

function parsearCSV(texto: string): { filas: FilaCSVParsed[]; erroresEstructura: string[] } {
  const lineas = texto.split(/\r?\n/)
  if (lineas.length < 2) {
    return { filas: [], erroresEstructura: ['El archivo no tiene datos.'] }
  }

  const encabezados = lineas[0].split(',').map((h) => h.trim().toLowerCase())

  // Validar columnas mínimas
  const faltantes = COLUMNAS_REQUERIDAS.filter((c) => !encabezados.includes(c))
  if (faltantes.length > 0) {
    return {
      filas: [],
      erroresEstructura: [
        `Columnas requeridas faltantes: ${faltantes.join(', ')}. ` +
          `Descargá la plantilla para ver el formato correcto.`,
      ],
    }
  }

  const idx = (col: string) => encabezados.indexOf(col)
  const get = (cols: string[], col: string): string => {
    const i = idx(col)
    return i >= 0 ? (cols[i] ?? '').trim() : ''
  }
  const num = (val: string, def = 0): number => {
    const n = parseFloat(val.replace(/[.$\s]/g, '').replace(',', '.'))
    return isNaN(n) ? def : n
  }

  const filas: FilaCSVParsed[] = []

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i]
    if (!linea.trim()) continue // ignorar líneas vacías

    // Parser CSV básico (manejo de campos entre comillas)
    const cols = linea.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g)?.map((c) =>
      c.startsWith('"') ? c.slice(1, -1) : c
    ) ?? linea.split(',')

    const nombre = get(cols, 'nombre')
    const precioVentaRaw = get(cols, 'precio_venta')
    const precioVenta = num(precioVentaRaw)

    let errorCliente: string | undefined
    if (!nombre) errorCliente = 'Nombre vacío'
    else if (!precioVentaRaw || precioVenta <= 0) errorCliente = 'Precio de venta inválido'

    filas.push({
      filaOriginal: i + 1,
      nombre,
      descripcion: get(cols, 'descripcion') || undefined,
      categoria: get(cols, 'categoria') || undefined,
      codigo_base: get(cols, 'codigo_base') || undefined,
      precio_compra: num(get(cols, 'precio_compra')),
      precio_venta: precioVenta,
      unidad: get(cols, 'unidad') || undefined,
      talla: get(cols, 'talla') || undefined,
      color: get(cols, 'color') || undefined,
      codigo_barras: get(cols, 'codigo_barras') || undefined,
      stock_actual: num(get(cols, 'stock_actual')),
      stock_minimo: num(get(cols, 'stock_minimo')),
      errorCliente,
    })
  }

  return { filas, erroresEstructura: [] }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ImportadorCSV() {
  const [estado, setEstado] = useState<Estado>('idle')
  const [filas, setFilas] = useState<FilaCSVParsed[]>([])
  const [erroresEstructura, setErroresEstructura] = useState<string[]>([])
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filasOk = filas.filter((f) => !f.errorCliente)
  const filasConError = filas.filter((f) => f.errorCliente)

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (!archivo.name.toLowerCase().endsWith('.csv')) {
      setErroresEstructura(['Solo se aceptan archivos .csv'])
      return
    }
    setNombreArchivo(archivo.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const { filas: filasParseadas, erroresEstructura: errEst } = parsearCSV(texto)
      setErroresEstructura(errEst)
      setFilas(filasParseadas)
      if (errEst.length === 0 && filasParseadas.length > 0) {
        setEstado('preview')
      }
    }
    reader.readAsText(archivo, 'UTF-8')
  }

  async function handleConfirmar() {
    if (filasOk.length === 0) return
    setEstado('importing')
    try {
      const res = await importarProductosCSV(filasOk)
      setResultado(res)
    } catch (e) {
      setResultado({
        ok: false,
        total: filasOk.length,
        exitosos: 0,
        errores: [{ fila: 0, nombre: '', ok: false, error: (e as Error).message }],
      })
    }
    setEstado('done')
  }

  function handleReiniciar() {
    setEstado('idle')
    setFilas([])
    setErroresEstructura([])
    setResultado(null)
    setNombreArchivo('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Estado: idle ──────────────────────────────────────────────────────────
  if (estado === 'idle') {
    return (
      <div className="max-w-xl">
        {/* Drop zone */}
        <label
          htmlFor="csv-upload"
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl p-10 cursor-pointer hover:border-lime-400 hover:bg-lime-50/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-lime-100 flex items-center justify-center transition-colors text-2xl">
            📂
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-800">Hacé clic para seleccionar un archivo CSV</p>
            <p className="text-sm text-gray-400 mt-1">o arrastrá el archivo aquí</p>
          </div>
          <input
            ref={inputRef}
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleArchivo}
          />
        </label>

        {/* Errores de estructura */}
        {erroresEstructura.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            {erroresEstructura.map((e, i) => (
              <p key={i} className="text-sm text-red-700">{e}</p>
            ))}
          </div>
        )}

        {/* Descarga plantilla */}
        <div className="mt-5 flex items-center gap-2 text-sm">
          <span className="text-gray-400">¿No tenés el formato correcto?</span>
          <a
            href="/plantilla-importacion-productos.csv"
            download
            className="text-lime-700 font-medium hover:underline"
          >
            Descargar plantilla CSV →
          </a>
        </div>

        {/* Instrucciones columnas */}
        <details className="mt-4 text-xs text-gray-500 border border-gray-100 rounded-xl p-3">
          <summary className="cursor-pointer font-medium text-gray-600 mb-1">
            Ver columnas del CSV
          </summary>
          <div className="mt-2 space-y-1">
            <p><strong>nombre</strong> — obligatorio</p>
            <p><strong>precio_venta</strong> — obligatorio, número sin símbolo $</p>
            <p><strong>precio_compra</strong> — opcional (default 0)</p>
            <p><strong>categoria</strong> — opcional, se crea si no existe</p>
            <p><strong>codigo_base</strong> — opcional; mismo valor agrupa variantes</p>
            <p><strong>talla</strong> — opcional (ej. M, 42, Único)</p>
            <p><strong>color</strong> — opcional (ej. Negro, Azul)</p>
            <p><strong>codigo_barras</strong> — opcional, se autogenera si está vacío</p>
            <p><strong>stock_actual</strong> — opcional (default 0). En despensa/carnicería: <code>-1</code> = ilimitado</p>
            <p><strong>stock_minimo</strong> — opcional (default 0)</p>
            <p><strong>unidad</strong> — opcional (default: unidad)</p>
            <p><strong>descripcion</strong> — opcional</p>
          </div>
        </details>
      </div>
    )
  }

  // ── Estado: preview ───────────────────────────────────────────────────────
  if (estado === 'preview') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-sm text-gray-500">
              Archivo: <strong className="text-gray-800">{nombreArchivo}</strong>
            </p>
          </div>
          <button
            onClick={handleReiniciar}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Cambiar archivo
          </button>
        </div>

        <ImportPreviewTable filas={filas} />

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleConfirmar}
            disabled={filasOk.length === 0}
            className="px-5 py-2.5 rounded-xl bg-lime-600 text-white text-sm font-semibold hover:bg-lime-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Importar {filasOk.length} producto{filasOk.length !== 1 ? 's' : ''}
          </button>
          {filasConError.length > 0 && (
            <p className="text-xs text-amber-600">
              {filasConError.length} fila{filasConError.length !== 1 ? 's' : ''} con error{filasConError.length !== 1 ? 'es' : ''} serán omitidas
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Estado: importing ─────────────────────────────────────────────────────
  if (estado === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-lime-200 border-t-lime-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Importando productos…</p>
        <p className="text-sm text-gray-400">Esto puede tardar unos segundos según la cantidad.</p>
      </div>
    )
  }

  // ── Estado: done ──────────────────────────────────────────────────────────
  if (estado === 'done' && resultado) {
    const hayErrores = resultado.errores.length > 0
    return (
      <div className="max-w-xl space-y-4">
        {/* Resultado principal */}
        <div
          className={`rounded-2xl p-6 border ${
            !hayErrores
              ? 'bg-green-50 border-green-200'
              : resultado.exitosos > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <p className="text-lg font-bold text-gray-900 mb-1">
            {!hayErrores
              ? '¡Importación completada!'
              : resultado.exitosos > 0
              ? 'Importación parcialmente completada'
              : 'Error en la importación'}
          </p>
          <p className="text-sm text-gray-600">
            {resultado.exitosos} de {resultado.total} producto{resultado.total !== 1 ? 's' : ''} importado{resultado.exitosos !== 1 ? 's' : ''} correctamente.
          </p>
        </div>

        {/* Lista de errores */}
        {hayErrores && (
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <p className="text-xs font-semibold text-red-700 bg-red-50 px-4 py-2 uppercase tracking-wide">
              Filas con error ({resultado.errores.length})
            </p>
            <ul className="divide-y divide-red-100">
              {resultado.errores.map((e, i) => (
                <li key={i} className="px-4 py-2.5 text-sm">
                  <span className="font-medium text-gray-800">
                    {e.fila > 0 ? `Fila ${e.fila}: ` : ''}{e.nombre || '(sin nombre)'}
                  </span>
                  <span className="text-red-600 ml-2">— {e.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3 flex-wrap">
          {resultado.exitosos > 0 && (
            <Link
              href="/productos"
              className="px-5 py-2.5 rounded-xl bg-lime-600 text-white text-sm font-semibold hover:bg-lime-700 transition-colors"
            >
              Ver productos →
            </Link>
          )}
          <button
            onClick={handleReiniciar}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Importar otro archivo
          </button>
        </div>
      </div>
    )
  }

  return null
}
