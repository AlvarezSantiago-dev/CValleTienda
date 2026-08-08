'use client'

import { Mic, MicOff, Package } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useVoz } from './VoiceProvider'
import type { VozPaso } from '@/lib/voz/tipos'
import { cn } from '@/components/ui/cn'

function getEstadoFab(paso: VozPaso): {
  color: string
  icon: React.ReactNode
  pulse: boolean
  label: string
} {
  if (paso === 'inactivo') {
    return {
      color: 'bg-fg hover:opacity-90 text-fg-inverse',
      icon: <Mic size={22} />,
      pulse: false,
      label: 'Activar control por voz',
    }
  }

  if (paso === 'escuchando_nav') {
    return {
      color: 'bg-primary hover:bg-primary-hover text-primary-fg',
      icon: <Mic size={22} />,
      pulse: true,
      label: 'Escuchando...',
    }
  }

  if (paso === 'producto_error') {
    return {
      color: 'bg-danger hover:bg-danger-hover text-fg-inverse',
      icon: <MicOff size={22} />,
      pulse: false,
      label: 'Error de voz',
    }
  }

  if (paso === 'producto_listo') {
    return {
      color: 'bg-primary text-primary-fg',
      icon: <Package size={22} />,
      pulse: false,
      label: '¡Guardado!',
    }
  }

  if (paso === 'producto_guardando') {
    return {
      color: 'bg-accent text-primary-fg',
      icon: <Package size={22} />,
      pulse: true,
      label: 'Guardando...',
    }
  }

  return {
    color: 'bg-primary hover:bg-primary-hover text-primary-fg',
    icon: <Mic size={22} />,
    pulse: true,
    label: 'Escuchando producto...',
  }
}

function pasoPorcentaje(paso: VozPaso): string | null {
  const pasos: VozPaso[] = [
    'producto_nombre',
    'producto_codigo_barras',
    'producto_precio_venta',
    'producto_precio_compra',
    'producto_unidad',
    'producto_categoria',
    'producto_categoria_crear',
    'producto_variantes_yn',
    'producto_variantes',
    'producto_variantes_color_yn',
    'producto_variantes_color',
    'producto_variantes_stock',
    'producto_stock_simple',
    'producto_stock_minimo',
    'producto_descripcion',
    'producto_confirmar',
  ]
  const idx = pasos.indexOf(paso)
  if (idx === -1) return null
  return `${idx + 1}/${pasos.length}`
}

export function VoiceFab() {
  const { paso, soportado, iniciarNav, cancelar } = useVoz()
  const pathname = usePathname()
  const enPos = pathname === '/pos' || pathname.startsWith('/pos/')

  if (!soportado) return null

  const estado = getEstadoFab(paso)
  const numerito = pasoPorcentaje(paso)
  const estaActivo = paso !== 'inactivo'

  const handleClick = () => {
    if (estaActivo) {
      cancelar()
    } else {
      iniciarNav()
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label={estado.label}
      title={estado.label}
      className={cn(
        'fixed right-6 z-(--z-toast) w-14 h-14 rounded-full shadow-lg',
        'flex items-center justify-center transition-all duration-(--duration-base)',
        'print:hidden focus-ring cursor-pointer',
        estado.color,
        estado.pulse && 'ring-4 ring-primary-border',
        enPos
          ? 'bottom-6'
          : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6'
      )}
    >
      {estado.icon}
      {numerito && (
        <span className="absolute -top-1 -right-1 bg-surface text-fg-brand text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow border border-primary-border">
          {numerito}
        </span>
      )}
      {estado.pulse && (
        <span className="absolute inset-0 rounded-full animate-ping bg-accent/25 pointer-events-none" />
      )}
    </button>
  )
}
