export interface TopProductoMes {
  nombre: string
  cantidad: number
  monto: number
}

export interface TopVar1Mes {
  valor: string
  cantidad: number
  monto: number
}

export interface KpisVentasMes {
  cantidadVentas: number
  ventasNetas: number
  ticketPromedio: number
  unidadesVendidas: number
}

export interface MixPagoMes {
  metodoNombre: string
  monto: number
  porcentaje: number
}

export interface TasaDevolucionesMes {
  montoDevoluciones: number
  ventasBrutas: number
  tasaPct: number | null
}

export interface StockResumen {
  valorInventario: number
  totalVariantes: number
  bajoStock: number
  sinStock: number
}

export interface MovimientoStockMes {
  tipo: string
  cantidadTotal: number
  cantidadMovs: number
}

export interface TopIngresoMes {
  productoNombre: string
  cantidad: number
  fecha: string
}

export interface VentaPorVendedor {
  vendedorNombre: string
  cantidad: number
  monto: number
}

export interface ComparacionMes {
  ventasNetas: { actual: number; anterior: number; deltaPct: number | null }
  tickets: { actual: number; anterior: number; deltaPct: number | null }
  resultadoNeto: { actual: number; anterior: number; deltaPct: number | null }
}

export interface RemitosPendientesResumen {
  cantidad: number
  totalDeuda: number
}
