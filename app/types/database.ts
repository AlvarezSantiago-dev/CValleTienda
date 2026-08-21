// =============================================================
// TIPOS TYPESCRIPT — CValleTienda Database
// Generados manualmente a partir del schema de Supabase.
// Para regenerar automáticamente: npx supabase gen types typescript
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums / Literales ────────────────────────────────────────

export type RolUsuario = 'owner' | 'admin' | 'vendedor'
export type Rubro = 'ropa' | 'ferreteria' | 'corralon' | 'despensa' | 'libreria' | 'generico' | 'carniceria' | 'farmacia' | 'verduleria' | 'distribuidora'
export type CondicionPago = 'contado' | 'cuenta_corriente'
export type TipoMovimientoCc = 'cargo' | 'pago' | 'ajuste'
export type PlanTipo = 'basico' | 'pro'
export type UnidadMedida = 'unidad' | 'kg' | 'gramo' | 'tonelada' | 'litro' | 'metro' | 'm2' | 'm3' | 'bolsa' | 'pack' | 'caja'
export type EstadoVenta = 'completada' | 'anulada' | 'pendiente'
export type EstadoSesionCaja = 'abierta' | 'cerrada'
export type TipoCuenta = 'efectivo' | 'mercado_pago' | 'banco' | 'otro'
export type TipoMovimientoStock = 'entrada' | 'salida' | 'ajuste' | 'devolucion' | 'inicial'
export type TipoMovimientoFondo = 'ingreso' | 'egreso' | 'ajuste'
export type TipoDevolucion = 'total' | 'parcial'
export type EstadoDevolucion = 'completada' | 'anulada'
export type TipoColaImpresion = 'ticket_venta' | 'ticket_devolucion' | 'cierre_caja' | 'etiqueta_producto'
export type EstadoColaImpresion = 'pendiente' | 'imprimiendo' | 'completado' | 'error'
export type EstadoRemito = 'borrador' | 'emitido' | 'entregado' | 'anulado'
export type TipoRemito   = 'entrega' | 'cuenta_corriente'
export type EstadoCobro  = 'no_aplica' | 'pendiente' | 'cobrado'
export type TipoComprobante = 'A' | 'B' | 'C'
export type CondicionIVAEmisor = 'Monotributista' | 'Responsable Inscripto' | 'Exento' | 'No Responsable'

// ─── Config Rubro ──────────────────────────────────────────────

export interface ConfigRubroDB {
  rubro: Rubro
  label_var1: string
  label_var2: string
  usar_var1: boolean
  usar_var2: boolean
  unidades_disponibles: string[]
  categorias_sugeridas: string[] | null
  tallas_sugeridas: string[] | null
  descripcion: string | null
}

// ─── Tablas ────────────────────────────────────────────────────

export interface Tienda {
  id: string
  nombre: string
  descripcion: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  cuit: string | null
  logo_url: string | null
  moneda: string
  rubro: Rubro
  activo: boolean
  plan: PlanTipo
  trial_hasta: string | null
  plan_activo_desde: string | null
  acceso_hasta: string | null
  ultimo_pago_at: string | null
  catalogo_slug: string | null
  catalogo_activo: boolean
  whatsapp_pedidos: string | null
  catalogo_retiro: boolean
  catalogo_envio: boolean
  catalogo_mensaje_bienvenida: string | null
  created_at: string
  updated_at: string
}

export interface Perfil {
  id: string
  tienda_id: string
  nombre: string
  apellido: string | null
  rol: RolUsuario
  activo: boolean
  onboarding_completado: boolean
  created_at: string
  updated_at: string
}

