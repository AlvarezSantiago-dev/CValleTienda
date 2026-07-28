import { MovimientosTurnoTabla } from '@/components/caja/MovimientosTurnoTabla'
import type { MovimientoTurno } from '@/lib/caja/types'

interface Props {
  movimientos: MovimientoTurno[]
}

/** Vista de solo lectura para detalle de sesión cerrada. */
export function MovimientosTurnoLista({ movimientos }: Props) {
  return <MovimientosTurnoTabla movimientos={movimientos} editable={false} />
}
