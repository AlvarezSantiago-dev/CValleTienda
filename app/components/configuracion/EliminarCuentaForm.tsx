'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { eliminarMiCuenta } from '@/app/actions/cuenta'
import type { RolUsuario } from '@/types/database'

export function EliminarCuentaForm({
  rol,
  nombreTienda,
  email,
}: {
  rol: RolUsuario
  nombreTienda: string
  email: string
}) {
  const router = useRouter()
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const esOwner = rol === 'owner'

  const placeholder = esOwner ? nombreTienda : 'ELIMINAR'
  const listo = esOwner
    ? confirmacion.trim().toLocaleLowerCase('es') === nombreTienda.trim().toLocaleLowerCase('es')
    : confirmacion.trim().toLowerCase() === 'eliminar' ||
      confirmacion.trim().toLowerCase() === email.toLowerCase()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await eliminarMiCuenta(confirmacion)
      if (!res.ok) {
        setError(res.error ?? 'No se pudo eliminar')
        return
      }
      router.push('/login?ok=cuenta-eliminada')
    })
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft p-5 space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-danger-soft-fg">Zona peligrosa</h2>
        <p className="mt-1 text-[13px] text-danger-soft-fg/90 leading-relaxed">
          {esOwner ? (
            <>
              Elimina <strong>esta tienda</strong>, todos los datos (productos, ventas, clientes, caja)
              y los logins del equipo. No se puede deshacer.
            </>
          ) : (
            <>
              Elimina <strong>tu usuario</strong> de esta tienda. El negocio sigue. No se puede deshacer.
            </>
          )}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label={esOwner ? `Escribí “${nombreTienda}” para confirmar` : 'Escribí ELIMINAR o tu email'}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {error && (
          <p className="text-xs text-danger-soft-fg" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="danger" disabled={!listo || isPending} isLoading={isPending}>
          {esOwner ? 'Eliminar tienda y cuenta' : 'Eliminar mi usuario'}
        </Button>
      </form>
    </section>
  )
}
