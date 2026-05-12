// Tipos e helpers de caja sin dependencias de servidor
// Importable tanto desde Server Components como Client Components

export interface UsuarioLite {
  id: string
  nombre: string | null
  apellido: string | null
}

export function nombreUsuario(u: UsuarioLite | null): string | null {
  if (!u) return null
  const full = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim()
  return full || null
}

export interface SesionCaja {
  id: string
  tienda_id: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_apertura_efectivo: number
  estado: 'abierta' | 'cerrada'
  observaciones_apertura: string | null
  observaciones_cierre: string | null
  usuario_apertura: UsuarioLite | null
}

export interface SaldoCuenta {
  cuenta_fondo_id: string
  nombre: string
  tipo: string
  color: string | null
  saldo_actual: number
}

export interface SesionConTotales extends SesionCaja {
  total_ventas_monto: number
  total_ventas_cantidad: number
  saldos_cuentas: SaldoCuenta[]
}
