# Plan: Etiquetas por rubro (catálogo + ficha) y tramos % o $

**Creado:** 2026-09-02
**Estado:** Implementado
**Pedido:** En distribuidora dejar de mostrar Talle/Color (y que se puedan elegir variantes); tramos de cantidad en producto y pack/caja, por porcentaje o por monto.

---

## Descripción General

### Qué Logra Este Plan

El catálogo público y el resto de superficies usan las etiquetas del rubro (en distribuidora: **Marca** y **Presentación**), y elegir un chip siempre resuelve una variante válida. Los descuentos por cantidad (producto y cada pack/caja overlay) se pueden cargar en **% o en pesos** por presentación; POS, catálogo y pedidos recostean igual.

### Por Qué Importa

LaDistry vende gaseosas, no ropa. “Talle: Sprite / Color: Común” confunde al cliente y, con valores repetidos en los dos ejes, los chips no cambian la variante. Los mayoristas piensan “desde 2 packs, $500 menos” además de “5 %”. Sin monto, tienen que inventar un % equivalente.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Dónde | Qué hay hoy |
|------|--------|-------------|
| Labels de rubro | `app/lib/rubro/config.ts` | `distribuidora`: `labelVar1=Marca`, `labelVar2=Presentación`. Dashboard vía `RubroProvider`. |
| Catálogo ficha | `app/components/catalogo-publico/CatalogoFicha.tsx` L285–318 | **Hardcodea** `"Talle"` y `"Color"`. `TiendaCatalogoPublica` no lleva labels (`aDtoPublico` tira el `rubro`). |
| Selección de variante | `CatalogoFicha.pick(talla, color)` | Busca `talla === X && color === Y`. Si Sprite está en ambos ejes (captura), clickear Coca Cola con Color=Sprite no encuentra fila → parece que “no se puede seleccionar”. |
| Dashboard variantes | `VariantesEditor` / `VarianteFila` / POS | Ya usan `labelVar1` / `labelVar2`. Si la tienda tiene rubro `ropa` o un deploy viejo, se ve Talla/Color. |
| Tabs taxonomía | `TabsProductos.tsx` | `${labelVar1}s` → “Marcas” ok, **“Presentacións”** mal. Placeholders de `/productos/tallas` no incluyen `distribuidora`. |
| Tramos | `producto_tramos_cantidad` + `producto_pack_tramos` | Solo `cantidad_desde` + `descuento_pct`. Motor `lib/precios/tramos-cantidad.ts`. Agrupa variantes del mismo producto (ya implementado). |
| Editor | `TramosCantidadEditor.tsx` | Un campo “% dto.”. Se reusa en producto y en `PacksProductoEditor`. |
| Recosteo | POS `syncCarritoPrecios`, catálogo `recostearCarrito`, `actions/catalogo.ts`, API pedido | Todos llaman `precioConTramo(lista, tramos, qty)`. |

Captura catálogo (`/c/ladistry/p/...`): chips **Talle** = Sprite / Coca Cola / Fanta y **Color** = Sprite / Común / Zero / Fanta. Eso es dato mal cargado (marca y sabor mezclados en `tallas` y `colores`) **más** labels de ropa en la vitrina.

### Brechas o Problemas que se Abordan

1. Catálogo ignora el rubro y dice Talle/Color.
2. `pick()` exige combinación exacta; no filtra chips disponibles → selección rota.
3. Tramos solo %; no hay $ por pack/caja/unidad.
4. Plural “Presentacións”; placeholders de taxonomía sin distribuidora.
5. Etiqueta térmica / remito nuevo aún dicen Talla/Color (mismo patrón ropa).

---

## Cambios Propuestos

### Resumen de Cambios

