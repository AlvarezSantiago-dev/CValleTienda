// =============================================================
// lib/cajero/tools.ts
// Tools del Cajero Hablado + dispatcher. Única frontera entre el
// LLM y el sistema: todas las escrituras pasan por las server
// actions existentes, y las tools de ejecución exigen una
// propuesta pendiente (guard impuesto en código, no en el prompt).
// =============================================================

import {
  registrarVenta,
  buscarVariantesAction,
  buscarClientesAction,
} from '@/app/actions/ventas'
import {
  crearProducto,
  generarCodigoBarrasUnico,
  generarCodigosBarrasBatch,
  crearTallaInline,
  crearColorInline,
  type ProductoInput,
  type VarianteInput,
} from '@/app/actions/productos'
import { actualizarPrecioVenta } from '@/app/actions/cajero'
import { armarPropuestaVenta, resumenPropuestaVenta } from './propuesta'
import { armarCombosVariantes, parsearListaNombres } from './variantes-producto'
import type { ContextoCajero, OpcionVarianteCajero } from './contexto'
import type {
  CandidatoProducto,
  EstadoConversacion,
  ResultadoEjecucion,
  VariantePropuestaProducto,
} from './tipos'
import type { ToolDef } from './openai'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'

export interface SesionCajero {
  contexto: ContextoCajero
  estado: EstadoConversacion
  resultado?: ResultadoEjecucion
}

// ------------------------------------------------------------------
// Definición de tools (JSON Schema para el modelo)
// ------------------------------------------------------------------

export const TOOLS_CAJERO: ToolDef[] = [
  {
    name: 'buscar_productos',
    description:
      'Busca productos en el catálogo de la tienda por nombre o código. Devuelve candidatos con id, precio y stock. Llamala antes de proponer una venta o un cambio de precio. Si hay más de un candidato plausible, preguntale al usuario cuál.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre o parte del nombre del producto' },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_cliente',
    description: 'Busca clientes por nombre, DNI o teléfono. Solo si el usuario mencionó un cliente.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'proponer_venta',
    description:
      'Arma la propuesta de venta con los ítems elegidos (ids obtenidos de buscar_productos). El servidor calcula total y vuelto. Después de llamarla, decile el resumen al usuario y esperá su confirmación. NO registra la venta.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              variante_id: { type: 'string' },
              cantidad: {
                type: 'number',
                description:
                  'Cantidad en la unidad del producto. Para productos por kg, los gramos van como fracción: 359 g = 0.359',
              },
            },
            required: ['variante_id', 'cantidad'],
          },
        },
        recibido: {
          type: 'number',
          description: 'Monto en pesos que entregó el cliente, si lo dijo',
        },
        cliente_id: { type: 'string', description: 'Solo si se buscó y eligió un cliente' },
      },
      required: ['items'],
    },
  },
  {
    name: 'registrar_venta',
    description:
      'Registra (cobra) la venta de la propuesta pendiente. SOLO llamala después de que el usuario confirmó explícitamente la propuesta en un mensaje posterior.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'proponer_producto',
    description:
      'Prepara el alta de un producto. Si el rubro usa variantes, pasá var1 (Marca/Talla/…) y var2 (Presentación/Color/…) como listas: se combinan todas con todas. Si el usuario dijo que es uno solo, dejá las listas vacías. NO crea el producto: esperá confirmación.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        precio_venta: { type: 'number' },
        precio_compra: { type: 'number' },
        codigo_barras: {
          type: 'string',
          description: 'Código dictado. Si hay varias variantes se usa en la primera y el resto se generan.',
        },
        descripcion: { type: 'string' },
        stock_inicial: { type: 'number', description: 'Unidades iniciales por variante, default 0' },
        unidad_de_medida: { type: 'string' },
        var1: {
          type: 'array',
          items: { type: 'string' },
          description: 'Valores de la primera dimensión (marca, talle, medida…). Vacío si es producto simple.',
        },
        var2: {
          type: 'array',
          items: { type: 'string' },
          description: 'Valores de la segunda dimensión (presentación, color…). Vacío si no aplica.',
        },
      },
      required: ['nombre', 'precio_venta'],
    },
  },
  {
    name: 'crear_producto',
    description:
      'Crea el producto de la propuesta pendiente. SOLO después de confirmación explícita del usuario.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'proponer_precio',
    description:
      'Prepara un cambio de precio de venta para un producto (producto_id de buscar_productos). Resumile el cambio al usuario y esperá confirmación. NO cambia el precio.',
    parameters: {
      type: 'object',
      properties: {
        producto_id: { type: 'string' },
        nuevo_precio: { type: 'number' },
      },
      required: ['producto_id', 'nuevo_precio'],
    },
  },
  {
    name: 'actualizar_precio',
    description:
      'Aplica el cambio de precio de la propuesta pendiente. SOLO después de confirmación explícita del usuario.',
    parameters: { type: 'object', properties: {} },
  },
]

