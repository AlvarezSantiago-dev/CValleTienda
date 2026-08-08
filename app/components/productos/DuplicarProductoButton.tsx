'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { duplicarProducto } from '@/app/actions/productos'

interface DuplicarProductoButtonProps {
  id: string
}

export function DuplicarProductoButton({ id }: DuplicarProductoButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const res = await duplicarProducto(id)
      if (res.ok && res.data && typeof res.data === 'object' && 'id' in res.data) {
        router.push(`/productos/${(res.data as { id: string }).id}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm text-fg-muted border border-border-default rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-surface-sunken disabled:opacity-50 transition-colors"
    >
      <span>⎘</span>
      {pending ? 'Duplicando...' : 'Duplicar'}
    </button>
  )
}
