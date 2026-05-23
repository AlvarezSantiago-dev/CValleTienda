'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface PageContextValue {
  title: string
  setTitle: (t: string) => void
}

const PageContext = createContext<PageContextValue>({ title: '', setTitle: () => {} })

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  return (
    <PageContext.Provider value={{ title, setTitle }}>
      {children}
    </PageContext.Provider>
  )
}

export function usePageTitle() {
  return useContext(PageContext)
}
