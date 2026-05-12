'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  actualizarConfiguracionTienda,
  type ConfigTiendaInput,
} from '@/app/actions/configuracion'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

interface DatosTiendaFormProps {
  initial: ConfiguracionTienda | null
}

const CONDICIONES_IVA = [
  'Monotributista',
  'Responsable Inscripto',
  'Exento',
  'Consumidor Final',
]

export function DatosTiendaForm({ initial }: DatosTiendaFormProps) {
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
    mostrar_logo: initial?.mostrar_logo ?? true,
    mostrar_iva: initial?.mostrar_iva ?? false,
    prefijo_ticket: initial?.prefijo_ticket ?? 'T',
    impresora_ticket: initial?.impresora_ticket ?? '',
    ancho_ticket_mm: initial?.ancho_ticket_mm ?? 80,
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
