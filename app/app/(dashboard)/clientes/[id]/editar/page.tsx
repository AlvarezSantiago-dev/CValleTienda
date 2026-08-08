import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerCliente } from '@/lib/clientes/queries'
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { PageHeader } from '@/components/ui/PageHeader'

interface EditarClientePageProps {
  params: Promise<{ id: string }>
}

export default async function EditarClientePage({ params }: EditarClientePageProps) {
  const { id } = await params
  const cliente = await obtenerCliente(id)
  if (!cliente) notFound()

  const nombreCompleto =
    `${cliente.nombre}${cliente.apellido ? ' ' + cliente.apellido : ''}`.trim()

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        className="mb-0"
        title={`Editar ${nombreCompleto}`}
        breadcrumb={
          <Link href={`/clientes/${id}`} className="text-sm text-fg-brand hover:underline">
            ← Volver al cliente
          </Link>
        }
      />

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <ClienteForm mode="edit" initial={cliente} />
      </div>
    </div>
  )
}