// ------------------------------------------------------------------
// Dispatcher
// ------------------------------------------------------------------

function normalizarNombreVar(
  nombre: string,
  eje: 'var1' | 'var2',
  rubro: string
): string {
  const t = nombre.trim()
  if (!t) return t
  if (eje === 'var1' && rubro === 'ropa') return upperCaseTrim(t)
  return titleCase(t)
}

async function resolverOpcion(
  nombre: string,
  existentes: OpcionVarianteCajero[],
  crear: (n: string) => Promise<{ ok: boolean; error?: string; data?: { id: string; nombre: string } }>
): Promise<{ id: string; nombre: string } | { error: string }> {
  const key = nombre.trim().toLowerCase()
  const hit = existentes.find((e) => e.nombre.trim().toLowerCase() === key)
  if (hit) return hit
  const res = await crear(nombre)
  if (!res.ok || !res.data) return { error: res.error ?? `No pude crear "${nombre}"` }
  existentes.push({ id: res.data.id, nombre: res.data.nombre })
  return res.data
}

const MAX_CANDIDATOS = 8

function limpiarCodigo(raw: string | undefined | null): string | null {
  const t = (raw ?? '').replace(/[\s.]/g, '').trim()
  if (!t) return null
  return /^[0-9A-Za-z\-]{4,32}$/.test(t) ? t : null
}

