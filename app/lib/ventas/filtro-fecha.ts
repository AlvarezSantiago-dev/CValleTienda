const YMD = /^\d{4}-\d{2}-\d{2}$/

export function esYmd(fecha?: string | null): fecha is string {
  return Boolean(fecha && YMD.test(fecha))
}

/**
 * Día a filtrar en el listado de ventas, o `null` para no filtrar por fecha.
 *
 * Si hay búsqueda y no hay fecha, no recorta a hoy: el ticket puede ser de otro día.
 */
export function ymdFiltroListadoVentas(opts: {
  fecha?: string
  query?: string
  forzarHoy: boolean
  hoyYmd: string
}): string | null {
  if (esYmd(opts.fecha)) return opts.fecha
  if (opts.query?.trim()) return null
  if (opts.forzarHoy) return opts.hoyYmd
  return null
}