export interface Categoria {
  id: string
  tienda_id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Talla {
  id: string
  tienda_id: string
  nombre: string
  orden: number
  activo: boolean
  created_at: string
}

export interface Color {
  id: string
  tienda_id: string
  nombre: string
  hex_color: string | null
  activo: boolean
  created_at: string
}

export interface Producto {
  id: string
  tienda_id: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  codigo_base: string | null
  precio_compra: number
  precio_venta: number
  unidad_de_medida: UnidadMedida
  imagen_url: string | null
  activo: boolean
  es_bundle: boolean
  es_kit: boolean
  recargo_cc_pct: number | null
  visible_en_catalogo: boolean
  created_at: string
  updated_at: string
}

export interface ProductoTramoCantidad {
  id: string
  tienda_id: string
  producto_id: string
  cantidad_desde: number
  descuento_pct: number
}

export interface KitComponente {
  id: string
  tienda_id: string
  kit_variante_id: string
  componente_variante_id: string
  cantidad: number
  created_at: string
  // Joins opcionales
  componente_variante?: {
    id: string
    codigo_barras: string | null
    precio_venta: number | null
    stock_actual: number
    producto: { id: string; nombre: string; precio_compra: number } | null
    talla: { id: string; nombre: string } | null
    color: { id: string; nombre: string; hex_color: string | null } | null
  }
}

export interface ProductoComponente {
  id: string
  tienda_id: string
  variante_bundle_id: string
  componente_variante_id: string
  cantidad: number
  created_at: string
  // Joins opcionales cargados desde queries
  componente_variante?: {
    id: string
    codigo_barras: string | null
    precio_venta: number | null
    stock_actual: number
    producto: { nombre: string; precio_compra: number } | null
    talla: { nombre: string } | null
    color: { nombre: string } | null
  }
}

export interface HistorialPrecio {
  id: string
  tienda_id: string
  producto_id: string
  precio_anterior: number
  precio_nuevo: number
  changed_at: string
}

export interface VarianteProducto {
  id: string
  tienda_id: string
  producto_id: string
  talla_id: string | null
  color_id: string | null
  codigo_barras: string | null
  precio_venta: number | null
  stock_actual: number
  stock_minimo: number
  pack_habilitado: boolean
  pack_cantidad: number | null
  pack_precio: number | null
  pack_codigo_barras: string | null
  imagen_url: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  tienda_id: string
  nombre: string
  apellido: string | null
  dni: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  fecha_nacimiento: string | null
  notas: string | null
  total_compras: number
  monto_total: number
  ultima_compra: string | null
  saldo_favor: number
  saldo_cc: number
  limite_cc: number | null
  cuit: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface MovimientoCc {
  id: string
  tienda_id: string
  cliente_id: string
  tipo: TipoMovimientoCc
  monto: number
  saldo_anterior: number
  saldo_posterior: number
  concepto: string | null
  venta_id: string | null
  remito_id: string | null
  usuario_id: string | null
  medio_pago: string | null
  created_at: string
}

export interface CuentaFondo {
  id: string
  tienda_id: string
  nombre: string
  tipo: TipoCuenta
  descripcion: string | null
  saldo_actual: number
  color: string
  icono: string
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface MovimientoFondo {
  id: string
  tienda_id: string
  cuenta_fondo_id: string
  tipo: TipoMovimientoFondo
  concepto: string
  monto: number
  saldo_anterior: number
  saldo_posterior: number
  venta_id: string | null
  usuario_id: string | null
  sesion_caja_id: string | null
  created_at: string
}

export interface MetodoPago {
  id: string
  tienda_id: string
  cuenta_fondo_id: string
  nombre: string
  descripcion: string | null
  comision_porcentaje: number
  dias_acreditacion: number
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface SesionCaja {
  id: string
  tienda_id: string
  usuario_apertura_id: string
  usuario_cierre_id: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  monto_apertura_efectivo: number
  estado: EstadoSesionCaja
  observaciones_apertura: string | null
  observaciones_cierre: string | null
  created_at: string
  updated_at: string
}

export interface Venta {
  id: string
  tienda_id: string
  cliente_id: string | null
  usuario_id: string | null
  sesion_caja_id: string | null
  numero_ticket: number
  subtotal: number
  descuento: number
  total: number
  /** Parte del total cubierta con crédito de devoluciones (sin ingreso de caja) */
  saldo_favor_usado: number
  condicion_pago: CondicionPago
  /** Parte del total fiada (no ingresó a caja) */
  monto_cc: number
  estado: EstadoVenta
  observaciones: string | null
  /** Monto retenido en caja por redondeo de vuelto (interno; no altera total). */
  redondeo_efectivo_monto: number
  // Facturación electrónica AFIP/ARCA (null = Ticket X)
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  cae: string | null
  cae_vencimiento: string | null
  qr_afip: string | null
  pdf_url: string | null
  cuit_receptor: string | null
  cajero_id: string | null
  created_at: string
  updated_at: string
}

export interface FacturacionConfig {
  id: string
  tienda_id: string
  // Credenciales TusFacturasAPP — nunca exponer al cliente
  api_usertoken: string | null
  api_apitoken: string | null
  api_apikey: string | null
  // Datos AFIP del emisor
  punto_de_venta: number | null
  condicion_iva_emisor: CondicionIVAEmisor
  activo: boolean
  created_at: string
  updated_at: string
}

export interface DetalleVenta {
  id: string
  tienda_id: string
  venta_id: string
  variante_id: string | null
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  descuento_linea: number
  total_linea: number
  created_at: string
}

export interface PagoVenta {
  id: string
  tienda_id: string
  venta_id: string
  metodo_pago_id: string | null
  cuenta_fondo_id: string | null
  nombre_metodo: string
  nombre_cuenta_fondo: string
  comision_porcentaje: number
  dias_acreditacion: number
  monto: number
  comision_calculada: number
  monto_neto: number
  referencia: string | null
  created_at: string
}

export interface CierreCaja {
  id: string
  sesion_id: string
  tienda_id: string
  usuario_id: string | null
  fecha_cierre: string
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_devoluciones_monto: number
  total_devoluciones_cantidad: number
  total_neto: number
  monto_apertura_efectivo: number
  efectivo_esperado: number
  efectivo_declarado: number | null
  diferencia_efectivo: number | null
  observaciones: string | null
  created_at: string
}

export interface CierreCajaDetalle {
  id: string
  cierre_id: string
  tienda_id: string
  cuenta_fondo_id: string | null
  nombre_cuenta: string
  tipo_cuenta: string
  total_ingresos: number
  total_egresos: number
  comision_estimada: number
  total_neto: number
  saldo_antes_turno: number
  saldo_despues_turno: number
}

export interface MovimientoStock {
  id: string
  tienda_id: string
  variante_id: string
  tipo: TipoMovimientoStock
  cantidad: number
  stock_anterior: number
  stock_posterior: number
  motivo: string | null
  venta_id: string | null
  usuario_id: string | null
  created_at: string
}

export interface Devolucion {
  id: string
  tienda_id: string
  venta_id: string
  sesion_caja_id: string | null
  usuario_id: string | null
  cliente_id: string | null
  numero_devolucion: number
  tipo: TipoDevolucion
  motivo: string
  estado: EstadoDevolucion
  total_devuelto: number
  created_at: string
  updated_at: string
}

export interface DetalleDevolucion {
  id: string
  tienda_id: string
  devolucion_id: string
  detalle_venta_id: string | null
  variante_id: string | null
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  total_linea: number
  created_at: string
}

export interface PagoDevolucion {
  id: string
  tienda_id: string
  devolucion_id: string
  metodo_pago_id: string | null
  cuenta_fondo_id: string | null
  nombre_metodo: string
  nombre_cuenta: string
  monto: number
  referencia: string | null
  created_at: string
}

export interface ColaImpresion {
  id: string
  tienda_id: string
  tipo: TipoColaImpresion
  referencia_id: string | null
  referencia_tipo: string | null
  payload: Json
  estado: EstadoColaImpresion
  intentos: number
  error_mensaje: string | null
  dispositivo_id: string | null
  created_at: string
  updated_at: string
}

export interface ConfiguracionTienda {
  id: string
  tienda_id: string
  razon_social: string | null
  cuit: string | null
  condicion_iva: string | null
  direccion_legal: string | null
  texto_encabezado: string | null
  texto_pie: string | null
  mostrar_logo: boolean
  mostrar_iva: boolean
  prefijo_ticket: string
  ultimo_numero_ticket: number
  ultimo_numero_devolucion: number
  ultimo_numero_remito: number
  impresora_ticket: string | null
  ancho_ticket_mm: number
  moneda: string
  simbolo_moneda: string
  separador_decimal: string
  separador_miles: string
  pos_modo_cobro?: 'clasico' | 'guiado'
  /** Vuelto efectivo solo en múltiplos de $100; resto queda en caja. */
  redondeo_efectivo_activo?: boolean
  /** Plantilla del aviso en ticket ({monto}, {total}). Null = default. */
  redondeo_efectivo_aviso_ticket?: string | null
  recargo_cc_default?: number
  created_at: string
  updated_at: string
}

export interface ConfiguracionEtiqueta {
  id: string
  tienda_id: string
  nombre: string
  es_predeterminado: boolean
  formato: string
  ancho_mm: number
  alto_mm: number
  mostrar_nombre: boolean
  mostrar_precio: boolean
  mostrar_talla: boolean
  mostrar_color: boolean
  mostrar_codigo: boolean
  mostrar_barcode: boolean
  mostrar_logo: boolean
  mostrar_nombre_tienda: boolean
  tamano_fuente_nombre: number
  tamano_fuente_precio: number
  tamano_fuente_talla: number
  etiquetas_por_fila: number
  etiquetas_por_col: number
  created_at: string
  updated_at: string
}

// ─── Remito ───────────────────────────────────────────────────

export interface FacturacionConfig {
  id: string
  tienda_id: string
  api_usertoken: string | null
  api_apitoken: string | null
  api_apikey: string | null
  punto_de_venta: number | null
  condicion_iva_emisor: CondicionIVAEmisor
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Remito {
  id: string
  tienda_id: string
  venta_id: string | null
  usuario_id: string | null
  cliente_id: string | null
  numero_remito: number
  tipo: TipoRemito
  estado: EstadoRemito
  destinatario: string
  direccion_entrega: string | null
  telefono_entrega: string | null
  observaciones: string | null
  fecha_entrega: string | null
  monto_total: number
  monto_cobrado: number
  estado_cobro: EstadoCobro
  fecha_cobro: string | null
  created_at: string
  updated_at: string
}

export interface RemitoItem {
  id: string
  remito_id: string
  tienda_id: string
  nombre_producto: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  total_linea: number
  created_at: string
}

export type EstadoPedidoCatalogo =
  | 'nuevo'
  | 'visto'
  | 'confirmado'
  | 'listo'
  | 'entregado'
  | 'cancelado'
  | 'convertido'

export type TipoEntregaCatalogo = 'retiro' | 'envio'

export interface PedidoCatalogo {
  id: string
  tienda_id: string
  numero: number
  estado: EstadoPedidoCatalogo
  cliente_nombre: string
  cliente_telefono: string
  cliente_id: string | null
  tipo_entrega: TipoEntregaCatalogo
  direccion_entrega: string | null
  notas: string | null
  subtotal: number
  total: number
  venta_id: string | null
  remito_id: string | null
  condicion_pago: CondicionPago
  created_at: string
  updated_at: string
}

export interface PedidoCatalogoItem {
  id: string
  tienda_id: string
  pedido_id: string
  variante_id: string | null
  producto_nombre: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  total_linea: number
  imagen_url: string | null
}

export interface Notificacion {
  id: string
  tienda_id: string
  tipo: string
  titulo: string
  cuerpo: string | null
  leida: boolean
  pedido_id: string | null
  created_at: string
}

// ─── Tipos de base de datos para Supabase client ──────────────

// Shape genérico para tablas: Insert por defecto deriva del Row
// quitando 'id', 'created_at' y 'updated_at' opcionales.
// `Relationships: []` es exigido por GenericTable de postgrest-js.
// Update siempre es Partial<Row>: aunque haya tablas append-only,
// poner `never` rompe la inferencia (Schema cae a never).
type TableShape<R, I = Omit<R, 'id' | 'created_at' | 'updated_at'>> = {
  Row: R
  Insert: I
  Update: Partial<R>
  Relationships: []
}

export interface Database {
  // @supabase/supabase-js v2.96+ exige este marker para resolver
  // los tipos de Tables correctamente. Sin él, `from(...)` cae a `never`.
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      tiendas: TableShape<Tienda>
      perfiles: TableShape<Perfil, Omit<Perfil, 'created_at' | 'updated_at'>>
      categorias: TableShape<Categoria>
      tallas: TableShape<Talla, Omit<Talla, 'id' | 'created_at'>>
      colores: TableShape<Color, Omit<Color, 'id' | 'created_at'>>
      productos: TableShape<Producto>
      variantes_producto: TableShape<VarianteProducto>
      clientes: TableShape<
        Cliente,
        Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'total_compras' | 'monto_total'>
      >
      cuentas_fondos: TableShape<CuentaFondo>
      movimientos_fondos: TableShape<MovimientoFondo, Omit<MovimientoFondo, 'id' | 'created_at'>>
      metodos_pago: TableShape<MetodoPago>
      sesiones_caja: TableShape<SesionCaja>
      ventas: TableShape<Venta>
      detalles_venta: TableShape<DetalleVenta, Omit<DetalleVenta, 'id' | 'created_at'>>
      pagos_venta: TableShape<PagoVenta, Omit<PagoVenta, 'id' | 'created_at'>>
      cierres_caja: TableShape<CierreCaja, Omit<CierreCaja, 'id' | 'created_at'>>
      cierres_caja_detalle: TableShape<CierreCajaDetalle, Omit<CierreCajaDetalle, 'id'>>
      movimientos_stock: TableShape<MovimientoStock, Omit<MovimientoStock, 'id' | 'created_at'>>
      devoluciones: TableShape<Devolucion>
      detalles_devolucion: TableShape<DetalleDevolucion, Omit<DetalleDevolucion, 'id' | 'created_at'>>
      pagos_devolucion: TableShape<PagoDevolucion, Omit<PagoDevolucion, 'id' | 'created_at'>>
      remitos: TableShape<Remito>
      remito_items: TableShape<RemitoItem, Omit<RemitoItem, 'id' | 'created_at'>>
      cola_impresion: TableShape<ColaImpresion>
      configuracion_tienda: TableShape<ConfiguracionTienda>
      configuracion_etiquetas: TableShape<ConfiguracionEtiqueta>
      facturacion_config: TableShape<FacturacionConfig, Omit<FacturacionConfig, 'id' | 'created_at' | 'updated_at'>>
    }
    Views: Record<string, never>
    Functions: {
      get_tienda_id: { Args: Record<string, never>; Returns: string }
      cerrar_caja: { Args: { p_sesion_id: string; p_efectivo_declarado?: number; p_observaciones?: string }; Returns: string }
      get_siguiente_numero_ticket: { Args: { p_tienda_id: string }; Returns: number }
      get_siguiente_numero_devolucion: { Args: { p_tienda_id: string }; Returns: number }
      registrar_movimiento_caja_manual: {
        Args: {
          p_cuenta_fondo_id: string
          p_tipo: string
          p_concepto: string
          p_monto: number
        }
        Returns: string
      }
      editar_movimiento_caja_manual: {
        Args: {
          p_id: string
          p_cuenta_fondo_id: string
          p_tipo: string
          p_concepto: string
          p_monto: number
        }
        Returns: string
      }
      eliminar_movimiento_caja_manual: {
        Args: { p_id: string }
        Returns: undefined
      }
      get_dashboard_inicio: { Args: { p_tienda_id: string }; Returns: Json }
      get_dashboard_ganancia: { Args: { p_tienda_id: string }; Returns: Json }
      get_dashboard_tops: {
        Args: { p_tienda_id: string; p_limit?: number }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