- Pasar `labelVar1` / `labelVar2` / `usarVar1` / `usarVar2` al DTO público del catálogo y usarlos en la ficha.
- Reemplazar `pick()` por selección por ejes con fallback (si no existe Marca A + Presentación B, tomar la primera variante de Marca A) y chips del otro eje filtrados.
- Extender tramos: `tipo = 'pct' | 'monto'` + valor; monto = pesos **por presentación** (el pack/caja/unidad que se está vendiendo), no sobre el total de la línea.
- Mismo editor y motor para tramos del producto y de cada pack overlay.
- Plurales y placeholders de taxonomía para distribuidora.
- Tests del motor; migración SQL.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260902000001_tramos_tipo_monto.sql` | `tipo` + `descuento_monto` en `producto_tramos_cantidad` y `producto_pack_tramos`; `descuento_pct` nullable cuando es monto. |
| `app/lib/catalogo/pick-variante.ts` | Helper puro `resolverVariante(variantes, talla, color)` + chips disponibles. |
| `app/lib/catalogo/pick-variante.test.ts` | Combinación inexistente no deja el chip “muerto”. |
| `app/lib/precios/tramos-cantidad.test.ts` | Casos extra % vs $ (editar el existente). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/rubro/config.ts` | `labelVar1Plural` / `labelVar2Plural` (Presentaciones, no Presentacións). |
| `app/lib/catalogo/types.ts` | Labels en `TiendaCatalogoPublica`. |
| `app/lib/catalogo/queries-publico.ts` | `aDtoPublico` copia labels desde `getConfigRubro(rubro)`. |
| `app/components/catalogo-publico/CatalogoFicha.tsx` | Labels; pick filtrado; `textoTramos` con $ o %. |
| `app/app/(catalogo)/c/[slug]/p/[productoId]/page.tsx` | Ya pasa `tienda`; no hace falta si el DTO trae labels. |
| `app/lib/precios/tramos-cantidad.ts` | `TramoCantidad` con `tipo` y `descuento_monto`; `precioConTramo`; `textoTramos`; `validarTramos`. |
| `app/components/productos/TramosCantidadEditor.tsx` | Toggle % / $ por fila; campo monto. |
| `app/app/actions/tramos-cantidad.ts` | Persist tipo + monto. |
| `app/app/actions/packs.ts` | Insert de `producto_pack_tramos` con las nuevas columnas. |
| `app/types/database.ts` | Tipos `ProductoTramoCantidad` / `ProductoPackTramo`. |
| `app/lib/catalogo/queries-publico.ts` + `queries-interno.ts` + `actions/catalogo.ts` + API pedido + `lib/pos/queries.ts` | SELECT de las columnas nuevas al hidratar tramos. |
| `app/components/productos/TabsProductos.tsx` | Usar plural del config. |
| `app/app/(dashboard)/productos/tallas/page.tsx` | Placeholder distribuidora: `Ej: Coca Cola, Manaos, Pepsi`. |
| `app/app/(dashboard)/productos/colores/page.tsx` | Placeholder: `Ej: 2.25 L, 600 ml, Común, Zero`. |
| `app/components/configuracion/DisenadorEtiqueta.tsx` | Labels del rubro en preview. |
| `app/components/remitos/NuevoRemitoForm.tsx` | Placeholders `labelVar1` / `labelVar2`. |
| `CLAUDE.md` + `referencia/catalogo-publico.md` + `contexto/proyectos.md` | Tramo % o $; catálogo usa labels de rubro. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **No se renombran columnas `tallas` / `colores` en Postgres.** Siguen siendo eje 1 y eje 2. Solo cambia el **label** por rubro. Migrar schema rompería POS, stock, CSV y kits.

2. **Catálogo usa `getConfigRubro(tienda.rubro)`**, no un RubroProvider (el layout `/c` no es dashboard). Labels viajan en `TiendaCatalogoPublica`.

3. **Selección: fallback + chips filtrados.** Click en Marca “Coca Cola” → si no hay Coca Cola + Presentación actual, se elige la primera Coca Cola. El eje Presentación solo muestra valores que existen para esa marca (y al revés). Así Sprite en los dos ejes deja de trabar.

