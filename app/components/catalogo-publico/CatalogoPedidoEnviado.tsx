'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { PEDIDO_ENVIADO_KEY } from '@/lib/catalogo/const'
import type { PedidoEnviadoPayload } from '@/lib/catalogo/types'

export function CatalogoPedidoEnviado({ slug }: { slug: string }) {
  const [data, setData] = useState<PedidoEnviadoPayload | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PEDIDO_ENVIADO_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as PedidoEnviadoPayload
      if (parsed.slug !== slug) return
      setData(parsed)
      if (!parsed.opened && parsed.waUrl) {
        parsed.opened = true
        sessionStorage.setItem(PEDIDO_ENVIADO_KEY, JSON.stringify(parsed))
        window.location.assign(parsed.waUrl)
      }
    } catch {
      /* ignore */
    }
  }, [slug])

  return (
    <div className="text-center space-y-4 py-10">
      <h1 className="text-xl font-bold text-fg">Pedido listo</h1>
      <p className="text-sm text-fg-muted max-w-sm mx-auto">
        {data?.numero
          ? `Tu pedido #${data.numero} ya llegó al local. Abrí WhatsApp para avisarle.`
          : 'Si cerraste WhatsApp, podés volver al catálogo.'}
      </p>
      {data?.waUrl && (
        <Button type="button" className="w-full max-w-xs mx-auto" onClick={() => window.location.assign(data.waUrl)}>
          Abrir WhatsApp
        </Button>
      )}
      <Link href={`/c/${slug}`} className="block text-sm text-fg-brand">
        Volver al catálogo
      </Link>
    </div>
  )
}
