import { listarRemitos } from '@/lib/remitos/queries'
import { Pagination } from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { LinkButton } from '@/components/ui/Button'
import { TablaRemitos } from '@/components/remitos/TablaRemitos'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import { Plus } from 'lucide-react'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function RemitosPage({ searchParams }: Props) {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'remitos')) {
    return <UpgradeBanner feature="remitos" />
  }
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const { remitos, total } = await listarRemitos({ page, pageSize: 20 })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Remitos"
        description="Gestión de remitos de entrega."
        actions={
          <LinkButton href="/remitos/nuevo">
            <Plus size={14} aria-hidden />
            Nuevo remito
          </LinkButton>
        }
        className="mb-0"
      />

      <TablaRemitos remitos={remitos} />

      {!(remitos.length === 0 && page === 1) && (
        <Pagination page={page} pageSize={20} total={total} basePath="/remitos" />
      )}
    </div>
  )
}
