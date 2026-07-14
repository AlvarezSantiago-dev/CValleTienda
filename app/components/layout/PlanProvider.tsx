'use client'

import { createContext, useContext } from 'react'
import type { PlanTipo } from '@/lib/planes/config'
import type { EstadoAcceso } from '@/lib/planes/acceso'

interface PlanContextValue {
  plan:          PlanTipo
  planEfectivo:  PlanTipo
  trial_hasta:   string | null
  esTrial:       boolean
  diasTrial:     number
  acceso_hasta:  string | null
  tieneAcceso:   boolean
  diasAcceso:    number
  estadoAcceso:  EstadoAcceso
}

const PlanContext = createContext<PlanContextValue>({
  plan:         'basico',
  planEfectivo: 'basico',
  trial_hasta:  null,
  esTrial:      false,
  diasTrial:    0,
  acceso_hasta: null,
  tieneAcceso:  true,
  diasAcceso:   0,
  estadoAcceso: 'activo',
})

export function PlanProvider({
  children,
  plan,
  planEfectivo,
  trial_hasta,
  esTrial,
  diasTrial,
  acceso_hasta,
  tieneAcceso,
  diasAcceso,
  estadoAcceso,
}: PlanContextValue & { children: React.ReactNode }) {
  return (
    <PlanContext.Provider
      value={{
        plan,
        planEfectivo,
        trial_hasta,
        esTrial,
        diasTrial,
        acceso_hasta,
        tieneAcceso,
        diasAcceso,
        estadoAcceso,
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan(): PlanContextValue {
  return useContext(PlanContext)
}
