// =============================================================
// CLIENTE HTTP — TusFacturasAPP API
// Documentación: https://developers.tusfacturas.app
// Endpoint base: https://www.tusfacturas.app/app/api/v2
// Solo se usa server-side (credenciales nunca van al browser).
// =============================================================

import type { TusFacturasRequest, TusFacturasResponse } from './tipos'

// TusFacturasAPP usa el mismo endpoint en plan DEV y producción.
// El plan DEV no envía a AFIP/ARCA real — el comportamiento de prueba
// lo controla el plan de la cuenta, no una URL diferente.
const BASE_URL = 'https://www.tusfacturas.app/app/api/v2'
const ENDPOINT_NUEVO_COMPROBANTE = `${BASE_URL}/facturacion/nuevo`

/**
 * Emite un nuevo comprobante electrónico via TusFacturasAPP.
 * Lanza un error si la respuesta HTTP falla o si TusFacturasAPP
 * devuelve `error: 'S'`.
 */
export async function emitirComprobante(
  request: TusFacturasRequest
): Promise<TusFacturasResponse> {
  let res: Response
  try {
    res = await fetch(ENDPOINT_NUEVO_COMPROBANTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch (err) {
    throw new Error(
      `Error de red al conectar con TusFacturasAPP: ${(err as Error).message}`
    )
  }

  if (!res.ok) {
    throw new Error(
      `TusFacturasAPP respondió con estado HTTP ${res.status}. Reintentá más tarde.`
    )
  }

  let data: TusFacturasResponse
  try {
    data = (await res.json()) as TusFacturasResponse
  } catch {
    throw new Error('Respuesta inválida de TusFacturasAPP (no es JSON válido).')
  }

  if (data.error === 'S') {
    const detalle = data.errores?.join(' | ') ?? 'Error desconocido'
    throw new Error(`AFIP rechazó el comprobante: ${detalle}`)
  }

  return data
}
