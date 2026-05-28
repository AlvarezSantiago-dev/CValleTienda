'use client'

import { useState, useTransition } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { actualizarConfigRemito, type ConfigRemitoInput } from '@/app/actions/configuracion'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

interface RemotoFormProps {
  initial: ConfiguracionTienda | null
}

export function RemotoForm({ initial }: RemotoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [form, setForm] = useState<ConfigRemitoInput>({
    texto_pie_remito: initial?.texto_pie_remito ?? '',
    estilo_remito: (initial?.estilo_remito as 'moderno' | 'clasico') ?? 'moderno',
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarConfigRemito(form)
      setMensaje(res.ok
        ? { tipo: 'ok', texto: 'Configuración de remito guardada' }
        : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <Textarea
        label="Texto del pie del remito"
        name="texto_pie_remito"
        value={form.texto_pie_remito ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, texto_pie_remito: e.target.value }))}
        placeholder={"Ej: La mercadería se entrega sobre la vereda del domicilio,\nLos plazos de entrega son de 24 hs. a partir de la acreditación del pago."}
        rows={3}
        hint="Cada línea con Enter = una línea impresa al pie del remito."
      />

      <div>
        <p className="text-[13px] font-medium text-[#0A0A0A] mb-3">Estilo de impresión</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, estilo_remito: 'moderno' }))}
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
            <p className="text-xs text-gray-500">Diseño limpio con colores y tipografía contemporánea. Ideal para indumentaria y moda.</p>
          </button>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, estilo_remito: 'clasico' }))}
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
            <p className="text-xs text-gray-500">Formato talonario tradicional con cuadros, tabla de ítems y firma. Ideal para ferreterías y corralones.</p>
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Guardando...' : 'Guardar remito'}
        </button>
      </div>
    </form>
  )
}
