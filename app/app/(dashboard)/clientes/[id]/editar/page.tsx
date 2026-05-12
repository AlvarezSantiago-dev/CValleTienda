import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerCliente } from '@/lib/clientes/queries'
import { ClienteForm } from '@/components/clientes/ClienteForm'

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
      <div>
        <Link
          href={`/clientes/${id}`}
          className="text-sm text-lime-700 hover:text-lime-800 hover:underline"
        >
          ← Volver al cliente
        </Link>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-2">
          Editar {nombreCompleto}
        </h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <ClienteForm mode="edit" initial={cliente} />
      </div>
    </div>
  )
}
