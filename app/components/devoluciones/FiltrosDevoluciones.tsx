'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface FiltrosDevolucionesProps {
  basePath?: string
}

export function FiltrosDevoluciones({
  basePath = '/devoluciones',
}: FiltrosDevolucionesProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(sp.get('q') ?? '')
  const [desde, setDesde] = useState(sp.get('desde') ?? '')
  const [hasta, setHasta] = useState(sp.get('hasta') ?? '')
  const [tipo, setTipo] = useState(sp.get('tipo') ?? '')

  function aplicar(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    if (tipo) params.set('tipo', tipo)
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
  }

  function limpiar() {
    setSearch('')
    setDesde('')
    setHasta('')
    setTipo('')
    startTransition(() => router.push(basePath))
  }

  const tieneFiltros = !!search.trim() || !!desde || !!hasta || !!tipo

  return (
    <form
      onSubmit={aplicar}
      className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
    >
      <Input
        label="Buscar"
        placeholder="# devolución o motivo"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Input
        label="Desde"
        type="date"
        value={desde}
        onChange={(e) => setDesde(e.target.value)}
      />
      <Input
        label="Hasta"
        type="date"
        value={hasta}
        onChange={(e) => setHasta(e.target.value)}
      />
      <Select
        label="Tipo"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
      >
        <option value="">Todos</option>
        <option value="total">Total</option>
        <option value="parcial">Parcial</option>
      </Select>
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
    </form>
  )
}
