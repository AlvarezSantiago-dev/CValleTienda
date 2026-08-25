'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ControlledTabs } from '@/components/ui/Tabs'
import { IngresoForm } from '@/components/stock/IngresoForm'
import { AjusteForm } from '@/components/stock/AjusteForm'

interface Props {
  open: boolean
  onClose: () => void
  varianteId: string
  productoNombre: string
  varianteLabel: string | null
  stockActual: number
  unidadDeMedida: string
  esBundle?: boolean
  initialTab?: 'ingreso' | 'ajuste'
}

export function StockAccionSheet({
  open,
  onClose,
  varianteId,
  productoNombre,
  varianteLabel,
  stockActual,
  unidadDeMedida,
  esBundle = false,
  initialTab = 'ingreso',
}: Props) {
  const [tab, setTab] = useState<'ingreso' | 'ajuste'>(initialTab)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={productoNombre}
      description={varianteLabel ? `Variante: ${varianteLabel}` : 'Gestionar stock'}
      size="lg"
    >
      {esBundle ? (
        <p className="text-sm text-fg-muted">
          Este producto es un bundle: el stock se gestiona por sus componentes.
        </p>
      ) : (
        <div className="space-y-4">
          <ControlledTabs
            value={tab}
            onChange={(v) => setTab(v as 'ingreso' | 'ajuste')}
            items={[
              { value: 'ingreso', label: 'Ingresar' },
              { value: 'ajuste', label: 'Ajustar' },
            ]}
            variant="pill"
          />
          {tab === 'ingreso' ? (
            <IngresoForm
              varianteId={varianteId}
              unidadDeMedida={unidadDeMedida}
              autoFocus
              compact
            />
          ) : (
            <AjusteForm
              varianteId={varianteId}
              stockActual={stockActual}
              unidadDeMedida={unidadDeMedida}
              autoFocus
              compact
            />
          )}
        </div>
      )}
    </Modal>
  )
}
