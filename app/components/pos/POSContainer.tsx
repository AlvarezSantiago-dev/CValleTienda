'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BuscadorVariantes, type BuscadorVariantesHandle } from './BuscadorVariantes'
import { Carrito } from './Carrito'
import { PanelPago } from './PanelPago'
import { GrillaProductos } from './GrillaProductos'
import { registrarVenta, buscarVariantesAction } from '@/app/actions/ventas'
import { obtenerPayloadVenta } from '@/app/actions/impresion'
import { emitirFactura, obtenerEstadoFacturacion } from '@/app/actions/facturacion'
import { usePrint } from '@/lib/impresion/usePrint'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'
import { useEffect } from 'react'
import { TicketVentaRenderer } from '@/components/impresion/TicketVentaRenderer'
import type { VarianteResultado, ProductoPOS } from '@/lib/pos/queries'
import type { MetodoPago, ConfiguracionTienda } from '@/lib/configuracion/queries'
import type { ClienteLite } from '@/app/actions/ventas'
import type { PagoLinea } from './PagoMultiMetodo'

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
  const [descuento, setDescuento] = useState(0)
  const [cliente, setCliente] = useState<ClienteLite | null>(null)
  const [saldoFavorAplicado, setSaldoFavorAplicado] = useState(0)
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmacion, setConfirmacion] = useState<{ ticket: string } | null>(null)
  const [isCobrando, startCobrando] = useTransition()
  const [facturacionActiva, setFacturacionActiva] = useState(false)
  const [emitirFacturaToggle, setEmitirFacturaToggle] = useState(false)
  const [cuitReceptor, setCuitReceptor] = useState('')

  // Verificar si la facturación está activa para este tenant (una sola vez al montar)
  useEffect(() => {
    obtenerEstadoFacturacion().then((res) => {
      if (res.ok && res.data?.activo) setFacturacionActiva(true)
    })
  }, [])
  const { contenido: printContenido, imprimir } = usePrint({ tipo: 'ticket' })
  const buscadorRef = useRef<BuscadorVariantesHandle>(null)
  const [buscadorQuery, setBuscadorQuery] = useState('')

  // Captura escaneos cuando el foco NO está en el buscador (ej: en el botón Cobrar).
  useBarcodeScanner({
    onScan: async (codigo) => {
      const res = await buscarVariantesAction(codigo)
      if (res.ok && res.data && res.data.length === 1) {
        agregarVariante(res.data[0])
      } else {
        // No hubo match único: pre-cargar el query en el buscador para que el cajero vea opciones.
        buscadorRef.current?.setQuery(codigo)
      }
    },
  })

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0),
    [items]
  )

  function agregarVariante(v: VarianteResultado) {
    setError(null)
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.variante_id === v.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
        return next
      }
      return [
        ...prev,
        {
          id: v.id,
          variante_id: v.id,
          producto_nombre: v.producto_nombre,
          talla: v.talla,
          color: v.color,
          precio_unitario: v.precio_venta,
          cantidad: 1,
          stock_actual: v.stock_actual,
          codigo_barras: v.codigo_barras,
          unidad_de_medida: v.unidad_de_medida,
        },
      ]
    })
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
  }

  const totalBruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const sumaPagos = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  const stockOk = items.every((it) => it.cantidad <= it.stock_actual)
  const puedeCobrar =
    items.length > 0 &&
    stockOk &&
    (pagos.length > 0 || saldoFavorAplicado >= totalBruto) &&
    sumaPagos + saldoFavorAplicado + 0.01 >= totalBruto

  function cobrar() {
    if (!puedeCobrar) return
    setError(null)

    startCobrando(async () => {
      const res = await registrarVenta({
        items: items.map((it) => ({
          variante_id: it.variante_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
        pagos: pagos.map((p) => ({
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

      setConfirmacion({ ticket: String(numeroTicket) })
      setTimeout(() => setConfirmacion(null), 5000)

      // Emitir factura electrónica si el toggle está activo
      if (emitirFacturaToggle) {
        await emitirFactura(ventaId, cuitReceptor || null)
      }

      reset()
      router.refresh()

      // Disparar impresión automática del ticket
      const payloadRes = await obtenerPayloadVenta(ventaId)
      if (payloadRes.ok && payloadRes.data) {
        imprimir(<TicketVentaRenderer payload={payloadRes.data} />)
      }

      // Devolver el foco al buscador para la próxima venta
      buscadorRef.current?.focus()
    })
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <BuscadorVariantes
            ref={buscadorRef}
            onSelect={agregarVariante}
            onQueryChange={setBuscadorQuery}
          />
          {!buscadorQuery && (
            <GrillaProductos productos={productos} onSelect={agregarVariante} />
          )}
          <Carrito
            items={items}
            onUpdate={actualizarItem}
            onRemove={eliminarItem}
          />
        </div>
        <div className="lg:col-span-2">
          <PanelPago
            metodos={metodos}
            subtotal={subtotal}
            descuento={descuento}
            onDescuentoChange={setDescuento}
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
            onSaldoFavorChange={setSaldoFavorAplicado}
            facturacionActiva={facturacionActiva}
            emitirFactura={emitirFacturaToggle}
            onEmitirFacturaChange={setEmitirFacturaToggle}
            cuitReceptor={cuitReceptor}
            onCuitReceptorChange={setCuitReceptor}
          />
        </div>
      </div>

      {confirmacion && (
        <div
          role="status"
          className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm flex items-center gap-3"
        >
          <span className="text-lg">✓</span>
          <div>
            <div className="font-semibold">Venta registrada</div>
            <div className="text-xs opacity-90">Ticket {confirmacion.ticket} · imprimiendo…</div>
          </div>
          <button
            onClick={() => setConfirmacion(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
      {printContenido}
    </>
  )
}
