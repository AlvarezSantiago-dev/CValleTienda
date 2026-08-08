import { TabsProductos } from '@/components/productos/TabsProductos'
import { ImportadorCSV } from '@/components/productos/ImportadorCSV'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default function ImportarProductosPage() {
  return (
    <div>
      <PageHeader
        title="Importar productos"
        description="Cargá un archivo CSV con tu catálogo para importarlo masivamente. Máximo 500 filas por importación."
      />

      <TabsProductos active="importar" />

      <ImportadorCSV />
    </div>
  )
}
