'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Categoria, Color, Talla } from '@/types/database'
import {
  crearCategoriaInline,
  crearColorInline,
  crearTallaInline,
} from '@/app/actions/productos'
import { resolverYCrearProductoExpress } from '@/app/actions/carga-express'
import { parsearDatosProducto, parsearStockCeldas, esTalleRopa } from '@/lib/productos/carga-express/parser-nl'
import {
  draftVacio,
  validarDraft,
  type CargaExpressDraft,
} from '@/lib/productos/carga-express/tipos'
import { totalUnidades } from '@/lib/productos/carga-express/expandir-variantes'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'
import { ExpressForm } from './ExpressForm'
import { ImagenProductoUpload } from '@/components/productos/ImagenProductoUpload'
import { FotosPorColor } from '@/components/productos/FotosPorColor'
import { subirImagenesTrasAlta } from '@/lib/productos/imagen-api'
import { MatrizStockSparsa } from './MatrizStockSparsa'
import { ExpressPreview } from './ExpressPreview'
import { NlPasteBox } from './NlPasteBox'

export type EjeColor = { key: string; id: string | null; nombre: string; hex: string | null }
export type EjeTalla = { key: string; id: string | null; nombre: string }

function celdaKey(colorKey: string, tallaKey: string) {
  return `${colorKey}__${tallaKey}`
}

function esTalleRopaSafe(nombre: string) {
  return esTalleRopa(nombre)
}

interface CargaExpressRopaProps {
  categorias: Categoria[]
  tallas: Talla[]
  colores: Color[]
  margenDefault: number
}

