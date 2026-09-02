'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { guardarPlantillaEtiqueta } from '@/app/actions/impresion'
import type { PlantillaEtiquetaInput } from '@/app/actions/impresion'
import { EtiquetaRenderer } from '@/components/impresion/EtiquetaRenderer'
import type { PayloadEtiquetaItem } from '@/lib/impresion/types'
import { useRubro } from '@/components/layout/RubroProvider'

interface DisenadorEtiquetaProps {
  inicial: PlantillaEtiquetaInput
  nombreTienda?: string | null
}

const PREVIEW_ITEM: PayloadEtiquetaItem = {
  variante_id: 'preview',
  nombre_producto: 'Remera básica algodón',
  talla: 'M',
  color: 'Negro',
  codigo_barras: '7791234567898',
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
    <label className="flex items-center gap-2 text-sm text-fg select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40"
      />
      {label}
    </label>
  )
}

/**
 * 4 pasos discretos que mapean exactamente a las 4 fuentes bitmap del firmware TSC.
 * S=font2 (16dots), M=font3 (24dots), L=font4 (32dots), XL=font5 (48dots)
 */
const FONT_STEPS = [
  { label: 'S',  value: 10, title: 'Pequeño' },
  { label: 'M',  value: 12, title: 'Mediano' },
  { label: 'L',  value: 15, title: 'Grande' },
  { label: 'XL', value: 21, title: 'Extra grande' },
]

interface FontStepPickerProps {
  label: string
  value: number
  onChange: (v: number) => void
}

function FontStepPicker({ label, value, onChange }: FontStepPickerProps) {
  const currentStep = FONT_STEPS.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  )
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-fg min-w-[70px]">{label}</span>
      <div className="flex gap-1">
        {FONT_STEPS.map((step) => (
          <button
            key={step.value}
            type="button"
            title={step.title}
            onClick={() => onChange(step.value)}
            className={`w-9 h-8 rounded text-xs font-semibold border transition-colors ${
              currentStep.value === step.value
                ? 'bg-fg text-white border-fg'
                : 'bg-surface text-fg-muted border-border-default hover:border-border-strong'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DisenadorEtiqueta({ inicial, nombreTienda }: DisenadorEtiquetaProps) {
  const { labelVar1, labelVar2 } = useRubro()
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
    mostrar_nombre_tienda: form.mostrar_nombre_tienda,
    tamano_fuente_nombre: form.tamano_fuente_nombre,
    tamano_fuente_precio: form.tamano_fuente_precio,
    tamano_fuente_talla: form.tamano_fuente_talla,
    etiquetas_por_fila: 1,
    etiquetas_por_col: 1,
  }

  // Escala dinámica: ~220px de ancho visual, 1mm ≈ 3.78px a 96dpi
  const ESCALA = Math.max(1, Math.min(3, Math.round(220 / (form.ancho_mm * 3.78) * 10) / 10))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* PANEL: editor */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border-subtle p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-fg mb-1">
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
            <label className="block text-sm font-medium text-fg mb-1">
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
              <label className="block text-sm font-medium text-fg mb-1">
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
              <label className="block text-sm font-medium text-fg mb-1">
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
          <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle mb-2">
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
              label={labelVar1}
              checked={form.mostrar_talla}
              onChange={(v) => patch('mostrar_talla', v)}
            />
            <CheckboxRow
              label={labelVar2}
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
            <CheckboxRow
              label="Nombre de la tienda"
              checked={form.mostrar_nombre_tienda}
              onChange={(v) => patch('mostrar_nombre_tienda', v)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">Tamaño de fuente</h3>
          <FontStepPicker
            label="Nombre"
            value={form.tamano_fuente_nombre}
            onChange={(v) => patch('tamano_fuente_nombre', v)}
          />
          <FontStepPicker
            label="Precio"
            value={form.tamano_fuente_precio}
            onChange={(v) => patch('tamano_fuente_precio', v)}
          />
          <FontStepPicker
            label="Talla / Color"
            value={form.tamano_fuente_talla}
            onChange={(v) => patch('tamano_fuente_talla', v)}
          />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border-subtle">
          <button
            onClick={onGuardar}
            disabled={pending}
            className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
          >
            {pending ? 'Guardando…' : 'Guardar plantilla'}
          </button>
          {msg && (
            <span
              className={`text-sm ${
                msg.tipo === 'ok' ? 'text-fg-brand' : 'text-danger-soft-fg'
              }`}
            >
              {msg.texto}
            </span>
          )}
        </div>
      </div>

      {/* PANEL: preview */}
      <div className="bg-surface-sunken rounded-[var(--radius-lg)] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">Vista previa</h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] bg-surface-sunken text-[11px] font-mono font-medium text-fg-muted">
            {form.ancho_mm} × {form.alto_mm} mm
          </span>
        </div>
        <div className="flex items-center justify-center bg-[#e8e8e8] rounded-md py-8 px-6 border border-dashed border-border-default">
          <div
            style={{
              zoom: ESCALA,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.22))',
            }}
          >
            <EtiquetaRenderer
              plantilla={plantillaPreview}
              item={PREVIEW_ITEM}
              simboloMoneda={SIMBOLO_PREVIEW}
              nombreTienda={nombreTienda ?? 'Mi Tienda'}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-fg-muted leading-relaxed">
          Los cambios se aplican al instante. Cuando estés conforme, presioná
          <strong> Guardar plantilla</strong>. Esta plantilla se usará automáticamente
          al imprimir etiquetas desde el módulo de Productos.
        </p>
      </div>
    </div>
  )
}
