'use client'

import { Mic, MicOff, Package } from 'lucide-react'
import { useVoz } from './VoiceProvider'
import type { VozPaso } from '@/lib/voz/tipos'

function getEstadoFab(paso: VozPaso): {
  color: string
  icon: React.ReactNode
  pulse: boolean
  label: string
} {
  if (paso === 'inactivo') {
    return {
      color: 'bg-gray-800 hover:bg-gray-700 text-white',
      icon: <Mic size={22} />,
      pulse: false,
      label: 'Activar control por voz',
    }
  }

  if (paso === 'escuchando_nav') {
    return {
      color: 'bg-lime-600 hover:bg-lime-700 text-white',
      icon: <Mic size={22} />,
      pulse: true,
      label: 'Escuchando...',
    }
  }

  if (paso === 'producto_error') {
    return {
      color: 'bg-red-600 hover:bg-red-700 text-white',
      icon: <MicOff size={22} />,
      pulse: false,
      label: 'Error de voz',
    }
  }

  if (paso === 'producto_listo') {
    return {
      color: 'bg-lime-600 text-white',
      icon: <Package size={22} />,
      pulse: false,
      label: '¡Guardado!',
    }
  }

  if (paso === 'producto_guardando') {
    return {
      color: 'bg-lime-500 text-white',
      icon: <Package size={22} />,
      pulse: true,
      label: 'Guardando...',
    }
  }

  // Cualquier paso del flujo de producto
  return {
    color: 'bg-lime-600 hover:bg-lime-700 text-white',
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

  // Ocultar si el navegador no soporta Speech API
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
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-200
        print:hidden
        ${estado.color}
        ${estado.pulse ? 'ring-4 ring-lime-400/30' : ''}
      `}
    >
      {/* Ícono principal */}
      {estado.icon}

      {/* Número de paso (badge) */}
      {numerito && (
        <span className="absolute -top-1 -right-1 bg-white text-lime-700 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow border border-lime-200">
          {numerito}
        </span>
      )}

      {/* Anillo pulsante de escucha activa */}
      {estado.pulse && (
        <span className="absolute inset-0 rounded-full animate-ping bg-lime-400/25 pointer-events-none" />
      )}
    </button>
  )
}
