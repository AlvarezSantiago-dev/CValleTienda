import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NuevoRemitoForm } from '@/components/remitos/NuevoRemitoForm'

interface Props {
  searchParams: Promise<{ venta_id?: string }>
}

export default async function NuevoRemitoPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!perfil) redirect('/login')

  // Últimas 50 ventas para el selector
  const { data: ventasRaw } = await supabase
    .from('ventas')
    .select('id, numero_ticket, total, cliente_id, created_at, clientes(nombre, apellido)')
    .eq('tienda_id', perfil.tienda_id)
    .eq('estado', 'completada')
    .order('created_at', { ascending: false })
    .limit(50)

  const ventas = (ventasRaw ?? []).map((v: unknown) => {
    const row = v as Record<string, unknown>
    const cliente = Array.isArray(row.clientes)
      ? (row.clientes[0] as Record<string, string> | undefined)
      : (row.clientes as Record<string, string> | null)
    const nombre = cliente
      ? `${cliente.nombre ?? ''}${cliente.apellido ? ' ' + cliente.apellido : ''}`.trim()
      : null
    return {
      id:            row.id as string,
      numero_ticket: row.numero_ticket as number,
      total:         Number(row.total),
      created_at:    row.created_at as string,
      cliente_nombre: nombre,
    }
  })

  // Clientes para el selector
  const { data: clientesRaw } = await supabase
    .from('clientes')
    .select('id, nombre, apellido')
    .eq('tienda_id', perfil.tienda_id)
    .order('nombre', { ascending: true })
    .limit(500)

  const clientes = (clientesRaw ?? []).map((c) => ({
    id:       c.id as string,
    nombre:   c.nombre as string,
    apellido: (c.apellido ?? null) as string | null,
  }))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Nuevo remito</h1>
        <p className="text-[13px] text-gray-400 mt-1">Creá un remito de entrega, con o sin venta asociada.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <NuevoRemitoForm
          ventas={ventas}
          clientes={clientes}
          ventaIdPreseleccionada={sp.venta_id}
        />
      </div>
    </div>
  )
}
