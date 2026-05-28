'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { PrintBridgeStatus } from '@/components/configuracion/PrintBridgeStatus'
import {
  actualizarConfiguracionTienda,
  type ConfigTiendaInput,
} from '@/app/actions/configuracion'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'
import { getConfigRubro, rubroTieneVale } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'

interface DatosTiendaFormProps {
  initial: ConfiguracionTienda | null
  rubro: Rubro
}

const CONDICIONES_IVA = [
  'Monotributista',
  'Responsable Inscripto',
  'Exento',
  'Consumidor Final',
]

export function DatosTiendaForm({ initial, rubro }: DatosTiendaFormProps) {
  const configRubro = getConfigRubro(rubro)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  )

  const [form, setForm] = useState<ConfigTiendaInput>({
    razon_social: initial?.razon_social ?? '',
    cuit: initial?.cuit ?? '',
    condicion_iva: initial?.condicion_iva ?? 'Monotributista',
    direccion_legal: initial?.direccion_legal ?? '',
    texto_encabezado: initial?.texto_encabezado ?? '',
    texto_pie: initial?.texto_pie ?? '',
    texto_pie_remito: initial?.texto_pie_remito ?? '',
    mostrar_logo: initial?.mostrar_logo ?? true,
    mostrar_iva: initial?.mostrar_iva ?? false,
    prefijo_ticket: initial?.prefijo_ticket ?? 'T',
    impresora_ticket: initial?.impresora_ticket ?? '',
    ancho_ticket_mm: initial?.ancho_ticket_mm ?? 80,
    estilo_remito: initial?.estilo_remito ?? 'moderno',
    balanza_formato: initial?.balanza_formato ?? null,
    margen_ganancia_default: initial?.margen_ganancia_default ?? 0,
    dias_cambio: initial?.dias_cambio ?? 0,
  })

  function update<K extends keyof ConfigTiendaInput>(key: K, value: ConfigTiendaInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarConfiguracionTienda(form)
      if (res.ok) {
        setMensaje({ tipo: 'ok', texto: 'Cambios guardados correctamente' })
        router.refresh()
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'Error al guardar' })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl">
      {/* Mensaje feedback */}
      {mensaje && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-lime-50 text-lime-800 border border-lime-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
          role="status"
        >
          {mensaje.texto}
        </div>
      )}

      {/* Datos fiscales */}
      <section>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Datos fiscales</h2>
        <p className="text-[13px] text-gray-400 mb-4">
          Información que aparece en el ticket impreso.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Razón social"
            name="razon_social"
            value={form.razon_social ?? ''}
            onChange={(e) => update('razon_social', e.target.value)}
            placeholder="Mi Tienda S.R.L."
          />
          <Input
            label="CUIT"
            name="cuit"
            value={form.cuit ?? ''}
            onChange={(e) => update('cuit', e.target.value)}
            placeholder="20-12345678-9"
            hint="8 a 13 dígitos. Guiones opcionales."
          />
          <Select
            label="Condición frente al IVA"
            name="condicion_iva"
            value={form.condicion_iva ?? ''}
            onChange={(e) => update('condicion_iva', e.target.value)}
          >
            {CONDICIONES_IVA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input
            label="Dirección legal"
            name="direccion_legal"
            value={form.direccion_legal ?? ''}
            onChange={(e) => update('direccion_legal', e.target.value)}
            placeholder="Av. Siempreviva 742"
          />
        </div>
      </section>

      {/* Ticket */}
      <section>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Ticket impreso</h2>
        <p className="text-[13px] text-gray-400 mb-4">
          Personalizá lo que se imprime en cada venta.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            label="Texto de encabezado"
            name="texto_encabezado"
            value={form.texto_encabezado ?? ''}
            onChange={(e) => update('texto_encabezado', e.target.value)}
            placeholder="¡Gracias por tu compra!"
            rows={2}
          />
          <Textarea
            label="Texto del pie"
            name="texto_pie"
            value={form.texto_pie ?? ''}
            onChange={(e) => update('texto_pie', e.target.value)}
            placeholder="Cambios dentro de los 7 días con ticket"
            rows={2}
          />
          <Input
            label="Prefijo de numeración"
            name="prefijo_ticket"
            value={form.prefijo_ticket ?? ''}
            onChange={(e) => update('prefijo_ticket', e.target.value)}
            placeholder="T"
            hint="Ej: T-0001, V-0001."
            maxLength={5}
          />
          <Select
            label="Ancho del ticket"
            name="ancho_ticket_mm"
            value={String(form.ancho_ticket_mm)}
            onChange={(e) => update('ancho_ticket_mm', Number(e.target.value))}
          >
            <option value="58">58 mm (impresora chica)</option>
            <option value="76">76 mm (impresora media)</option>
            <option value="80">80 mm (impresora estándar)</option>
          </Select>
          <Input
            label="Nombre de la impresora"
            name="impresora_ticket"
            value={form.impresora_ticket ?? ''}
            onChange={(e) => update('impresora_ticket', e.target.value)}
            placeholder="POS-58 / EPSON-TM-T20"
            hint="Como aparece en el sistema operativo (opcional)."
          />
          {rubroTieneVale(rubro) && (
            <Input
              label="Días para cambios y devoluciones"
              name="dias_cambio"
              type="number"
              min={0}
              max={365}
              value={String(form.dias_cambio ?? 0)}
              onChange={(e) => update('dias_cambio', Number(e.target.value) || 0)}
              hint="0 = no imprimir vale de cambio. Ej: 30 → imprime un segundo slip con fecha límite."
              placeholder="0"
            />
          )}
          <PrintBridgeStatus />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={form.mostrar_logo}
              onChange={(e) => update('mostrar_logo', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"
            />
            Mostrar logo en el ticket
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={form.mostrar_iva}
              onChange={(e) => update('mostrar_iva', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"
            />
            Mostrar discriminación de IVA
          </label>
        </div>
      </section>

      {/* Balanza electrónica — solo rubros que venden por peso */}
      {configRubro.usarBalanza && (
      <section>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Balanza electrónica</h2>
        <p className="text-[13px] text-gray-400 mb-4">
          Si usás una balanza que genera etiquetas con código de barras EAN-13 (prefijo 2),
          indicá si el valor embebido representa el precio o el peso del producto.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sin balanza */}
          <button
            type="button"
            onClick={() => update('balanza_formato', null)}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
              form.balanza_formato === null
                ? 'border-lime-500 bg-lime-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {form.balanza_formato === null && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
            )}
            <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Sin balanza</p>
            <p className="text-xs text-gray-500">No usás balanza o manejás los precios manualmente.</p>
          </button>

          {/* Precio embebido */}
          <button
            type="button"
            onClick={() => update('balanza_formato', 'precio')}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
              form.balanza_formato === 'precio'
                ? 'border-lime-500 bg-lime-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {form.balanza_formato === 'precio' && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
            )}
            <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Precio embebido</p>
            <p className="text-xs text-gray-500">El código trae el precio final (÷100). Ej: 01250 → $12.50</p>
          </button>

          {/* Peso embebido */}
          <button
            type="button"
            onClick={() => update('balanza_formato', 'peso')}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
              form.balanza_formato === 'peso'
                ? 'border-lime-500 bg-lime-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {form.balanza_formato === 'peso' && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
            )}
            <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Peso embebido</p>
            <p className="text-xs text-gray-500">El código trae los gramos (÷1000 = kg). Ej: 01350 → 1.350 kg</p>
          </button>
        </div>
      </section>
      )}

      {/* Remito — solo rubros que emiten remitos */}
      {configRubro.usarRemitos && (
      <section>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Remito</h2>
        <p className="text-[13px] text-gray-400 mb-4">
          Configurá el formato visual y el texto legal que aparece al pie de cada remito.
        </p>
        <Textarea
          label="Texto del pie del remito"
          name="texto_pie_remito"
          value={form.texto_pie_remito ?? ''}
          onChange={(e) => update('texto_pie_remito', e.target.value)}
          placeholder={"Ej: La mercadería se entrega sobre la vereda del domicilio,\nLos plazos de entrega son de 24 hs. a partir de la acreditación del pago."}
          rows={3}
          hint="Cada línea con Enter = una línea impresa al pie del remito."
        />
        <div className="mt-6">
          <p className="text-[13px] font-medium text-[#0A0A0A] mb-3">Estilo de impresión</p>
          <p className="text-[13px] text-gray-400 mb-4">
            Elegí el formato visual con el que se imprime cada remito.
          </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opción moderno */}
          <button
            type="button"
            onClick={() => update('estilo_remito', 'moderno')}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
              form.estilo_remito === 'moderno'
                ? 'border-lime-500 bg-lime-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {form.estilo_remito === 'moderno' && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
            )}
            <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Moderno</p>
            <p className="text-xs text-gray-500">Diseño limpio con colores, bloques y tipografía contemporánea. Ideal para tiendas de indumentaria y moda.</p>
          </button>

          {/* Opción clásico */}
          <button
            type="button"
            onClick={() => update('estilo_remito', 'clasico')}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
              form.estilo_remito === 'clasico'
                ? 'border-lime-500 bg-lime-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {form.estilo_remito === 'clasico' && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
            )}
            <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Clásico</p>
            <p className="text-xs text-gray-500">Formato talonario tradicional con cuadros de fecha, tabla de ítems, firma y texto legal al pie. Ideal para ferreterías, corralones y distribuidoras.</p>
          </button>
        </div>
        </div>
      </section>
      )}

      {/* Precios y márgenes */}
      <section>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Precios y márgenes</h2>
        <p className="text-[13px] text-gray-400 mb-4">
          Al cargar el precio de compra de un producto, el sistema calculará y sugerirá automáticamente el precio de venta sumando este porcentaje sobre el costo.
        </p>
        <div className="max-w-xs">
          <Input
            label="Markup por defecto (%)"
            type="number"
            step="0.01"
            min="0"
            max="9999"
            value={form.margen_ganancia_default}
            onChange={(e) => update('margen_ganancia_default', Number(e.target.value) || 0)}
            placeholder="Ej: 80"
            hint="Porcentaje sobre el costo. 0 = sugerencia desactivada."
          />
          {form.margen_ganancia_default > 0 && (
            <p className="mt-2 text-[12px] text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              Compra $1.000 → sugiere ${Math.round(1000 * (1 + form.margen_ganancia_default / 100)).toLocaleString('es-AR')} de venta (+{form.margen_ganancia_default}%)
            </p>
          )}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={isPending}
          className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
