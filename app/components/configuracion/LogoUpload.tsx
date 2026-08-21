'use client'

import { useRef, useState, useTransition } from 'react'
import { redimensionarLogoNegocio } from '@/lib/configuracion/logo-cliente'

interface Props {
  logoUrl: string | null
}

export function LogoUpload({ logoUrl: initialLogo }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initialLogo)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    startTransition(async () => {
      try {
        const listo = await redimensionarLogoNegocio(file)
        setPreview(URL.createObjectURL(listo))
        const fd = new FormData()
        fd.append('logo', listo)
        const res = await fetch('/api/logo', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Error al subir el logo')
          setPreview(initialLogo)
        } else {
          setPreview(json.url)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al subir el logo')
        setPreview(initialLogo)
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/logo', { method: 'DELETE' })
      if (res.ok) {
        setPreview(null)
        if (inputRef.current) inputRef.current.value = ''
      } else {
        const json = await res.json()
        setError(json.error ?? 'Error al eliminar')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">Logo del negocio</p>
      <p className="text-[13px] text-fg-subtle">Se mostrará en tickets (si está activado en Ticket) y en remitos. PNG, JPG, WEBP o SVG — se comprime sola para la térmica.</p>

      {/* Vista previa */}
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-[var(--radius-lg)] border-2 border-dashed border-border-default flex items-center justify-center bg-surface-sunken overflow-hidden flex-shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de Storage/SVG/blob; next/image explota y tumba /configuracion
            <img
              src={preview}
              alt="Logo"
              width={96}
              height={96}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-3xl select-none">🏪</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] border border-border-default bg-surface hover:bg-surface-sunken text-sm font-medium text-fg disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Subiendo…' : preview ? 'Cambiar logo' : 'Subir logo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] border border-danger-border text-danger-soft-fg hover:bg-danger-soft text-sm font-medium disabled:opacity-50 transition-colors"
            >
              Eliminar logo
            </button>
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
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
