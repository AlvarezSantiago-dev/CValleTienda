import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { DisenadorEtiqueta } from '@/components/configuracion/DisenadorEtiqueta'
import { createClient } from '@/lib/supabase/server'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import type { PlantillaEtiquetaInput } from '@/app/actions/impresion'

export const dynamic = 'force-dynamic'

const DEFAULTS: PlantillaEtiquetaInput = {
  nombre: 'Etiqueta estándar',
  ancho_mm: 50,
  alto_mm: 30,
  mostrar_nombre: true,
  mostrar_precio: true,
  mostrar_talla: true,
  mostrar_color: true,
  mostrar_codigo: false,
  mostrar_barcode: true,
  tamano_fuente_nombre: 10,
  tamano_fuente_precio: 14,
  tamano_fuente_talla: 9,
}

export default async function ConfiguracionEtiquetasPage() {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'disenador_etiquetas')) {
    return <UpgradeBanner feature="disenador_etiquetas" />
  }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  let inicial: PlantillaEtiquetaInput = DEFAULTS

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
        inicial = {
          nombre: plant.nombre,
          ancho_mm: plant.ancho_mm,
          alto_mm: plant.alto_mm,
          mostrar_nombre: plant.mostrar_nombre,
          mostrar_precio: plant.mostrar_precio,
          mostrar_talla: plant.mostrar_talla,
          mostrar_color: plant.mostrar_color,
          mostrar_codigo: plant.mostrar_codigo,
          mostrar_barcode: plant.mostrar_barcode,
          tamano_fuente_nombre: plant.tamano_fuente_nombre,
          tamano_fuente_precio: plant.tamano_fuente_precio,
          tamano_fuente_talla: plant.tamano_fuente_talla,
        }
      }
    }
  }

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Diseño de etiquetas</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Diseñá la etiqueta que se imprimirá automáticamente desde Productos.
      </p>

      <TabsConfiguracion active="etiquetas" />

      <DisenadorEtiqueta inicial={inicial} />
    </div>
  )
}
