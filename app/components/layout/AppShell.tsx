'use client'

import { useCallback, useEffect, useState } from 'react'
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
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  useCommandPaletteHotkey(openPalette)

  const enPos = pathname === '/pos' || pathname.startsWith('/pos/')
  const showBottomNav = !enPos

  // Cerrar drawer al navegar
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Scroll lock + Escape mientras el drawer móvil está abierto
  useEffect(() => {
    if (!sidebarOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen])

  return (
    <VoiceProvider>
      <PageProvider>
        <div className="h-[100dvh] bg-background flex overflow-hidden">
          {/* Overlay móvil — debajo del panel del drawer */}
          <div
            className={cn(
              'fixed inset-0 z-(--z-overlay) bg-surface-overlay transition-opacity duration-(--duration-base) lg:hidden',
              sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onClick={closeSidebar}
            aria-hidden
          />

          {/* Sidebar — drawer mobile (z-modal > overlay) / rail desktop */}
          <div
            className={cn(
              'fixed inset-y-0 left-0 z-(--z-modal) transition-transform duration-(--duration-base) ease-emphasized',
              'lg:relative lg:z-auto lg:translate-x-0 print:hidden',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <SidebarV2
              perfil={perfil}
              tiendaNombre={tiendaNombre}
              onClose={closeSidebar}
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
                menuOpen={sidebarOpen}
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

          {showBottomNav && (
            <BottomNav
              rol={perfil.rol as RolUsuario}
              onMenuClick={() => setSidebarOpen(true)}
              menuOpen={sidebarOpen}
              className={sidebarOpen ? 'pointer-events-none' : undefined}
            />
          )}

          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            rol={perfil.rol as RolUsuario}
          />

          {/* Voz — ocultar FAB táctil cuando el menú está abierto */}
          <div className={cn(sidebarOpen && 'max-lg:pointer-events-none max-lg:invisible')}>
            <VoiceFab />
          </div>
          <VoiceHUD />
          <VoiceProductoWizard />
        </div>
      </PageProvider>
    </VoiceProvider>
  )
}
