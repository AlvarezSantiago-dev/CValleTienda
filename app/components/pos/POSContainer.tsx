'use client'

import { useMemo, useRef, useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BuscadorVariantes, type BuscadorVariantesHandle } from './BuscadorVariantes'
import { Carrito } from './Carrito'
import { PanelPago } from './PanelPago'
import { GrillaProductos } from './GrillaProductos'
import { PesoModal } from './PesoModal'
import { registrarVenta, buscarVariantesAction, buscarVarianteBalanzaAction } from '@/app/actions/ventas'
import { esStockInfinito, STOCK_INFINITO, tieneStockSuficiente } from '@/lib/stock/infinito'
import { puedeCobrarVenta } from '@/lib/pos/puede-cobrar'
import { rubroPermiteStockInfinito, rubroTieneVale } from '@/lib/rubro/config'
import { obtenerPayloadVenta } from '@/app/actions/impresion'
import { emitirFactura, obtenerEstadoFacturacion } from '@/app/actions/facturacion'
import { usePrint } from '@/lib/impresion/usePrint'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { TicketVentaRenderer } from '@/components/impresion/TicketVentaRenderer'
import { ValeCambioRenderer } from '@/components/impresion/ValeCambioRenderer'
import { PrintSelectionModal } from './PrintSelectionModal'
import { PosAtajosHelp } from './PosAtajosHelp'
import { CobroGuiadoModal } from './CobroGuiadoModal'
import { CobroPagoModal } from './CobroPagoModal'
import { PanelCobroResumen } from './PanelCobroResumen'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Package, Check } from 'lucide-react'
import { formatARS } from '@/lib/format'
import { limitarDescuentoASubtotal } from '@/lib/pos/descuento'
import { aplicarPreciosCondicion, syncCarritoPrecios } from '@/lib/pos/precios-condicion'
import { CondicionPagoToggle } from './CondicionPagoToggle'
import type { CondicionPago } from '@/types/database'
import { shouldIgnoreHotkey } from '@/lib/pos/hotkeys'
import { esModoGuiado, normalizarModoCobro } from '@/lib/pos/cobro-modo'
import { CodigoDesconocidoModal } from '@/components/productos/CodigoDesconocidoModal'
import { useRubro } from '@/components/layout/RubroProvider'
import {
  sincronizarPagosTrasDescuento,
  totalAPagar as calcTotalAPagar,
  type PasoCobroGuiado,
} from '@/lib/pos/cobro-guiado-steps'
import {
  aplicarPagoRapido,
  esMetodoEfectivo,
  focusPrimerMontoPago,
  metodoPorDefecto,
} from '@/lib/pos/pago-rapido'
import type { PayloadTicketVenta } from '@/lib/impresion/types'
import { parseBalanza } from '@/lib/pos/balanza'
import { round2, round3 } from '@/lib/format-cantidad'
import { sumarSubtotalLineas } from '@/lib/pos/totales-carrito'
import type { VarianteResultado, ProductoPOS } from '@/lib/pos/queries'
import type { MetodoPago, ConfiguracionTienda } from '@/lib/configuracion/queries'
import type { ClienteLite } from '@/app/actions/ventas'
import type { PagoLinea } from './PagoMultiMetodo'

/** Unidades que se venden por medida continua y requieren ingresar la cantidad */
const UNIDADES_MEDIBLES = new Set(['kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada'])

export interface CartItem {
  id: string
  variante_id: string
  producto_nombre: string
  talla: string | null
  color: string | null
  precio_unitario: number
  cantidad: number
  stock_actual: number
  codigo_barras: string | null
  unidad_de_medida: string
  es_pack?: boolean
  pack_cantidad?: number | null
  pack_habilitado?: boolean
  pack_precio?: number | null
  pack_codigo_barras?: string | null
  pack_automatico?: boolean
  precio_unidad_original?: number
  codigo_unidad?: string | null
  stock_fisico?: number
  /** Precio de contado (post-pack, post-tramo) para poder volver del recargo CC */
  precio_contado?: number
  recargo_cc_pct?: number | null
  precio_lista?: number
  tramos?: import('@/lib/precios/tramos-cantidad').TramoCantidad[]
}

interface POSContainerProps {
  metodos: MetodoPago[]
  configuracion: ConfiguracionTienda | null
  tiendaNombre: string | null
  productos: ProductoPOS[]
}

