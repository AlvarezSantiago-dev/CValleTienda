'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Categoria, Color, Talla } from '@/types/database'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useRubro } from '@/components/layout/RubroProvider'

interface FiltrosStockProps {
  categorias: Categoria[]
  tallas: Talla[]
  colores: Color[]
  basePath?: string
}

export function FiltrosStock({
  categorias,
  tallas,
  colores,
  basePath = '/stock',
}: FiltrosStockProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { labelVar1, labelVar2, usarVar1, usarVar2 } = useRubro()

  const [search, setSearch] = useState(sp.get('q') ?? '')
  const [categoriaId, setCategoriaId] = useState(sp.get('categoria') ?? '')
  const [tallaId, setTallaId] = useState(sp.get('talla') ?? '')
  const [colorId, setColorId] = useState(sp.get('color') ?? '')
  const [bajo, setBajo] = useState(sp.get('bajo') === '1')

  function aplicar(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (categoriaId) params.set('categoria', categoriaId)
    if (tallaId) params.set('talla', tallaId)
    if (colorId) params.set('color', colorId)
    if (bajo) params.set('bajo', '1')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
  }

  function limpiar() {
    setSearch('')
    setCategoriaId('')
    setTallaId('')
    setColorId('')
    setBajo(false)
    startTransition(() => router.push(basePath))
  }

  const tieneFiltros =
    !!search.trim() || !!categoriaId || !!tallaId || !!colorId || bajo

  return (
    <form
      onSubmit={aplicar}
      className={`bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end ${
        usarVar2 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
      }`}
    >
      <Input
        label="Buscar"
        placeholder="Nombre, código de producto o de barras"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        label="Categoría"
        value={categoriaId}
        onChange={(e) => setCategoriaId(e.target.value)}
      >
        <option value="">Todas</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      <Select
        label={labelVar1}
        value={tallaId}
        onChange={(e) => setTallaId(e.target.value)}
      >
        <option value="">Todos</option>
        {tallas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </Select>
      {usarVar2 && (
      <Select
        label={labelVar2}
        value={colorId}
        onChange={(e) => setColorId(e.target.value)}
      >
        <option value="">Todos</option>
        {colores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      )}
      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={bajo}
            onChange={(e) => setBajo(e.target.checked)}
            className="h-4 w-4 rounded border-gray-200 text-lime-600 focus:ring-lime-400/60 focus:ring-offset-0"
          />
          Solo bajo stock
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Filtrando…' : 'Aplicar'}
          </Button>
          {tieneFiltros && (
            <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
