'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { eliminarProducto } from '@/app/actions/productos'

interface Props {
  id: string
  nombre: string
}

export function EliminarProductoButton({ id, nombre }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (
      !confirm(
        `¿Eliminar el producto "${nombre}"? Se desactivará junto con sus variantes (no se borra el historial).`
      )
    )
      return
    startTransition(async () => {
      const res = await eliminarProducto(id)
      if (!res.ok) {
        alert(res.error ?? 'Error al eliminar')
        return
      }
      router.push('/productos')
      router.refresh()
    })
  }

  return (
    <Button variant="danger" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? 'Eliminando...' : 'Eliminar producto'}
    </Button>
  )
}
