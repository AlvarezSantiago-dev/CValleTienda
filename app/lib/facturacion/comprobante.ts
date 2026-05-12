// =============================================================
// LÓGICA DE COMPROBANTE — Determina tipo A/B/C y construye
// el request para TusFacturasAPP según condición IVA.
// =============================================================

import type { CondicionIVAEmisor, TipoComprobante } from '@/types/database'
import type {
  TusFacturasRequest,
  TusFacturasCredenciales,
  TusFacturasCliente,
  TusFacturasDetalle,
} from './tipos'
import type { PayloadTicketVenta } from '@/lib/impresion/types'

/**
 * Determina el tipo de comprobante (A, B o C) según la condición IVA
 * del emisor y si el receptor tiene CUIT o no.
 *
 * Regla:
 *   Monotributista / Exento / No Responsable → siempre C
 *   Responsable Inscripto sin CUIT receptor  → B (consumidor final)
 *   Responsable Inscripto con CUIT receptor  → A (otro RI)
 */
export function determinarTipoComprobante(
  condicionEmisor: CondicionIVAEmisor,
  cuitReceptor: string | null | undefined
): TipoComprobante {
  if (condicionEmisor !== 'Responsable Inscripto') return 'C'
  if (!cuitReceptor || !cuitReceptor.trim()) return 'B'
  return 'A'
}

/**
 * Formatea una fecha ISO a 'DD/MM/YYYY' que espera TusFacturasAPP.
 */
function formatFechaTusFacturas(isoDate: string): string {
  const d = new Date(isoDate)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/**
 * Convierte el vencimiento CAE de TusFacturasAPP ('AAAAMMDD')
 * al formato legible 'DD/MM/YYYY'.
 */
export function formatVencimientoCae(vencimiento: string): string {
  if (vencimiento.length !== 8) return vencimiento
  const yyyy = vencimiento.slice(0, 4)
  const mm = vencimiento.slice(4, 6)
  const dd = vencimiento.slice(6, 8)
  return `${dd}/${mm}/${yyyy}`
}

/** Mapea TipoComprobante al nombre completo que espera TusFacturasAPP */
function tipoComprobanteNombre(tipo: TipoComprobante): string {
  return `FACTURA ${tipo}` // 'FACTURA A' | 'FACTURA B' | 'FACTURA C'
}

/**
 * Construye el objeto request para la API de TusFacturasAPP
 * a partir del payload de la venta, la configuración y el receptor.
 */
export function construirRequest(
  payload: PayloadTicketVenta,
  credenciales: TusFacturasCredenciales,
  puntoDeVenta: number,
  tipoComprobante: TipoComprobante,
  cuitReceptor: string | null | undefined
): TusFacturasRequest {
  // Datos del receptor según tipo de comprobante
  let cliente: TusFacturasCliente
  if (tipoComprobante === 'A' && cuitReceptor) {
    cliente = {
      documento_tipo: 'CUIT',
      documento_nro: cuitReceptor.replace(/\D/g, ''),
      razon_social: payload.cliente?.nombre ?? 'Comprador',
      email: '',
      domicilio: '-',
      provincia: '1',   // código AFIP: 1 = Buenos Aires (más común)
      condicion_iva: 'RI',
      envia_por_mail: 'N',
      reclama_deuda: 'N',
    }
  } else if (payload.cliente?.dni) {
    cliente = {
      documento_tipo: 'DNI',
      documento_nro: payload.cliente.dni.replace(/\D/g, ''),
      razon_social: payload.cliente.nombre,
      email: '',
      domicilio: '-',
      provincia: '1',
      condicion_iva: 'CF',
      envia_por_mail: 'N',
      reclama_deuda: 'N',
    }
  } else {
    // Consumidor Final sin datos — usar tipo 'OTRO' con nro '0' (DNI no acepta cero)
    cliente = {
      documento_tipo: 'OTRO',
      documento_nro: '0',
      razon_social: 'Consumidor Final',
      email: '',
      domicilio: '-',
      provincia: '1',
      condicion_iva: 'CF',
      envia_por_mail: 'N',
      reclama_deuda: 'N',
    }
  }

  // Para Factura C (mono/exento), el precio ya incluye todo — alicuota = '0'
  const alicuota = '0'

  // Detalles de línea — todos los campos son strings según la API
  const detalle: TusFacturasDetalle[] = payload.lineas.map((ln) => {
    const descripcion = [
      ln.nombre_producto,
      ln.talla ? `T:${ln.talla}` : null,
      ln.color ?? null,
    ]
      .filter(Boolean)
      .join(' - ')

    const bonificacion =
      ln.descuento_linea > 0
        ? String(
            Math.round((ln.descuento_linea / (ln.precio_unitario * ln.cantidad)) * 100)
          )
        : '0'

    return {
      cantidad: String(ln.cantidad),
      afecta_stock: 'N',
      bonificacion_porcentaje: bonificacion,
      producto: {
        descripcion,
        precio_unitario_sin_iva: String(Math.round(ln.precio_unitario * 100) / 100),
        alicuota,
        unidad_bulto: '1',
        unidad_medida: '7',
        actualiza_precio: 'N',
        codigo: ln.codigo_barras ?? undefined,
      },
    }
  })

  const fecha = formatFechaTusFacturas(payload.fecha)

  return {
    usertoken: credenciales.usertoken,
    apitoken: credenciales.apitoken,
    apikey: credenciales.apikey,
    cliente,
    comprobante: {
      fecha,
      vencimiento: fecha,   // contado = vencimiento el mismo día
      tipo: tipoComprobanteNombre(tipoComprobante),
      operacion: 'V',
      punto_venta: String(puntoDeVenta),
      moneda: 'PES',
      idioma: '1',
      detalle,
      bonificacion:
        payload.descuento > 0
          ? String(Math.round(payload.descuento * 100) / 100)
          : undefined,
      total: String(Math.round(payload.total * 100) / 100),
    },
  }
}
