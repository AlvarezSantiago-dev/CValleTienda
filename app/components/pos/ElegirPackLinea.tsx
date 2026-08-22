'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { labelPack } from '@/lib/packs/virtual'
import type { ProductoPack } from '@/lib/packs/types'

export function ElegirPackLinea({
  packs,
  cantidadUnidades,
  onElegir,
}: {
  packs: ProductoPack[]
  cantidadUnidades: number
  onElegir: (pack: ProductoPack) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const disponibles = packs.filter((p) => p.unidades > 1 && p.unidades <= cantidadUnidades)
  if (packs.length === 0) return null

  return (
    <div className="mt-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setAbierto((v) => !v)}
      >
        Pasar a pack…
      </Button>
      {abierto && (
        <div className="mt-1 flex flex-wrap gap-1">
          {packs.map((p) => {
            const cabe = p.unidades <= cantidadUnidades
            const n = Math.floor(cantidadUnidades / p.unidades)
            return (
              <button
                key={p.id}
                type="button"
                disabled={!cabe}
                onClick={() => {
                  onElegir(p)
                  setAbierto(false)
                }}
                className="text-[11px] px-2 py-1 rounded-[var(--radius-md)] border border-border-default text-fg disabled:opacity-40 hover:bg-primary-soft"
              >
                {labelPack(p.unidades, p.nombre)}
                {cabe ? ` · ${n}` : ''}
              </button>
            )
          })}
          {disponibles.length === 0 && (
            <p className="text-[11px] text-fg-muted">Agregá más unidades para armar un pack.</p>
          )}
        </div>
      )}
    </div>
  )
}
