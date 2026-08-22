'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { ACCEPT_IMAGEN_PRODUCTO } from '@/lib/productos/imagen-const'
import { redimensionarImagenProducto } from '@/lib/productos/imagen-cliente'
import {
  eliminarImagenProducto,
  subirImagenProducto,
  type KindImagen,
} from '@/lib/productos/imagen-api'

export interface ImagenProductoUploadProps {
  productoId: string | null
  imagenUrl: string | null
  onUrlChange: (url: string | null) => void
  /** Alta: el padre guarda el File y lo sube después del INSERT */
  onFilePendienteChange?: (file: File | null) => void
  kind?: KindImagen
  colorId?: string
  varianteId?: string
  packId?: string
  compact?: boolean
  etiqueta?: string
  ayuda?: string
  disabled?: boolean
}

export function ImagenProductoUpload({
  productoId,
  imagenUrl,
  onUrlChange,
  onFilePendienteChange,
  kind = 'cover',
  colorId,
  varianteId,
  packId,
  compact = false,
  etiqueta,
  ayuda,
  disabled = false,
}: ImagenProductoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewLocal, setPreviewLocal] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const preview = previewLocal ?? imagenUrl
  const opts = { kind, colorId, varianteId, packId }

  useEffect(() => {
    return () => {
      if (previewLocal) URL.revokeObjectURL(previewLocal)
    }
  }, [previewLocal])

  function setLocalFile(file: File | null) {
    setPreviewLocal((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
    onFilePendienteChange?.(file)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    startTransition(async () => {
      let listo: File
      try {
        listo = await redimensionarImagenProducto(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo comprimir la foto')
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      if (!productoId) {
        setLocalFile(listo)
        return
      }

      setLocalFile(listo)
      const res = await subirImagenProducto(productoId, listo, opts)
      if (!res.ok) {
        setError(res.error)
        setLocalFile(null)
        onUrlChange(imagenUrl)
        return
      }
      setPreviewLocal((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      onFilePendienteChange?.(null)
      onUrlChange(res.url)
    })
  }

  function handleDelete() {
    setError(null)
    if (!productoId) {
      setLocalFile(null)
      onUrlChange(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    startTransition(async () => {
      const res = await eliminarImagenProducto(productoId, opts)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setLocalFile(null)
      onUrlChange(null)
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  const box = compact ? 'w-14 h-14' : 'w-[120px] h-[120px]'
  const ayudaDefault = compact
    ? undefined
    : (ayuda ??
      'JPG, PNG o WEBP. Se comprime sola (~300 KB) para el listado, la caja y el catálogo.')

  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      {etiqueta && (
        <p
          className={cn(
            'font-semibold text-fg-subtle uppercase tracking-[0.10em]',
            compact ? 'text-[10px]' : 'text-[10px]'
          )}
        >
          {etiqueta}
        </p>
      )}
      {ayudaDefault && <p className="text-[13px] text-fg-subtle">{ayudaDefault}</p>}

      <div className={cn('flex items-center gap-3', compact && 'gap-2')}>
        <div
          className={cn(
            box,
            'rounded-[var(--radius-lg)] border-2 border-dashed border-border-default flex items-center justify-center bg-surface-sunken overflow-hidden flex-shrink-0'
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="object-cover w-full h-full" />
          ) : (
            <ImageIcon className={compact ? 'size-5 text-fg-subtle' : 'size-8 text-fg-subtle'} />
          )}
        </div>

        <div className="flex flex-col gap-1.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size={compact ? 'xs' : 'sm'}
            disabled={disabled || pending}
            isLoading={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? 'Subiendo…' : preview ? 'Cambiar' : 'Subir foto'}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size={compact ? 'xs' : 'sm'}
              disabled={disabled || pending}
              onClick={handleDelete}
              className="text-danger-soft-fg hover:bg-danger-soft"
            >
              Quitar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger-soft-fg bg-danger-soft border border-danger-border rounded-[var(--radius-md)] px-3 py-2">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_IMAGEN_PRODUCTO}
        className="hidden"
        disabled={disabled || pending}
        onChange={handleFile}
      />
    </div>
  )
}
