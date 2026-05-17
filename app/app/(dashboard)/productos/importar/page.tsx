import { TabsProductos } from '@/components/productos/TabsProductos'
import { ImportadorCSV } from '@/components/productos/ImportadorCSV'

export const dynamic = 'force-dynamic'

export default function ImportarProductosPage() {
  return (
    <div>
      <div className="mb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
          Importar productos
        </h1>
      </div>
      <p className="text-[13px] text-gray-400 mb-5">
        Cargá un archivo CSV con tu catálogo para importarlo masivamente. Máximo 500 filas por importación.
      </p>

      <TabsProductos active="importar" />

      <ImportadorCSV />
    </div>
  )
}
