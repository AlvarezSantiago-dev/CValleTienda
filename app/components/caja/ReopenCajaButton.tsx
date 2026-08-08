'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { reabrirCaja } from '@/app/actions/caja'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  sesionId: string
}

export function ReopenCajaButton({ sesionId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await reabrirCaja(sesionId)
      if (!res.ok) {
        setError(res.error ?? 'Error al reabrir la caja')
        return
      }
      router.push('/caja')
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setMostrar(true)}
        className="border-warning-border bg-warning-soft text-warning-soft-fg hover:bg-warning-soft"
      >
        <RotateCcw size={14} aria-hidden />
        Anular cierre y reabrir
      </Button>

      <Modal
        open={mostrar}
        onClose={() => {
          setMostrar(false)
          setError(null)
        }}
        title="Anular cierre y reabrir caja"
        description="Esto eliminará el cierre registrado y dejará la sesión abierta nuevamente, como si no se hubiera cerrado."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMostrar(false)
                setError(null)
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'Reabriendo…' : 'Confirmar reapertura'}
            </Button>
          </>
        }
      >
        <div className="rounded-[var(--radius-md)] bg-warning-soft border border-warning-border px-4 py-3 text-sm text-warning-soft-fg">
          Solo disponible mientras no haya otra sesión abierta. Usalo únicamente si el cierre fue un
          error.
        </div>
        {error && <p className="mt-3 text-sm text-danger-soft-fg">{error}</p>}
      </Modal>
    </>
  )
}
