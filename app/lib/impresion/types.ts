// =============================================================
// TIPOS COMPARTIDOS — Módulo de impresión
// Reflejan el snapshot que producen las funciones SQL
// build_payload_ticket_venta / _devolucion y el trigger de cierre.
// =============================================================

import type {
  TipoColaImpresion,
  EstadoColaImpresion,
  ConfiguracionEtiqueta,
} from '@/types/database'

// ─── Tienda (común) ────────────────────────────────────────────
export interface TiendaPayload {
  nombre: string
  razon_social: string | null
  cuit: string | null
  condicion_iva: string | null
  direccion: string | null
  direccion_legal?: string | null
  telefono?: string | null
  texto_encabezado: string | null
  texto_pie: string | null
  ancho_mm: number
  simbolo_moneda: string
  dias_cambio?: number | null
  rubro?: string | null
  logo_url?: string | null
  mostrar_logo?: boolean
}

// ─── Ticket de venta ──────────────────────────────────────────
export interface LineaTicketVenta {
  nombre_producto: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
  cantidad: number
  precio_unitario: number
  descuento_linea: number
  total_linea: number
}

export interface PagoTicket {
  nombre_metodo: string
  monto: number
  comision_porcentaje?: number | null
  dias_acreditacion?: number | null
  referencia: string | null
}

export interface ClientePayload {
  nombre: string
  dni: string | null
  telefono: string | null
}

export interface PayloadTicketVenta {
  tienda: TiendaPayload
  numero_ticket: string
  numero_ticket_entero?: number
  fecha: string
  vendedor: string | null
  subtotal: number
  descuento: number
  total: number
  estado: string
  observaciones: string | null
  /**
   * Vuelto no entregado por redondeo a billetes de $100.
   * Se muestra en ticket como aviso al cliente. No altera el TOTAL.
   */
  ajuste_redondeo?: number
  /**
   * Plantilla configurable del aviso (`{monto}`, `{total}`).
   * Vacío → texto por defecto del sistema.
   */
  aviso_redondeo_texto?: string | null
  lineas: LineaTicketVenta[]
  pagos: PagoTicket[]
  cliente: ClientePayload | null
  /** Datos de factura electrónica AFIP/ARCA (null = Ticket X) */
  factura?: FacturaTicketPayload | null
}

/** Datos de factura electrónica que se imprimen al pie del ticket */
export interface FacturaTicketPayload {
  tipo_comprobante: 'A' | 'B' | 'C'
  numero_comprobante: string   // '00001-00000042'
  cae: string                  // 14 dígitos
  cae_vencimiento: string      // 'DD/MM/YYYY'
  qr_afip: string              // URL del QR ARCA
}

// ─── Ticket de devolución ─────────────────────────────────────
export interface LineaEntregaTicket {
  nombre_producto: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
}

export interface LineaTicketDevolucion {
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario?: number
  total_linea?: number
  entrega?: LineaEntregaTicket | null
}

export interface PagoDevolucionPayload {
  nombre_metodo: string
  monto: number
  referencia: string | null
}

export interface PayloadTicketDevolucion {
  tienda: TiendaPayload
  tipo_documento: 'DEVOLUCIÓN'
  numero_devolucion: string
  venta_referencia: string
  numero_ticket_entero?: number
  fecha_venta?: string
  fecha: string
  vendedor: string | null
  cliente: ClientePayload | null
  motivo: string
  tipo: 'total' | 'parcial'
  /** Cómo se resolvió: reembolso | saldo_a_favor | cambio. Ausente en payloads viejos. */
  tipo_resolucion?: 'reembolso' | 'saldo_a_favor' | 'cambio' | null
  total_devuelto: number
  lineas: LineaTicketDevolucion[]
  pagos: PagoDevolucionPayload[]
}

// ─── Cierre de caja ───────────────────────────────────────────
export interface DetalleCierreCuenta {
  nombre_cuenta: string
  tipo_cuenta: string
  total_ingresos: number
  total_egresos: number
  comision: number
  total_neto: number
  saldo_nuevo: number
}