4. **Tramo “desde N”, sin “hasta”.** Sigue ganando el `cantidad_desde` más alto ≤ qty; no se apilan. Evita huecos y doble descuento.

5. **Monto = pesos por 1 presentación vendida.** Desde 2 packs, −$500 ⇒ cada pack a `lista - 500` (piso 0). Equivalente conceptual al %. El recargo CC se aplica **después**, igual que hoy.

6. **Producto vs pack overlay.** Tramos del producto aplican a la UOM del SKU (unidad/pack/caja del producto). Cada fila de Packs/cajas tiene sus propios tramos (cantidad de **esos** packs). No se mezclan sueltas con overlay (ya hay `claveGrupoTramo`).

7. **Se puede mezclar % y $ en umbrales distintos** (desde 2 → 5 %; desde 10 → $800). No dos tramos con el mismo `cantidad_desde`.

8. **Compat:** filas viejas sin `tipo` = `pct`. `descuento_monto` null.

### Alternativas Consideradas

- **Renombrar tablas a `marcas` / `presentaciones`:** rechazo; costo enorme, mismo bug de labels se resuelve en UI.
- **Tramo con rango desde–hasta:** más UI y casos borde (solapes). El modelo actual ya cubre “desde 2” y “desde 10”.
- **Monto sobre el total de la línea** (`$500` off el renglón, no por pack): no escala con qty y no es simétrico al %. Se documenta como no-objetivo.
- **Un solo toggle global %/$ para todo el producto:** demasiado rígido para “2 packs 5 % y 12 packs $X”.

### Preguntas Abiertas (si las hay)

Ninguna bloqueante. Asunción: monto por presentación. Si más adelante se pide “$500 off el renglón entero”, sería un tercer tipo `monto_linea`.

**Chequeo operativo (no código):** en Configuración, el rubro de LaDistry debe ser **Distribuidora**. Si quedó `ropa` o `generico` (bug viejo de `handle_new_user`), el dashboard dirá Talla/Color aunque el catálogo se arregle. No hace falta migrar datos de Sprite duplicado; con el pick nuevo funciona, pero conviene recargar Marca vs Presentación a mano.

---

## Tareas Paso a Paso

### Paso 1: Migración SQL tramos % / $

Agregar a ambas tablas:

```sql
alter table public.producto_tramos_cantidad
  add column if not exists tipo text not null default 'pct',
  add column if not exists descuento_monto numeric(12, 2);

alter table public.producto_tramos_cantidad
  drop constraint if exists producto_tramos_cantidad_tipo_check;
alter table public.producto_tramos_cantidad
  add constraint producto_tramos_cantidad_tipo_check
  check (tipo in ('pct', 'monto'));

-- pct: descuento_pct entre 0 y 100; monto: descuento_monto >= 0 y pct puede ser 0
```

Mismo bloque para `producto_pack_tramos`. Relajar el CHECK de `descuento_pct` para permitir 0 cuando `tipo = 'monto'` (hoy `not null` 0–100 sigue sirviendo si guardamos `0` en pct al usar monto).

**Archivos afectados:**

- `supabase/migrations/20260902000001_tramos_tipo_monto.sql`

### Paso 2: Motor `precioConTramo`

```ts
export type TipoTramo = 'pct' | 'monto'
export interface TramoCantidad {
  cantidad_desde: number
  tipo?: TipoTramo  // default pct
  descuento_pct: number
  descuento_monto?: number | null
}
```

- Elegir el tramo con mayor `cantidad_desde` ≤ qty (igual que ahora).
- `pct` → `round2(lista * (1 - pct/100))`.
- `monto` → `round2(Math.max(0, lista - monto))`.
- `textoTramos`: `Desde 2 packs 5 %` o `Desde 2 packs −$500`.
- `validarTramos`: si tipo monto, `descuento_monto > 0`; si pct, 0–100.

**Acciones:** actualizar tests (Coca $10430 desde 2 → 5 % = 9908.5; mismo qty −$500 = 9930).

**Archivos afectados:**

