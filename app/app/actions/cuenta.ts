'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import {
  borrarTiendaYLogins,
  confirmarNombreTienda,
  soltarSesionesUsuario,
  borrarLoginsAuth,
} from '@/lib/cuenta/borrar-tienda'

export async function eliminarMiCuenta(
  confirmacion: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, tienda_id, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) return { ok: false, error: 'Perfil no encontrado' }

  const admin = createAdminClient()
  const tiendaId = perfil.tienda_id as string
  const rol = perfil.rol as string
  const userId = user.id
  const email = user.email ?? ''

  if (rol === 'owner') {
    const { data: tienda } = await admin
      .from('tiendas')
      .select('nombre')
      .eq('id', tiendaId)
      .maybeSingle()
    const nombre = (tienda?.nombre as string | undefined) ?? ''
    if (!confirmarNombreTienda(confirmacion, nombre)) {
      return { ok: false, error: `Escribí exactamente el nombre de la tienda: ${nombre}` }
    }
    const res = await borrarTiendaYLogins(admin, tiendaId)
    if (!res.ok) return { ok: false, error: res.error }
    await supabase.auth.signOut()
  } else {
    const okConfirm =
      confirmacion.trim().toLowerCase() === 'eliminar' ||
      confirmacion.trim().toLowerCase() === email.toLowerCase()
    if (!okConfirm) {
      return { ok: false, error: 'Escribí ELIMINAR o tu email para confirmar' }
    }
    const { data: owner } = await admin
      .from('perfiles')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('rol', 'owner')
      .maybeSingle()
    const soltar = await soltarSesionesUsuario(admin, userId, (owner?.id as string | undefined) ?? null)
    if (!soltar.ok) return { ok: false, error: soltar.error }
    const auth = await borrarLoginsAuth(admin, [userId])
    if (!auth.ok) return { ok: false, error: auth.error }
    await supabase.auth.signOut()
  }

  redirect('/login?ok=cuenta-eliminada')
}