export interface PayloadCierreCaja {
  tienda: {
    nombre: string
    razon_social: string | null
    cuit: string | null
    ancho_mm?: number
    simbolo_moneda?: string
  }
  fecha_apertura: string
  fecha_cierre: string
  usuario: string | null
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_devoluciones_monto: number
  total_devoluciones_cantidad: number
  /** Devoluciones con reintegro de dinero. Ausente en cierres previos al split. */
  total_devoluciones_reintegro?: number
  /** Devoluciones acreditadas como saldo a favor (sin egreso de caja). */
  total_devoluciones_credito?: number
  total_neto: number
  monto_apertura_efectivo: number
  efectivo_esperado: number
  efectivo_declarado: number | null
  diferencia_efectivo: number | null
  detalle_por_cuenta: DetalleCierreCuenta[]
  observaciones: string | null
}

// ─── Etiquetas ────────────────────────────────────────────────
export interface PayloadEtiquetaItem {
  variante_id: string
  nombre_producto: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
  precio: number
  cantidad: number
}

export interface PlantillaEtiquetaPayload {
  id: string
  nombre: string
  formato: string
  ancho_mm: number
  alto_mm: number
  mostrar_nombre: boolean
  mostrar_precio: boolean
  mostrar_talla: boolean
  mostrar_color: boolean
  mostrar_codigo: boolean
  mostrar_barcode: boolean
  mostrar_logo: boolean
  mostrar_nombre_tienda: boolean
  tamano_fuente_nombre: number
  tamano_fuente_precio: number
  tamano_fuente_talla: number
  etiquetas_por_fila: number
  etiquetas_por_col: number
}

export interface PayloadEtiquetaProducto {
  plantilla: PlantillaEtiquetaPayload
  items: PayloadEtiquetaItem[]
  simbolo_moneda: string
  nombre_tienda?: string | null
}

// ─── Job genérico ─────────────────────────────────────────────
export type JobPayload =
  | PayloadTicketVenta
  | PayloadTicketDevolucion
  | PayloadCierreCaja
  | PayloadEtiquetaProducto

export interface JobImpresion {
  id: string
  tienda_id: string
  tipo: TipoColaImpresion
  referencia_id: string | null
  referencia_tipo: string | null
  payload: JobPayload
  estado: EstadoColaImpresion
  intentos: number
  error_mensaje: string | null
  dispositivo_id: string | null
  created_at: string
  updated_at: string
}

// ─── Dispositivo local ────────────────────────────────────────
export interface DispositivoLocal {
  id: string
  nombre: string
}

// Helper: convertir ConfiguracionEtiqueta DB → PlantillaEtiquetaPayload (snapshot)
export function plantillaSnapshot(cfg: ConfiguracionEtiqueta): PlantillaEtiquetaPayload {
  return {
    id: cfg.id,
    nombre: cfg.nombre,
    formato: cfg.formato,
    ancho_mm: cfg.ancho_mm,
    alto_mm: cfg.alto_mm,
    mostrar_nombre: cfg.mostrar_nombre,
    mostrar_precio: cfg.mostrar_precio,
    mostrar_talla: cfg.mostrar_talla,
    mostrar_color: cfg.mostrar_color,
    mostrar_codigo: cfg.mostrar_codigo,
    mostrar_barcode: cfg.mostrar_barcode,
    mostrar_logo: cfg.mostrar_logo,
    mostrar_nombre_tienda: cfg.mostrar_nombre_tienda,
    tamano_fuente_nombre: cfg.tamano_fuente_nombre,
    tamano_fuente_precio: cfg.tamano_fuente_precio,
    tamano_fuente_talla: cfg.tamano_fuente_talla,
    etiquetas_por_fila: cfg.etiquetas_por_fila,
    etiquetas_por_col: cfg.etiquetas_por_col,
  }
}