- `app/lib/precios/tramos-cantidad.ts`
- `app/lib/precios/tramos-cantidad.test.ts`

### Paso 3: Editor de tramos

Por fila: select `%` / `$`, un solo input de valor. Placeholder y hint según `unidadLabel` (packs / cajas / unidades). Ayuda: “Gana el tramo más alto; no se apilan. El $ es por cada pack/unidad, no el total.”

**Archivos afectados:**

- `app/components/productos/TramosCantidadEditor.tsx`
- `app/components/productos/ProductoForm.tsx` (el hint de “se suman variantes” se queda)
- `app/components/productos/PacksProductoEditor.tsx` (ya pasa `unidadLabel="packs"`)

### Paso 4: Persistencia e hidratación

Insert/select `tipo`, `descuento_pct`, `descuento_monto` en:

- `guardarTramosProducto`
- `guardarPacksProducto` (tramos por pack)
- queries POS, catálogo público, `hidratarItemsPedido`, recosteo `actions/catalogo.ts`, `api/catalogo/[slug]/pedido`

Mapear row → `TramoCantidad` con default `tipo: 'pct'`.

**Archivos afectados:**

- `app/app/actions/tramos-cantidad.ts`
- `app/app/actions/packs.ts`
- `app/lib/pos/queries.ts`
- `app/lib/catalogo/queries-publico.ts`
- `app/lib/catalogo/queries-interno.ts`
- `app/app/actions/catalogo.ts`
- `app/app/api/catalogo/[slug]/pedido/route.ts`
- `app/types/database.ts`

El recosteo existente no cambia de flujo: sigue llamando `precioConTramo`; el motor ya entiende monto.

### Paso 5: Labels en catálogo + pick de variantes

`aDtoPublico`:

```ts
const cfg = getConfigRubro(t.rubro)
return { ..., labelVar1: cfg.labelVar1, labelVar2: cfg.labelVar2, usarVar1: cfg.usarVar1, usarVar2: cfg.usarVar2 }
```

`CatalogoFicha`: títulos de chips = `tienda.labelVar1` / `labelVar2`. Si `usarVar2` es false, no mostrar eje 2.

Helper `resolverVariante`:

1. Preferir match exacto talla+color.
2. Si no, match talla (o color si se clickeó ese eje).
3. Chips del otro eje = valores que existen para el eje fijo.

**Archivos afectados:**

- `app/lib/catalogo/types.ts`
- `app/lib/catalogo/queries-publico.ts`
- `app/lib/catalogo/pick-variante.ts` + test
- `app/components/catalogo-publico/CatalogoFicha.tsx`

### Paso 6: Dashboard taxonomía y leftovers ropa

- `TabsProductos`: `cfg.labelVar1Plural`.
- Config: `distribuidora` → Marcas / Presentaciones.
- Placeholders en páginas tallas/colores.
- `DisenadorEtiqueta` y `NuevoRemitoForm`: `useRubro()`.

**Archivos afectados:**

- `app/lib/rubro/config.ts`
- `app/components/productos/TabsProductos.tsx`
- `app/app/(dashboard)/productos/tallas/page.tsx`
- `app/app/(dashboard)/productos/colores/page.tsx`
- `app/components/configuracion/DisenadorEtiqueta.tsx`
- `app/components/remitos/NuevoRemitoForm.tsx`

### Paso 7: Docs

Una línea en CLAUDE: tramos `%` o `$` por presentación; catálogo labels de rubro. Actualizar `referencia/catalogo-publico.md` (chips Marca/Presentación, no Talle). `contexto/proyectos.md` POS/catálogo.

**Archivos afectados:**

- `CLAUDE.md`
- `referencia/catalogo-publico.md`
- `contexto/proyectos.md`

### Paso 8: Verificar

- `npx tsc --noEmit` en `app/`.
- Tests `tramos-cantidad` + `pick-variante`.
- En browser (distribuidora): ficha catálogo dice Marca/Presentación; chips cambian foto/precio; tramo $ en POS y catálogo con 1 Comun + 1 Zero (sigue sumando variantes).

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

