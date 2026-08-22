import type { Metadata } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Catálogo',
  robots: { index: false, follow: false },
}

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-fg antialiased pb-[env(safe-area-inset-bottom)]">
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        offset={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
        mobileOffset={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
        toastOptions={{
          classNames: {
            toast:
              'bg-surface text-fg border border-border-default shadow-md rounded-[var(--radius-lg)]',
            title: 'text-fg font-medium',
            description: 'text-fg-muted',
            actionButton: 'bg-primary text-primary-fg',
            cancelButton: 'bg-surface-sunken text-fg-muted',
            closeButton: 'bg-surface border-border-default text-fg-muted',
          },
        }}
      />
    </div>
  )
}
