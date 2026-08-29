import { updateTag } from 'next/cache'
import { catalogoTag } from './cache-tags'

/** Invalida lecturas cacheadas del catálogo público de una tienda. */
export function invalidarCacheCatalogo(tiendaId: string): void {
  updateTag(catalogoTag(tiendaId))
}
