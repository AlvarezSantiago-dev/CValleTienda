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
  /** Mostrar sección de balanza electrónica (solo rubros que venden por peso) */
  usarBalanza: boolean
  /** Habilitar pack por variante (ej: pack de 6 sodas, pernos) */
  usarPack: boolean
  /** POS: toggle Contado / A cuenta + recargo por producto */
  usarPedidoCc: boolean
  /** Al confirmar venta, emitir remito automático */
  remitoAutoVenta: boolean
  /** A cuenta exige cliente en el POS */
  clienteObligatorioCc: boolean
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
    usarBalanza: false,
    usarPack: false,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: false,
    usarPack: true,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: true,
    usarPack: false,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: true,
    usarPack: true,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: false,
    usarPack: true,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: true,
    usarPack: true,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
  },
  carniceria: {
    rubro: 'carniceria',
    labelVar1: 'Corte',
    labelVar2: 'Procedencia',
    usarVar1: true,
    usarVar2: false,
    unidadesDisponibles: ['kg', 'gramo', 'unidad', 'pack', 'caja'],
    descripcion: 'Carnicería y fiambrería',
    usarRemitos: false,
    usarDevoluciones: false,
    defaultSinVariantes: true,
    usarHexVar2: false,
    usarBalanza: true,
    usarPack: true,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: false,
    usarPack: true,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
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
    usarBalanza: true,
    usarPack: false,
    usarPedidoCc: false,
    remitoAutoVenta: false,
    clienteObligatorioCc: false,
  },
  distribuidora: {
    rubro: 'distribuidora',
    labelVar1: 'Marca',
    labelVar2: 'Presentación',
    usarVar1: true,
    usarVar2: true,
    unidadesDisponibles: ['unidad', 'pack', 'caja', 'litro', 'kg'],
    descripcion: 'Distribuidora — pedidos de mostrador, remito y cuenta corriente',
    usarRemitos: true,
    usarDevoluciones: true,
    defaultSinVariantes: true,
    usarHexVar2: false,
    usarBalanza: false,
    usarPack: true,
    usarPedidoCc: true,
    remitoAutoVenta: true,
    clienteObligatorioCc: true,
  },
}

export function getConfigRubro(rubro: Rubro): ConfigRubro {
  return CONFIG_RUBROS[rubro] ?? CONFIG_RUBROS.generico
}

const PLURAL_EJE: Record<string, string> = {
  Color: 'Colores',
  Presentación: 'Presentaciones',
  Material: 'Materiales',
  Calidad: 'Calidades',
  Procedencia: 'Procedencias',
  Origen: 'Orígenes',
  'Variante 1': 'Variantes 1',
  'Variante 2': 'Variantes 2',
}

export function pluralLabelVar(label: string): string {
  return PLURAL_EJE[label] ?? `${label}s`
}

/**
 * Rubros donde el vale de cambio tiene sentido comercial.
 * Ropa: política de cambio obligatoria en indumentaria.
 * Librería: artículos de temporada escolar con cambio habitual.
 */
const RUBROS_CON_VALE: ReadonlySet<Rubro> = new Set(['ropa', 'libreria'])

export function rubroTieneVale(rubro: string | null | undefined): boolean {
  return RUBROS_CON_VALE.has((rubro ?? '') as Rubro)
}

/** Stock -1 (ilimitado) solo se habilita para cargar en estos rubros */
const RUBROS_CON_STOCK_INFINITO: ReadonlySet<Rubro> = new Set(['despensa', 'carniceria'])

export function rubroPermiteStockInfinito(rubro: string | null | undefined): boolean {
  return RUBROS_CON_STOCK_INFINITO.has((rubro ?? '') as Rubro)
}

export const TODOS_LOS_RUBROS: Rubro[] = [
  'ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico',
  'carniceria', 'farmacia', 'verduleria', 'distribuidora',
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
  distribuidora: '🚚 Distribuidora',
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
