'use server'

import { listarProductos } from '@/lib/productos/queries'
import { listarClientes } from '@/lib/clientes/queries'

export interface BusquedaRapidaResultado {
  productos: { id: string; nombre: string; codigo_base: string | null }[]
  clientes: { id: string; nombre: string; apellido: string | null }[]
}

/** Búsqueda liviana para Command Palette — reutiliza queries existentes. */
export async function buscarRapido(q: string): Promise<BusquedaRapidaResultado> {
  const term = q.trim()
  if (term.length < 2) return { productos: [], clientes: [] }

  try {
    const [prod, cli] = await Promise.all([
      listarProductos({ search: term, pageSize: 5 }),
      listarClientes({ search: term, pageSize: 5 }),
    ])
    return {
      productos: prod.items.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        codigo_base: p.codigo_base,
      })),
      clientes: cli.items.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        apellido: c.apellido,
      })),
    }
  } catch {
    return { productos: [], clientes: [] }
  }
}
