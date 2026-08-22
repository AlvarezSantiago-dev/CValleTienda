'use client'

import { useEffect, useState } from 'react'
import { Button, LinkButton } from '@/components/ui/Button'
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
    <div className="text-center space-y-5 py-12 px-1">
      <h1 className="text-xl font-bold text-fg">Pedido listo</h1>
      <p className="text-sm text-fg-muted max-w-sm mx-auto">
        {data?.numero
          ? `Tu pedido #${data.numero} ya llegó al local. Abrí WhatsApp para avisarle.`
          : 'Si cerraste WhatsApp, podés volver al catálogo.'}
      </p>
      <div className="mx-auto w-full max-w-sm space-y-2">
        {data?.waUrl && (
          <Button
            type="button"
            className="w-full"
            onClick={() => window.location.assign(data.waUrl)}
          >
            Abrir WhatsApp
          </Button>
        )}
        <LinkButton href={`/c/${slug}`} variant="secondary" className="w-full">
          Volver al catálogo
        </LinkButton>
      </div>
    </div>
  )
}