export async function ejecutarToolCajero(
  sesion: SesionCajero,
  nombre: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (nombre) {
    // ---------------- lectura ----------------
    case 'buscar_productos': {
      const query = String(args.query ?? '').trim()
      if (!query) return { error: 'Falta el texto de búsqueda' }
      const res = await buscarVariantesAction(query)
      if (!res.ok || !res.data) return { error: res.error ?? 'Error buscando productos' }

      // v1: sin packs — el modelo trabaja con unidades sueltas
      const candidatos: CandidatoProducto[] = res.data
        .filter((v) => !v.es_pack)
        .slice(0, MAX_CANDIDATOS)
        .map((v) => ({
          variante_id: v.id,
          producto_id: v.producto_id,
          etiqueta: [v.producto_nombre, v.talla, v.color].filter(Boolean).join(' · '),
          precio: v.precio_venta,
          stock_efectivo: v.stock_efectivo,
          unidad: v.unidad_de_medida,
        }))

      // acumular para habilitar proponer_venta / proponer_precio
      const vistos = new Set(sesion.estado.candidatos.map((c) => c.variante_id))
      for (const c of candidatos) {
        if (!vistos.has(c.variante_id)) sesion.estado.candidatos.push(c)
      }

      if (candidatos.length === 0) {
        return { candidatos: [], nota: 'Sin resultados. Avisale al usuario y ofrecé cargarlo como producto nuevo.' }
      }
      return { candidatos }
    }

    case 'buscar_cliente': {
      const query = String(args.query ?? '').trim()
      if (!query) return { error: 'Falta el texto de búsqueda' }
      const res = await buscarClientesAction(query)
      if (!res.ok || !res.data) return { error: res.error ?? 'Error buscando clientes' }
      return {
        candidatos: res.data.slice(0, 5).map((c) => ({
          cliente_id: c.id,
          nombre: [c.nombre, c.apellido].filter(Boolean).join(' '),
          saldo_favor: c.saldo_favor,
        })),
      }
    }

    // ---------------- proponer ----------------
    case 'proponer_venta': {
      const items = Array.isArray(args.items) ? (args.items as Array<Record<string, unknown>>) : []
      if (items.length === 0) return { error: 'La venta necesita al menos un ítem' }

      const porId = new Map(sesion.estado.candidatos.map((c) => [c.variante_id, c]))
      const resueltos = []
      for (const it of items) {
        const id = String(it.variante_id ?? '')
        const cantidad = Number(it.cantidad)
        const cand = porId.get(id)
        if (!cand) {
          return { error: `Variante ${id} desconocida. Usá buscar_productos primero.` }
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          return { error: `Cantidad inválida para ${cand.etiqueta}` }
        }
        if (cand.stock_efectivo !== -1 && cantidad > cand.stock_efectivo) {
          return {
            error: `Stock insuficiente de ${cand.etiqueta}: hay ${cand.stock_efectivo}. Avisale al usuario.`,
          }
        }
        resueltos.push({
          variante_id: id,
          etiqueta: cand.etiqueta,
          cantidad,
          precio_unitario: cand.precio,
        })
      }

      const clienteNombre: string | null = null
      const clienteId = args.cliente_id ? String(args.cliente_id) : null

      let propuesta
      try {
        propuesta = armarPropuestaVenta(resueltos, {
          recibido: args.recibido != null ? Number(args.recibido) : undefined,
          redondeoActivo: sesion.contexto.redondeoActivo,
          cliente_id: clienteId,
          cliente_nombre: clienteNombre,
        })
      } catch (e) {
        return { error: (e as Error).message }
      }

      sesion.estado.propuestaPendiente = propuesta
      return {
        propuesta: resumenPropuestaVenta(propuesta),
        instruccion:
          propuesta.faltante != null
            ? 'El monto recibido no alcanza. Avisale al usuario.'
            : 'Decile el total (y el vuelto si corresponde) y preguntá si cobrás. NO llames registrar_venta todavía.',
      }
    }

    case 'proponer_producto': {
      const nombreProd = String(args.nombre ?? '').trim()
      const precioVenta = Number(args.precio_venta)
      if (!nombreProd) return { error: 'Falta el nombre del producto' }
      if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
        return { error: 'Precio de venta inválido' }
      }

      const lista1 = sesion.contexto.usarVar1 ? parsearListaNombres(args.var1) : []
      const lista2 = sesion.contexto.usarVar2 ? parsearListaNombres(args.var2) : []
      const var1 = lista1.map((n) => normalizarNombreVar(n, 'var1', sesion.contexto.rubro))
      const var2 = lista2.map((n) => normalizarNombreVar(n, 'var2', sesion.contexto.rubro))

      let combos
      try {
        combos = armarCombosVariantes(var1, var2)
      } catch (e) {
        return { error: (e as Error).message }
      }

      const codigoDicho = limpiarCodigo(args.codigo_barras as string | undefined)
      const codigos: string[] = []
      if (codigoDicho) codigos.push(codigoDicho)
      const faltan = combos.length - codigos.length
      if (faltan === 1 && !codigoDicho) {
        const gen = await generarCodigoBarrasUnico()
        if (!gen.ok || !gen.data) return { error: 'No pude generar el código de barras' }
        codigos.push(gen.data.codigo)
      } else if (faltan > 0) {
        const gen = await generarCodigosBarrasBatch(faltan)
        if (!gen.ok || !gen.data) return { error: gen.error ?? 'No pude generar los códigos' }
        codigos.push(...gen.data.codigos)
      }

      const unidadRaw = String(args.unidad_de_medida ?? 'unidad').trim().toLowerCase()
      const unidad = sesion.contexto.unidades.includes(unidadRaw) ? unidadRaw : 'unidad'

      const variantes: VariantePropuestaProducto[] = combos.map((c, i) => ({
        etiqueta: c.etiqueta,
        var1: c.var1,
        var2: c.var2,
        codigo_barras: codigos[i]!,
      }))

      sesion.estado.propuestaPendiente = {
        tipo: 'producto',
        nombre: nombreProd,
        precio_venta: precioVenta,
        precio_compra: Number.isFinite(Number(args.precio_compra))
          ? Math.max(0, Number(args.precio_compra))
          : 0,
        codigo_barras: variantes[0]!.codigo_barras,
        descripcion: args.descripcion ? String(args.descripcion).trim() : null,
        unidad_de_medida: unidad,
        stock_inicial: Number.isFinite(Number(args.stock_inicial))
          ? Math.max(0, Number(args.stock_inicial))
          : 0,
        variantes,
      }
      const resumenVars =
        variantes.length === 1 && variantes[0]!.etiqueta === 'Única'
          ? 'una sola variante'
          : `${variantes.length} variantes: ${variantes.map((v) => v.etiqueta).join(', ')}`
      return {
        propuesta: { ...sesion.estado.propuestaPendiente, resumen_variantes: resumenVars },
        instruccion: `Resumile nombre, precios y ${resumenVars}. Preguntá si lo creás. NO llames crear_producto todavía. Las ${sesion.contexto.labelVar1}/${sesion.contexto.labelVar2} que no existan se dan de alta al confirmar.`,
      }
    }

    case 'proponer_precio': {
      if (sesion.contexto.rol !== 'owner' && sesion.contexto.rol !== 'admin') {
        return { error: 'El usuario no tiene permiso para cambiar precios. Avisale.' }
      }
      const productoId = String(args.producto_id ?? '')
      const nuevoPrecio = Number(args.nuevo_precio)
      if (!Number.isFinite(nuevoPrecio) || nuevoPrecio <= 0) {
        return { error: 'Precio nuevo inválido' }
      }
      const cand = sesion.estado.candidatos.find((c) => c.producto_id === productoId)
      if (!cand) {
        return { error: `Producto ${productoId} desconocido. Usá buscar_productos primero.` }
      }
      sesion.estado.propuestaPendiente = {
        tipo: 'precio',
        producto_id: productoId,
        etiqueta: cand.etiqueta,
        precio_actual: cand.precio,
        precio_nuevo: nuevoPrecio,
      }
      return {
        propuesta: sesion.estado.propuestaPendiente,
        instruccion: 'Confirmá el cambio con el usuario. NO llames actualizar_precio todavía.',
      }
    }

    // ---------------- ejecutar (requieren propuesta pendiente) ----------------
    case 'registrar_venta': {
      const p = sesion.estado.propuestaPendiente
      if (!p || p.tipo !== 'venta') {
        return { error: 'No hay propuesta de venta pendiente. Primero proponé y esperá confirmación del usuario.' }
      }
      if (p.faltante != null) {
        return { error: `El monto recibido no cubre el total (faltan $${p.faltante}).` }
      }
      if (!sesion.contexto.metodoEfectivoId) {
        return { error: 'La tienda no tiene un método de pago de efectivo configurado. Avisale al usuario.' }
      }

      const res = await registrarVenta({
        items: p.items.map((it) => ({
          variante_id: it.variante_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
        pagos: [
          {
            metodo_pago_id: sesion.contexto.metodoEfectivoId,
            monto: p.recibido ?? p.total,
          },
        ],
        cliente_id: p.cliente_id ?? null,
        condicion_pago: 'contado',
      })
      if (!res.ok || !res.data) return { error: res.error ?? 'No se pudo registrar la venta' }

      sesion.estado.propuestaPendiente = null
      sesion.resultado = {
        tipo: 'venta',
        ventaId: res.data.ventaId,
        numeroTicket: res.data.numeroTicket,
      }
      return { ok: true, numero_ticket: res.data.numeroTicket, vuelto: p.vuelto ?? 0 }
    }

    case 'crear_producto': {
      const p = sesion.estado.propuestaPendiente
      if (!p || p.tipo !== 'producto') {
        return { error: 'No hay propuesta de producto pendiente. Primero proponé y esperá confirmación del usuario.' }
      }

      const combosFuente =
        Array.isArray(p.variantes) && p.variantes.length > 0
          ? p.variantes
          : [
              {
                etiqueta: 'Única',
                var1: null,
                var2: null,
                codigo_barras: p.codigo_barras,
              },
            ]

      const variantesInput: VarianteInput[] = []
      for (const v of combosFuente) {
        let tallaId: string | null = null
        let colorId: string | null = null
        if (v.var1) {
          const r = await resolverOpcion(v.var1, sesion.contexto.var1Existentes, crearTallaInline)
          if ('error' in r) {
            return { error: `No pude crear ${sesion.contexto.labelVar1} "${v.var1}": ${r.error}` }
          }
          tallaId = r.id
        }
        if (v.var2) {
          const r = await resolverOpcion(v.var2, sesion.contexto.var2Existentes, (n) =>
            crearColorInline(n)
          )
          if ('error' in r) {
            return { error: `No pude crear ${sesion.contexto.labelVar2} "${v.var2}": ${r.error}` }
          }
          colorId = r.id
        }
        variantesInput.push({
          talla_id: tallaId,
          color_id: colorId,
          codigo_barras: v.codigo_barras,
          precio_venta: null,
          stock_inicial: p.stock_inicial,
          stock_minimo: 0,
        })
      }

      const input: ProductoInput = {
        nombre: p.nombre,
        descripcion: p.descripcion,
        codigo_base: null,
        categoria_id: null,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        unidad_de_medida: p.unidad_de_medida,
        imagen_url: null,
        variantes: variantesInput,
      }
      const res = await crearProducto(input)
      if (!res.ok || !res.data) return { error: res.error ?? 'No se pudo crear el producto' }

      sesion.estado.propuestaPendiente = null
      sesion.resultado = { tipo: 'producto', id: res.data.id, nombre: p.nombre }
      return { ok: true, producto_id: res.data.id, variantes: combosFuente.length }
    }

    case 'actualizar_precio': {
      const p = sesion.estado.propuestaPendiente
      if (!p || p.tipo !== 'precio') {
        return { error: 'No hay cambio de precio pendiente. Primero proponé y esperá confirmación del usuario.' }
      }
      const res = await actualizarPrecioVenta(p.producto_id, p.precio_nuevo)
      if (!res.ok) return { error: res.error ?? 'No se pudo cambiar el precio' }

      sesion.estado.propuestaPendiente = null
      sesion.resultado = {
        tipo: 'precio',
        producto_id: p.producto_id,
        precio_nuevo: p.precio_nuevo,
      }
      return { ok: true, precio_anterior: res.data?.anterior, precio_nuevo: p.precio_nuevo }
    }

    default:
      return { error: `Tool desconocida: ${nombre}` }
  }
}
