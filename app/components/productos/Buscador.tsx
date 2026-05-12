'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import { buscarProductoPorCodigoBarras } from '@/app/actions/productos'

const RE_CODIGO = /^[A-Za-z0-9_-]{8,14}$/

/**
 * Buscador con debounce que sincroniza el término al search param `q`.
 * Si el usuario escanea un código (8-14 alfanuméricos + Enter) y matchea
 * exacto, navega al detalle del producto.
 */
export function Buscador() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = searchParams.get('q') ?? ''
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useAutoFocus(inputRef)

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : '?')
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const q = value.trim()
    if (!RE_CODIGO.test(q)) return
    e.preventDefault()
    startTransition(async () => {
      const res = await buscarProductoPorCodigoBarras(q)
      if (res.ok && res.data?.producto_id) {
        router.push(`/productos/${res.data.producto_id}`)
      }
    })
  }

  return (
    <Input
      ref={inputRef}
      placeholder="Buscar por nombre o escanear código…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      aria-label="Buscar productos"
      autoComplete="off"
      disabled={pending}
    />
  )
}
