// =============================================================
// lib/rubro/templates.ts
// Genera plantillas CSV de importación de productos por rubro.
// =============================================================

import { getConfigRubro, TODOS_LOS_RUBROS } from './config'
import type { Rubro } from '@/types/database'

export interface TemplateColumn {
  nombre: string
  descripcion: string
  requerido: boolean
  ejemplo: string
}

export function getColumnasTemplate(rubro: Rubro): TemplateColumn[] {
  const config = getConfigRubro(rubro)

  const columnas: TemplateColumn[] = [
    {
      nombre: 'nombre',
      descripcion: 'Nombre del producto',
      requerido: true,
      ejemplo: 'Producto de ejemplo',
    },
    {
      nombre: 'descripcion',
      descripcion: 'Descripción del producto',
      requerido: false,
      ejemplo: 'Descripción opcional',
    },
    {
      nombre: 'codigo_barras',
      descripcion: 'Código de barras (EAN-13 u otro)',
      requerido: false,
      ejemplo: '7790001234567',
    },
    {
      nombre: 'precio_compra',
      descripcion: 'Precio de costo (sin signo $)',
      requerido: false,
      ejemplo: '100',
    },
    {
      nombre: 'precio_venta',
      descripcion: 'Precio de venta (sin signo $)',
      requerido: true,
      ejemplo: '150',
    },
    {
      nombre: 'unidad_de_medida',
      descripcion: `Unidad de medida. Opciones: ${config.unidadesDisponibles.join(', ')}`,
      requerido: true,
      ejemplo: config.unidadesDisponibles[0],
    },
    {
      nombre: 'categoria',
      descripcion: 'Nombre de la categoría',
      requerido: false,
      ejemplo: 'Sin categoría',
    },
  ]

  if (config.usarVar1) {
    columnas.push({
      nombre: 'variante_1',
      descripcion: `${config.labelVar1} de la variante`,
      requerido: false,
      ejemplo: getEjemploVar1(rubro),
    })
  }

  if (config.usarVar2) {
    columnas.push({
      nombre: 'variante_2',
      descripcion: `${config.labelVar2} de la variante`,
      requerido: false,
      ejemplo: getEjemploVar2(rubro),
    })
  }

  columnas.push({
    nombre: 'stock_inicial',
    descripcion: 'Stock inicial de esta variante',
    requerido: false,
    ejemplo: '10',
  })

  if (config.usarPedidoCc) {
    columnas.push({
      nombre: 'recargo_cc_pct',
      descripcion: 'Recargo % para pedidos a cuenta (vacío = default de tienda)',
      requerido: false,
      ejemplo: '10',
    })
  }

  return columnas
}

function getEjemploVar1(rubro: Rubro): string {
  const ejemplos: Partial<Record<Rubro, string>> = {
    ropa:       'M',
    ferreteria: '10mm',
    corralon:   'Cemento Portland',
    despensa:   'La Serenísima',
    libreria:   'Staedtler',
    carniceria: 'Asado',
    farmacia:   'Comprimidos',
    verduleria: 'Manzana Roja',
    generico:   'Variante A',
    distribuidora: 'Coca-Cola',
  }
  return ejemplos[rubro] ?? 'Variante A'
}

function getEjemploVar2(rubro: Rubro): string {
  const ejemplos: Partial<Record<Rubro, string>> = {
    ropa:       'Azul',
    ferreteria: 'Acero',
    despensa:   '1L',
    libreria:   'HB',
    generico:   'Variante B',
    distribuidora: '2L',
  }
  return ejemplos[rubro] ?? 'Variante B'
}

/** Genera el contenido CSV como string */
export function generarTemplateCSV(rubro: Rubro): string {
  const config  = getConfigRubro(rubro)
  const columnas = getColumnasTemplate(rubro)

  const header = columnas.map((c) => c.nombre).join(',')

  // Fila de instrucciones (comentada con #)
  const instrucciones = columnas.map((c) => `"${c.descripcion}"`).join(',')

  // 2 filas de ejemplo
  const ejemplo1 = columnas.map((c) => `"${c.ejemplo}"`).join(',')
  const ejemplo2 = columnas.map((c, i) => {
    if (i === 0) return `"Otro producto de ejemplo"`
    if (c.nombre === 'precio_venta') return '"200"'
    if (c.nombre === 'precio_compra') return '"130"'
    if (c.nombre === 'stock_inicial') return '"5"'
    if (c.nombre === 'variante_1') return `"${getEjemploVar1(rubro)} 2"`
    return `"${c.ejemplo}"`
  }).join(',')

  const lines = [
    `# Plantilla de importación de productos — Rubro: ${config.descripcion}`,
    `# Columnas requeridas: ${columnas.filter((c) => c.requerido).map((c) => c.nombre).join(', ')}`,
    `# No elimines la primera fila de encabezados.`,
    header,
    ejemplo1,
    ejemplo2,
  ]

  return lines.join('\r\n')
}

export { TODOS_LOS_RUBROS }
