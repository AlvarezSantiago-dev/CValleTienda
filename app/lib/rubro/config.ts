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
  },
  ferreteria: {
    rubro: 'ferreteria',
    labelVar1: 'Medida',
    labelVar2: 'Material',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'pack', 'caja'],
    descripcion: 'Ferretería y materiales de construcción menores',
  },
  corralon: {
    rubro: 'corralon',
    labelVar1: 'Tipo',
    labelVar2: 'Calidad',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['unidad', 'kg', 'tonelada', 'm3', 'metro', 'bolsa'],
    descripcion: 'Corralón de materiales de construcción',
  },
  despensa: {
    rubro: 'despensa',
    labelVar1: 'Marca',
    labelVar2: 'Presentación',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'kg', 'gramo', 'litro', 'pack'],
    descripcion: 'Despensa, kiosco o minimarket',
  },
  libreria: {
    rubro: 'libreria',
    labelVar1: 'Marca',
    labelVar2: 'Modelo',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'pack', 'caja'],
    descripcion: 'Librería y papelería',
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
  },
  carniceria: {
    rubro: 'carniceria',
    labelVar1: 'Corte',
    labelVar2: 'Procedencia',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['kg', 'gramo', 'unidad'],
    descripcion: 'Carnicería y fiambrería',
  },
  farmacia: {
    rubro: 'farmacia',
    labelVar1: 'Presentación',
    labelVar2: 'Laboratorio',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['unidad', 'caja', 'pack'],
    descripcion: 'Farmacia y perfumería',
  },
  verduleria: {
    rubro: 'verduleria',
    labelVar1: 'Variedad',
    labelVar2: 'Origen',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['kg', 'gramo', 'unidad'],
    descripcion: 'Verduleria y fruteriía',
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
