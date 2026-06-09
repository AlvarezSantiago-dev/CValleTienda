export const POS_HOTKEYS = {
  COBRAR: ['F2', 'ctrl+enter'],
  FOCUS_BUSCADOR: ['escape'],
  AYUDA: ['?'],
  NUEVA_VENTA: ['enter'],
} as const

export function shouldIgnoreHotkey(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'TEXTAREA') return true
  if (tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const input = t as HTMLInputElement
    if (input.type === 'search') return false
    if (input.dataset.pagoMonto !== undefined) return false
    return true
  }

  if (t.isContentEditable) return true
  return false
}
