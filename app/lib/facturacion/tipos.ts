// =============================================================
// TIPOS — TusFacturasAPP API
// Documentación: https://developers.tusfacturas.app
// =============================================================

import type { TipoComprobante, CondicionIVAEmisor } from '@/types/database'

// ─── Credenciales ─────────────────────────────────────────────

export interface TusFacturasCredenciales {
  usertoken: string
  apitoken: string
  apikey: string
}

// ─── Request ──────────────────────────────────────────────────

export interface TusFacturasCliente {
  documento_tipo: 'CUIT' | 'DNI' | 'CUIL' | 'OTRO'
  documento_nro: string
  razon_social: string
  nombre_fantasia?: string
  email: string
  domicilio: string
  provincia?: string        // código AFIP de provincia
  condicion_iva: string     // 'CF' consumidor final | 'RI' resp. inscripto | 'M' monotrib
  envia_por_mail: 'S' | 'N'
  reclama_deuda: 'S' | 'N'
}

export interface TusFacturasProducto {
  descripcion: string
  precio_unitario_sin_iva: string  // string según docs
  alicuota: string                 // '0' para C/mono, '21', '10.5' para A/B
  unidad_bulto: string             // siempre '1' para minoristas
  codigo?: string
  unidad_medida?: string           // '7' = unidades
  actualiza_precio?: string        // 'N'
}

export interface TusFacturasDetalle {
  cantidad: string                 // string según docs
  afecta_stock: 'S' | 'N'
  bonificacion_porcentaje: string  // '0'
  producto: TusFacturasProducto
  leyenda?: string
}

export interface TusFacturasComprobante {
  fecha: string           // 'DD/MM/YYYY'
  vencimiento: string     // 'DD/MM/YYYY' — igual a fecha para ventas de contado
  tipo: string            // 'FACTURA A' | 'FACTURA B' | 'FACTURA C'
  operacion: 'V' | 'C'   // V = venta
  punto_venta: string     // número como string: '1', '2', etc.
  moneda: string          // 'PES' para pesos argentinos
  idioma: string          // '1' = español
  detalle: TusFacturasDetalle[]
  bonificacion?: string   // monto descuento global como string
  total: string           // total como string
}

export interface TusFacturasRequest {
  usertoken: string
  apitoken: string
  apikey: string
  cliente: TusFacturasCliente
  comprobante: TusFacturasComprobante
}

// ─── Response ─────────────────────────────────────────────────

export interface TusFacturasResponse {
  error: 'S' | 'N'
  errores: string[]
  rta: string
  vencimiento_cae: string          // 'DD/MM/AAAA' según respuesta real
  vencimiento_pago?: string
  comprobante_nro: string          // '0000123'
  cae: string                      // 14 dígitos (con espacio al final — hacer trim)
  afip_qr: string                  // URL del QR ARCA (con espacio al final — hacer trim)
  envio_x_mail?: 'S' | 'N'
  comprobante_pdf_url?: string
  comprobante_ticket_url?: string
}

// ─── Estado de facturación (para el frontend) ─────────────────
// Versión sin credenciales que se puede enviar al cliente

export interface FacturacionEstado {
  activo: boolean
  configurado: boolean             // tiene las 3 keys + punto de venta
  condicion_iva_emisor: CondicionIVAEmisor
  punto_de_venta: number | null
}

// ─── Resultado de emitir una factura ─────────────────────────

export interface FacturaEmitida {
  tipo_comprobante: TipoComprobante
  numero_comprobante: string
  cae: string
  cae_vencimiento: string          // 'DD/MM/YYYY'
  qr_afip: string
  pdf_url: string | null
}
