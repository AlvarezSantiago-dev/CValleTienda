'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button, LinkButton } from '@/components/ui/Button'
import { VariantesEditor } from './VariantesEditor'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import {
  crearProducto,
  actualizarProducto,
  type ProductoInput,
  type VarianteInput,
} from '@/app/actions/productos'
import type { Categoria, Talla, Color } from '@/types/database'
import { useRubro } from '@/components/layout/RubroProvider'
import { TODAS_LAS_UNIDADES } from '@/lib/rubro/config'

interface ProductoFormProps {
  modo: 'crear' | 'editar'
  productoId?: string
  initial?: Partial<ProductoInput>
  initialVariantes?: VarianteInput[]
  categorias: Categoria[]
  tallas: Talla[]
  colores: Color[]
}

export function ProductoForm({
  modo,
  productoId,
  initial,
  initialVariantes,
  categorias,
  tallas,
  colores,
}: ProductoFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  useAutoFocus(nombreRef)
  const { unidadesDisponibles } = useRubro()
  const unidadesOpciones = TODAS_LAS_UNIDADES.filter((u) => unidadesDisponibles.includes(u.value))

  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [codigoBase, setCodigoBase] = useState(initial?.codigo_base ?? '')
  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoria_id ?? '')
  const [precioCompra, setPrecioCompra] = useState<number>(initial?.precio_compra ?? 0)
  const [precioVenta, setPrecioVenta] = useState<number>(initial?.precio_venta ?? 0)
  const [unidadMedida, setUnidadMedida] = useState<string>(initial?.unidad_de_medida ?? 'unidad')
  const [imagenUrl, setImagenUrl] = useState(initial?.imagen_url ?? '')
  const [variantes, setVariantes] = useState<VarianteInput[]>(initialVariantes ?? [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input: ProductoInput = {
      nombre,
      descripcion: descripcion || null,
      codigo_base: codigoBase || null,
      categoria_id: categoriaId || null,
      precio_compra: Number(precioCompra) || 0,
      precio_venta: Number(precioVenta) || 0,
      unidad_de_medida: unidadMedida || 'unidad',
      imagen_url: imagenUrl || null,
      variantes,
    }
    startTransition(async () => {
      const res =
        modo === 'crear'
          ? await crearProducto(input)
          : await actualizarProducto(productoId!, input)
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido')
        return
      }
      if (modo === 'crear' && res.data && typeof res.data === 'object' && 'id' in res.data) {
        router.push(`/productos/${(res.data as { id: string }).id}`)
      } else {
        router.push('/productos')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400">Información del producto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            ref={nombreRef}
            label="Nombre *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={200}
          />
          <Select
            label="Categoría"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">— Sin categoría —</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Input
            label="Código base (interno)"
            value={codigoBase}
            onChange={(e) => setCodigoBase(e.target.value)}
            placeholder="Opcional, ej: REM-001"
          />
          <Input
            label="URL de imagen"
            type="url"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="https://..."
          />
          <Input
            label="Precio compra"
            type="number"
            step="0.01"
            min="0"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(Number(e.target.value))}
          />
          <Input
            label="Precio venta *"
            type="number"
            step="0.01"
            min="0"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(Number(e.target.value))}
            required
          />
          <Select
            label="Unidad de medida"
            value={unidadMedida}
            onChange={(e) => setUnidadMedida(e.target.value)}
          >
            {unidadesOpciones.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <VariantesEditor
          tallas={tallas}
          colores={colores}
          initial={initialVariantes}
          onChange={setVariantes}
          modoEdicion={modo === 'editar'}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <LinkButton href="/productos" variant="ghost">
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
