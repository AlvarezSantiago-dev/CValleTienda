'use client'

import { createContext, useContext } from 'react'
import { getConfigRubro } from '@/lib/rubro/config'
import type { ConfigRubro, Rubro } from '@/lib/rubro/config'

const RubroContext = createContext<ConfigRubro>(getConfigRubro('generico'))

interface RubroProviderProps {
  rubro: Rubro
  children: React.ReactNode
}

export function RubroProvider({ rubro, children }: RubroProviderProps) {
  return (
    <RubroContext.Provider value={getConfigRubro(rubro)}>
      {children}
    </RubroContext.Provider>
  )
}

export function useRubro(): ConfigRubro {
  return useContext(RubroContext)
}