function stockFisicoValido(items: CartItem[], permiteInfinito: boolean) {
  const consumo = new Map<string, { cantidad: number; disponible: number }>()
  for (const item of items) {
    const packSize = item.es_pack && item.pack_cantidad ? item.pack_cantidad : 1
    const cantidadFisica = item.cantidad * packSize
    let disponible: number
    if (item.stock_fisico != null) {
      disponible = item.stock_fisico
    } else if (esStockInfinito(item.stock_actual)) {
      disponible = STOCK_INFINITO
    } else if (item.es_pack) {
      disponible = item.stock_actual * packSize
    } else {
      disponible = item.stock_actual
    }
    const actual = consumo.get(item.variante_id)
    consumo.set(item.variante_id, {
      cantidad: (actual?.cantidad ?? 0) + cantidadFisica,
      disponible,
    })
  }
  return Array.from(consumo.values()).every((item) =>
    tieneStockSuficiente(item.disponible, item.cantidad, permiteInfinito)
  )
}

export function POSContainer({
  metodos,
  configuracion,
  tiendaNombre,
  productos,
}: POSContainerProps) {
  const router = useRouter()
  const { usarPack, usarPedidoCc, rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const recargoDefault = Number(configuracion?.recargo_cc_default ?? 0)
  const [condicionPago, setCondicionPago] = useState<CondicionPago>('contado')
  const condicionRef = useRef<CondicionPago>('contado')
  condicionRef.current = condicionPago
  const esCuentaCorriente = usarPedidoCc && condicionPago === 'cuenta_corriente'
  /** Recargo % de este pedido (editable). null = usar producto / default de tienda. */
  const [recargoPedido, setRecargoPedido] = useState<number | null>(null)
  const recargoPedidoRef = useRef<number | null>(null)
  recargoPedidoRef.current = recargoPedido
  const [items, setItems] = useState<CartItem[]>([])
  const [pagos, setPagos] = useState<PagoLinea[]>([])
  const [descuentoRaw, setDescuento] = useState(0)
  const [cliente, setCliente] = useState<ClienteLite | null>(null)
  const [saldoFavorAplicado, setSaldoFavorAplicado] = useState(0)
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmacion, setConfirmacion] = useState<{ ticket: string; ventaId: string } | null>(null)
  const [isCobrando, startCobrando] = useTransition()
  const [facturacionActiva, setFacturacionActiva] = useState(false)
  const [emitirFacturaToggle, setEmitirFacturaToggle] = useState(false)
  const [cuitReceptor, setCuitReceptor] = useState('')
  /** Código escaneado que no se encontró en el sistema */
  const [codigoNoEncontrado, setCodigoNoEncontrado] = useState<string | null>(null)
  /** Variante pendiente de confirmación de peso/cantidad (para unidades medibles) */
  const [pesoModalPendiente, setPesoModalPendiente] = useState<{ variante: VarianteResultado; precioOverride?: number } | null>(null)
  /** Payload listo para imprimir — muestra el diálogo de selección de tickets */
  const [payloadPendiente, setPayloadPendiente] = useState<PayloadTicketVenta | null>(null)
  const [showAtajosHelp, setShowAtajosHelp] = useState(false)
  const [cobroGuiadoAbierto, setCobroGuiadoAbierto] = useState(false)
  const [cobroPagoAbierto, setCobroPagoAbierto] = useState(false)
  const [pasoGuiado, setPasoGuiado] = useState<PasoCobroGuiado>('pago')

  const modoCobro = normalizarModoCobro(configuracion?.pos_modo_cobro)
  const modoGuiado = esModoGuiado(modoCobro)
  const redondeoEfectivoActivo = configuracion?.redondeo_efectivo_activo !== false

  // Verificar si la facturación está activa para este tenant (una sola vez al montar)
  useEffect(() => {
    obtenerEstadoFacturacion().then((res) => {
      if (res.ok && res.data?.activo) setFacturacionActiva(true)
    })
  }, [])
  const { contenido: printContenido, imprimir, imprimirConPayload } = usePrint({ tipo: 'ticket' })
  const buscadorRef = useRef<BuscadorVariantesHandle>(null)
  const [buscadorQuery, setBuscadorQuery] = useState('')
  const [grillaAbierta, setGrillaAbierta] = useState(false)
  const [carritoDrawerOpen, setCarritoDrawerOpen] = useState(false)

  // Captura escaneos cuando el foco NO está en el buscador (ej: en el botón Cobrar).
  useBarcodeScanner({
    onScan: async (codigo) => {
      const res = await buscarVariantesAction(codigo)
      if (res.ok && res.data && res.data.length === 1) {
        agregarVariante(res.data[0])
        return
      }
      if (res.ok && res.data && res.data.length > 1) {
        // Múltiples resultados: mostrar en el buscador para que el cajero elija
        buscadorRef.current?.setQuery(codigo)
        return
      }
      // Sin resultados — intentar como código de balanza
      const balanza = parseBalanza(codigo)
      if (balanza && configuracion?.balanza_formato) {
        const res2 = await buscarVarianteBalanzaAction(balanza.codigoInterno)
        if (res2.ok && res2.data) {
          if (configuracion.balanza_formato === 'precio') {
            agregarVariante(res2.data, { precioOverride: balanza.precio })
          } else {
            const qty =
              res2.data.unidad_de_medida === 'gramo'
                ? round3(balanza.peso * 1000)
                : balanza.peso
            agregarVariante(res2.data, { cantidadOverride: qty })
          }
          return
        }
      }
      // Definitivamente no encontrado
      handleCodigoNoEncontrado(codigo)
    },
  })

  function handleCodigoNoEncontrado(codigo: string) {
    setCodigoNoEncontrado(codigo)
    buscadorRef.current?.focus()
  }

  async function handleCodigoAsociado(codigo: string) {
    const res = await buscarVariantesAction(codigo)
    if (!res.ok || !res.data || res.data.length !== 1) {
      setError(res.error ?? 'El código se asoció, pero no se pudo agregar el producto al carrito')
      setCodigoNoEncontrado(null)
      return
    }
    setCodigoNoEncontrado(null)
    agregarVariante(res.data[0])
    buscadorRef.current?.focus()
  }

  const subtotal = useMemo(() => sumarSubtotalLineas(items), [items])

  const descuento = useMemo(
    () => limitarDescuentoASubtotal(subtotal, descuentoRaw),
    [subtotal, descuentoRaw]
  )

  function handleSaldoFavorChange(nuevo: number) {
    const totalAnterior = calcTotalAPagar({
      subtotal,
      descuento,
      saldoFavorAplicado,
      pagos,
      cliente,
      metodos,
    })
    setSaldoFavorAplicado(nuevo)
    const totalNuevo = calcTotalAPagar({
      subtotal,
      descuento,
      saldoFavorAplicado: nuevo,
      pagos,
      cliente,
      metodos,
    })
    setPagos((prev) => sincronizarPagosTrasDescuento(prev, totalAnterior, totalNuevo))
  }

  function handleDescuentoChange(nuevo: number) {
    const limitado = limitarDescuentoASubtotal(subtotal, nuevo)
    const totalAnterior = calcTotalAPagar({
      subtotal,
      descuento,
      saldoFavorAplicado,
      pagos,
      cliente,
      metodos,
    })
    setDescuento(limitado)
    const totalNuevo = calcTotalAPagar({
      subtotal,
      descuento: limitado,
      saldoFavorAplicado,
      pagos,
      cliente,
      metodos,
    })
    setPagos((prev) => sincronizarPagosTrasDescuento(prev, totalAnterior, totalNuevo))
  }

  function agregarVariante(
    v: VarianteResultado,
    opts?: { precioOverride?: number; cantidadOverride?: number }
  ) {
    setError(null)
    setCodigoNoEncontrado(null)

    // Si tiene unidad medible y no tenemos override de cantidad → pedir al cajero
    if (UNIDADES_MEDIBLES.has(v.unidad_de_medida) && opts?.cantidadOverride === undefined) {
      setPesoModalPendiente({ variante: v, precioOverride: opts?.precioOverride })
      return
    }

    const cantidad = opts?.cantidadOverride ?? 1
    const precio = opts?.precioOverride ?? v.precio_venta
    const varianteId = v.es_pack ? v.id.replace(/__pack$/, '') : v.id

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === v.id)
      let next: CartItem[]
      const esMedible = UNIDADES_MEDIBLES.has(v.unidad_de_medida)
      if (idx >= 0) {
        next = [...prev]
        next[idx] = {
          ...next[idx],
          cantidad: esMedible
            ? round3(next[idx].cantidad + cantidad)
            : next[idx].cantidad + cantidad,
          precio_unitario: opts?.precioOverride !== undefined ? precio : next[idx].precio_unitario,
        }
      } else {
        next = [
          ...prev,
          {
            id: v.id,
            variante_id: varianteId,
            producto_nombre: v.producto_nombre,
            talla: v.talla,
            color: v.color,
            precio_unitario: precio,
            cantidad,
            stock_actual: v.stock_efectivo,
            codigo_barras: v.codigo_barras,
            unidad_de_medida: v.unidad_de_medida,
            es_pack: v.es_pack ?? false,
            pack_cantidad: v.pack_cantidad ?? null,
            pack_habilitado: v.pack_habilitado,
            pack_precio: v.pack_precio,
            pack_codigo_barras: v.pack_codigo_barras,
            pack_automatico: false,
            precio_unidad_original: v.es_pack ? undefined : precio,
            codigo_unidad: v.es_pack ? null : v.codigo_barras,
            stock_fisico: v.stock_actual,
            precio_contado: precio,
            precio_lista: precio,
            recargo_cc_pct: recargoPedidoRef.current ?? v.recargo_cc_pct,
            tramos: v.es_pack ? [] : (v.tramos ?? []),
          },
        ]
      }
      return syncCarritoPrecios(next, {
        usarPack: usarPack && !v.es_pack,
        permiteInfinito,
        condicion: condicionRef.current,
        recargoDefault,
      })
    })
  }

  function confirmarPeso(cantidad: number) {
    if (!pesoModalPendiente) return
    const { variante, precioOverride } = pesoModalPendiente
    setPesoModalPendiente(null)
    agregarVariante(variante, { cantidadOverride: cantidad, precioOverride })
    buscadorRef.current?.focus()
  }

  function cancelarPeso() {
    setPesoModalPendiente(null)
    buscadorRef.current?.focus()
  }

  function actualizarItem(id: string, patch: Partial<CartItem>) {
    setItems((prev) => {
      let next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
      if (patch.recargo_cc_pct != null) {
        return aplicarPreciosCondicion(next, condicionRef.current, recargoDefault)
      }
      const precioEditado = patch.precio_unitario
      if (precioEditado != null && patch.precio_contado == null) {
        return next.map((it) =>
          it.id === id
            ? { ...it, precio_contado: precioEditado, precio_unitario: precioEditado }
            : it
        )
      }
      return patch.cantidad !== undefined
        ? syncCarritoPrecios(next, {
            usarPack,
            permiteInfinito,
            condicion: condicionRef.current,
            recargoDefault,
          })
        : next
    })
  }

  function cambiarCondicionPago(next: CondicionPago) {
    setCondicionPago(next)
    condicionRef.current = next
    if (next === 'cuenta_corriente') {
      setPagos([])
    }
    setItems((prev) => aplicarPreciosCondicion(prev, next, recargoDefault))
  }

  function cambiarRecargoPedido(pct: number) {
    const recargo = Math.max(0, Number.isFinite(pct) ? pct : 0)
    setRecargoPedido(recargo)
    recargoPedidoRef.current = recargo
    setItems((prev) =>
      aplicarPreciosCondicion(
        prev.map((it) => ({ ...it, recargo_cc_pct: recargo })),
        condicionRef.current,
        recargoDefault
      )
    )
  }
  function eliminarItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function reset() {
    setItems([])
    setPagos([])
    setDescuento(0)
    setCliente(null)
    setSaldoFavorAplicado(0)
    setObservaciones('')
    setError(null)
    setEmitirFacturaToggle(false)
    setCuitReceptor('')
    setCodigoNoEncontrado(null)
    setPesoModalPendiente(null)
    setCondicionPago('contado')
    condicionRef.current = 'contado'
    setRecargoPedido(null)
    recargoPedidoRef.current = null
  }

  const totalBruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const totalAPagar = Math.max(0, Math.round((totalBruto - saldoFavorAplicado) * 100) / 100)
  const stockOk = stockFisicoValido(items, permiteInfinito)
  const puedeCobrar = puedeCobrarVenta({
    hayItems: items.length > 0,
    stockOk,
    totalBruto,
    saldoFavorAplicado,
    pagos,
    esCuentaCorriente,
  })
  const puedeAbrirCobro =
    items.length > 0 && stockOk && (modoGuiado || !esCuentaCorriente || !!cliente)
  const superaLimite =
    esCuentaCorriente &&
    cliente?.limite_cc != null &&
    (cliente.saldo_cc ?? 0) + totalBruto > cliente.limite_cc + 0.01

  const finalizarVenta = useCallback(
    (pagosOverride?: PagoLinea[]) => {
      setError(null)

      const bruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
      const pagosActuales = pagosOverride ?? pagos
      const stockValido = stockFisicoValido(items, permiteInfinito)
      const ok = puedeCobrarVenta({
        hayItems: items.length > 0,
        stockOk: stockValido,
        totalBruto: bruto,
        saldoFavorAplicado,
        pagos: pagosActuales,
        esCuentaCorriente,
      })

      if (!ok) return

      if (esCuentaCorriente && !cliente) {
        setError('Elegí un cliente para fiar')
        return
      }

      startCobrando(async () => {
        const res = await registrarVenta({
          items: items.map((it) => ({
            variante_id: it.variante_id,
            cantidad: it.cantidad,
            precio_unitario: it.precio_unitario,
            pack_size: it.es_pack && it.pack_cantidad ? it.pack_cantidad : undefined,
          })),
          pagos: pagosActuales.map((p) => ({
            metodo_pago_id: p.metodo_pago_id,
            monto: Number(p.monto),
            referencia: p.referencia || null,
          })),
          cliente_id: cliente?.id ?? null,
          descuento_global: descuento,
          observaciones: observaciones || null,
          saldo_favor_usado: saldoFavorAplicado > 0 ? saldoFavorAplicado : undefined,
          condicion_pago: esCuentaCorriente ? 'cuenta_corriente' : 'contado',
        })

        if (!res.ok || !res.data) {
          setError(res.error ?? 'Error al cobrar')
          return
        }

        const { numeroTicket, ventaId } = res.data
        const ticketFmt = formatNumeroTicket(configuracion?.prefijo_ticket, numeroTicket)

        setCobroGuiadoAbierto(false)
        setCobroPagoAbierto(false)
        setConfirmacion({ ticket: ticketFmt, ventaId })
        setTimeout(() => setConfirmacion(null), 12000)

        if (emitirFacturaToggle) {
          await emitirFactura(ventaId, cuitReceptor || null)
        }

        reset()
        router.refresh()

        const payloadRes = await obtenerPayloadVenta(ventaId)
        if (payloadRes.ok && payloadRes.data) {
          setPayloadPendiente(payloadRes.data)
        }

        buscadorRef.current?.focus()
      })
    },
    [
      items,
      pagos,
      subtotal,
      descuento,
      saldoFavorAplicado,
      cliente,
      observaciones,
      emitirFacturaToggle,
      cuitReceptor,
      configuracion?.prefijo_ticket,
      router,
      permiteInfinito,
      esCuentaCorriente,
    ]
  )

  const abrirCobroGuiado = useCallback(() => {
    if (items.length === 0 || !stockOk) return
    setError(null)
    if (esCuentaCorriente) {
      setPagos([])
      setPasoGuiado('cliente')
    } else {
      setPasoGuiado('pago')
    }
    setCobroGuiadoAbierto(true)
  }, [items.length, stockOk, esCuentaCorriente])

  const cobrar = useCallback((pagosOverride?: PagoLinea[]) => {
    setError(null)

    const bruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
    const aPagar = Math.max(0, Math.round((bruto - saldoFavorAplicado) * 100) / 100)
    const pagosActuales = [...(pagosOverride ?? pagos)]

    // Sin método elegido: no cobrar. Efectivo → seed + foco monto; otro → mensaje.
    if (pagosActuales.length === 0 && aPagar > 0 && !esCuentaCorriente) {
      const m = metodoPorDefecto(metodos)
      if (m && esMetodoEfectivo(m)) {
        setPagos(
          aplicarPagoRapido(m.id, aPagar, {
            esEfectivo: true,
            redondeoActivo: redondeoEfectivoActivo,
          })
        )
        focusPrimerMontoPago()
        return
      }
      setError('Elegí una forma de pago')
      return
    }

    if (esCuentaCorriente && !cliente) {
      setError('Elegí un cliente para fiar')
      return
    }

    const stockValido = stockFisicoValido(items, permiteInfinito)
    const ok = puedeCobrarVenta({
      hayItems: items.length > 0,
      stockOk: stockValido,
      totalBruto: bruto,
      saldoFavorAplicado,
      pagos: pagosActuales,
      esCuentaCorriente,
    })

    if (!ok) return

    finalizarVenta(pagosActuales)
  }, [items, pagos, subtotal, descuento, saldoFavorAplicado, metodos, finalizarVenta, permiteInfinito, esCuentaCorriente, cliente, redondeoEfectivoActivo])

  const abrirCobroPago = useCallback(() => {
    if (items.length === 0 || !stockOk) return
    if (esCuentaCorriente && !cliente) {
      setError('Elegí un cliente para fiar')
      return
    }
    setError(null)
    setCobroPagoAbierto(true)
  }, [items.length, stockOk, esCuentaCorriente, cliente])

  const iniciarCobro = useCallback(() => {
    if (modoGuiado) {
      abrirCobroGuiado()
      return
    }
    abrirCobroPago()
  }, [modoGuiado, abrirCobroGuiado, abrirCobroPago])

  const modalAbierto = !!pesoModalPendiente || !!payloadPendiente || cobroGuiadoAbierto || cobroPagoAbierto

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (showAtajosHelp) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowAtajosHelp(false)
        }
        return
      }

      if (modalAbierto) return
      if (shouldIgnoreHotkey(e)) return

      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        if (modoGuiado) {
          if (cobroGuiadoAbierto && pasoGuiado === 'confirmacion') {
            finalizarVenta()
          } else {
            iniciarCobro()
          }
        } else {
          iniciarCobro()
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        buscadorRef.current?.focus()
        setGrillaAbierta(false)
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowAtajosHelp(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalAbierto, showAtajosHelp, iniciarCobro, modoGuiado, cobroGuiadoAbierto, pasoGuiado, finalizarVenta])

  return (
    <>
      <div className={`grid grid-cols-1 lg:grid-cols-5 gap-6 ${items.length > 0 ? 'pb-24 lg:pb-0' : ''}`}>
        <div className="lg:col-span-3 space-y-4 min-w-0">
          {/* Card de búsqueda */}
          <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">
                Buscar o escanear
              </span>
              {!buscadorQuery && productos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGrillaAbierta((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-colors cursor-pointer focus-ring ${
                    grillaAbierta
                      ? 'bg-fg text-fg-inverse'
                      : 'bg-surface-sunken text-fg-muted hover:bg-surface-hover'
                  }`}
                >
                  <Package size={14} aria-hidden />
                  {grillaAbierta ? 'Cerrar catálogo' : 'Catálogo'}
                </button>
              )}
            </div>
            <div className="p-3">
              <BuscadorVariantes
                ref={buscadorRef}
                onSelect={agregarVariante}
                onQueryChange={setBuscadorQuery}
                onCodigoNoEncontrado={handleCodigoNoEncontrado}
              />
            </div>
          </div>

          {!buscadorQuery && grillaAbierta && (
            <GrillaProductos productos={productos} onSelect={agregarVariante} />
          )}
          <div className="hidden lg:block space-y-3">
            {usarPedidoCc && (
              <div className="space-y-2">
                <CondicionPagoToggle value={condicionPago} onChange={cambiarCondicionPago} />
                {esCuentaCorriente && (
                  <label className="flex items-center gap-2 text-sm text-fg">
                    <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted shrink-0">
                      Recargo %
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={recargoPedido ?? recargoDefault}
                      onChange={(e) => cambiarRecargoPedido(Number(e.target.value))}
                      className="w-24 h-9 px-2 border border-border-default rounded-[var(--radius-md)] text-sm tabular-nums bg-surface focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      aria-label="Recargo cuenta corriente del pedido"
                    />
                    <span className="text-xs text-fg-subtle">sobre el precio de contado</span>
                  </label>
                )}
                {esCuentaCorriente && !cliente && (
                  <p className="text-xs text-warning-soft-fg bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-3 py-2">
                    Elegí un cliente para fiar al confirmar.
                  </p>
                )}
                {superaLimite && (
                  <p className="text-xs text-warning-soft-fg bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-3 py-2">
                    Este pedido supera el límite de cuenta del cliente. Se puede confirmar igual.
                  </p>
                )}
              </div>
            )}
            <Carrito
              items={items}
              onUpdate={actualizarItem}
              onRemove={eliminarItem}
              esCuentaCorriente={esCuentaCorriente}
              recargoDefault={recargoDefault}
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          {modoGuiado ? (
            <div className="hidden lg:block">
              <PanelCobroResumen
                subtotal={subtotal}
                descuento={descuento}
                totalAPagar={totalAPagar}
                itemsCount={items.length}
                onCobrar={iniciarCobro}
                isCobrando={isCobrando}
                puedeCobrar={puedeAbrirCobro}
                error={error}
              />
            </div>
          ) : (
            <PanelPago
              subtotal={subtotal}
              descuento={descuento}
              onDescuentoChange={handleDescuentoChange}
              clienteSeleccionado={cliente}
              onClienteChange={(c) => {
                setCliente(c)
                setSaldoFavorAplicado(0)
              }}
              observaciones={observaciones}
              onObservacionesChange={setObservaciones}
              onCobrar={iniciarCobro}
              isCobrando={isCobrando}
              puedeAbrirCobro={puedeAbrirCobro}
              error={error}
              saldoFavorAplicado={saldoFavorAplicado}
              onSaldoFavorChange={handleSaldoFavorChange}
              facturacionActiva={facturacionActiva}
              emitirFactura={emitirFacturaToggle}
              onEmitirFacturaChange={setEmitirFacturaToggle}
              cuitReceptor={cuitReceptor}
              onCuitReceptorChange={setCuitReceptor}
              esCuentaCorriente={esCuentaCorriente}
            />
          )}
        </div>
      </div>

      {/* Barra sticky cobro — solo en layout apilado (< lg) */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-(--z-nav) border-t border-border-default bg-surface px-4 py-3 flex items-center gap-3 shadow-overlay pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCarritoDrawerOpen(true)}
            className="flex-1 min-w-0 text-left cursor-pointer focus-ring rounded-[var(--radius-md)]"
          >
            <p className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
              {items.length} {items.length === 1 ? 'ítem' : 'ítems'} · Ver carrito
            </p>
            <p className="text-xl font-bold text-fg font-mono tabular-nums truncate">
              {formatARS(totalAPagar)}
            </p>
          </button>
          <Button
            type="button"
            onClick={iniciarCobro}
            disabled={!puedeAbrirCobro || isCobrando}
            size="lg"
            className="shrink-0"
          >
            {isCobrando ? '…' : 'Cobrar'}
          </Button>
        </div>
      )}

      <Drawer
        open={carritoDrawerOpen}
        onClose={() => setCarritoDrawerOpen(false)}
        title="Carrito"
        description={`${items.length} ${items.length === 1 ? 'ítem' : 'ítems'} · ${formatARS(totalAPagar)}`}
        side="bottom"
        footer={
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={() => {
              setCarritoDrawerOpen(false)
              iniciarCobro()
            }}
            disabled={!puedeAbrirCobro || isCobrando}
          >
            {isCobrando ? '…' : 'Cobrar'}
          </Button>
        }
      >
        {usarPedidoCc && (
          <div className="mb-3 space-y-2">
            <CondicionPagoToggle value={condicionPago} onChange={cambiarCondicionPago} />
            {esCuentaCorriente && (
              <label className="flex items-center gap-2 text-sm text-fg">
                <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Recargo %
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={recargoPedido ?? recargoDefault}
                  onChange={(e) => cambiarRecargoPedido(Number(e.target.value))}
                  className="w-24 h-9 px-2 border border-border-default rounded-[var(--radius-md)] text-sm tabular-nums bg-surface"
                  aria-label="Recargo cuenta corriente del pedido"
                />
              </label>
            )}
            {esCuentaCorriente && !cliente && (
              <p className="text-xs text-warning-soft-fg">Elegí un cliente para fiar al confirmar.</p>
            )}
          </div>
        )}
        <Carrito
          items={items}
          onUpdate={actualizarItem}
          onRemove={eliminarItem}
          esCuentaCorriente={esCuentaCorriente}
          recargoDefault={recargoDefault}
        />
      </Drawer>

      <PosAtajosHelp
        open={showAtajosHelp}
        onClose={() => setShowAtajosHelp(false)}
        modoGuiado={modoGuiado}
      />

      <CobroPagoModal
        open={cobroPagoAbierto}
        onClose={() => setCobroPagoAbierto(false)}
        metodos={metodos}
        totalAPagar={totalAPagar}
        pagos={pagos}
        onPagosChange={setPagos}
        cliente={cliente}
        onConfirmar={cobrar}
        isCobrando={isCobrando}
        puedeCobrar={puedeCobrar}
        error={error}
        redondeoEfectivoActivo={redondeoEfectivoActivo}
        esCuentaCorriente={esCuentaCorriente}
      />

      <CobroGuiadoModal
        open={cobroGuiadoAbierto}
        onClose={() => setCobroGuiadoAbierto(false)}
        paso={pasoGuiado}
        onPasoChange={setPasoGuiado}
        subtotal={subtotal}
        descuento={descuento}
        saldoFavorAplicado={saldoFavorAplicado}
        pagos={pagos}
        cliente={cliente}
        itemsCount={items.length}
        metodos={metodos}
        facturacionActiva={facturacionActiva}
        emitirFactura={emitirFacturaToggle}
        onEmitirFacturaChange={setEmitirFacturaToggle}
        cuitReceptor={cuitReceptor}
        onCuitReceptorChange={setCuitReceptor}
        observaciones={observaciones}
        onObservacionesChange={setObservaciones}
        onPagosChange={setPagos}
        onClienteChange={(c) => {
          setCliente(c)
          if (!c) setSaldoFavorAplicado(0)
        }}
        onDescuentoChange={handleDescuentoChange}
        onSaldoFavorChange={handleSaldoFavorChange}
        onConfirmar={() => finalizarVenta()}
        isCobrando={isCobrando}
        error={error}
        redondeoEfectivoActivo={redondeoEfectivoActivo}
        esCuentaCorriente={esCuentaCorriente}
      />

      {confirmacion && (
        <div
          role="status"
          className="fixed bottom-6 right-6 bg-fg text-fg-inverse px-4 py-3 rounded-[var(--radius-lg)] shadow-overlay z-(--z-toast) text-sm flex items-center gap-3"
        >
          <Check size={18} className="shrink-0 text-primary" aria-hidden />
          <div>
            <div className="font-semibold">Venta {confirmacion.ticket} registrada</div>
            <div className="text-xs opacity-70">Listos para imprimir…</div>
          </div>
          <a
            href={`/remitos/nuevo?venta_id=${confirmacion.ventaId}`}
            onClick={() => setConfirmacion(null)}
            className="ml-1 shrink-0 px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-[var(--radius-full)] transition"
          >
            Crear remito →
          </a>
          <button
            type="button"
            onClick={() => setConfirmacion(null)}
            className="text-fg-inverse/50 hover:text-fg-inverse cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Diálogo de selección de tickets */}
      {payloadPendiente && (() => {
        const dias = payloadPendiente.tienda.dias_cambio
        const tieneVale = !!(dias && dias > 0) && rubroTieneVale(payloadPendiente.tienda.rubro)

        const handleTicket = () => {
          imprimirConPayload('ticket', payloadPendiente, <TicketVentaRenderer payload={payloadPendiente} />)
          // No se cierra: el cajero imprime, corta, y puede seguir imprimiendo
        }
        const handleVale = () => {
          imprimirConPayload('vale', payloadPendiente, <ValeCambioRenderer payload={payloadPendiente} diasCambio={dias!} />)
          // No se cierra: el cajero corta y cierra manualmente cuando termina
        }

        return (
          <PrintSelectionModal
            numeroTicket={payloadPendiente.numero_ticket}
            tieneVale={tieneVale}
            diasCambio={dias ?? undefined}
            onTicket={handleTicket}
            onVale={handleVale}
            onClose={() => setPayloadPendiente(null)}
          />
        )
      })()}

      {/* Modal de cantidad para productos vendidos por peso/medida */}
      {pesoModalPendiente && (
        <PesoModal
          variante={pesoModalPendiente.variante}
          precioOverride={pesoModalPendiente.precioOverride}
          cantidadActualEnCarrito={
            items.find((it) => it.id === pesoModalPendiente.variante.id)?.cantidad ?? 0
          }
          onConfirm={confirmarPeso}
          onCancel={cancelarPeso}
        />
      )}

      <CodigoDesconocidoModal
        open={codigoNoEncontrado !== null}
        codigo={codigoNoEncontrado}
        usarPack={usarPack}
        onClose={() => {
          setCodigoNoEncontrado(null)
          buscadorRef.current?.focus()
        }}
        onCrear={(codigo) => {
          window.open(
            `/productos/nuevo?codigo=${encodeURIComponent(codigo)}`,
            '_blank',
            'noopener,noreferrer'
          )
          setCodigoNoEncontrado(null)
        }}
        onAsociado={() => {
          if (codigoNoEncontrado) void handleCodigoAsociado(codigoNoEncontrado)
        }}
      />

      {printContenido}
    </>
  )
}
