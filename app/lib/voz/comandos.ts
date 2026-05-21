function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const RUTAS: Array<{ keywords: string[]; ruta: string }> = [
  { keywords: ['inicio', 'dashboard', 'home', 'principal'],           ruta: '/dashboard' },
  { keywords: ['pos', 'vender', 'punto de venta', 'cobrar'],          ruta: '/pos' },
  { keywords: ['ventas', 'venta', 'historial'],                        ruta: '/ventas' },
  { keywords: ['devoluciones', 'devolucion'],                          ruta: '/devoluciones' },
  { keywords: ['remitos', 'remito'],                                   ruta: '/remitos' },
  { keywords: ['productos', 'producto', 'catalogo'],                   ruta: '/productos' },
  { keywords: ['stock', 'inventario', 'deposito'],                     ruta: '/stock' },
  { keywords: ['caja', 'turno', 'caja diaria'],                        ruta: '/caja' },
  { keywords: ['clientes', 'cliente'],                                  ruta: '/clientes' },
  { keywords: ['configuracion', 'configuraciones', 'ajustes'],         ruta: '/configuracion' },
  { keywords: ['planes', 'plan', 'suscripcion', 'billing'],            ruta: '/planes' },
]

const TRIGGERS_NAV = [
  'ir a', 'ir al', 'ir las', 'ir los',
  'abrir', 'mostrar', 'navegar a', 'llevar a', 'voy a', 'vamos a',
]

const TRIGGERS_PRODUCTO = [
  'nuevo producto', 'cargar producto', 'agregar producto',
  'alta producto', 'crear producto', 'añadir producto',
]

/**
 * Intenta reconocer una frase de navegación y devuelve la ruta,
 * o null si no hay match.
 */
export function parsearComandoNav(texto: string): string | null {
  const norm = normalizar(texto)

  // Buscar si hay trigger word; si la hay, extraer lo que viene después
  let sinTrigger = norm
  let hasTrigger = false
  for (const trigger of TRIGGERS_NAV) {
    const t = normalizar(trigger)
    if (norm.includes(t)) {
      sinTrigger = norm.replace(t, '').trim()
      hasTrigger = true
      break
    }
  }

  for (const { keywords, ruta } of RUTAS) {
    for (const kw of keywords) {
      const kwNorm = normalizar(kw)
      if (hasTrigger) {
        if (sinTrigger.includes(kwNorm)) return ruta
      } else {
        // Sin trigger: solo match exacto para evitar falsos positivos
        if (norm === kwNorm) return ruta
      }
    }
  }

  return null
}

/**
 * Devuelve true si el texto activa el flujo de carga de producto.
 */
export function esComandoProducto(texto: string): boolean {
  const norm = normalizar(texto)
  return TRIGGERS_PRODUCTO.some((t) => norm.includes(normalizar(t)))
}
