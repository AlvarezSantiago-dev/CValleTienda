import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContextoTienda } from '@/lib/supabase/context'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'
import { parseTab, parseMeses, parseMesSeleccionado } from '@/lib/reportes/parse-params'
import { GraficosLayout } from '@/components/reportes/GraficosLayout'
import { FinanzasTab } from '@/components/reportes/finanzas/FinanzasTab'
import { VentasTab } from '@/components/reportes/ventas/VentasTab'
import { StockTab } from '@/components/reportes/stock/StockTab'
import { OperacionTab } from '@/components/reportes/operacion/OperacionTab'

interface PageProps {
  searchParams: Promise<{ tab?: string; meses?: string; mes?: string }>
}

export default async function GraficosPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const tab = parseTab(sp.tab)
  const meses = parseMeses(sp.meses)
  const mesSeleccionado = parseMesSeleccionado(sp.mes)

  const ctx = await getContextoTienda()
  const config = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)

  return (
    <GraficosLayout tab={tab} meses={meses} mesSeleccionado={mesSeleccionado}>
      {tab === 'finanzas' && <FinanzasTab meses={meses} mes={mesSeleccionado} />}
      {tab === 'ventas' && (
        <VentasTab
          mes={mesSeleccionado}
          labelVar1={config.labelVar1}
          usarVar1={config.usarVar1}
          usarDevoluciones={config.usarDevoluciones}
        />
      )}
      {tab === 'stock' && <StockTab mes={mesSeleccionado} />}
      {tab === 'operacion' && (
        <OperacionTab mes={mesSeleccionado} usarRemitos={config.usarRemitos} />
      )}
    </GraficosLayout>
  )
}
