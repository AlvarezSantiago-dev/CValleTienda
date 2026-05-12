'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import type { Categoria } from '@/types/database'

interface FiltroCategoriaProps {
  categorias: Categoria[]
}

export function FiltroCategoria({ categorias }: FiltroCategoriaProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('categoria') ?? ''

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('categoria', value)
    else params.delete('categoria')
    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?')
  }

  return (
    <Select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar por categoría"
    >
      <option value="">Todas las categorías</option>
      {categorias.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </Select>
  )
}
