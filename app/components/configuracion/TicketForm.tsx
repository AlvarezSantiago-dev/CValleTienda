'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { PrintBridgeStatus } from '@/components/configuracion/PrintBridgeStatus'
import { actualizarConfigTicket, type ConfigTicketInput } from '@/app/actions/configuracion'
import { rubroTieneVale } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

interface TicketFormProps {
  initial: ConfiguracionTienda | null
  rubro: Rubro
}

export function TicketForm({ initial, rubro }: TicketFormProps) {
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [form, setForm] = useState<ConfigTicketInput>({
    texto_encabezado: initial?.texto_encabezado ?? '',
    texto_pie: initial?.texto_pie ?? '',
    mostrar_logo: initial?.mostrar_logo ?? true,
    mostrar_iva: initial?.mostrar_iva ?? false,
    prefijo_ticket: initial?.prefijo_ticket ?? 'T',
    impresora_ticket: initial?.impresora_ticket ?? '',
    ancho_ticket_mm: initial?.ancho_ticket_mm ?? 80,
    dias_cambio: initial?.dias_cambio ?? 0,
  })

  function update<K extends keyof ConfigTicketInput>(key: K, value: ConfigTicketInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarConfigTicket(form)
      setMensaje(res.ok
        ? { tipo: 'ok', texto: 'Configuración de ticket guardada correctamente' }
        : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mensaje && (
        <div
          className={`rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
              : 'bg-danger-soft text-red-800 border border-danger-border'
          }`}
          role="status"
        >
          {mensaje.texto}
        </div>
      )}

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6 space-y-5">
        <div>
          <h2 className="text-[15px] font-semibold text-fg mb-1">Texto del ticket</h2>
          <p className="text-[13px] text-fg-subtle mb-4">
            Personalizá el mensaje que aparece al inicio y al final del ticket impreso.
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
          </div>
        </div>

        <div>
          <h2 className="text-[15px] font-semibold text-fg mb-1">Formato e impresora</h2>
          <p className="text-[13px] text-fg-subtle mb-4">
            Configurá el ancho del rollo, la numeración y el nombre de la impresora térmica.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        <div>
          <h2 className="text-[15px] font-semibold text-fg mb-1">Opciones de impresión</h2>
          <div className="mt-3 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={form.mostrar_logo}
                onChange={(e) => update('mostrar_logo', e.target.checked)}
                className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40"
              />
              Mostrar logo en el ticket
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={form.mostrar_iva}
                onChange={(e) => update('mostrar_iva', e.target.checked)}
                className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40"
              />
              Mostrar discriminación de IVA
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-[15px] font-semibold text-fg mb-1">Impresora local (PrintBridge)</h2>
          <p className="text-[13px] text-fg-subtle mb-3">
            CValle PrintBridge permite imprimir directo a la térmica sin diálogo del navegador.
          </p>
          <PrintBridgeStatus />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Guardando...' : 'Guardar ticket'}
        </button>
      </div>
    </form>
  )
}
