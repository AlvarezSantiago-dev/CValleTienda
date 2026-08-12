/** Ejemplos de texto para la UI de carga en 2 pasos. */

export const EJEMPLO_PASO1_DATOS = `Producto Nuevas prendas New Balance. Colores rojo, azul, verde, amarillo. Compra 25000 venta 50000. Categoría zapatillas.`

export const EJEMPLO_PASO2_STOCK = `1 rojo XS, 2 rojos M, 3 azules XXL, 1 verde M, 4 amarillos L`

/** @deprecated usar EJEMPLO_PASO1 + EJEMPLO_PASO2 */
export const EJEMPLO_NEW_BALANCE = `${EJEMPLO_PASO1_DATOS} ${EJEMPLO_PASO2_STOCK}`

export const EJEMPLOS_PASO1 = [
  {
    id: 'nb-datos',
    label: 'New Balance (datos)',
    texto: EJEMPLO_PASO1_DATOS,
  },
  {
    id: 'remera-datos',
    label: 'Remera (datos)',
    texto: `Producto Remera Básica Oversize. Colores negro, blanco. Compra 3500 venta 8900. Categoría remeras.`,
  },
] as const

export const EJEMPLOS_PASO2 = [
  {
    id: 'nb-stock',
    label: 'Stock con talles',
    texto: EJEMPLO_PASO2_STOCK,
  },
  {
    id: 'remera-stock',
    label: 'Stock remera',
    texto: `5 negros S, 4 negros M, 3 negros L, 2 blancos M, 2 blancos L`,
  },
] as const

/** Compat con imports viejos */
export const EJEMPLOS_CARGA_EXPRESS = EJEMPLOS_PASO1