export function CargaExpressRopa({
  categorias: catsInit,
  tallas: tallasInit,
  colores: coloresInit,
  margenDefault,
}: CargaExpressRopaProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [categorias, setCategorias] = useState(catsInit)
  const [catalogoColores, setCatalogoColores] = useState(coloresInit)
  const [catalogoTallas, setCatalogoTallas] = useState(tallasInit)

  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [categoriaPendiente, setCategoriaPendiente] = useState<string | null>(null)
  const [precioCompra, setPrecioCompra] = useState(0)
  const [precioVenta, setPrecioVenta] = useState(0)
  const [codigoBase, setCodigoBase] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [generarBarras, setGenerarBarras] = useState(true)

  const [ejesColores, setEjesColores] = useState<EjeColor[]>([])
  const [ejesTallas, setEjesTallas] = useState<EjeTalla[]>([])
  const [stock, setStock] = useState<Record<string, number>>({})
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [fileImagen, setFileImagen] = useState<File | null>(null)
  const [filesColor, setFilesColor] = useState<Record<string, File>>({})
  const [fotosKey, setFotosKey] = useState(0)

  const draft: CargaExpressDraft = useMemo(() => {
    const catNombre =
      categorias.find((c) => c.id === categoriaId)?.nombre ?? categoriaPendiente
    const celdas: CargaExpressDraft['celdas'] = []
    for (const col of ejesColores) {
      for (const tal of ejesTallas) {
        const qty = stock[celdaKey(col.key, tal.key)] ?? 0
        if (qty > 0) {
          celdas.push({
            colorNombre: col.nombre,
            tallaNombre: tal.nombre,
            cantidad: qty,
          })
        }
      }
    }
    return {
      ...draftVacio(),
      nombre,
      descripcion: descripcion || null,
      categoriaNombre: catNombre,
      precioCompra,
      precioVenta,
      colores: ejesColores.map((c) => ({ nombre: c.nombre, hex: c.hex })),
      tallas: ejesTallas.map((t) => t.nombre),
      celdas,
      generarBarras,
      codigoBase: codigoBase || null,
    }
  }, [
    nombre,
    descripcion,
    categoriaId,
    categoriaPendiente,
    categorias,
    precioCompra,
    precioVenta,
    ejesColores,
    ejesTallas,
    stock,
    generarBarras,
    codigoBase,
  ])

  function setCelda(colorKey: string, tallaKey: string, qty: number) {
    const k = celdaKey(colorKey, tallaKey)
    setStock((prev) => {
      const next = { ...prev }
      if (!qty || qty <= 0) delete next[k]
      else next[k] = Math.round(qty)
      return next
    })
  }

  function toggleColorFromCatalog(color: Color) {
    setEjesColores((prev) => {
      const exists = prev.find(
        (c) => c.id === color.id || c.nombre.toLowerCase() === color.nombre.toLowerCase()
      )
      if (exists) {
        setStock((s) => {
          const next = { ...s }
          for (const key of Object.keys(next)) {
            if (key.startsWith(`${exists.key}__`)) delete next[key]
          }
          return next
        })
        return prev.filter((c) => c.key !== exists.key)
      }
      return [
        ...prev,
        { key: color.id, id: color.id, nombre: color.nombre, hex: color.hex_color },
      ]
    })
  }

  function toggleTallaFromCatalog(talla: Talla) {
    setEjesTallas((prev) => {
      const exists = prev.find(
        (t) => t.id === talla.id || t.nombre.toUpperCase() === talla.nombre.toUpperCase()
      )
      if (exists) {
        setStock((s) => {
          const next = { ...s }
          for (const key of Object.keys(next)) {
            if (key.endsWith(`__${exists.key}`)) delete next[key]
          }
          return next
        })
        return prev.filter((t) => t.key !== exists.key)
      }
      return [...prev, { key: talla.id, id: talla.id, nombre: talla.nombre }]
    })
  }

  function applyDatos(parsed: CargaExpressDraft, warnings: string[]) {
    setNombre(parsed.nombre)
    setPrecioCompra(parsed.precioCompra)
    setPrecioVenta(parsed.precioVenta)
    setCodigoBase(parsed.codigoBase ?? '')
    setDescripcion(parsed.descripcion ?? '')
    setParseWarnings(warnings)

    // Crear taxonomías faltantes enseguida (categoría + colores + talles mencionados)
    startTransition(async () => {
      const creados: string[] = []
      let catsLocal = [...categorias]
      let coloresLocal = [...catalogoColores]
      let tallasLocal = [...catalogoTallas]

      // Categoría
      if (parsed.categoriaNombre?.trim()) {
        const nombreCat = titleCase(parsed.categoriaNombre)
        const hit = catsLocal.find((c) => c.nombre.toLowerCase() === nombreCat.toLowerCase())
        if (hit) {
          setCategoriaId(hit.id)
          setCategoriaPendiente(null)
        } else {
          const res = await crearCategoriaInline(nombreCat)
          if (res.ok && res.data) {
            const cat = {
              id: res.data.id,
              nombre: res.data.nombre,
              descripcion: null,
              activo: true,
              tienda_id: '',
              created_at: '',
              updated_at: '',
            } satisfies Categoria
            catsLocal = [...catsLocal, cat]
            setCategorias(catsLocal)
            setCategoriaId(res.data.id)
            setCategoriaPendiente(null)
            creados.push(`categoría “${res.data.nombre}”`)
          } else {
            setCategoriaPendiente(nombreCat)
          }
        }
      }

      // Colores
      const newColores: EjeColor[] = []
      for (const col of parsed.colores) {
        const display = titleCase(col.nombre)
        if (newColores.some((c) => c.nombre.toLowerCase() === display.toLowerCase())) continue
        const fromCat = coloresLocal.find((c) => c.nombre.toLowerCase() === display.toLowerCase())
        if (fromCat) {
          newColores.push({
            key: fromCat.id,
            id: fromCat.id,
            nombre: fromCat.nombre,
            hex: fromCat.hex_color,
          })
          continue
        }
        const res = await crearColorInline(display, col.hex ?? undefined)
        if (res.ok && res.data) {
          const full: Color = {
            id: res.data.id,
            nombre: res.data.nombre,
            hex_color: res.data.hex_color,
            activo: true,
            tienda_id: '',
            created_at: '',
          }
          coloresLocal = [...coloresLocal, full]
          setCatalogoColores(coloresLocal)
          newColores.push({
            key: full.id,
            id: full.id,
            nombre: full.nombre,
            hex: full.hex_color,
          })
          creados.push(`color “${full.nombre}”`)
        } else {
          newColores.push({
            key: `new-c-${display.toLowerCase()}`,
            id: null,
            nombre: display,
            hex: col.hex ?? null,
          })
        }
      }
      setEjesColores(newColores)

      // Talles mencionados en paso 1
      const newTallas: EjeTalla[] = []
      for (const tNombre of parsed.tallas) {
        const display = upperCaseTrim(tNombre)
        if (!esTalleRopaSafe(display)) continue
        if (newTallas.some((t) => t.nombre.toUpperCase() === display)) continue
        const fromCat = tallasLocal.find((x) => x.nombre.toUpperCase() === display)
        if (fromCat) {
          newTallas.push({ key: fromCat.id, id: fromCat.id, nombre: fromCat.nombre })
          continue
        }
        const res = await crearTallaInline(display)
        if (res.ok && res.data) {
          const full: Talla = {
            id: res.data.id,
            nombre: res.data.nombre,
            orden: 0,
            activo: true,
            tienda_id: '',
            created_at: '',
          }
          tallasLocal = [...tallasLocal, full]
          setCatalogoTallas(tallasLocal)
          newTallas.push({ key: full.id, id: full.id, nombre: full.nombre })
          creados.push(`talle “${full.nombre}”`)
        } else {
          newTallas.push({ key: `new-t-${display}`, id: null, nombre: display })
        }
      }
      setEjesTallas(newTallas)
      setStock({})

      if (creados.length > 0) {
        toast.success(`Creado: ${creados.join(', ')}. Ahora dictá el stock (paso 2)`)
      } else {
        toast.success('Datos listos — ahora dictá el stock (paso 2)')
      }
    })
  }

  function applyStock(parsed: CargaExpressDraft, warnings: string[]) {
    setParseWarnings(warnings)

    startTransition(async () => {
      const creados: string[] = []
      const newColores = [...ejesColores]
      const newTallas = [...ejesTallas]
      let coloresLocal = [...catalogoColores]
      let tallasLocal = [...catalogoTallas]

      async function ensureColor(nombreRaw: string): Promise<EjeColor | null> {
        const display = titleCase(nombreRaw)
        const existing = newColores.find((c) => c.nombre.toLowerCase() === display.toLowerCase())
        if (existing) return existing
        const fromCat = coloresLocal.find((c) => c.nombre.toLowerCase() === display.toLowerCase())
        if (fromCat) {
          const eje = {
            key: fromCat.id,
            id: fromCat.id,
            nombre: fromCat.nombre,
            hex: fromCat.hex_color,
          }
          newColores.push(eje)
          return eje
        }
        const res = await crearColorInline(display)
        if (res.ok && res.data) {
          const full: Color = {
            id: res.data.id,
            nombre: res.data.nombre,
            hex_color: res.data.hex_color,
            activo: true,
            tienda_id: '',
            created_at: '',
          }
          coloresLocal = [...coloresLocal, full]
          setCatalogoColores(coloresLocal)
          const eje = { key: full.id, id: full.id, nombre: full.nombre, hex: full.hex_color }
          newColores.push(eje)
          creados.push(`color “${full.nombre}”`)
          return eje
        }
        const eje = { key: `new-c-${display.toLowerCase()}`, id: null, nombre: display, hex: null }
        newColores.push(eje)
        return eje
      }

      async function ensureTalla(nombreRaw: string): Promise<EjeTalla | null> {
        const display = upperCaseTrim(nombreRaw)
        if (!esTalleRopaSafe(display)) {
          warnings.push(`“${display}” no parece un talle válido — se omitió`)
          return null
        }
        const existing = newTallas.find((t) => t.nombre.toUpperCase() === display)
        if (existing) return existing
        const fromCat = tallasLocal.find((x) => x.nombre.toUpperCase() === display)
        if (fromCat) {
          const eje = { key: fromCat.id, id: fromCat.id, nombre: fromCat.nombre }
          newTallas.push(eje)
          return eje
        }
        const res = await crearTallaInline(display)
        if (res.ok && res.data) {
          const full: Talla = {
            id: res.data.id,
            nombre: res.data.nombre,
            orden: 0,
            activo: true,
            tienda_id: '',
            created_at: '',
          }
          tallasLocal = [...tallasLocal, full]
          setCatalogoTallas(tallasLocal)
          const eje = { key: full.id, id: full.id, nombre: full.nombre }
          newTallas.push(eje)
          creados.push(`talle “${full.nombre}”`)
          return eje
        }
        const eje = { key: `new-t-${display}`, id: null, nombre: display }
        newTallas.push(eje)
        return eje
      }

      const newStock: Record<string, number> = {}
      for (const cel of parsed.celdas) {
        const col = await ensureColor(cel.colorNombre)
        const tal = await ensureTalla(cel.tallaNombre)
        if (!col || !tal || cel.cantidad <= 0) continue
        const k = celdaKey(col.key, tal.key)
        newStock[k] = (newStock[k] ?? 0) + Math.round(cel.cantidad)
      }

      setEjesColores([...newColores])
      setEjesTallas([...newTallas])
      setStock(newStock)
      setParseWarnings([...warnings])

      if (creados.length > 0) {
        toast.success(`Stock listo. También creado: ${creados.join(', ')}`)
      } else {
        toast.success('Stock cargado — revisá la matriz antes de crear')
      }
    })
  }

  function handleInterpretarDatos(texto: string) {
    const result = parsearDatosProducto(texto, {
      colores: catalogoColores.map((c) => ({ id: c.id, nombre: c.nombre })),
      tallas: catalogoTallas.map((t) => ({ id: t.id, nombre: t.nombre })),
      categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
    })
    const msgs = result.warnings.map((w) => w.message)
    if (!result.draft.nombre && result.draft.colores.length === 0) {
      toast.error('No se pudieron interpretar los datos')
      setParseWarnings(msgs)
      return
    }
    applyDatos(result.draft, msgs)
  }

  function handleInterpretarStock(texto: string) {
    if (ejesColores.length === 0) {
      toast.error('Primero interpretá los datos (paso 1) con al menos un color')
      return
    }
    const result = parsearStockCeldas(
      texto,
      ejesColores.map((c) => c.nombre),
      {
        colores: catalogoColores.map((c) => ({ id: c.id, nombre: c.nombre })),
        tallas: catalogoTallas.map((t) => ({ id: t.id, nombre: t.nombre })),
        categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
      }
    )
    const msgs = result.warnings.map((w) => w.message)
    if (result.draft.celdas.length === 0) {
      toast.error('No se detectó stock con talles')
      setParseWarnings(msgs)
      return
    }
    applyStock(result.draft, msgs)
  }

  function resetForm() {
    setNombre('')
    setCategoriaId('')
    setCategoriaPendiente(null)
    setPrecioCompra(0)
    setPrecioVenta(0)
    setCodigoBase('')
    setDescripcion('')
    setGenerarBarras(true)
    setEjesColores([])
    setEjesTallas([])
    setStock({})
    setParseWarnings([])
    setFileImagen(null)
    setFilesColor({})
    setFotosKey((k) => k + 1)
  }

  function handleSubmit(yCrearOtro: boolean) {
    const err = validarDraft(draft)
    if (err) {
      toast.error(err)
      return
    }
    startTransition(async () => {
      const res = await resolverYCrearProductoExpress(draft)
      if (!res.ok) {
        toast.error(res.error ?? 'Error al crear')
        return
      }
      const imgErr = await subirImagenesTrasAlta(res.data!.id, {
        cover: fileImagen,
        porColor: filesColor,
      })
      if (imgErr) {
        toast.warning(`Producto creado, pero la foto no se subió: ${imgErr}. Podés cargarla al editar.`)
      } else {
        toast.success('Producto creado')
      }
      if (yCrearOtro) {
        resetForm()
        router.refresh()
      } else {
        router.push(`/productos/${res.data!.id}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <NlPasteBox
        onInterpretarDatos={handleInterpretarDatos}
        onInterpretarStock={handleInterpretarStock}
        coloresListos={ejesColores.length > 0}
        coloresLabel={ejesColores.map((c) => c.nombre).join(', ')}
      />

      {parseWarnings.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-fg space-y-1">
          {parseWarnings.map((w, i) => (
            <p key={i}>• {w}</p>
          ))}
        </div>
      )}

      <ExpressForm
        nombre={nombre}
        onNombreChange={setNombre}
        categoriaId={categoriaId}
        onCategoriaChange={(id) => {
          setCategoriaId(id)
          setCategoriaPendiente(null)
        }}
        categorias={categorias}
        onCategoriaCreated={(c) => {
          setCategorias((prev) => [...prev, c])
          setCategoriaId(c.id)
          setCategoriaPendiente(null)
        }}
        precioCompra={precioCompra}
        onPrecioCompraChange={setPrecioCompra}
        precioVenta={precioVenta}
        onPrecioVentaChange={setPrecioVenta}
        margenDefault={margenDefault}
        codigoBase={codigoBase}
        onCodigoBaseChange={setCodigoBase}
        descripcion={descripcion}
        onDescripcionChange={setDescripcion}
        catalogoColores={catalogoColores}
        catalogoTallas={catalogoTallas}
        ejesColores={ejesColores}
        ejesTallas={ejesTallas}
        onToggleColor={toggleColorFromCatalog}
        onToggleTalla={toggleTallaFromCatalog}
        onColorCreated={(c) => {
          setCatalogoColores((prev) => [...prev, c])
          setEjesColores((prev) => [
            ...prev,
            { key: c.id, id: c.id, nombre: c.nombre, hex: c.hex_color },
          ])
        }}
        onTallaCreated={(t) => {
          setCatalogoTallas((prev) => [...prev, t])
          setEjesTallas((prev) => [...prev, { key: t.id, id: t.id, nombre: t.nombre }])
        }}
        crearCategoriaInline={crearCategoriaInline}
        crearColorInline={crearColorInline}
        crearTallaInline={crearTallaInline}
        imagenSlot={
          <ImagenProductoUpload
            key={`cover-${fotosKey}`}
            etiqueta="Foto principal"
            productoId={null}
            imagenUrl={null}
            onUrlChange={() => {}}
            onFilePendienteChange={setFileImagen}
          />
        }
        fotosColorSlot={
          <FotosPorColor
            key={`colores-${fotosKey}`}
            productoId={null}
            colores={ejesColores
              .filter((c): c is EjeColor & { id: string } => Boolean(c.id))
              .map((c) => ({
                id: c.id,
                nombre: c.nombre,
                hex_color: c.hex,
                imagen_url: null,
              }))}
            onUrlChange={() => {}}
            onFilePendienteChange={(colorId, file) => {
              setFilesColor((prev) => {
                const next = { ...prev }
                if (file) next[colorId] = file
                else delete next[colorId]
                return next
              })
            }}
          />
        }
      />

      <MatrizStockSparsa
        colores={ejesColores}
        tallas={ejesTallas}
        stock={stock}
        onChange={setCelda}
      />

      <ExpressPreview
        draft={draft}
        unidades={totalUnidades(draft.celdas)}
        validationError={validarDraft(draft)}
        generarBarras={generarBarras}
        onGenerarBarrasChange={setGenerarBarras}
        pending={pending}
        onCrear={() => handleSubmit(false)}
        onCrearYOtro={() => handleSubmit(true)}
      />
    </div>
  )
}
