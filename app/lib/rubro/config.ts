// =============================================================
// lib/rubro/config.ts
// Configuración estática de rubros para uso en el frontend.
// Espejo de la tabla config_rubro en DB — sin consulta extra.
// =============================================================

import type { Rubro, UnidadMedida } from '@/types/database'

export type { Rubro }

export interface ConfigRubro {
  rubro: Rubro
  labelVar1: string
  labelVar2: string
  usarVar1: boolean
  usarVar2: boolean
  unidadesDisponibles: UnidadMedida[]
  descripcion: string
  /** Mostrar módulo Remitos en el sidebar */
  usarRemitos: boolean
  /** Mostrar módulo Devoluciones en el sidebar */
  usarDevoluciones: boolean
  /** El toggle de variantes inicia en OFF — para rubros donde el 90% son productos simples */
  defaultSinVariantes: boolean
  /** La var2 usa picker de color hexadecimal (true solo para ropa) */
  usarHexVar2: boolean
}

export const CONFIG_RUBROS: Record<Rubro, ConfigRubro> = {
  ropa: {
    rubro: 'ropa',
    labelVar1: 'Talla',
    labelVar2: 'Color',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad'],
    descripcion: 'Tienda de indumentaria y accesorios',
    usarRemitos: false,
    usarDevoluciones: true,
    defaultSinVariantes: false,
    usarHexVar2: true,
  },
  ferreteria: {
    rubro: 'ferreteria',
    labelVar1: 'Medida',
    labelVar2: 'Material',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'pack', 'caja'],
    descripcion: 'Ferretería y materiales de construcción menores',
    usarRemitos: true,
    usarDevoluciones: true,
    defaultSinVariantes: false,
    usarHexVar2: false,
  },
  corralon: {
    rubro: 'corralon',
    labelVar1: 'Tipo',
    labelVar2: 'Calidad',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['unidad', 'kg', 'tonelada', 'm3', 'metro', 'bolsa'],
    descripcion: 'Corralón de materiales de construcción',
    usarRemitos: true,
    usarDevoluciones: false,
    defaultSinVariantes: false,
    usarHexVar2: false,
  },
  despensa: {
    rubro: 'despensa',
    labelVar1: 'Marca',
    labelVar2: 'Presentación',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'kg', 'gramo', 'litro', 'pack'],
    descripcion: 'Despensa, kiosco o minimarket',
    usarRemitos: false,
    usarDevoluciones: false,
    defaultSinVariantes: true,
    usarHexVar2: false,
  },
  libreria: {
    rubro: 'libreria',
    labelVar1: 'Marca',
    labelVar2: 'Modelo',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'pack', 'caja'],
    descripcion: 'Librería y papelería',
    usarRemitos: false,
    usarDevoluciones: true,
    defaultSinVariantes: false,
    usarHexVar2: false,
  },
  generico: {
    rubro: 'generico',
    labelVar1: 'Variante 1',
    labelVar2: 'Variante 2',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: [
      'unidad', 'kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada', 'bolsa', 'pack', 'caja',
    ],
    descripcion: 'Negocio genérico — configurable',
    usarRemitos: true,
    usarDevoluciones: true,
    defaultSinVariantes: false,
    usarHexVar2: false,
  },
  carniceria: {
    rubro: 'carniceria',
    labelVar1: 'Corte',
    labelVar2: 'Procedencia',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['kg', 'gramo', 'unidad'],
    descripcion: 'Carnicería y fiambrería',
    usarRemitos: false,
    usarDevoluciones: false,
    defaultSinVariantes: true,
    usarHexVar2: false,
  },
  farmacia: {
    rubro: 'farmacia',
    labelVar1: 'Presentación',
    labelVar2: 'Laboratorio',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['unidad', 'caja', 'pack'],
    descripcion: 'Farmacia y perfumería',
    usarRemitos: false,
    usarDevoluciones: true,
    defaultSinVariantes: true,
    usarHexVar2: false,
  },
  verduleria: {
    rubro: 'verduleria',
    labelVar1: 'Variedad',
    labelVar2: 'Origen',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['kg', 'gramo', 'unidad'],
    descripcion: 'Verdulería y frutería',
    usarRemitos: false,
    usarDevoluciones: false,
    defaultSinVariantes: true,
    usarHexVar2: false,
  },
}

export function getConfigRubro(rubro: Rubro): ConfigRubro {
  return CONFIG_RUBROS[rubro] ?? CONFIG_RUBROS.generico
}

export const TODOS_LOS_RUBROS: Rubro[] = [
  'ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico',
  'carniceria', 'farmacia', 'verduleria',
]

export const LABEL_RUBRO: Record<Rubro, string> = {
  ropa: '👗 Tienda de Ropa',
  ferreteria: '🔧 Ferretería',
  corralon: '🏗️ Corralón',
  despensa: '🛒 Despensa / Kiosco',
  libreria: '📚 Librería',
  generico: '🏪 Otro rubro',
  carniceria: '🥩 Carnicería',
  farmacia: '💊 Farmacia',
  verduleria: '🥬 Verduleria',
}

export const TODAS_LAS_UNIDADES: { value: UnidadMedida; label: string }[] = [
  { value: 'unidad',   label: 'Unidad' },
  { value: 'kg',       label: 'Kilogramo (kg)' },
  { value: 'gramo',    label: 'Gramo (g)' },
  { value: 'tonelada', label: 'Tonelada (t)' },
  { value: 'litro',    label: 'Litro (L)' },
  { value: 'metro',    label: 'Metro lineal (m)' },
  { value: 'm2',       label: 'Metro cuadrado (m²)' },
  { value: 'm3',       label: 'Metro cúbico (m³)' },
  { value: 'bolsa',    label: 'Bolsa' },
  { value: 'pack',     label: 'Pack' },
  { value: 'caja',     label: 'Caja' },
]
