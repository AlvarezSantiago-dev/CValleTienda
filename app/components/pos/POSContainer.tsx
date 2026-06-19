'use client'

import { useMemo, useRef, useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BuscadorVariantes, type BuscadorVariantesHandle } from './BuscadorVariantes'
import { Carrito } from './Carrito'
import { PanelPago } from './PanelPago'
import { GrillaProductos } from './GrillaProductos'
import { PesoModal } from './PesoModal'
import { UltimoAgregadoChip } from './UltimoAgregadoChip'
import { registrarVenta, buscarVariantesAction, buscarVarianteBalanzaAction } from '@/app/actions/ventas'
import { obtenerPayloadVenta } from '@/app/actions/impresion'
import { emitirFactura, obtenerEstadoFacturacion } from '@/app/actions/facturacion'
import { usePrint } from '@/lib/impresion/usePrint'
import { rubroTieneVale } from '@/lib/rubro/config'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { TicketVentaRenderer } from '@/components/impresion/TicketVentaRenderer'
import { ValeCambioRenderer } from '@/components/impresion/ValeCambioRenderer'
import { PrintSelectionModal } from './PrintSelectionModal'
import { PosAtajosHelp } from './PosAtajosHelp'
import { CobroGuiadoModal } from './CobroGuiadoModal'
import { PanelCobroResumen } from './PanelCobroResumen'
import { Button } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { limitarDescuentoASubtotal } from '@/lib/pos/descuento'
import { shouldIgnoreHotkey } from '@/lib/pos/hotkeys'
import { esModoGuiado, normalizarModoCobro } from '@/lib/pos/cobro-modo'
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
}