`precioConTramo` / `TramoCantidad`: POS `precios-condicion.ts`, `carrito.ts`, `CatalogoCarrito`, `EditarPedidoForm`, `ConvertirPedidoModal`, `lib/packs/virtual.test.ts`. No hace falta tocarlos si el tipo se extiende con campos opcionales.

### Actualizaciones Necesarias para Consistencia

Correr la SQL en Supabase **antes** de deploy; si no, los INSERT con `tipo` fallan.

### Impacto en Flujos de Trabajo Existentes

Tramos % actuales siguen iguales. Pack overlay y agrupación de variantes no se tocan. Stock pack/caja (unidades_contenido informativo) no cambia.

---

## Lista de Validación

- [ ] Migración aplicada en Supabase; tramos viejos siguen en % . *(correr `supabase/migrations/20260902000001_tramos_tipo_monto.sql` antes de deploy)*
- [x] Catálogo LaDistry: chips **Marca** / **Presentación** (no Talle/Color). *(HTML de `/c/ladistry/p/...`)*
- [ ] Click Coca Cola con Presentación Sprite inexistente elige una Coca Cola válida (imagen/precio cambian). *(cubierto por test `pick-variante`; falta click en browser)*
- [ ] Producto: tramo desde 2 → 5 %; 1 Comun + 1 Zero en POS y catálogo aplican 5 %. *(motor testeado; falta UI live)*
- [ ] Mismo producto: tramo desde 2 → $500; precio unitario = lista − 500. *(motor testeado; falta UI live)*
- [ ] Pack overlay x4: tramo propio en % o $ no se mezcla con el de suelta. *(motor `qtyGrupoTramo`; falta UI live)*
- [x] Tabs Productos: Marcas / Presentaciones. *(código: `pluralLabelVar`)*
- [x] `npx tsc --noEmit` ok; tests de tramos y pick ok.
- [x] CLAUDE.md y `referencia/catalogo-publico.md` actualizados.

---

## Criterios de Éxito

1. En `/c/ladistry/p/{id}` no aparece la palabra Talle ni Color.
2. Todos los chips de variante seleccionables cambian la SKU mostrada.
3. Un tramo en pesos y uno en % se pueden guardar en producto y en un pack, y el precio en POS/catálogo/pedido coincide con el motor.

---

## Notas

- El `6` de “unidades por pack” sigue siendo **contenido informativo**; los tramos cuentan presentaciones (packs), no botellas.
- Si el cliente cargó “coca-cola” como talla y “2.25l” como color, con labels correctos se lee Marca/Presentación. Conviene reordenar datos (Marca = Coca Cola, Presentación = 2.25 L / Común / Zero) para que los ejes no se pisen.
- Verificar rubro de la tienda en Configuración si el **dashboard** sigue diciendo Talla después de este plan (el catálogo se arregla igual porque lee `tiendas.rubro`).

---

## Notas de Implementación

**Implementado:** 2026-09-02

### Resumen

Catálogo público toma `labelVar1` / `labelVar2` del rubro y resuelve variantes con fallback + chips filtrados. Tramos aceptan `%` o `$` por presentación (producto y pack overlay), con el mismo motor en POS, catálogo y pedidos.

### Desviaciones del Plan

- Plurales vía `pluralLabelVar()` (mapa Presentación → Presentaciones) en lugar de `labelVar1Plural` en cada objeto de rubro.
- En la ficha, los chips de pack overlay se titulan **Pack o caja** para no chocar con el eje Presentación del rubro distribuidora.

### Problemas Encontrados

Ninguno bloqueante. Falta que el usuario corra la migración SQL en Supabase antes de guardar tramos con `tipo`. No se pudo hacer click-through en browser (sin MCP); se verificó HTML de fichas LaDistry (Marca/Presentación, sin Talle/Color) más `tsc` y 21 tests.
