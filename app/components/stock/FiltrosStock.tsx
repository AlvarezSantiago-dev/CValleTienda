'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { Categoria, Color, Talla } from '@/types/database'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useRubro } from '@/components/layout/RubroProvider'
import { cn } from '@/components/ui/cn'

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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [search, setSearch] = useState(sp.get('q') ?? '')
  const [categoriaId, setCategoriaId] = useState(sp.get('categoria') ?? '')
  const [tallaId, setTallaId] = useState(sp.get('talla') ?? '')
  const [colorId, setColorId] = useState(sp.get('color') ?? '')
  const [bajo, setBajo] = useState(sp.get('bajo') === '1')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearch(sp.get('q') ?? '')
    setCategoriaId(sp.get('categoria') ?? '')
    setTallaId(sp.get('talla') ?? '')
    setColorId(sp.get('color') ?? '')
    setBajo(sp.get('bajo') === '1')
  }, [sp])

  const navegar = useCallback(
    (next: {
      q?: string
      categoria?: string
      talla?: string
      color?: string
      bajo?: boolean
    }) => {
      const params = new URLSearchParams()
      const q = (next.q ?? search).trim()
      const cat = next.categoria ?? categoriaId
      const talla = next.talla ?? tallaId
      const color = next.color ?? colorId
      const soloBajo = next.bajo ?? bajo
      if (q) params.set('q', q)
      if (cat) params.set('categoria', cat)
      if (usarVar1 && talla) params.set('talla', talla)
      if (usarVar2 && color) params.set('color', color)
      if (soloBajo) params.set('bajo', '1')
      const qs = params.toString()
      startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
    },
    [search, categoriaId, tallaId, colorId, bajo, usarVar1, usarVar2, basePath, router]
  )

  function onSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navegar({ q: value })
    }, 320)
  }

  function toggleBajo() {
    const next = !bajo
    setBajo(next)
    navegar({ bajo: next })
  }

  function aplicar(e?: React.FormEvent) {
    e?.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    navegar({})
    setDrawerOpen(false)
  }

  function limpiar() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearch('')
    setCategoriaId('')
    setTallaId('')
    setColorId('')
    setBajo(false)
    startTransition(() => router.push(basePath))
    setDrawerOpen(false)
  }

  function quitarChip(key: 'q' | 'categoria' | 'talla' | 'color' | 'bajo') {
    if (key === 'q') {
      setSearch('')
      navegar({ q: '' })
    } else if (key === 'categoria') {
      setCategoriaId('')
      navegar({ categoria: '' })
    } else if (key === 'talla') {
      setTallaId('')
      navegar({ talla: '' })
    } else if (key === 'color') {
      setColorId('')
      navegar({ color: '' })
    } else {
      setBajo(false)
      navegar({ bajo: false })
    }
  }

  const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre
  const tallaNombre = tallas.find((t) => t.id === tallaId)?.nombre
  const colorNombre = colores.find((c) => c.id === colorId)?.nombre

  const chips: { key: 'q' | 'categoria' | 'talla' | 'color' | 'bajo'; label: string }[] = []
  if (search.trim()) chips.push({ key: 'q', label: `“${search.trim()}”` })
  if (categoriaId && catNombre) chips.push({ key: 'categoria', label: catNombre })
  if (usarVar1 && tallaId && tallaNombre) chips.push({ key: 'talla', label: tallaNombre })
  if (usarVar2 && colorId && colorNombre) chips.push({ key: 'color', label: colorNombre })
  if (bajo) chips.push({ key: 'bajo', label: 'Bajo stock' })

  const formFields = (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 items-end',
        usarVar1 && usarVar2
          ? 'sm:grid-cols-2 lg:grid-cols-4'
          : usarVar1 || usarVar2
            ? 'sm:grid-cols-2 lg:grid-cols-3'
            : 'sm:grid-cols-2'
      )}
    >
      <Input
        label="Buscar"
        placeholder="Nombre, código de producto o de barras"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        label="Categoría"
        value={categoriaId}
        onChange={(e) => {
          setCategoriaId(e.target.value)
          navegar({ categoria: e.target.value })
        }}
      >
        <option value="">Todas</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      {usarVar1 && (
        <Select
          label={labelVar1}
          value={tallaId}
          onChange={(e) => {
            setTallaId(e.target.value)
            navegar({ talla: e.target.value })
          }}
        >
          <option value="">Todos</option>
          {tallas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Select>
      )}
      {usarVar2 && (
        <Select
          label={labelVar2}
          value={colorId}
          onChange={(e) => {
            setColorId(e.target.value)
            navegar({ color: e.target.value })
          }}
        >
          <option value="">Todos</option>
          {colores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Mobile bar */}
      <div className="flex gap-2 md:hidden">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar stock"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 min-h-11 px-3"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {chips.length > 0 && (
            <span className="ml-1.5 text-xs font-semibold tabular-nums">{chips.length}</span>
          )}
        </Button>
        <Button
          type="button"
          variant={bajo ? 'primary' : 'secondary'}
          className="shrink-0 min-h-11 px-3 text-xs"
          onClick={toggleBajo}
        >
          Bajo
        </Button>
      </div>

      {/* Desktop filters */}
      <form
        onSubmit={aplicar}
        className="hidden md:block bg-surface rounded-[var(--radius-lg)] border border-border-subtle p-4 space-y-3 shadow-xs"
      >
        {formFields}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={bajo}
              onChange={toggleBajo}
              className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40 focus:ring-offset-0"
            />
            Solo bajo stock
          </label>
          <div className="flex gap-2 ml-auto">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Filtrando…' : 'Aplicar'}
            </Button>
            {chips.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </form>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => quitarChip(c.key)}
              className="inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-border-default bg-surface-sunken px-2.5 py-1 text-xs font-medium text-fg hover:border-border-strong focus-ring cursor-pointer"
            >
              {c.label}
              <X className="h-3 w-3 text-fg-muted" aria-hidden />
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtros de stock"
        side="bottom"
        footer={
          <div className="flex gap-2 w-full">
            <Button type="button" variant="ghost" className="flex-1 min-h-11" onClick={limpiar}>
              Limpiar
            </Button>
            <Button type="button" className="flex-1 min-h-11" onClick={() => aplicar()}>
              Aplicar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pb-2">
          {formFields}
          <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={bajo}
              onChange={(e) => setBajo(e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40 focus:ring-offset-0"
            />
            Solo bajo stock
          </label>
        </div>
      </Drawer>
    </div>
  )
}
