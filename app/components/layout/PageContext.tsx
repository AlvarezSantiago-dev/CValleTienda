'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface PageContextValue {
  title: string
  setTitle: (t: string) => void
  actions: ReactNode
  setActions: (n: ReactNode) => void
}

const PageContext = createContext<PageContextValue>({
  title: '',
  setTitle: () => {},
  actions: null,
  setActions: () => {},
})

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  const [actions, setActions] = useState<ReactNode>(null)
  return (
    <PageContext.Provider value={{ title, setTitle, actions, setActions }}>
      {children}
    </PageContext.Provider>
  )
}

export function usePageTitle() {
  return useContext(PageContext)
}

export function usePageActions() {
  const { actions, setActions } = useContext(PageContext)
  return { actions, setActions }
}
