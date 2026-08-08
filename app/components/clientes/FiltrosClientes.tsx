'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'

interface FiltrosClientesProps {
  basePath?: string
}

export function FiltrosClientes({ basePath = '/clientes' }: FiltrosClientesProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(sp.get('q') ?? '')
  const [incluirInactivos, setIncluirInactivos] = useState(
    sp.get('inactivos') === '1'
  )

  function aplicar(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (incluirInactivos) params.set('inactivos', '1')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
  }

  function limpiar() {
    setSearch('')
    setIncluirInactivos(false)
    startTransition(() => router.push(basePath))
  }

  const tieneFiltros = !!search.trim() || incluirInactivos

  return (
    <form
      onSubmit={aplicar}
      className="bg-surface rounded-[var(--radius-lg)] border border-border-subtle p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
    >
      <div className="md:col-span-2">
        <Input
          label="Buscar"
          placeholder="Nombre, apellido, DNI, teléfono o email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer">
          <input
            type="checkbox"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-primary focus:ring-primary/40"
          />
          Incluir inactivos
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Filtrando…' : 'Aplicar'}
          </button>
          {tieneFiltros && (
            <button
              type="button"
              onClick={limpiar}
              className="h-10 px-4 text-sm font-medium text-fg border border-border-default rounded-[var(--radius-full)] hover:bg-surface-hover"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
