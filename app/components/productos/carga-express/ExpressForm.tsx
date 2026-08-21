'use client'

import { useState, type ReactNode } from 'react'
import type { Categoria, Color, Talla } from '@/types/database'
import type { ActionResult } from '@/app/actions/productos'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { InlineCreate } from '@/components/productos/InlineCreate'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'
import { cn } from '@/components/ui/cn'
import { esColorBasura, esTalleRopa } from '@/lib/productos/carga-express/parser-nl'
import type { EjeColor, EjeTalla } from './CargaExpressRopa'

interface ExpressFormProps {
  nombre: string
  onNombreChange: (v: string) => void
  categoriaId: string
  onCategoriaChange: (id: string) => void
  categorias: Categoria[]
  onCategoriaCreated: (c: Categoria) => void
  precioCompra: number
  onPrecioCompraChange: (n: number) => void
  precioVenta: number
  onPrecioVentaChange: (n: number) => void
  margenDefault: number
  codigoBase: string
  onCodigoBaseChange: (v: string) => void
  descripcion: string
  onDescripcionChange: (v: string) => void
  catalogoColores: Color[]
  catalogoTallas: Talla[]
  ejesColores: EjeColor[]
  ejesTallas: EjeTalla[]
  onToggleColor: (c: Color) => void
  onToggleTalla: (t: Talla) => void
  onColorCreated: (c: Color) => void
  onTallaCreated: (t: Talla) => void
  crearCategoriaInline: (nombre: string) => Promise<ActionResult<{ id: string; nombre: string }>>
  crearColorInline: (
    nombre: string,
    hex?: string
  ) => Promise<ActionResult<{ id: string; nombre: string; hex_color: string | null }>>
  crearTallaInline: (nombre: string) => Promise<ActionResult<{ id: string; nombre: string }>>
  imagenSlot?: ReactNode
  fotosColorSlot?: ReactNode
}

