'use client'

import { ImagenProductoUpload } from './ImagenProductoUpload'
import type { Color } from '@/types/database'

export interface ColorConFoto {
  id: string
  nombre: string
  hex_color: string | null
  imagen_url: string | null
}

interface FotosPorColorProps {
  productoId: string | null
  colores: ColorConFoto[]
  onUrlChange: (colorId: string, url: string | null) => void
  onFilePendienteChange?: (colorId: string, file: File | null) => void
}

export function FotosPorColor({
  productoId,
  colores,
  onUrlChange,
  onFilePendienteChange,
}: FotosPorColorProps) {
  if (colores.length === 0) return null

  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken/50 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
          Fotos por color
        </p>
        <p className="text-xs text-fg-muted mt-0.5">
          Una foto por color se aplica a todos los talles de ese color. Opcional: la tapa del
          producto cubre el resto.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {colores.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border-default bg-surface p-3"
          >
            <span
              className="mt-1 w-3.5 h-3.5 rounded-full border border-border-default flex-shrink-0"
              style={{ backgroundColor: c.hex_color || '#d4d4d4' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <ImagenProductoUpload
                compact
                etiqueta={c.nombre}
                productoId={productoId}
                imagenUrl={c.imagen_url}
                colorId={c.id}
                kind="color"
                onUrlChange={(url) => onUrlChange(c.id, url)}
                onFilePendienteChange={
                  onFilePendienteChange
                    ? (file) => onFilePendienteChange(c.id, file)
                    : undefined
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function coloresUnicosConFoto(
  items: Array<{ color_id: string | null; imagen_url?: string | null; eliminar?: boolean }>,
  catalogo: Color[]
): ColorConFoto[] {
  const seen = new Map<string, ColorConFoto>()
  for (const v of items) {
    if (v.eliminar || !v.color_id) continue
    const c = catalogo.find((x) => x.id === v.color_id)
    if (!c) continue
    const prev = seen.get(c.id)
    if (!prev) {
      seen.set(c.id, {
        id: c.id,
        nombre: c.nombre,
        hex_color: c.hex_color,
        imagen_url: v.imagen_url ?? null,
      })
    } else if (!prev.imagen_url && v.imagen_url) {
      prev.imagen_url = v.imagen_url
    }
  }
  return [...seen.values()]
}
