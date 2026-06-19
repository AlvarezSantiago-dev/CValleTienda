export type PosModoCobro = 'clasico' | 'guiado'

export const POS_MODO_COBRO_DEFAULT: PosModoCobro = 'clasico'

export function esModoGuiado(modo: PosModoCobro | null | undefined): boolean {
  return modo === 'guiado'
}

export function normalizarModoCobro(modo: PosModoCobro | null | undefined): PosModoCobro {
  return modo === 'guiado' ? 'guiado' : 'clasico'
}