interface POSContainerProps {
  metodos: MetodoPago[]
  configuracion: ConfiguracionTienda | null
  tiendaNombre: string | null
  productos: ProductoPOS[]
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function POSContainer({
  metodos,
  configuracion,
  tiendaNombre,
  productos,
}: POSContainerProps) {
  const router = useRouter()
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
  const [pasoGuiado, setPasoGuiado] = useState<PasoCobroGuiado>('pago')

  const modoCobro = normalizarModoCobro(configuracion?.pos_modo_cobro)
  const modoGuiado = esModoGuiado(modoCobro)

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
  const [ultimoAgregadoId, setUltimoAgregadoId] = useState<string | null>(null)
  const ultimoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function mostrarChip(id: string) {
    setUltimoAgregadoId(id)
    if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
    ultimoTimerRef.current = setTimeout(() => setUltimoAgregadoId(null), 4000)
  }

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
            agregarVariante(res2.data, { cantidadOverride: balanza.peso })
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

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0),
    [items]
  )

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

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === v.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          cantidad: round2(next[idx].cantidad + cantidad),
          precio_unitario: opts?.precioOverride !== undefined ? precio : next[idx].precio_unitario,
        }
        return next
      }
      return [
        ...prev,
        {
          id: v.id,
          variante_id: v.es_pack ? v.id.replace('__pack', '') : v.id,
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
        },
      ]
    })
    mostrarChip(v.id)
  }

  function confirmarPeso(cantidad: number) {
    if (!pesoModalPendiente) return
    const { variante, precioOverride } = pesoModalPendiente
    setPesoModalPendiente(null)
    agregarVariante(variante, { cantidadOverride: cantidad, precioOverride })
    // agregarVariante llama mostrarChip internamente
    buscadorRef.current?.focus()
  }

  function cancelarPeso() {
    setPesoModalPendiente(null)
    buscadorRef.current?.focus()
  }

  function actualizarItem(id: string, patch: Partial<CartItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
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
    setUltimoAgregadoId(null)
    if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
  }

  const totalBruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const totalAPagar = Math.max(0, Math.round((totalBruto - saldoFavorAplicado) * 100) / 100)
  const sumaPagos = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  const stockOk = items.every((it) => it.cantidad <= it.stock_actual)
  const puedeCobrarSaldo = saldoFavorAplicado + 0.01 >= totalBruto
  const puedePagosOk = pagos.length > 0 && sumaPagos + saldoFavorAplicado + 0.01 >= totalBruto
  const puedeAutoSeed = pagos.length === 0 && totalAPagar > 0 && metodos.length > 0
  const puedeCobrar =
    items.length > 0 &&
    stockOk &&
    (puedeCobrarSaldo || puedePagosOk || puedeAutoSeed)

  const finalizarVenta = useCallback(
    (pagosOverride?: PagoLinea[]) => {
      setError(null)

      const bruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
      const pagosActuales = pagosOverride ?? pagos
      const suma = pagosActuales.reduce((acc, p) => acc + Number(p.monto || 0), 0)
      const stockValido = items.every((it) => it.cantidad <= it.stock_actual)
      const ok =
        items.length > 0 &&
        stockValido &&
        (saldoFavorAplicado + 0.01 >= bruto ||
          (pagosActuales.length > 0 && suma + saldoFavorAplicado + 0.01 >= bruto))

      if (!ok) return

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
        })

        if (!res.ok || !res.data) {
          setError(res.error ?? 'Error al cobrar')
          return
        }

        const { numeroTicket, ventaId } = res.data
        const ticketFmt = formatNumeroTicket(configuracion?.prefijo_ticket, numeroTicket)

        setCobroGuiadoAbierto(false)
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
    ]
  )

  const abrirCobroGuiado = useCallback(() => {
    if (items.length === 0 || !stockOk) return
    setError(null)
    setPasoGuiado('pago')
    setCobroGuiadoAbierto(true)
  }, [items.length, stockOk])

  const cobrar = useCallback(() => {
    setError(null)

    const bruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
    const aPagar = Math.max(0, Math.round((bruto - saldoFavorAplicado) * 100) / 100)
    let pagosActuales = [...pagos]

    if (pagosActuales.length === 0 && aPagar > 0) {
      const m = metodoPorDefecto(metodos)
      if (m) {
        pagosActuales = aplicarPagoRapido(m.id, aPagar)
        setPagos(pagosActuales)
        if (esMetodoEfectivo(m)) {
          focusPrimerMontoPago()
          return
        }
      }
    }

    const suma = pagosActuales.reduce((acc, p) => acc + Number(p.monto || 0), 0)
    const stockValido = items.every((it) => it.cantidad <= it.stock_actual)
    const ok =
      items.length > 0 &&
      stockValido &&
      (saldoFavorAplicado + 0.01 >= bruto ||
        (pagosActuales.length > 0 && suma + saldoFavorAplicado + 0.01 >= bruto))

    if (!ok) return

    finalizarVenta(pagosActuales)
  }, [items, pagos, subtotal, descuento, saldoFavorAplicado, metodos, finalizarVenta])

  const iniciarCobro = useCallback(() => {
    if (modoGuiado) {
      abrirCobroGuiado()
      return
    }
    cobrar()
  }, [modoGuiado, abrirCobroGuiado, cobrar])

  const modalAbierto = !!pesoModalPendiente || !!payloadPendiente || cobroGuiadoAbierto

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
          cobrar()
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
  }, [modalAbierto, showAtajosHelp, cobrar, iniciarCobro, modoGuiado, cobroGuiadoAbierto, pasoGuiado, finalizarVenta])

  return (
    <>
      <div className={`grid grid-cols-1 lg:grid-cols-5 gap-6 ${items.length > 0 ? 'pb-24 lg:pb-0' : ''}`}>
        <div className="lg:col-span-3 space-y-4 min-w-0">
          {/* Card de búsqueda */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400">Buscar o escanear</span>
              {!buscadorQuery && productos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGrillaAbierta((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                    grillaAbierta
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>📦</span>
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

          {/* Banner: código escaneado no encontrado */}
          {codigoNoEncontrado && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[13px]">
              <span className="text-amber-800">
                Código{' '}
                <code className="font-mono font-semibold bg-amber-100 px-1 rounded">
                  {codigoNoEncontrado}
                </code>{' '}
                no encontrado en el sistema.
              </span>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <a
                  href={`/productos/nuevo?codigo=${encodeURIComponent(codigoNoEncontrado)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-700 hover:text-lime-800 hover:underline font-semibold whitespace-nowrap"
                >
                  Crear producto →
                </a>
                <button
                  type="button"
                  onClick={() => setCodigoNoEncontrado(null)}
                  className="text-amber-400 hover:text-amber-700 text-xl leading-none"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {/* Chip último producto agregado */}
          {(() => {
            const ultimoItem = ultimoAgregadoId ? (items.find((it) => it.id === ultimoAgregadoId) ?? null) : null
            if (!ultimoItem) return null
            return (
              <UltimoAgregadoChip
                item={ultimoItem}
                onIncrement={() => {
                  const siguiente = Math.min(ultimoItem.stock_actual, round2(ultimoItem.cantidad + 1))
                  actualizarItem(ultimoItem.id, { cantidad: siguiente })
                  mostrarChip(ultimoItem.id)
                }}
                onDecrement={() => {
                  if (ultimoItem.cantidad <= 1) {
                    eliminarItem(ultimoItem.id)
                    setUltimoAgregadoId(null)
                    if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
                  } else {
                    actualizarItem(ultimoItem.id, { cantidad: round2(ultimoItem.cantidad - 1) })
                    mostrarChip(ultimoItem.id)
                  }
                }}
                onDismiss={() => {
                  setUltimoAgregadoId(null)
                  if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
                }}
              />
            )
          })()}

          {!buscadorQuery && grillaAbierta && (
            <GrillaProductos productos={productos} onSelect={agregarVariante} />
          )}
          <Carrito
            items={items}
            onUpdate={actualizarItem}
            onRemove={eliminarItem}
          />
        </div>
        <div className="lg:col-span-2">
          {modoGuiado ? (
            <PanelCobroResumen
              subtotal={subtotal}
              descuento={descuento}
              totalAPagar={totalAPagar}
              itemsCount={items.length}
              onCobrar={iniciarCobro}
              isCobrando={isCobrando}
              puedeCobrar={puedeCobrar}
              error={error}
            />
          ) : (
            <PanelPago
              metodos={metodos}
              subtotal={subtotal}
              descuento={descuento}
              onDescuentoChange={handleDescuentoChange}
              pagos={pagos}
              onPagosChange={setPagos}
              clienteSeleccionado={cliente}
              onClienteChange={(c) => {
                setCliente(c)
                setSaldoFavorAplicado(0)
              }}
              observaciones={observaciones}
              onObservacionesChange={setObservaciones}
              onCobrar={cobrar}
              isCobrando={isCobrando}
              puedeCobrar={puedeCobrar}
              error={error}
              saldoFavorAplicado={saldoFavorAplicado}
              onSaldoFavorChange={handleSaldoFavorChange}
              facturacionActiva={facturacionActiva}
              emitirFactura={emitirFacturaToggle}
              onEmitirFacturaChange={setEmitirFacturaToggle}
              cuitReceptor={cuitReceptor}
              onCuitReceptorChange={setCuitReceptor}
            />
          )}
        </div>
      </div>

      {/* Barra sticky cobro — solo en layout apilado (< lg) */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3 shadow-[0_-4px_12px_rgb(0,0,0,0.08)]">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Total</p>
            <p className="text-xl font-black text-gray-900 tabular-nums truncate">
              {formatARS(totalAPagar)}
            </p>
          </div>
          <Button
            type="button"
            onClick={iniciarCobro}
            disabled={!puedeCobrar || isCobrando}
            className="!h-12 !px-6 !bg-[#0A0A0A] hover:!bg-gray-800 !rounded-full !border-transparent !text-[14px] !font-bold shrink-0"
          >
            {isCobrando ? '…' : 'Cobrar'}
          </Button>
        </div>
      )}

      <PosAtajosHelp
        open={showAtajosHelp}
        onClose={() => setShowAtajosHelp(false)}
        modoGuiado={modoGuiado}
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
      />

      {confirmacion && (
        <div
          role="status"
          className="fixed bottom-6 right-6 bg-[#0A0A0A] text-white px-4 py-3 rounded-xl shadow-xl z-50 text-sm flex items-center gap-3"
        >
          <span className="text-lg">✓</span>
          <div>
            <div className="font-semibold">Venta {confirmacion.ticket} registrada</div>
            <div className="text-xs opacity-70">Listos para imprimir…</div>
          </div>
          <a
            href={`/remitos/nuevo?venta_id=${confirmacion.ventaId}`}
            onClick={() => setConfirmacion(null)}
            className="ml-1 shrink-0 px-3 py-1.5 bg-lime-500 hover:bg-lime-400 text-[#0A0A0A] text-xs font-bold rounded-full transition"
          >
            Crear remito →
          </a>
          <button
            onClick={() => setConfirmacion(null)}
            className="text-white/50 hover:text-white"
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

      {printContenido}
    </>
  )
}
