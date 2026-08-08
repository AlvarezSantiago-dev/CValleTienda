import Link from 'next/link'
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { PageHeader } from '@/components/ui/PageHeader'

export default function NuevoClientePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        className="mb-0"
        title="Nuevo cliente"
        description="Cargá los datos del cliente. Solo el nombre es obligatorio."
        breadcrumb={
          <Link href="/clientes" className="text-sm text-fg-brand hover:underline">
            ← Volver a clientes
          </Link>
        }
      />

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <ClienteForm mode="create" />
      </div>
    </div>
  )
}
