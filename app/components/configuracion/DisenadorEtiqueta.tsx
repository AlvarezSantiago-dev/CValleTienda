'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { guardarPlantillaEtiqueta } from '@/app/actions/impresion'
import type { PlantillaEtiquetaInput } from '@/app/actions/impresion'
import { EtiquetaRenderer } from '@/components/impresion/EtiquetaRenderer'
import type { PayloadEtiquetaItem } from '@/lib/impresion/types'

interface DisenadorEtiquetaProps {
  inicial: PlantillaEtiquetaInput
}

const PREVIEW_ITEM: PayloadEtiquetaItem = {
  variante_id: 'preview',
  nombre_producto: 'Remera básica algodón',
  talla: 'M',
  color: 'Negro',
  codigo_barras: '7791234567890',
  precio: 12500,
  cantidad: 1,
}

const SIMBOLO_PREVIEW = '$'

interface PresetTamano {
  label: string
  ancho: number
  alto: number
}

/** Tamaños estándar comunes de etiquetas térmicas (rollos de góndola/textil). */
const PRESETS_TAMANO: PresetTamano[] = [
  { label: '50 × 25 mm (estándar)', ancho: 50, alto: 25 },
  { label: '50 × 30 mm', ancho: 50, alto: 30 },
  { label: '50 × 40 mm', ancho: 50, alto: 40 },
  { label: '40 × 30 mm', ancho: 40, alto: 30 },
  { label: '40 × 25 mm', ancho: 40, alto: 25 },
  { label: '60 × 40 mm', ancho: 60, alto: 40 },
  { label: '70 × 25 mm (textil)', ancho: 70, alto: 25 },
  { label: '100 × 50 mm', ancho: 100, alto: 50 },
  { label: '32 × 25 mm (joya)', ancho: 32, alto: 25 },
]

interface CheckboxRowProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function CheckboxRow({ label, checked, onChange }: CheckboxRowProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"
      />
      {label}
    </label>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  unidad?: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, unidad = '', onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
        <span>{label}</span>
        <span className="font-mono text-gray-600">
          {value}
          {unidad}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-lime-600"
      />
    </div>
  )
}

