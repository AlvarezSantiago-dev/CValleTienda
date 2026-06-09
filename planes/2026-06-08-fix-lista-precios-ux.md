# Plan: Fix lista de precios + UX de consulta rápida

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Arreglar la lista de precios (hoy no funciona) y diseñar una interfaz visual clara para ver al instante el precio de lo escaneado o buscado por nombre.

---

## Descripción General

### Qué Logra Este Plan

Corrige la búsqueda de precios conectándola al modelo real del catálogo (variantes con código de barras, stock y precio por variante) y rediseña la pantalla `/precios` como una **consola de consulta rápida**: escaneo instantáneo, precio grande y legible, variantes visibles (talla/color/pack) y feedback claro de stock y errores.

### Por Qué Importa

La consulta de precios es una herramienta diaria en mostrador — cajeros y vendedores la usan cuando un cliente pregunta "¿cuánto sale?" sin iniciar una venta. Hoy la pantalla existe pero la server action consulta columnas que **no existen** en `productos`, por lo que la búsqueda falla silenciosamente. Arreglarlo y pulir la UX reduce fricción en caja y refuerza la percepción profesional del producto.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/app/(dashboard)/precios/page.tsx` | Página "Lista de precios" con layout `max-w-xl` |
| `app/components/precios/BuscadorPrecios.tsx` | Client component con scanner global, debounce, tarjeta grande de precio y tabla de múltiples resultados |
| `app/app/actions/precios.ts` | Server action `buscarPrecios()` — **bug aquí** |
| `app/lib/pos/queries.ts` | Lógica correcta de búsqueda por barcode/nombre sobre `variantes_producto` (usada por POS) |
| `app/lib/hooks/useBarcodeScanner.ts` | Captura escaneos USB-HID cuando el foco no está en un input |
| `app/lib/hooks/useAutoFocus.ts` | Autofocus en el input de búsqueda |
| `app/components/layout/Sidebar.tsx` | Ítem "Lista de precios" → `/precios` |
| `supabase/migrations/20260419000003_productos.sql` | Schema: `productos` (nombre, precio_venta base) + `variantes_producto` (codigo_barras, stock_actual, precio_venta override) |
| `supabase/migrations/20260509000001_multi_rubro_fase1.sql` | Campo `productos.unidad_de_medida` (no `unidad`) |
| `planes/2026-05-25-gestion-equipo-y-rol-cajero.md` | Especificación original de `/precios` para rol cajero |

### Brechas o Problemas que se Abordan

1. **Bug crítico — columnas inexistentes:** `buscarPrecios` hace `.select('id, nombre, precio_venta, stock_actual, unidad, codigo_barras')` sobre la tabla `productos`. Esas columnas (`stock_actual`, `unidad`, `codigo_barras`) **no existen** en `productos`; viven en `variantes_producto`. Supabase devuelve error y el UI muestra "Sin resultados" sin explicar el fallo.

2. **Modelo de datos incorrecto:** El código de barras escaneado en POS está en `variantes_producto.codigo_barras`, no en productos. Un escaneo nunca matchea con la query actual.

3. **Precio por variante ignorado:** Una variante puede tener `precio_venta` propio que sobrescribe el del producto padre. La consulta solo lee el precio base del producto.

4. **Packs y kits no contemplados:** POS resuelve `pack_codigo_barras`, packs virtuales y stock de kits vía `lib/pos/queries.ts`. La lista de precios no.

5. **Errores silenciosos en UI:** `BuscadorPrecios` solo usa `const { data } = await buscarPrecios(q)` e ignora `error`.

6. **Regex de código inconsistente:** `BuscadorPrecios` usa `^\d{8,14}$` (solo dígitos). POS y el resto del sistema usan `^[A-Za-z0-9_-]{8,14}$` (alfanumérico).

7. **UX incompleta para consulta rápida:** Falta mostrar talla/color (labels dinámicos del rubro), badge de pack, estado de stock semántico, imagen del producto cuando exista, y layout más amplio para lectura a distancia en mostrador.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear `app/lib/precios/queries.ts` con `buscarPreciosConsulta()` reutilizando mappers y joins de POS, adaptado para consulta (incluye variantes con stock 0).
- Reescribir `app/app/actions/precios.ts` para delegar en la nueva query y exponer tipo enriquecido `PrecioConsulta`.
- Actualizar `BuscadorPrecios.tsx` con diseño tipo kiosco, manejo de errores, labels de rubro, badges de variante/pack/stock.
- Ajustar `precios/page.tsx` para layout más amplio y orientado a mostrador.
- (Opcional menor) Extraer subcomponentes `TarjetaPrecioGrande.tsx` y `ListaPreciosCompacta.tsx` si el archivo supera ~350 líneas.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/precios/queries.ts` | Query server-side de consulta de precios sobre variantes, packs y kits |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/actions/precios.ts` | Reemplazar query rota; nuevo tipo `PrecioConsulta`; delegar a `lib/precios/queries.ts` |
| `app/components/precios/BuscadorPrecios.tsx` | Fix regex, mostrar errores, rediseño visual kiosco, variantes y packs |
| `app/app/(dashboard)/precios/page.tsx` | Layout más amplio, subtítulo orientado a uso en mostrador |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Reutilizar lógica POS, no duplicar SQL:** Extraer/adaptar desde `lib/pos/queries.ts` (`mapVariante`, `SELECT_VARIANTE`, `generarPackVariantes`, `computarStockKits`) para mantener paridad barcode ↔ precio entre POS y consulta.

2. **Consulta incluye stock 0:** A diferencia del POS (filtra `stock > 0` para vender), la lista de precios debe mostrar el precio aunque no haya stock — el cliente igual quiere saber cuánto cuesta.

3. **Un resultado por variante (no agrupar por producto):** Si "Remera básica" tiene 5 talles, la búsqueda por nombre muestra cada variante con su precio/stock. Al escanear un EAN, se muestra **una sola tarjeta grande** (match exacto).

4. **Diseño kiosco con precio dominante:** Precio en tipografía 56–72px, nombre secundario, badges discretos para variante/stock. Flash lime al escanear (ya existe, mantener). Paleta lime/gray alineada al design system del SaaS.

5. **Sin filtrar por rol en backend:** RLS ya aísla por tienda. Todos los roles con acceso a `/precios` ven los mismos datos read-only.

6. **No agregar dependencias:** Todo con Tailwind + componentes existentes (`Input` opcional, pero puede mantenerse input nativo actual por simplicidad del kiosco).

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Llamar directamente a `buscarVariantes()` de POS | Filtra stock > 0; ocultaría productos sin stock en consulta de precio |
| Mantener búsqueda solo en `productos` | No refleja la realidad del catálogo multi-variante |
| Página fullscreen separada `/precios/kiosco` | Scope innecesario; el rediseño de `/precios` alcanza |
| Reutilizar `BuscadorVariantes` del POS | UX orientada a "agregar al carrito", no a mostrar precio grande |

### Preguntas Abiertas (si las hay)

1. **¿Mostrar precio de compra/costo?** Por defecto **no** — es consulta para clientes en mostrador. Si el usuario lo pide, agregar toggle visible solo para `owner`/`admin`.
2. **¿Incluir productos inactivos?** Por defecto **no** — solo `activo = true` en producto y variante.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Crear query de consulta de precios

Crear `app/lib/precios/queries.ts` con la función principal y tipos.

**Acciones:**

- Definir interface `PrecioConsulta`:
  ```typescript
  export interface PrecioConsulta {
    id: string                    // id variante (o id + '__pack' para pack virtual)
    producto_id: string
    nombre: string                // producto_nombre + sufijo variante si aplica
    producto_nombre: string
    precio_venta: number
    stock_actual: number
    stock_efectivo: number
    unidad_de_medida: string
    codigo_barras: string | null
    talla: string | null
    color: string | null
    color_hex: string | null
    imagen_url: string | null
    es_pack: boolean
    pack_cantidad: number | null
    es_kit: boolean
  }
  ```

- Extender el select de variante para incluir imagen:
  ```typescript
  const SELECT_PRECIO =
    'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, ' +
    'pack_habilitado, pack_cantidad, pack_precio, pack_codigo_barras, ' +
    'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo, es_kit, imagen_url), ' +
    'talla:tallas(id, nombre), color:colores(id, nombre, hex_color)'
  ```

- Implementar `buscarPreciosConsulta(query: string, limit = 40): Promise<PrecioConsulta[]>`:

  **Rama A — Código exacto (8–14 alfanuméricos, igual que POS):**
  - Si `/^[A-Za-z0-9_-]{8,14}$/.test(q)`:
    1. Buscar en `variantes_producto` con `.eq('codigo_barras', q)` (sin filtrar stock).
    2. Si no hay match, buscar `.eq('pack_codigo_barras', q)` + `.eq('pack_habilitado', true)`.
    3. Si match de pack barcode → retornar solo la entrada pack virtual (`generarPackVariantes`).
    4. Si match normal → retornar variante + pack virtual si `pack_habilitado`.
    5. Para kits: llamar `computarStockKits` (importar o duplicar mínimamente desde POS).

  **Rama B — Búsqueda por texto:**
  - Sanitizar término igual que POS: `term.replace(/[,()]/g, ' ')` → pattern `%term%`.
  - Buscar productos activos por `nombre.ilike` o `codigo_base.ilike`.
  - Buscar variantes activas por producto_ids **sin** filtro `stock > 0`.
  - Buscar variantes por `codigo_barras ilike pattern`.
  - Merge deduplicado por `id`, computar stock kits, generar packs virtuales.
  - Ordenar por `producto_nombre`, luego talla, luego color.
  - Limitar a `limit`.

- Función helper `toPrecioConsulta(v: VarianteResultado, imagen?: string | null): PrecioConsulta`:
  - `nombre` = `producto_nombre` + sufijos `" · Talle X"` / `" · Color Y"` / `" · Pack xN"` según corresponda.

- **Importante:** Importar `mapVariante`, `generarPackVariantes`, `computarStockKits` desde `lib/pos/queries.ts` exportándolos (si hoy son privados, exportarlos o mover a `lib/productos/variante-mappers.ts` compartido — preferir export mínimo desde POS para no over-engineer).

**Archivos afectados:**

- `app/lib/precios/queries.ts` (nuevo)
- `app/lib/pos/queries.ts` (exportar helpers privados si hace falta)

---

### Paso 2: Reescribir server action `buscarPrecios`

**Acciones:**

- Reemplazar contenido de `app/app/actions/precios.ts`:
  ```typescript
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import { buscarPreciosConsulta, type PrecioConsulta } from '@/lib/precios/queries'

  export type { PrecioConsulta as PrecioProducto } // alias backward compat en imports existentes

  export async function buscarPrecios(query: string): Promise<{
    data: PrecioConsulta[] | null
    error: string | null
  }> {
    if (!query?.trim()) return { data: [], error: null }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    try {
      const data = await buscarPreciosConsulta(query.trim())
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  }
  ```

- Eliminar la query incorrecta sobre `productos` con columnas inexistentes.

**Archivos afectados:**

- `app/app/actions/precios.ts`

---

### Paso 3: Actualizar tipos y lógica en `BuscadorPrecios`

**Acciones:**

- Cambiar import de tipo a `PrecioConsulta` (o mantener alias `PrecioProducto`).
- Actualizar `RE_CODIGO` a `/^[A-Za-z0-9_-]{8,14}$/` (paridad con POS).
- En `ejecutarBusqueda`:
  ```typescript
  const { data, error } = await buscarPrecios(q)
  if (error) {
    setErrorMsg(error)
    setResultados([])
    return
  }
  setErrorMsg(null)
  setResultados(data ?? [])
  ```
- Agregar state `errorMsg: string | null`.
- Usar `useRubro()` para labels dinámicos (`labelVar1`, `labelVar2`, `usarVar2`) en badges de variante.

**Archivos afectados:**

- `app/components/precios/BuscadorPrecios.tsx`

---

### Paso 4: Rediseño visual — tarjeta de resultado único (modo escaneo)

Cuando `resultados.length === 1` (típico al escanear), mostrar tarjeta tipo kiosco:

**Layout propuesto (ASCII):**

```
┌─────────────────────────────────────────────────────┐
│  ● Listo para escanear          [Limpiar · Esc]     │
│  [ Escanear código o buscar por nombre…           ] │
├─────────────────────────────────────────────────────┤
│  ┌──────┐                                           │
│  │ img  │  REMERA BÁSICA ALGODÓN                     │
│  │ 64px │  Talle M · Negro          [Pack x6]        │
│  └──────┘  Cód. 7791234567890                       │
│                                                     │
│              $ 12.500,00                            │
│              ─────────────                          │
│         Stock: 8 unidades  ● Disponible             │
└─────────────────────────────────────────────────────┘
```

**Acciones concretas:**

- Contenedor principal: `max-w-2xl mx-auto` (no `max-w-xl`).
- Tarjeta resultado único:
  - Fondo: `bg-gradient-to-br from-lime-50 via-white to-white border-lime-200 rounded-3xl p-8 shadow-sm`.
  - Precio: `text-[56px] sm:text-[72px] font-black tracking-tight tabular-nums`.
  - Nombre producto: `text-lg font-semibold text-gray-900`.
  - Badges inline:
    - Talla/color con `Badge` o spans `rounded-full bg-gray-100 px-2.5 py-0.5 text-xs`.
    - Pack: `bg-amber-50 text-amber-800 border border-amber-200`.
  - Stock semántico:
    - `stock_efectivo > 5` → verde "Disponible"
    - `1–5` → ámbar "Últimas unidades"
    - `0` → rojo "Sin stock" (pero precio igual visible)
  - Imagen: si `imagen_url`, thumbnail `w-16 h-16 rounded-xl object-cover border`; si no, placeholder con iniciales del producto.
- Mantener animación `flash` lime al escanear (ya implementada).
- Agregar `role="status" aria-live="polite"` al contenedor de resultado para accesibilidad en lectores de pantalla.

**Archivos afectados:**

- `app/components/precios/BuscadorPrecios.tsx`

---

### Paso 5: Rediseño visual — lista de múltiples resultados (búsqueda por nombre)

**Acciones:**

- Reemplazar tabla desktop/mobile actual por filas tipo "price row":
  - Cada fila: nombre + badges variante | precio grande alineado a la derecha | stock chip.
  - Hover: `hover:bg-lime-50/50`.
  - Precio en `text-lime-700 font-bold text-lg`.
- Header de lista: `"N resultados"` + query truncada.
- En mobile: mismo layout stacked (precio abajo del nombre, no tabla oculta).

**Archivos afectados:**

- `app/components/precios/BuscadorPrecios.tsx`

---

### Paso 6: Estados de error, vacío y carga

**Acciones:**

- **Error de servidor:** banner rojo suave arriba de resultados:
  `"No se pudo consultar el precio. {errorMsg}"` + botón reintentar.
- **Sin resultados:** mantener empty state pero mejorar copy:
  - Título: "Producto no encontrado"
  - Subtítulo: "Verificá el código o probá con otro nombre"
  - Mostrar el query escaneado en monospace.
- **Carga:** mantener `SkeletonCard` existente; agregar pulse en el área de input (ya parcialmente implementado con `isPending`).

**Archivos afectados:**

- `app/components/precios/BuscadorPrecios.tsx`

---

### Paso 7: Ajustar página contenedora

**Acciones:**

- En `app/app/(dashboard)/precios/page.tsx`:
  - Quitar `max-w-xl` del wrapper interno (dejar que el componente controle ancho).
  - Actualizar subtítulo: `"Escaneá un código de barras o buscá por nombre para consultar el precio al instante."`
  - Agregar contenedor `max-w-2xl` a nivel página o dentro del componente.
  - Considerar clase utilitaria en el layout para centrar verticalmente en viewports altos (`min-h-[calc(100vh-8rem)] flex flex-col justify-start`).

**Archivos afectados:**

- `app/app/(dashboard)/precios/page.tsx`

---

### Paso 8: Validación manual y regresión

**Acciones:**

1. `cd app && npm run dev`
2. Ir a `/precios` autenticado.
3. **Escaneo EAN-13** de variante existente → tarjeta grande con precio correcto (coincide con POS).
4. **Escaneo pack_codigo_barras** → precio del pack, badge "Pack xN".
5. **Búsqueda por nombre parcial** ("remera") → lista con variantes separadas.
6. **Producto sin stock** → precio visible, badge "Sin stock".
7. **Código inexistente** → empty state claro (no error de servidor).
8. **Desconectar red / forzar error** → banner de error visible.
9. Verificar que cajero (`vendedor`) accede a `/precios` desde sidebar.
10. Comparar precio mostrado vs detalle de producto en `/productos/[id]`.

**Archivos afectados:**

- Ninguno (solo pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/components/layout/Sidebar.tsx` | Link a `/precios` |
| `planes/2026-05-25-gestion-equipo-y-rol-cajero.md` | Especificación original del módulo |
| `app/lib/pos/queries.ts` | Fuente de verdad para búsqueda barcode/variantes |
| `app/components/layout/RubroProvider.tsx` | Labels dinámicos talla/color |

### Actualizaciones Necesarias para Consistencia

- No requiere cambios en `CLAUDE.md` (no hay nuevo comando ni estructura de workspace).
- Opcional: agregar "Lista de precios" a la sección de módulos en `contexto/proyectos.md` cuando se implemente.

### Impacto en Flujos de Trabajo Existentes

- **POS:** Sin cambios funcionales; solo se alinea la lógica de búsqueda.
- **Cajero:** Mejora la herramienta de consulta que ya tiene en sidebar.
- **Productos:** Sin cambios; la consulta es read-only.

---

## Lista de Validación

- [x] `buscarPrecios` ya no consulta columnas inexistentes en `productos`
- [x] Escaneo de código de barras de variante devuelve precio correcto (query sobre `variantes_producto`)
- [x] Escaneo de `pack_codigo_barras` devuelve precio del pack
- [x] Búsqueda por nombre lista variantes con talla/color
- [x] Productos con stock 0 muestran precio igualmente (sin filtro stock > 0)
- [x] Errores de servidor se muestran en UI (banner + reintentar)
- [x] Regex de código acepta alfanumérico como POS
- [x] Tarjeta única muestra precio grande (≥56px) legible a distancia
- [x] Flash visual al escanear funciona
- [x] `npm run build` compila sin errores TypeScript

---

## Criterios de Éxito

1. Un escaneo de cualquier código de barras válido del catálogo muestra el precio en menos de 1 segundo, coincidiendo con el precio que usaría el POS.
2. Una búsqueda por nombre parcial lista todas las variantes relevantes con precio, stock y variante visible.
3. La pantalla es visualmente clara para uso en mostrador: precio dominante, feedback de escaneo, estados de error/vacío explícitos.

---

## Notas

- El componente `BuscadorPrecios.tsx` ya tiene una base visual sólida (flash lime, skeleton, tarjeta grande). El trabajo principal es **backend + enriquecimiento de datos + pulido visual**, no reescribir desde cero.
- Si exportar helpers desde `lib/pos/queries.ts` genera acoplamiento molesto, la alternativa aceptable es copiar solo `mapVariante` + constantes al nuevo archivo — pero preferir DRY con export mínimo.
- Futuro opcional (fuera de scope): modo pantalla completa con `F11`, beep al escanear, o toggle de precio de costo para admin.

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se corrigió la server action `buscarPrecios` delegando en `lib/precios/queries.ts`, que busca sobre `variantes_producto` reutilizando mappers del POS. Se rediseñó `BuscadorPrecios` con tarjeta kiosco (precio 56–72px, imagen, badges de variante/pack, stock semántico), lista unificada de múltiples resultados, manejo de errores y regex alfanumérico. La página `/precios` usa layout más amplio (`max-w-2xl`).

### Desviaciones del Plan

- En escaneo de código unitario se retorna **solo la variante matcheada** (1 resultado → tarjeta grande), no variante + pack virtual, para mantener UX de consulta instantánea al escanear.

### Problemas Encontrados

- Ninguno. `npm run build` completó exitosamente.
