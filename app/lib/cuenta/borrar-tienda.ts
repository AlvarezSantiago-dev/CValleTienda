import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKETS_STORAGE = ['productos', 'logos'] as const

export interface UsuarioHuerfano {
  id: string
  email: string
  created_at: string
}

function mismaConfirmacion(a: string, b: string) {
  return a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es')
}

export function confirmarNombreTienda(escrito: string, nombreReal: string) {
  return mismaConfirmacion(escrito, nombreReal)
}

async function vaciarPrefijo(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
  depth = 0
): Promise<void> {
  if (depth > 8) return
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!data?.length) return
  const files: string[] = []
  const folders: string[] = []
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id) files.push(path)
    else folders.push(path)
  }
  if (files.length > 0) {
    await admin.storage.from(bucket).remove(files)
  }
  for (const folder of folders) {
    await vaciarPrefijo(admin, bucket, folder, depth + 1)
  }
}

async function vaciarStorageTienda(admin: SupabaseClient, tiendaId: string) {
  for (const bucket of BUCKETS_STORAGE) {
    try {
      await vaciarPrefijo(admin, bucket, tiendaId)
    } catch {
      // Best-effort: la tienda igual se borra en SQL.
    }
  }
}

export async function borrarLoginsAuth(
  admin: SupabaseClient,
  userIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniq = [...new Set(userIds.filter(Boolean))]
  for (const id of uniq) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !/not found|user not found/i.test(error.message)) {
      return { ok: false, error: error.message }
    }
  }
  return { ok: true }
}

/**
 * Borra una tienda (cascade de datos) y los logins de sus perfiles.
 * Primero suelta sesiones_caja (RESTRICT hacia perfiles).
 */
export async function borrarTiendaYLogins(
  admin: SupabaseClient,
  tiendaId: string
): Promise<{ ok: true; userIds: string[] } | { ok: false; error: string }> {
  const { data: perfiles, error: errPerf } = await admin
    .from('perfiles')
    .select('id')
    .eq('tienda_id', tiendaId)

  if (errPerf) return { ok: false, error: errPerf.message }

  const userIds = (perfiles ?? []).map((p) => p.id as string)

  const { error: errSes } = await admin.from('sesiones_caja').delete().eq('tienda_id', tiendaId)
  if (errSes) return { ok: false, error: errSes.message }

  await vaciarStorageTienda(admin, tiendaId)

  const { error: errTienda } = await admin.from('tiendas').delete().eq('id', tiendaId)
  if (errTienda) return { ok: false, error: errTienda.message }

  const auth = await borrarLoginsAuth(admin, userIds)
  if (!auth.ok) return auth

  return { ok: true, userIds }
}

/** Reasigna turnos abiertos por este usuario al owner, o los borra si no hay fallback. */
export async function soltarSesionesUsuario(
  admin: SupabaseClient,
  userId: string,
  fallbackUserId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (fallbackUserId && fallbackUserId !== userId) {
    const { error } = await admin
      .from('sesiones_caja')
      .update({ usuario_apertura_id: fallbackUserId })
      .eq('usuario_apertura_id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }
  const { error } = await admin.from('sesiones_caja').delete().eq('usuario_apertura_id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
