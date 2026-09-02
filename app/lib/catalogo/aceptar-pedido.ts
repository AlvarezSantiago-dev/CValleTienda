import { getConfigRubro, type Rubro } from '@/lib/rubro/config'

/** Remito al aceptar: rubro con remitos y plan Pro (feature remitos). */
export function debeRemitoAlAceptar(rubro: Rubro, planTieneRemitos: boolean): boolean {
  if (!planTieneRemitos) return false
  return getConfigRubro(rubro).usarRemitos
}
