'use client'

import { createContext, useContext } from 'react'
import type { PlanTipo } from '@/lib/planes/config'

interface PlanContextValue {
  plan:         PlanTipo
  planEfectivo: PlanTipo
  trial_hasta:  string | null
  esTrial:      boolean
  diasTrial:    number
}

const PlanContext = createContext<PlanContextValue>({
  plan:         'basico',
  planEfectivo: 'basico',
  trial_hasta:  null,
  esTrial:      false,
  diasTrial:    0,
})

export function PlanProvider({
  children,
  plan,
  planEfectivo,
  trial_hasta,
  esTrial,
  diasTrial,
}: PlanContextValue & { children: React.ReactNode }) {
  return (
    <PlanContext.Provider value={{ plan, planEfectivo, trial_hasta, esTrial, diasTrial }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan(): PlanContextValue {
  return useContext(PlanContext)
}
