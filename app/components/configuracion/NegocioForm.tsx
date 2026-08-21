'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LogoUpload } from '@/components/configuracion/LogoUpload'
import {
  actualizarDatosFiscales,
  actualizarRubroTienda,
  actualizarMargenDefault,
  actualizarRecargoCcDefault,
  type DatosFiscalesInput,
} from '@/app/actions/configuracion'
import {
  TODOS_LOS_RUBROS,
  LABEL_RUBRO,
  CONFIG_RUBROS,
} from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

const CONDICIONES_IVA = [
  'Monotributista',
  'Responsable Inscripto',
  'Exento',
  'Consumidor Final',
]

interface NegocioFormProps {
  initial: ConfiguracionTienda | null
  rubroActual: Rubro
}

export function NegocioForm({ initial, rubroActual }: NegocioFormProps) {
  // ── Datos fiscales ──────────────────────────────────────────────────────────
  const [fiscalPending, startFiscal] = useTransition()
  const [fiscalMsg, setFiscalMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [fiscal, setFiscal] = useState<DatosFiscalesInput>({
    razon_social: initial?.razon_social ?? '',
    cuit: initial?.cuit ?? '',
    condicion_iva: initial?.condicion_iva ?? null,
    direccion_legal: initial?.direccion_legal ?? '',
  })

  function onFiscalSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFiscalMsg(null)
    startFiscal(async () => {
      const res = await actualizarDatosFiscales(fiscal)
      setFiscalMsg(res.ok
        ? { tipo: 'ok', texto: 'Datos fiscales guardados correctamente' }
        : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  // ── Rubro ───────────────────────────────────────────────────────────────────
  const [rubroPending, startRubro] = useTransition()
  const [rubroMsg, setRubroMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [selectedRubro, setSelectedRubro] = useState<Rubro>(rubroActual)

  function onRubroSubmit(e: React.FormEvent) {
    e.preventDefault()
    setRubroMsg(null)
    if (selectedRubro === rubroActual) {
      setRubroMsg({ tipo: 'ok', texto: 'El rubro ya está actualizado' })
      return
    }
    startRubro(async () => {
      const res = await actualizarRubroTienda(selectedRubro)
      setRubroMsg(res.ok
        ? { tipo: 'ok', texto: 'Rubro actualizado correctamente' }
        : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  // ── Margen ──────────────────────────────────────────────────────────────────
  const [margenPending, startMargen] = useTransition()
  const [margenMsg, setMargenMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [margen, setMargen] = useState(initial?.margen_ganancia_default ?? 0)
  const [recargoCcPending, startRecargoCc] = useTransition()
  const [recargoCcMsg, setRecargoCcMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [recargoCc, setRecargoCc] = useState(initial?.recargo_cc_default ?? 0)
  const usarPedidoCc = CONFIG_RUBROS[selectedRubro]?.usarPedidoCc ?? false

  function onMargenSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMargenMsg(null)
    startMargen(async () => {
      const res = await actualizarMargenDefault(margen)
      setMargenMsg(res.ok
        ? { tipo: 'ok', texto: 'Margen guardado correctamente' }
        : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <h2 className="text-[15px] font-semibold text-fg mb-1">Logo</h2>
        <p className="text-[13px] text-fg-subtle mb-4">
          Se muestra en el ticket impreso si la opción está activada.
        </p>
        <LogoUpload logoUrl={initial?.logo_url ?? null} />
      </div>

      {/* ── Datos fiscales ────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <h2 className="text-[15px] font-semibold text-fg mb-1">Datos fiscales</h2>
        <p className="text-[13px] text-fg-subtle mb-4">
          Aparecen en el ticket impreso y en los documentos del negocio.
        </p>

        {fiscalMsg && (
          <div
            className={`mb-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
              fiscalMsg.tipo === 'ok'
                ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
                : 'bg-danger-soft text-red-800 border border-danger-border'
            }`}
            role="status"
          >
            {fiscalMsg.texto}
          </div>
        )}

        <form onSubmit={onFiscalSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razón social"
              name="razon_social"
              value={fiscal.razon_social ?? ''}
              onChange={(e) => setFiscal((f) => ({ ...f, razon_social: e.target.value }))}
              placeholder="Mi Tienda S.R.L."
            />
            <Input
              label="CUIT"
              name="cuit"
              value={fiscal.cuit ?? ''}
              onChange={(e) => setFiscal((f) => ({ ...f, cuit: e.target.value }))}
              placeholder="20-12345678-9"
              hint="8 a 13 dígitos. Guiones opcionales."
            />
            <Select
              label="Condición frente al IVA"
              name="condicion_iva"
              value={fiscal.condicion_iva ?? ''}
              onChange={(e) =>
                setFiscal((f) => ({ ...f, condicion_iva: e.target.value || null }))
              }
              hint="Opcional. Si elegís «No mostrar en ticket», no se imprime en ticket ni vale."
            >
              <option value="">No mostrar en ticket</option>
              {CONDICIONES_IVA.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Input
              label="Dirección legal"
              name="direccion_legal"
              value={fiscal.direccion_legal ?? ''}
              onChange={(e) => setFiscal((f) => ({ ...f, direccion_legal: e.target.value }))}
              placeholder="Av. Siempreviva 742"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={fiscalPending}
              className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
            >
              {fiscalPending ? 'Guardando...' : 'Guardar datos fiscales'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Rubro ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <h2 className="text-[15px] font-semibold text-fg mb-1">Tipo de negocio</h2>
        <p className="text-[13px] text-fg-subtle mb-4">
          Define los labels de variantes (ej. &quot;Talla&quot;/&quot;Color&quot;), las unidades de medida disponibles
          y las categorías que se precargaron al crear la tienda.
        </p>

        {rubroMsg && (
          <div
            className={`mb-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
              rubroMsg.tipo === 'ok'
                ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
                : 'bg-danger-soft text-red-800 border border-danger-border'
            }`}
            role="status"
          >
            {rubroMsg.texto}
          </div>
        )}

        <form onSubmit={onRubroSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TODOS_LOS_RUBROS.map((rubro) => {
              const cfg = CONFIG_RUBROS[rubro]
              const isSelected = selectedRubro === rubro
              return (
                <button
                  key={rubro}
                  type="button"
                  onClick={() => setSelectedRubro(rubro)}
                  className={`flex flex-col gap-1 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary-soft'
                      : 'border-border-default bg-surface hover:border-border-default'
                  }`}
                >
                  <span className="text-2xl">{LABEL_RUBRO[rubro].split(' ')[0]}</span>
                  <span className={`text-sm font-medium ${isSelected ? 'text-fg-brand' : 'text-fg'}`}>
                    {LABEL_RUBRO[rubro].slice(LABEL_RUBRO[rubro].indexOf(' ') + 1)}
                  </span>
                  <span className="text-xs text-fg-muted leading-tight">{cfg.descripcion}</span>
                </button>
              )
            })}
          </div>

          {selectedRubro !== rubroActual && (
            <div className="rounded-[var(--radius-md)] bg-warning-soft border border-warning-border px-4 py-3 text-sm text-warning-soft-fg space-y-1">
              <p>
                <strong>Atención:</strong> Al cambiar el rubro se actualizan los labels de variantes
                ({CONFIG_RUBROS[selectedRubro].labelVar1} / {CONFIG_RUBROS[selectedRubro].labelVar2})
                y se agregan automáticamente las {CONFIG_RUBROS[selectedRubro].labelVar1.toLowerCase()}s
                y {CONFIG_RUBROS[selectedRubro].labelVar2.toLowerCase()}s sugeridas del nuevo rubro.
              </p>
              <p>Los datos existentes (productos, variantes, ventas) no se modifican ni eliminan.</p>
            </div>
          )}

          <div className="bg-surface-sunken border border-border-subtle rounded-[var(--radius-lg)] p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-fg-muted mb-0.5">Variante 1</p>
              <p className="text-sm font-medium text-fg">{CONFIG_RUBROS[selectedRubro].labelVar1}</p>
            </div>
            {CONFIG_RUBROS[selectedRubro].usarVar2 && (
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Variante 2</p>
                <p className="text-sm font-medium text-fg">{CONFIG_RUBROS[selectedRubro].labelVar2}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={rubroPending}
              className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
            >
              {rubroPending ? 'Guardando...' : 'Guardar rubro'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Margen de ganancia ─────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <h2 className="text-[15px] font-semibold text-fg mb-1">Precios y márgenes</h2>
        <p className="text-[13px] text-fg-subtle mb-4">
          Al cargar el precio de compra de un producto, el sistema calculará y sugerirá
          automáticamente el precio de venta sumando este porcentaje sobre el costo.
        </p>

        {margenMsg && (
          <div
            className={`mb-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
              margenMsg.tipo === 'ok'
                ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
                : 'bg-danger-soft text-red-800 border border-danger-border'
            }`}
            role="status"
          >
            {margenMsg.texto}
          </div>
        )}

        <form onSubmit={onMargenSubmit} className="space-y-4">
          <div className="max-w-xs">
            <Input
              label="Markup por defecto (%)"
              type="number"
              step="0.01"
              min="0"
              max="9999"
              value={margen}
              onChange={(e) => setMargen(Number(e.target.value) || 0)}
              placeholder="Ej: 80"
              hint="0 = desactivado. Sugerencia automática al cargar precio de costo."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={margenPending}
              className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
            >
              {margenPending ? 'Guardando...' : 'Guardar margen'}
            </button>
          </div>
        </form>
      </div>

      {usarPedidoCc && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
          <h2 className="text-[15px] font-semibold text-fg mb-1">Recargo cuenta corriente</h2>
          <p className="text-[13px] text-fg-subtle mb-4">
            Si un producto no tiene recargo propio, al fiar se usa este porcentaje sobre el precio de contado.
          </p>
          {recargoCcMsg && (
            <div
              className={`mb-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
                recargoCcMsg.tipo === 'ok'
                  ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
                  : 'bg-danger-soft text-red-800 border border-danger-border'
              }`}
              role="status"
            >
              {recargoCcMsg.texto}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setRecargoCcMsg(null)
              startRecargoCc(async () => {
                const res = await actualizarRecargoCcDefault(recargoCc)
                setRecargoCcMsg(
                  res.ok
                    ? { tipo: 'ok', texto: 'Recargo guardado correctamente' }
                    : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
                )
              })
            }}
            className="space-y-4"
          >
            <div className="max-w-xs">
              <Input
                label="Recargo cuenta por defecto (%)"
                type="number"
                step="0.01"
                min="0"
                max="9999"
                value={recargoCc}
                onChange={(e) => setRecargoCc(Number(e.target.value) || 0)}
                placeholder="Ej: 10"
                hint="0 = mismo precio de contado. Se puede overridear por producto."
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={recargoCcPending}
                className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
              >
                {recargoCcPending ? 'Guardando...' : 'Guardar recargo'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
