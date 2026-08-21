import { notFound } from 'next/navigation'
import { obtenerPayloadReciboCc } from '@/app/actions/recibo-cc'
import { ReciboCcRenderer } from '@/components/impresion/ReciboCcRenderer'
import { BotonImprimirReciboCc } from '@/components/clientes/BotonImprimirReciboCc'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReciboCcPage({ params }: Props) {
  const { id } = await params
  const res = await obtenerPayloadReciboCc(id)
  if (!res.ok || !res.data) notFound()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recibo de cobro"
        className="print:hidden"
        actions={<BotonImprimirReciboCc movimientoId={id} auto />}
      />
      <div className="flex justify-center">
        <ReciboCcRenderer payload={res.data} />
      </div>
    </div>
  )
}
