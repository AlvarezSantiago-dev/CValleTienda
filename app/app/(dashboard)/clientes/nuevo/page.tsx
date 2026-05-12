import Link from 'next/link'
import { ClienteForm } from '@/components/clientes/ClienteForm'

export default function NuevoClientePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-lime-700 hover:text-lime-800 hover:underline"
        >
          ← Volver a clientes
        </Link>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-2">Nuevo cliente</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Cargá los datos del cliente. Solo el nombre es obligatorio.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <ClienteForm mode="create" />
      </div>
    </div>
  )
}
