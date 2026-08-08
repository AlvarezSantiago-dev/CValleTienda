'use client'

import { useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarV2 } from './SidebarV2'
import Header from './Header'
import { BottomNav } from './BottomNav'
import { CommandPalette, useCommandPaletteHotkey } from './CommandPalette'
import { PageProvider } from './PageContext'
import type { Perfil, RolUsuario } from '@/types/database'
import { VoiceProvider } from '@/components/voz/VoiceProvider'
import { VoiceFab } from '@/components/voz/VoiceFab'
import { VoiceHUD } from '@/components/voz/VoiceHUD'
import { VoiceProductoWizard } from '@/components/voz/VoiceProductoWizard'
import { cn } from '@/components/ui/cn'

interface AppShellProps {
  perfil: Perfil
  tiendaNombre: string
  cajaAbierta?: boolean
  children: React.ReactNode
}

export function AppShell({
  perfil,
  tiendaNombre,
  cajaAbierta = false,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  useCommandPaletteHotkey(openPalette)

  const enPos = pathname === '/pos' || pathname.startsWith('/pos/')
  const showBottomNav = !enPos

  return (
    <VoiceProvider>
      <PageProvider>
        <div className="h-[100dvh] bg-background flex overflow-hidden">
          {/* Overlay móvil */}
          <div
            className={cn(
              'fixed inset-0 z-(--z-overlay) bg-surface-overlay transition-opacity duration-(--duration-base) lg:hidden',
              sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />

          {/* Sidebar — drawer mobile / rail desktop */}
          <div
            className={cn(
              'fixed inset-y-0 left-0 z-(--z-nav) transition-transform duration-(--duration-base) ease-emphasized',
              'lg:relative lg:translate-x-0 print:hidden',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <SidebarV2
              perfil={perfil}
              tiendaNombre={tiendaNombre}
              onClose={() => setSidebarOpen(false)}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
            />
          </div>

          {/* Contenido principal */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="print:hidden">
              <Header
                onMenuClick={() => setSidebarOpen(true)}
                onSearchClick={openPalette}
                cajaAbierta={cajaAbierta}
              />
            </div>
            <div
              className={cn(
                'flex-1 flex flex-col min-h-0 overflow-hidden',
                showBottomNav && 'pb-16 lg:pb-0'
              )}
            >
              {children}
            </div>
          </div>

          <BottomNav
            rol={perfil.rol as RolUsuario}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            rol={perfil.rol as RolUsuario}
          />

          {/* Voz */}
          <VoiceFab />
          <VoiceHUD />
          <VoiceProductoWizard />
        </div>
      </PageProvider>
    </VoiceProvider>
  )
}
