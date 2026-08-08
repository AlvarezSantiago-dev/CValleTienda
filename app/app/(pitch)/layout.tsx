import type { ReactNode } from 'react'

export default function PitchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-hidden bg-background antialiased text-fg">
      {children}
    </div>
  )
}
