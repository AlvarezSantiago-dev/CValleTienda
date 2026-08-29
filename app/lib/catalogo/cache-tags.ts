/** Tag de cache Next.js para invalidar lecturas del catálogo público. */
export function catalogoTag(tiendaId: string): string {
  return `catalogo:${tiendaId}`
}

export const CATALOGO_REVALIDATE_SEC = 30