export function ExpressForm({
  nombre,
  onNombreChange,
  categoriaId,
  onCategoriaChange,
  categorias,
  onCategoriaCreated,
  precioCompra,
  onPrecioCompraChange,
  precioVenta,
  onPrecioVentaChange,
  margenDefault,
  codigoBase,
  onCodigoBaseChange,
  descripcion,
  onDescripcionChange,
  catalogoColores,
  catalogoTallas,
  ejesColores,
  ejesTallas,
  onToggleColor,
  onToggleTalla,
  onColorCreated,
  onTallaCreated,
  crearCategoriaInline,
  crearColorInline,
  crearTallaInline,
  imagenSlot,
  fotosColorSlot,
}: ExpressFormProps) {
  const [detallesOpen, setDetallesOpen] = useState(false)

  function sugerirVentaDesdeCompra(compra: number) {
    onPrecioCompraChange(compra)
    if (margenDefault > 0 && compra > 0 && precioVenta <= 0) {
      onPrecioVentaChange(Math.round(compra * (1 + margenDefault / 100)))
    }
  }

  const colorSeleccionado = (c: Color) =>
    ejesColores.some((e) => e.id === c.id || e.nombre.toLowerCase() === c.nombre.toLowerCase())

  const tallaSeleccionada = (t: Talla) =>
    ejesTallas.some((e) => e.id === t.id || e.nombre.toUpperCase() === t.nombre.toUpperCase())

  const coloresUi = catalogoColores.filter((c) => !esColorBasura(c.nombre))
  const tallasUi = catalogoTallas.filter((t) => esTalleRopa(t.nombre))
  // Si el filtro dejó vacío (catálogo raro), mostrar todo para no bloquear
  const coloresChips = coloresUi.length > 0 ? coloresUi : catalogoColores
  const tallasChips = tallasUi.length > 0 ? tallasUi : catalogoTallas

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-default bg-surface p-4 md:p-5">
      <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">1. Producto</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Nombre *"
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Ej. Remera New Balance"
        />
        <div>
          <Select
            label="Categoría"
            value={categoriaId}
            onChange={(e) => onCategoriaChange(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <InlineCreate
            label="Nueva categoría"
            placeholder="Nombre"
            transform={titleCase}
            onConfirm={async (n) => {
              const res = await crearCategoriaInline(n)
              return res.ok && res.data ? res.data : null
            }}
            onCreated={(item) => {
              onCategoriaCreated({
                id: item.id,
                nombre: item.nombre,
                descripcion: null,
                activo: true,
                tienda_id: '',
                created_at: '',
                updated_at: '',
              })
            }}
          />
        </div>
        <Input
          label="Precio compra"
          type="number"
          min={0}
          step="1"
          value={precioCompra || ''}
          onChange={(e) => sugerirVentaDesdeCompra(Number(e.target.value) || 0)}
        />
        <Input
          label="Precio venta *"
          type="number"
          min={0}
          step="1"
          value={precioVenta || ''}
          onChange={(e) => onPrecioVentaChange(Number(e.target.value) || 0)}
        />
      </div>

      {imagenSlot}

      <button
        type="button"
        onClick={() => setDetallesOpen((o) => !o)}
        className="text-xs text-fg-muted hover:text-fg underline-offset-2 hover:underline"
      >
        {detallesOpen ? 'Ocultar detalles' : 'Más detalles (código base, descripción)'}
      </button>
      {detallesOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Código base"
            value={codigoBase}
            onChange={(e) => onCodigoBaseChange(e.target.value)}
          />
          <Input
            label="Descripción"
            value={descripcion}
            onChange={(e) => onDescripcionChange(e.target.value)}
          />
        </div>
      )}

      <div className="pt-2 border-t border-border-subtle space-y-3">
        <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">2. Colores y talles</h2>
        <p className="text-xs text-fg-muted">
          Elegí los ejes de la matriz. El stock se carga celda por celda abajo.
        </p>

        <div>
          <p className="text-xs font-medium text-fg-secondary mb-2">Colores</p>
          <div className="flex flex-wrap gap-2">
            {coloresChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggleColor(c)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-full)] border text-xs font-medium transition-colors',
                  colorSeleccionado(c)
                    ? 'bg-primary text-primary-fg border-transparent'
                    : 'bg-surface text-fg border-border-default hover:bg-surface-hover'
                )}
              >
                {c.hex_color && (
                  <span
                    className="w-3 h-3 rounded-full border border-border-subtle"
                    style={{ backgroundColor: c.hex_color }}
                  />
                )}
                {c.nombre}
              </button>
            ))}
          </div>
          <InlineCreate
            label="Nuevo color"
            placeholder="Color"
            withColor
            transform={titleCase}
            onConfirm={async (n, hex) => {
              const res = await crearColorInline(n, hex)
              if (!res.ok || !res.data) return null
              onColorCreated({
                id: res.data.id,
                nombre: res.data.nombre,
                hex_color: res.data.hex_color,
                activo: true,
                tienda_id: '',
                created_at: '',
              })
              return { id: res.data.id, nombre: res.data.nombre }
            }}
            onCreated={() => {
              /* ya agregado en onConfirm */
            }}
          />
        </div>

        {fotosColorSlot}

        <div>
          <p className="text-xs font-medium text-fg-secondary mb-2">Talles</p>
          <div className="flex flex-wrap gap-2">
            {tallasChips.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggleTalla(t)}
                className={cn(
                  'inline-flex items-center h-8 px-3 rounded-[var(--radius-full)] border text-xs font-medium transition-colors',
                  tallaSeleccionada(t)
                    ? 'bg-primary text-primary-fg border-transparent'
                    : 'bg-surface text-fg border-border-default hover:bg-surface-hover'
                )}
              >
                {t.nombre}
              </button>
            ))}
          </div>
          <InlineCreate
            label="Nuevo talle"
            placeholder="XS, M, 42…"
            transform={upperCaseTrim}
            onConfirm={async (n) => {
              const res = await crearTallaInline(n)
              return res.ok && res.data ? res.data : null
            }}
            onCreated={(item) => {
              onTallaCreated({
                id: item.id,
                nombre: item.nombre,
                orden: 0,
                activo: true,
                tienda_id: '',
                created_at: '',
              })
            }}
          />
        </div>

        {(ejesColores.some((c) => !c.id) || ejesTallas.some((t) => !t.id)) && (
          <p className="text-xs text-fg-muted">
            Al interpretar se crean categoría/color/talle si no existen (talles solo si parecen válidos: XS, S, M, L…).
          </p>
        )}
      </div>
    </section>
  )
}
