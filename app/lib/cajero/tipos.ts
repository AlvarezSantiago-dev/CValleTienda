// =============================================================
// lib/cajero/tipos.ts
// Tipos compartidos del Cajero Hablado (agente de voz con tools).
// =============================================================

/** Candidato compacto que devuelve la tool buscar_productos al modelo */
export interface CandidatoProducto {
  variante_id: string
  producto_id: string
  /** Ej: "Coca Cola 3L", "Remera básica · M · Rojo" */
  etiqueta: string
  precio: number
  stock_efectivo: number
  unidad: string
}

export interface CandidatoCliente {
  cliente_id: string
  nombre: string
  saldo_favor: number
}

/** Ítem ya resuelto contra el catálogo (precio real de la variante) */
export interface ItemResuelto {
  variante_id: string
  etiqueta: string
  cantidad: number
  precio_unitario: number
}

export interface ItemPropuesta extends ItemResuelto {
  subtotal: number
}

export interface PropuestaVenta {
  tipo: 'venta'
  items: ItemPropuesta[]
  total: number
  /** Monto entregado por el cliente (si lo dijo) */
  recibido?: number
  /** Vuelto a entregar (con redondeo $100 si está activo) */
  vuelto?: number
  /** Lo que queda en caja por redondeo (no se entrega) */
  ajusteRedondeo?: number
  /** Si recibido < total */
  faltante?: number
  cliente_id?: string | null
  cliente_nombre?: string | null
}

export interface VariantePropuestaProducto {
  etiqueta: string
  var1: string | null
  var2: string | null
  codigo_barras: string
}

export interface PropuestaProducto {
  tipo: 'producto'
  nombre: string
  precio_venta: number
  precio_compra: number
  /** Código de la primera variante (o la única) */
  codigo_barras: string
  descripcion: string | null
  unidad_de_medida: string
  stock_inicial: number
  variantes: VariantePropuestaProducto[]
}

export interface PropuestaPrecio {
  tipo: 'precio'
  producto_id: string
  etiqueta: string
  precio_actual: number
  precio_nuevo: number
}

export type PropuestaPendiente = PropuestaVenta | PropuestaProducto | PropuestaPrecio

export interface MensajeCajero {
  rol: 'usuario' | 'agente'
  texto: string
}

/** Estado de conversación que viaja cliente ↔ server (solo ids y etiquetas visibles al usuario) */
export interface EstadoConversacion {
  mensajes: MensajeCajero[]
  propuestaPendiente: PropuestaPendiente | null
  /** Candidatos ya mostrados — habilita proponer_venta/precio sin re-buscar */
  candidatos: CandidatoProducto[]
}

export type ResultadoEjecucion =
  | { tipo: 'venta'; ventaId: string; numeroTicket: number }
  | { tipo: 'producto'; id: string; nombre: string }
  | { tipo: 'precio'; producto_id: string; precio_nuevo: number }

export interface RespuestaCajero {
  /** Lo que se transcribió del audio del usuario */
  transcript: string
  /** Texto que el cliente reproduce con TTS y muestra en el HUD */
  hablar: string
  estado: EstadoConversacion
  resultado?: ResultadoEjecucion
  /** Navegación resuelta localmente sin LLM (ej: "ir a productos") */
  navegarA?: string
}

export function estadoVacio(): EstadoConversacion {
  return { mensajes: [], propuestaPendiente: null, candidatos: [] }
}
