'use client'

import type { ReactNode } from 'react'

/** Mock visuals for each pitch slide — inline styles for print-proof contrast */

function Shell({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className="w-full max-w-[340px] overflow-hidden rounded-[18px] border shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
      style={{
        backgroundColor: dark ? '#0a0a09' : '#ffffff',
        borderColor: dark ? '#222' : '#e9e8e5',
        color: dark ? '#fff' : '#0a0a09',
      }}
    >
      {children}
    </div>
  )
}

function Barcode() {
  return (
    <div className="mx-auto flex h-8 items-end justify-center gap-[1.5px]" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="bg-black"
          style={{ width: i % 5 === 0 ? 2.5 : 1.2, height: 12 + ((i * 7) % 18) }}
        />
      ))}
    </div>
  )
}

export function VisualTicket() {
  return (
    <Shell>
      <div
        className="px-3 py-3 font-mono text-[10px] leading-[1.35] text-black"
        style={{ background: 'repeating-linear-gradient(0deg,#fff,#fff 11px,#fafafa 11px,#fafafa 12px)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-cloudvalle.png" alt="" width={40} height={40} className="mx-auto mb-1 rounded" />
        <div className="text-center text-[12px] font-extrabold uppercase tracking-wide">TEST TIENDA</div>
        <div className="text-center text-[8px] text-[#444]">CUIT 20-12345678-9 · Cinco Saltos</div>
        <div className="my-2 border-t border-dashed border-[#777]" />
        <div className="mb-1 border border-black px-1 py-1 text-center text-[8px] font-bold leading-tight">
          COMPROBANTE INTERNO
          <br />
          NO VÁLIDO COMO FACTURA
        </div>
        <div className="flex justify-between text-[9px]">
          <span>Ticket #0042</span>
          <span>08/08 10:24</span>
        </div>
        <div className="my-2 border-t border-dashed border-[#777]" />
        <div className="mb-1 flex justify-between gap-2">
          <span>1× Remera M/Negro</span>
          <span>$12.500</span>
        </div>
        <div className="mb-1 flex justify-between gap-2">
          <span>2× Jean 38/Azul</span>
          <span>$57.800</span>
        </div>
        <div className="my-2 border-t border-dashed border-[#777]" />
        <div className="flex justify-between text-[11px] font-extrabold">
          <span>TOTAL</span>
          <span>$67.300</span>
        </div>
        <div className="mt-1 flex justify-between text-[9px]">
          <span>Efectivo</span>
          <span>$67.300</span>
        </div>
        <div className="my-2 border-t border-dashed border-[#777]" />
        <div className="text-center text-[8px]">¡Gracias por tu compra!</div>
        <div className="mt-2">
          <Barcode />
        </div>
      </div>
    </Shell>
  )
}

export function VisualEtiqueta() {
  return (
    <div className="flex w-full max-w-[340px] flex-col gap-3">
      <div className="rounded-[14px] border border-[#e9e8e5] bg-white p-3 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5b5a54]">
          Diseñador de etiquetas
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {['Nombre', 'Precio', 'Talle', 'Color', 'Código'].map((t, i) => (
            <span
              key={t}
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{
                backgroundColor: i < 4 ? '#ecfccb' : '#f5f5f3',
                color: i < 4 ? '#3f6212' : '#5b5a54',
              }}
            >
              {i < 4 ? '✓ ' : ''}
              {t}
            </span>
          ))}
        </div>
        <div className="rounded-[10px] border-2 border-dashed border-[#84cc16] bg-[#f7fee7] px-3 py-3 text-center">
          <p className="text-[11px] font-bold text-[#0a0a09]">Remera básica</p>
          <p className="text-[18px] font-black text-[#0a0a09]">$12.500</p>
          <p className="text-[9px] text-[#444]">M · Negro</p>
          <div className="mt-2">
            <Barcode />
          </div>
          <p className="mt-1 font-mono text-[8px] text-[#666]">7791234567890</p>
        </div>
        <p className="mt-2 text-[10px] text-[#5b5a54]">Tamaño, campos y preview editables</p>
      </div>
    </div>
  )
}

export function VisualCoverPair() {
  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
      <div className="w-full max-w-[200px] shrink-0 sm:w-[55%]">
        <VisualTicket />
      </div>
      <div className="w-full max-w-[180px] shrink-0 sm:w-[45%] sm:pt-6">
        <VisualEtiqueta />
      </div>
    </div>
  )
}

