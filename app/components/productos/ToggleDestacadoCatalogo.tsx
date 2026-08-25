'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/Switch'
import { setDestacadoEnCatalogo } from '@/app/actions/catalogo'

export function ToggleDestacadoCatalogo({
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
          const res = await setDestacadoEnCatalogo(productoId, v)
          if (!res.ok) setChecked(prev)
        })
      }}
      aria-label="Destacar en catálogo"
    />
  )
}
