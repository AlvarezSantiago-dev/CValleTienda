'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import type { Perfil } from '@/types/database'
import { VoiceProvider } from '@/components/voz/VoiceProvider'
import { VoiceFab } from '@/components/voz/VoiceFab'
import { VoiceHUD } from '@/components/voz/VoiceHUD'
import { VoiceProductoWizard } from '@/components/voz/VoiceProductoWizard'

interface AppShellProps {
  perfil: Perfil
  tiendaNombre: string
  children: React.ReactNode
}

export function AppShell({ perfil, tiendaNombre, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <VoiceProvider>
      <div className="h-screen bg-white flex overflow-hidden">
        {/* Overlay móvil */}
        <div
          className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-300 lg:hidden ${
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />

        {/* Sidebar — drawer en mobile, estático en desktop */}
        <div
          className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 print:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            perfil={perfil}
            tiendaNombre={tiendaNombre}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="print:hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
          </div>
          {children}
        </div>

        {/* Control por voz */}
        <VoiceFab />
        <VoiceHUD />
        <VoiceProductoWizard />
      </div>
    </VoiceProvider>
  )
}
