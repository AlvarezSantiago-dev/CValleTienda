import Link from 'next/link'
import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { DisenadorEtiqueta } from '@/components/configuracion/DisenadorEtiqueta'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import { createClient } from '@/lib/supabase/server'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import type { PlantillaEtiquetaInput } from '@/app/actions/impresion'

export const dynamic = 'force-dynamic'

const ETIQUETA_DEFAULTS: PlantillaEtiquetaInput = {
  nombre: 'Etiqueta estándar',
  ancho_mm: 50,
  alto_mm: 25,
  mostrar_nombre: true,
  mostrar_precio: true,
  mostrar_talla: true,
  mostrar_color: true,
  mostrar_codigo: false,
  mostrar_barcode: true,
  mostrar_nombre_tienda: false,
  tamano_fuente_nombre: 10,
  tamano_fuente_precio: 15,
  tamano_fuente_talla: 10,
}

export default async function EtiquetasPage() {
  const [ctx, supabase] = await Promise.all([
    getContextoTienda(),
    createClient(),
  ])
  const planEfectivo = ctx?.planEfectivo ?? 'basico'

  let etiquetaInicial: PlantillaEtiquetaInput = ETIQUETA_DEFAULTS

  const { data: auth } = await supabase.auth.getUser()
  if (auth.user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('tienda_id')
      .eq('id', auth.user.id)
      .maybeSingle()

    if (perfil?.tienda_id) {
      const { data: plant } = await supabase
        .from('configuracion_etiquetas')
        .select('*')
        .eq('tienda_id', perfil.tienda_id)
        .eq('es_predeterminado', true)
        .maybeSingle()

      if (plant) {
        etiquetaInicial = {
          nombre: plant.nombre,
          ancho_mm: plant.ancho_mm,
          alto_mm: plant.alto_mm,
          mostrar_nombre: plant.mostrar_nombre,
          mostrar_precio: plant.mostrar_precio,
          mostrar_talla: plant.mostrar_talla,
          mostrar_color: plant.mostrar_color,
          mostrar_codigo: plant.mostrar_codigo,
          mostrar_barcode: plant.mostrar_barcode,
          mostrar_nombre_tienda: plant.mostrar_nombre_tienda,
          tamano_fuente_nombre: plant.tamano_fuente_nombre,
          tamano_fuente_precio: plant.tamano_fuente_precio,
          tamano_fuente_talla: plant.tamano_fuente_talla,
        }
      }
    }
  }

  return (
    <ConfiguracionShell
      title="Etiquetas de producto"
      description="Diseñá la etiqueta que se imprimirá automáticamente desde Productos."
      breadcrumb={
        <Link href="/configuracion/avanzado" className="text-sm text-fg-brand hover:underline">
          ← Avanzado
        </Link>
      }
    >
      {puedeUsar(planEfectivo, 'disenador_etiquetas') ? (
        <DisenadorEtiqueta inicial={etiquetaInicial} nombreTienda={ctx?.nombre ?? null} />
      ) : (
        <UpgradeBanner feature="disenador_etiquetas" />
      )}
    </ConfiguracionShell>
  )
}
