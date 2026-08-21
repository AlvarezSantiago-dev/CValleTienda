'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/Switch'
import { setVisibleEnCatalogo } from '@/app/actions/catalogo'

export function ToggleCatalogoProducto({
  productoId,
  initial,
  disabled,
}: {
  productoId: string
  initial: boolean
  disabled?: boolean
}) {
  const [checked, setChecked] = useState(initial)
  const [pending, start] = useTransition()

  return (
    <Switch
      checked={checked}
      disabled={disabled || pending}
      onChange={(v) => {
        const prev = checked
        setChecked(v)
        start(async () => {
          const res = await setVisibleEnCatalogo(productoId, v)
          if (!res.ok) setChecked(prev)
        })
      }}
      aria-label="Mostrar en catálogo"
    />
  )
}
