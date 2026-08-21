import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Catálogo',
  robots: { index: false, follow: false },
}

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-fg antialiased">{children}</div>
  )
}