export function VisualPOS() {
  return (
    <Shell>
      <div className="border-b border-[#e9e8e5] bg-[#0a0a09] px-3 py-2 text-[11px] font-semibold text-white">
        Punto de venta
      </div>
      <div className="space-y-2 p-3">
        <div className="rounded-lg border border-[#84cc16] bg-[#f7fee7] px-3 py-2 text-[12px]">
          <span className="font-mono text-[10px] text-[#3f6212]">▋ SCAN</span>
          <span className="ml-2 font-semibold">7791234567890</span>
        </div>
        {[
          ['Remera básica M', '$12.500'],
          ['Jean slim 38', '$28.900'],
          ['Buzo canguro', '$22.000'],
        ].map(([n, p]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-[#f5f5f3] px-3 py-2 text-[12px]">
            <span className="font-medium">{n}</span>
            <span className="font-bold">{p}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-[#0a0a09] px-3 py-2.5 text-white">
          <span className="text-[12px]">Total</span>
          <span className="text-[16px] font-black" style={{ color: '#84cc16' }}>
            $63.400
          </span>
        </div>
      </div>
    </Shell>
  )
}

export function VisualPagos() {
  return (
    <Shell>
      <div className="p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#5b5a54]">Cobro mixto</p>
        <div className="mb-3 text-[22px] font-black">$67.300</div>
        <div className="space-y-2">
          {[
            ['Efectivo', '$30.000', '#ecfccb'],
            ['Débito', '$20.000', '#e0f2fe'],
            ['QR', '$17.300', '#fef3c7'],
          ].map(([n, m, bg]) => (
            <div key={n} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: bg }}>
              <span className="text-[12px] font-semibold">{n}</span>
              <span className="text-[12px] font-bold">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function VisualCaja() {
  return (
    <Shell>
      <div className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-bold">Turno #12</span>
          <span className="rounded-full bg-[#ecfccb] px-2 py-0.5 text-[9px] font-bold text-[#3f6212]">
            ABIERTO
          </span>
        </div>
        {[
          ['Apertura', '$15.000'],
          ['Ventas efectivo', '$82.400'],
          ['Egresos', '−$5.000'],
          ['Esperado', '$92.400'],
        ].map(([l, v], i) => (
          <div
            key={l}
            className={`flex justify-between py-1.5 text-[12px] ${i === 3 ? 'border-t border-[#e9e8e5] pt-2 font-bold' : ''}`}
          >
            <span className="text-[#5b5a54]">{l}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function VisualStock() {
  return (
    <Shell>
      <div className="p-3">
        <p className="mb-2 text-[11px] font-bold">Remera básica</p>
        <div className="overflow-hidden rounded-lg border border-[#e9e8e5]">
          <div className="grid grid-cols-4 bg-[#f5f5f3] px-2 py-1 text-[9px] font-bold text-[#5b5a54]">
            <span>Talle</span>
            <span>Color</span>
            <span className="text-right">Stock</span>
            <span className="text-right">$</span>
          </div>
          {[
            ['S', 'Negro', '4', '12.5k'],
            ['M', 'Negro', '12', '12.5k'],
            ['L', 'Blanco', '2', '12.5k'],
            ['XL', 'Azul', '0', '12.5k'],
          ].map(([t, c, s, p]) => (
            <div key={t + c} className="grid grid-cols-4 border-t border-[#f5f5f3] px-2 py-1.5 text-[11px]">
              <span className="font-semibold">{t}</span>
              <span>{c}</span>
              <span className={`text-right font-bold ${s === '0' ? 'text-[#dc2626]' : s === '2' ? 'text-[#d97706]' : ''}`}>
                {s}
              </span>
              <span className="text-right text-[#5b5a54]">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function VisualAlertas() {
  return (
    <Shell>
      <div className="space-y-2 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#92400e]">Stock bajo</p>
        {[
          ['Jean slim 38', '2 u.'],
          ['Cable USB-C', '1 u.'],
          ['Aceite 1.5L', '3 u.'],
        ].map(([n, s]) => (
          <div key={n} className="flex items-center justify-between rounded-lg border border-[#fcd34d] bg-[#fffbeb] px-3 py-2">
            <span className="text-[12px] font-medium">{n}</span>
            <span className="text-[12px] font-bold text-[#92400e]">{s}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function VisualClientes() {
  return (
    <Shell>
      <div className="p-3">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a0a09] text-[13px] font-bold text-[#84cc16]">
            MG
          </div>
          <div>
            <p className="text-[13px] font-bold">María Gómez</p>
            <p className="text-[10px] text-[#5b5a54]">DNI 28.445.112 · CC activa</p>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#f5f5f3] p-2">
            <p className="text-[9px] text-[#5b5a54]">Ticket prom.</p>
            <p className="text-[14px] font-bold">$18.200</p>
          </div>
          <div className="rounded-lg bg-[#f5f5f3] p-2">
            <p className="text-[9px] text-[#5b5a54]">Saldo CC</p>
            <p className="text-[14px] font-bold text-[#dc2626]">$24.000</p>
          </div>
        </div>
        <p className="text-[10px] text-[#5b5a54]">Última compra · hace 3 días</p>
      </div>
    </Shell>
  )
}

export function VisualDashboard() {
  return (
    <Shell>
      <div className="grid grid-cols-2 gap-2 p-3">
        {[
          ['Hoy', '$128.400', '#ecfccb'],
          ['Ganancia', '$41.200', '#e0f2fe'],
          ['Tickets', '34', '#fef3c7'],
          ['Stock bajo', '7', '#fee2e2'],
        ].map(([l, v, bg]) => (
          <div key={l} className="rounded-xl p-3" style={{ backgroundColor: bg }}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#5b5a54]">{l}</p>
            <p className="mt-1 text-[16px] font-black">{v}</p>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function VisualCharts() {
  return (
    <Shell>
      <div className="p-3">
        <p className="mb-3 text-[11px] font-bold">Ventas del mes</p>
        <div className="flex h-28 items-end gap-1.5">
          {[40, 55, 35, 70, 60, 85, 75, 90, 65, 80, 95, 88].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                backgroundColor: i === 11 ? '#65a30d' : '#d9f99d',
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#5b5a54]">Comparativo semanal · tendencia ↑</p>
      </div>
    </Shell>
  )
}

export function VisualDevolucion() {
  return (
    <Shell>
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-bold">Devolución #08</span>
          <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[9px] font-bold text-[#991b1b]">
            PARCIAL
          </span>
        </div>
        <div className="mb-2 rounded-lg bg-[#f5f5f3] px-3 py-2 text-[12px]">
          Jean slim 38 · vuelve a stock
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#5b5a54]">Reintegro</span>
          <span className="font-bold">$28.900</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-[#5b5a54]">Stock</span>
          <span className="font-bold text-[#059669]">+1 unidad</span>
        </div>
      </div>
    </Shell>
  )
}

export function VisualRemito() {
  return (
    <Shell>
      <div className="p-3">
        <div className="mb-2 border-b border-[#e9e8e5] pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#5b5a54]">Remito A4</p>
          <p className="text-[14px] font-black">R-000128</p>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <p className="text-[#5b5a54]">Remitente</p>
            <p className="font-semibold">TEST TIENDA</p>
          </div>
          <div>
            <p className="text-[#5b5a54]">Destinatario</p>
            <p className="font-semibold">Obra Norte</p>
          </div>
        </div>
        <div className="rounded-lg border border-[#e9e8e5] px-2 py-1.5 text-[11px]">
          3 ítems · Estado: <strong>Emitido</strong>
        </div>
      </div>
    </Shell>
  )
}

export function VisualAFIP() {
  return (
    <Shell>
      <div className="p-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#5b5a54]">Factura B</p>
        <p className="mt-1 text-[18px] font-black">0001-00000482</p>
        <div className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-[#0a0a09] bg-[#f5f5f3] font-mono text-[8px]">
          QR
          <br />
          AFIP
        </div>
        <p className="mt-2 text-[10px] text-[#5b5a54]">CAE · desde el POS</p>
      </div>
    </Shell>
  )
}

export function VisualRubros() {
  return (
    <Shell>
      <div className="grid grid-cols-2 gap-2 p-3">
        {['Ropa', 'Despensa', 'Ferretería', 'Librería', 'Carnicería', 'Farmacia'].map((r) => (
          <div
            key={r}
            className="rounded-xl border border-[#e9e8e5] bg-[#fafaf9] px-2 py-3 text-center text-[12px] font-semibold"
          >
            {r}
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function VisualPrint() {
  return (
    <Shell dark>
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">PrintBridge</p>
        <p className="mt-1 text-[15px] font-bold text-white">Agente local activo</p>
        <div className="mt-3 space-y-2">
          {['Ticket térmico', 'Etiqueta TSPL', 'Sin diálogo del navegador'].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-white/85" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#84cc16' }}>●</span>
              {t}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function VisualArranque() {
  return (
    <Shell>
      <div className="space-y-2 p-3">
        {[
          ['1', 'Configuramos tu tienda'],
          ['2', '3 capacitaciones × 1 h'],
          ['3', 'Cargamos 20 productos'],
          ['4', 'Primer día acompañado'],
        ].map(([n, t]) => (
          <div key={n} className="flex items-center gap-3 rounded-xl bg-[#f5f5f3] px-3 py-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-black"
              style={{ backgroundColor: '#0a0a09', color: '#84cc16' }}
            >
              {n}
            </span>
            <span className="text-[13px] font-semibold">{t}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function visualForPoint(id: string) {
  switch (id) {
    case 'pos':
      return <VisualPOS />
    case 'pay':
      return <VisualPagos />
    case 'ticket':
      return <VisualTicket />
    case 'caja':
      return <VisualCaja />
    case 'stock':
      return <VisualStock />
    case 'alert':
      return <VisualAlertas />
    case 'tag':
      return <VisualEtiqueta />
    case 'clients':
      return <VisualClientes />
    case 'dash':
      return <VisualDashboard />
    case 'chart':
      return <VisualCharts />
    case 'return':
      return <VisualDevolucion />
    case 'remito':
      return <VisualRemito />
    case 'afip':
      return <VisualAFIP />
    case 'rubro':
      return <VisualRubros />
    case 'print':
      return <VisualPrint />
    case 'rocket':
      return <VisualArranque />
    default:
      return null
  }
}