export function DisenadorEtiqueta({ inicial }: DisenadorEtiquetaProps) {
  const [form, setForm] = useState<PlantillaEtiquetaInput>(inicial)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  function patch<K extends keyof PlantillaEtiquetaInput>(
    key: K,
    value: PlantillaEtiquetaInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onGuardar() {
    setMsg(null)
    startTransition(async () => {
      const r = await guardarPlantillaEtiqueta(form)
      if (r.ok) {
        setMsg({ tipo: 'ok', texto: 'Plantilla guardada' })
        setTimeout(() => setMsg(null), 3000)
      } else {
        setMsg({ tipo: 'error', texto: r.error ?? 'Error' })
      }
    })
  }

  // Snapshot de plantilla para el preview en vivo (mismo shape que server)
  const plantillaPreview = {
    id: 'preview',
    nombre: form.nombre,
    formato: `${form.ancho_mm}x${form.alto_mm}`,
    ancho_mm: form.ancho_mm,
    alto_mm: form.alto_mm,
    mostrar_nombre: form.mostrar_nombre,
    mostrar_precio: form.mostrar_precio,
    mostrar_talla: form.mostrar_talla,
    mostrar_color: form.mostrar_color,
    mostrar_codigo: form.mostrar_codigo,
    mostrar_barcode: form.mostrar_barcode,
    mostrar_logo: false,
    tamano_fuente_nombre: form.tamano_fuente_nombre,
    tamano_fuente_precio: form.tamano_fuente_precio,
    tamano_fuente_talla: form.tamano_fuente_talla,
    etiquetas_por_fila: 1,
    etiquetas_por_col: 1,
  }

  // Escala visual: mostrar la etiqueta como si fuera 4× su tamaño físico
  // (1 mm ≈ 3.78 px → ×4 ≈ 15 px/mm para la preview).
  const ESCALA = 4

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* PANEL: editor */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la plantilla
          </label>
          <Input
            value={form.nombre}
            onChange={(e) => patch('nombre', e.target.value)}
            placeholder="Ej: Etiqueta estándar"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tamaño de etiqueta
            </label>
            <Select
              value={
                PRESETS_TAMANO.find(
                  (p) => p.ancho === form.ancho_mm && p.alto === form.alto_mm
                )?.label ?? '__custom__'
              }
              onChange={(e) => {
                const sel = PRESETS_TAMANO.find((p) => p.label === e.target.value)
                if (sel) {
                  setForm((f) => ({ ...f, ancho_mm: sel.ancho, alto_mm: sel.alto }))
                }
              }}
            >
              {PRESETS_TAMANO.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
              <option value="__custom__">Personalizado…</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ancho (mm)
              </label>
              <Input
                type="number"
                min={10}
                max={300}
                value={form.ancho_mm}
                onChange={(e) => patch('ancho_mm', Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alto (mm)
              </label>
              <Input
                type="number"
                min={10}
                max={300}
                value={form.alto_mm}
                onChange={(e) => patch('alto_mm', Number(e.target.value || 0))}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
            Qué mostrar en la etiqueta
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <CheckboxRow
              label="Nombre del producto"
              checked={form.mostrar_nombre}
              onChange={(v) => patch('mostrar_nombre', v)}
            />
            <CheckboxRow
              label="Precio"
              checked={form.mostrar_precio}
              onChange={(v) => patch('mostrar_precio', v)}
            />
            <CheckboxRow
              label="Talla"
              checked={form.mostrar_talla}
              onChange={(v) => patch('mostrar_talla', v)}
            />
            <CheckboxRow
              label="Color"
              checked={form.mostrar_color}
              onChange={(v) => patch('mostrar_color', v)}
            />
            <CheckboxRow
              label="Código (texto)"
              checked={form.mostrar_codigo}
              onChange={(v) => patch('mostrar_codigo', v)}
            />
            <CheckboxRow
              label="Código de barras"
              checked={form.mostrar_barcode}
              onChange={(v) => patch('mostrar_barcode', v)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Tamaños de fuente</h3>
          <SliderRow
            label="Nombre"
            value={form.tamano_fuente_nombre}
            min={4}
            max={40}
            unidad="px"
            onChange={(v) => patch('tamano_fuente_nombre', v)}
          />
          <SliderRow
            label="Precio"
            value={form.tamano_fuente_precio}
            min={4}
            max={60}
            unidad="px"
            onChange={(v) => patch('tamano_fuente_precio', v)}
          />
          <SliderRow
            label="Talla / Color"
            value={form.tamano_fuente_talla}
            min={4}
            max={40}
            unidad="px"
            onChange={(v) => patch('tamano_fuente_talla', v)}
          />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onGuardar}
            disabled={pending}
            className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60 transition-colors"
          >
            {pending ? 'Guardando…' : 'Guardar plantilla'}
          </button>
          {msg && (
            <span
              className={`text-sm ${
                msg.tipo === 'ok' ? 'text-lime-700' : 'text-red-700'
              }`}
            >
              {msg.texto}
            </span>
          )}
        </div>
      </div>

      {/* PANEL: preview */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Vista previa</h3>
          <span className="text-xs text-gray-500">
            {form.ancho_mm} × {form.alto_mm} mm (ampliado ×{ESCALA})
          </span>
        </div>
        <div className="flex items-center justify-center bg-white rounded-md p-6 border border-dashed border-gray-300 min-h-[300px]">
          <div
            style={{
              transform: `scale(${ESCALA})`,
              transformOrigin: 'center center',
            }}
          >
            <EtiquetaRenderer
              plantilla={plantillaPreview}
              item={PREVIEW_ITEM}
              simboloMoneda={SIMBOLO_PREVIEW}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          Los cambios se aplican al instante. Cuando estés conforme, presioná
          <strong> Guardar plantilla</strong>. Esta plantilla se usará automáticamente
          al imprimir etiquetas desde el módulo de Productos.
        </p>
      </div>
    </div>
  )
}
