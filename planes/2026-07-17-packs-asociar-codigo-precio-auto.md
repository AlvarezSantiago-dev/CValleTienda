# Plan: Packs — asociar código desconocido + precio pack automático en POS

**Creado:** 2026-07-17
**Estado:** Implementado
**Pedido:** Mejorar alta/escaneo de productos (crear o asociar código) y aplicar precio pack automáticamente en /pos al alcanzar N unidades individuales, solo en rubros con packs.

---

## Descripción General

### Qué Logra Este Plan

Al escanear un código en `/productos` o `/pos`: si existe, se abre/agrega el producto; si no, se ofrece **crear uno nuevo** o **asociarlo a un producto ya existente**. En rubros con packs (despensa, librería, ferretería, farmacia, genérico), al vender en caja: si se escanean N unidades individuales que completan un pack configurado en la variante, el carrito aplica el **precio del pack** (con remanente a precio unitario).

### Por Qué Importa

En despensas/kioscos el mismo SKU tiene código de lata y código de six-pack. Hoy el cajero paga de más si escanea latas sueltas, o pierde tiempo creando productos duplicados cuando solo falta asociar un código. Este cambio reduce fricción operativa y evita errores de precio en el momento de la venta.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivos |
|------|----------|
| Escaneo catálogo | `app/components/productos/Buscador.tsx` — si no encuentra → `/productos/nuevo?codigo=` directo |
| Lookup catálogo | `app/app/actions/productos.ts` → `buscarProductoPorCodigoBarras` (solo `codigo_barras`, no pack) |
| Alta con código | `app/app/(dashboard)/productos/nuevo/page.tsx`, `ProductoForm.tsx` |
| Packs en variante | `VariantesEditor.tsx`, `VarianteFila.tsx` — `pack_habilitado`, `pack_cantidad`, `pack_precio`, `pack_codigo_barras` |
| POS escaneo | `POSContainer.tsx`, `BuscadorVariantes.tsx`, `useBarcodeScanner.ts` |
| Lookup POS | `app/lib/pos/queries.ts` — barcode + pack (pack exacto solo en rama EAN-13) |
| Cobro pack explícito | `ventas.ts` — expande pack a unidades físicas vía `pack_size` |
| Rubros con pack | `app/lib/rubro/config.ts` → `usarPack: true` en despensa, librería, ferretería, farmacia, genérico |
| Migraciones pack | `20260523000001_pack_por_variante.sql`, `20260523000002_pack_codigo_barras.sql` |
| Modales POS existentes | `PesoModal.tsx`, `CobroGuiadoModal.tsx`, `NuevoClienteModal.tsx` (patrón a seguir) |

**Comportamiento actual:**

1. `/productos`: código conocido → detalle; desconocido → alta inmediata (sin preguntar).
2. `/pos`: código conocido → carrito; desconocido → banner con solo “Crear producto →” (nueva pestaña).
3. Pack: precio pack solo si se escanea `pack_codigo_barras` o se elige la variante virtual `__pack`. Escanear 6 veces el código unitario = 6 × precio unitario.

### Brechas o Problemas que se Abordan

1. No hay flujo “asociar código a producto existente” en productos ni en POS.
2. No hay conversión automática unidad→pack al alcanzar `pack_cantidad` en el carrito.
3. Lookup de catálogo ignora `pack_codigo_barras` (escanear código de pack en `/productos` parece “no existe”).
4. Lookup POS de pack restringido a exactamente 13 dígitos.
5. `pack_codigo_barras` sin índice único por tienda → colisiones posibles.
6. Tipos `VarianteProducto` incompletos respecto a campos pack.
7. Carnicería mencionada por el usuario tiene `usarPack: false` hoy (ver preguntas abiertas).

---

## Cambios Propuestos

### Resumen de Cambios

- Modal/dialogo compartido **Código no encontrado**: Crear nuevo | Asociar a existente (buscar producto → elegir variante → rol del código: unidad o pack).
- Acción de servidor `asociarCodigoAVariante` atómica con validación de unicidad.
- Ampliar lookups: `codigo_barras` **y** `pack_codigo_barras` en productos y POS (cualquier longitud válida 4–32).
- En POS (solo rubros `usarPack`): al agregar/actualizar cantidad de una línea unitaria con pack habilitado, **recalcular** el carrito: `floor(qty / pack_cantidad)` packs al `pack_precio` + remanente a precio unitario.
- Migración: índice único parcial `(tienda_id, pack_codigo_barras)` donde no null; constraint de no solapamiento con `codigo_barras` de otra variante de la misma tienda (vía trigger o check en app).
- Actualizar tipos TS y banner POS.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/components/productos/CodigoDesconocidoModal.tsx` | Modal reutilizable: opciones Crear / Asociar; paso de búsqueda de producto; elección de variante y rol del código |
| `app/lib/pos/aplicarPrecioPack.ts` | Función pura: dado items del carrito + metadata pack de variantes, produce items con packs convertidos + remanentes |
| `supabase/migrations/20260717000001_pack_codigo_barras_unique.sql` | Índice único parcial + documentación; opcional trigger anti-colisión con `codigo_barras` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/productos/Buscador.tsx` | Ante no encontrado → abrir modal en lugar de navegar directo a `/nuevo` |
| `app/app/(dashboard)/productos/page.tsx` | Montar/controlar estado del modal de código desconocido |
| `app/components/pos/POSContainer.tsx` | Banner → modal Crear/Asociar; tras asociar, agregar al carrito; aplicar `aplicarPrecioPack` en `agregarVariante`/`actualizarItem` |
| `app/app/actions/productos.ts` | `buscarProductoPorCodigoBarras` también busca pack; nueva `asociarCodigoAVariante`; validaciones de colisión |
| `app/lib/pos/queries.ts` | Lookup exacto de `pack_codigo_barras` fuera de la rama solo-EAN-13; incluir metadata pack en resultados unitarios |
| `app/types/database.ts` | Declarar campos pack en `VarianteProducto` |
| `app/components/pos/BuscadorVariantes.tsx` | Asegurar que `onCodigoNoEncontrado` dispare el mismo flujo modal |
| `contexto/proyectos.md` (opcional) | Mencionar mejora packs si se documenta el módulo |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Modal compartido productos + POS**: Misma UX y misma server action; en POS “Crear” abre `/productos/nuevo?codigo=` en pestaña (como hoy) o, si se prefiere inline, el mismo enlace; “Asociar” queda in-app sin salir de caja.
2. **Asociación = asignar código a una variante existente**: El usuario elige producto → variante. Luego elige rol:
   - **Código de unidad** → escribe `codigo_barras` (falla si la variante ya tiene otro distinto, salvo confirmación de reemplazo).
   - **Código de pack** → escribe `pack_codigo_barras` y exige `pack_habilitado` (si no está habilitado, ofrecer habilitar pack con cantidad/precio mínimos o redirigir a editar producto).
3. **Conversión pack automática solo en POS y solo si `usarPack` del rubro**: No cambia precios en catálogo ni en listados; solo recalcula líneas del carrito en el momento de la venta.
4. **Algoritmo de conversión**: Por cada `variante_id` unitaria (no `es_pack`) con `pack_habilitado` y `pack_cantidad`/`pack_precio`:
   - `packs = floor(cantidad / pack_cantidad)`
   - `resto = cantidad % pack_cantidad`
   - Reemplazar la línea unitaria por: línea virtual `__pack` con `cantidad = packs` (si packs > 0) + línea unitaria con `cantidad = resto` (si resto > 0).
   - Al bajar cantidad (edición manual), recalcular en sentido inverso (misma función pura).
5. **Escaneo del código de pack** sigue agregando la variante `__pack` directamente (sin pasar por conversión).
6. **Unicidad de códigos**: Un código no puede existir como `codigo_barras` ni como `pack_codigo_barras` de otra variante de la misma tienda.
7. **Sin confirmación extra al convertir**: La conversión es silenciosa (el chip/última línea refleja “Pack ×N”); es el comportamiento esperado en caja rápida.
8. **Carnicería**: Mantener `usarPack: false` salvo que el usuario pida habilitarlo (pregunta abierta). El flujo Crear/Asociar aplica a **todos** los rubros; la conversión pack solo a `usarPack`.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Descuento implícito en una sola línea (6 u × precio_ajustado) | Confunde stock/tickets; el modelo actual ya usa línea `__pack` + `pack_size` en cobro |
| Tabla separada `codigos_barras` multi-código | Overkill; el modelo pack actual alcanza si se asocia bien unidad vs pack |
| Preguntar “¿aplicar precio pack?” cada vez | Frena la caja; el usuario pidió aplicación automática al alcanzar N |
| Habilitar packs en carnicería por defecto | Hoy el rubro está pensado a peso/kg; no forzar sin confirmación |

### Preguntas Abiertas (si las hay)

Resueltas antes de implementar:

1. **Carnicería**: packs habilitados.
2. **Reemplazo de código**: bloqueado; se sugiere asociar como pack.
3. **Tras “Crear” desde POS**: se mantiene la apertura en pestaña nueva.
4. **Múltiples escalas de pack** (ej. ×6 y ×12): hoy hay un solo pack por variante — ¿alcanza, o se necesita multi-escala en el futuro? (Plan asume **un pack por variante**, como el esquema actual.)

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración de integridad de `pack_codigo_barras`

Crear migración que:

- Agregue índice único parcial:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS variantes_tienda_pack_codigo_barras_uidx
    ON public.variantes_producto (tienda_id, pack_codigo_barras)
    WHERE pack_codigo_barras IS NOT NULL;
  ```
- (Recomendado) Función/trigger `BEFORE INSERT OR UPDATE` que rechace si el valor de `pack_codigo_barras` o `codigo_barras` choca con el otro campo en cualquier variante de la misma tienda.

**Acciones:**

- Escribir `supabase/migrations/20260717000001_pack_codigo_barras_unique.sql`
- Documentar comentarios en columnas

**Archivos afectados:**

- `supabase/migrations/20260717000001_pack_codigo_barras_unique.sql`

---

### Paso 2: Tipos y lookup unificado de códigos

**Acciones:**

- Actualizar `VarianteProducto` en `app/types/database.ts` con `pack_habilitado`, `pack_cantidad`, `pack_precio`, `pack_codigo_barras`.
- Extender `buscarProductoPorCodigoBarras`:
  1. Buscar por `codigo_barras`
  2. Si no hay, buscar por `pack_codigo_barras` (+ `pack_habilitado = true`)
  3. Devolver `producto_id` (y opcionalmente `variante_id`, `es_pack_codigo: boolean`)
- En `app/lib/pos/queries.ts`:
  - Para códigos exactos alfanuméricos (mismo regex de scanner 8–14 o validación 4–32), buscar `codigo_barras` y luego `pack_codigo_barras` **sin** exigir 13 dígitos.
  - Asegurar que el resultado unitario incluya siempre los campos pack (ya están en SELECT) para la conversión en cliente.

**Archivos afectados:**

- `app/types/database.ts`
- `app/app/actions/productos.ts`
- `app/lib/pos/queries.ts`

---

### Paso 3: Server action `asociarCodigoAVariante`

Firma sugerida:

```ts
asociarCodigoAVariante(input: {
  varianteId: string
  codigo: string
  rol: 'unidad' | 'pack'
  reemplazarSiExiste?: boolean  // según respuesta a pregunta abierta #2
}): Promise<ActionResult<{ producto_id: string; variante_id: string }>>
```

**Acciones:**

- Validar sesión/tienda, variante activa de la tienda.
- Normalizar código (trim); validar formato `^[0-9A-Za-z\-]{4,32}$`.
- Verificar unicidad global en la tienda contra ambos campos.
- Si `rol === 'unidad'`: update `codigo_barras`.
- Si `rol === 'pack'`: exigir `pack_habilitado` (o fallar con mensaje claro: “Activá el pack en el producto primero”); update `pack_codigo_barras`.
- Reusar `listarProductosBasico` / búsqueda existente para el selector del modal (ya hay búsquedas en productos y kit).

**Archivos afectados:**

- `app/app/actions/productos.ts`

---

### Paso 4: Modal `CodigoDesconocidoModal`

UI en dos pasos:

**Paso A — Decisión**

- Título: `Código {codigo} no encontrado`
- Botones:
  - **Crear producto nuevo** → callback `onCrear` (navega a `/productos/nuevo?codigo=`)
  - **Asociar a producto existente** → pasa a paso B
  - Cancelar

**Paso B — Asociar**

- Input de búsqueda (nombre / código) con debounce.
- Lista de productos → al elegir, mostrar variantes (talla/color/presentación + código actual).
- Radio: “Usar como código de unidad” | “Usar como código de pack” (este último solo si `usarPack` del rubro de la tienda).
- Confirmar → llama `asociarCodigoAVariante` → `onAsociado({ producto_id, variante_id })`.

Patrón visual: seguir `NuevoClienteModal` / `PesoModal` (overlay fijo, panel centrado, botones lime/amber del sistema).

**Acciones:**

- Crear componente client
- Props: `codigo`, `open`, `onClose`, `onCrear`, `onAsociado`, `usarPack: boolean`

**Archivos afectados:**

- `app/components/productos/CodigoDesconocidoModal.tsx` (nuevo)
- Posible helper de búsqueda liviana si no existe acción adecuada

---

### Paso 5: Integrar modal en `/productos`

**Acciones:**

- En `Buscador.tsx` (o page padre): si lookup null → set state `codigoPendiente` en lugar de `router.push('/productos/nuevo?...')`.
- `onCrear` → `router.push(/productos/nuevo?codigo=...)`.
- `onAsociado` → `router.push(/productos/{producto_id})` (y toast opcional “Código asociado”).
- Si el código **sí** existe (unidad o pack) → ir al producto como hoy.

**Archivos afectados:**

- `app/components/productos/Buscador.tsx`
- `app/app/(dashboard)/productos/page.tsx` (si el estado vive en el page)

---

### Paso 6: Integrar modal en `/pos`

**Acciones:**

- Reemplazar el banner “solo Crear” por el mismo modal (o banner con dos CTAs que abren el modal en el paso correcto).
- `onCrear`: mantener `target=_blank` a `/productos/nuevo?codigo=` (hasta resolver pregunta abierta #3).
- `onAsociado`: llamar `buscarVariantesAction(codigo)` de nuevo y `agregarVariante` al carrito; limpiar `codigoNoEncontrado`.
- Pasar `usarPack` desde config de tienda/rubro ya disponible en POS.

**Archivos afectados:**

- `app/components/pos/POSContainer.tsx`
- `app/components/pos/BuscadorVariantes.tsx` (si hace falta)

---

### Paso 7: Motor de precio pack automático en carrito

Crear `app/lib/pos/aplicarPrecioPack.ts`:

```ts
type CartItemLike = {
  id: string
  variante_id: string
  cantidad: number
  precio_unitario: number
  es_pack?: boolean
  pack_cantidad?: number | null
  // ...resto
}

type PackMeta = {
  pack_habilitado: boolean
  pack_cantidad: number
  pack_precio: number
  // datos para construir línea pack (nombre, stock_efectivo packs, etc.)
}

function aplicarPrecioPack(items: CartItemLike[], metaByVarianteId: Map<string, PackMeta>): CartItemLike[]
```

**Reglas:**

1. Solo actuar si hay meta con `pack_habilitado` y `pack_cantidad > 1`.
2. Agrupar por `variante_id` las líneas unitarias (`!es_pack`).
3. Convertir a packs + resto como en Decisiones.
4. Preservar líneas que ya son pack por escaneo de código pack (sumar cantidades pack si mismo id `__pack`).
5. Stock: línea pack usa `floor(stock / pack_cantidad)`; línea unitaria usa stock físico (el cobro ya convierte packs a físicos).

**Integración en `POSContainer`:**

- Extender `CartItem` / `VarianteResultado` para guardar en memoria `pack_habilitado`, `pack_precio`, `pack_cantidad` al agregar unitario.
- Tras cada `agregarVariante` y `actualizarItem`, si `usarPack`, correr `setItems(prev => aplicarPrecioPack(...))`.
- Chip “último agregado”: preferir mostrar la línea pack si acaba de completarse un pack.

**No cambiar** el payload de `crearVenta` más allá de lo que ya soporta `es_pack` + `pack_size` — las líneas convertidas deben salir como packs explícitos.

**Archivos afectados:**

- `app/lib/pos/aplicarPrecioPack.ts` (nuevo)
- `app/components/pos/POSContainer.tsx`
- Tests unitarios opcionales en `app/lib/pos/aplicarPrecioPack.test.ts` si el repo ya usa Vitest/Jest para lib

---

### Paso 8: Validación manual y edge cases

**Acciones:**

- Probar matriz de casos (ver Lista de Validación).
- Verificar que bajar cantidad de 7→5 reconvierte a 0 packs + 5 unidades.
- Verificar que escanear código pack + unidades no doble-cuenta incorrectamente.
- Verificar colisión de códigos (mensaje claro).

**Archivos afectados:**

- Ninguno nuevo obligatorio

---

### Paso 9: Documentación de workspace

**Acciones:**

- Actualizar estado de este plan a Implementado al cerrar `/implementar`.
- Si el cambio es visible para el producto, una línea en `contexto/proyectos.md` bajo módulos (Productos/POS packs).
- `CLAUDE.md` raíz: **no** requiere cambio estructural de workspace (solo app).

**Archivos afectados:**

- `planes/2026-07-17-packs-asociar-codigo-precio-auto.md`
- `contexto/proyectos.md` (opcional)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/actions/ventas.ts` — cobro con `pack_size` (debe seguir funcionando con líneas auto-convertidas)
- `app/lib/precios/queries.ts` — consulta precios/pack (sin cambio funcional requerido)
- `app/components/productos/VariantesEditor.tsx` — UI donde se configura el pack (prerrequisito de datos)
- `app/lib/rubro/config.ts` — gate `usarPack`

### Actualizaciones Necesarias para Consistencia

- Tipos TS alineados con DB
- Lookups productos/POS/precios coherentes respecto a `pack_codigo_barras`
- Mensajes de error de unicidad amigables (ya hay patrón en productos.ts para `codigo_barras`)

### Impacto en Flujos de Trabajo Existentes

- Cajeros acostumbrados a “solo crear” verán un paso extra (modal) — necesario y explícito.
- Precios en ticket pueden bajar al completar packs (correcto comercialmente); entrenar que el pack debe estar configurado en la variante.
- Escaneo de código pack sigue igual.
- Rubros sin pack: solo ven Crear/Asociar como unidad; sin conversión automática.

---

## Lista de Validación

Cómo verificar que la implementación está completa y correcta:

- [ ] En `/productos`, escanear código existente (unidad) → abre ese producto
- [ ] En `/productos`, escanear `pack_codigo_barras` existente → abre ese producto
- [ ] En `/productos`, código nuevo → modal Crear | Asociar (no salta directo a nuevo)
- [ ] Asociar como unidad a variante sin código → persiste y reabre producto
- [ ] Asociar como pack a variante con pack habilitado → persiste `pack_codigo_barras`
- [ ] Asociar código duplicado → error claro, no corrompe datos
- [ ] En `/pos`, código desconocido → mismas opciones Crear | Asociar
- [ ] Tras asociar desde POS → producto se agrega al carrito
- [x] Variante Quilmes: unidad $1000, pack×6 $5000; escanear 6 veces código unidad → total $5000 (1 pack)
- [x] Escanear 7 veces → 1 pack ($5000) + 1 unidad ($1000) = $6000
- [ ] Escanear 1 vez código pack → 1 pack $5000
- [x] Bajar cantidad / eliminar líneas → recalcula sin precios fantasma
- [ ] Rubro ropa (`usarPack: false`): escanear 6 iguales no convierte a pack
- [ ] Cobrar venta con packs auto-convertidos: stock valida y descuenta unidades físicas agregadas
- [ ] Migración aplica sin error; no se pueden duplicar `pack_codigo_barras` en la tienda
- [x] Tipos TS sin casts manuales innecesarios para packs

---

## Criterios de Éxito

La implementación está completa cuando:

1. Código desconocido en productos y POS ofrece **crear o asociar**, y asociar funciona de punta a punta.
2. En rubros con pack, escanear N unidades individuales que completan `pack_cantidad` aplica **precio pack** en el carrito (con remanente unitario).
3. Lookups reconocen tanto código de unidad como de pack; la DB impide códigos pack duplicados/colisionados.
4. El cobro y descuento de stock siguen el camino ya probado de packs explícitos (`pack_size`).

---

## Notas

- Ejemplo canónico: Cerveza Quilmes — `codigo_barras` = lata, `pack_codigo_barras` = six-pack, `pack_cantidad = 6`, `pack_precio` < 6×unitario. El cajero puede escanear solo latas y el sistema “cierra” packs solos.
- No reintroducir el modelo bundle legacy (`producto_componentes`); packs por variante son la fuente de verdad.
- Si más adelante se piden multi-escalas (×6 y ×12), habría que normalizar a tabla `variante_packs`; fuera de alcance de este plan.

---

## Notas de Implementación

**Implementado:** 2026-07-17

### Resumen

- Se agregó el flujo Crear/Asociar para códigos desconocidos en Productos y POS.
- Se unificó la búsqueda exacta de códigos de unidad y pack.
- Se implementó la conversión automática de unidades a packs con remanente.
- Se agregó integridad de códigos en PostgreSQL y validación agregada de stock físico.
- Se habilitaron packs para carnicerías.

### Desviaciones del Plan

- El estado del modal de Productos quedó encapsulado en `Buscador.tsx`; no fue necesario modificar la página.
- Los packs automáticos usan el id de carrito `__pack_auto` para poder convivir con un pack escaneado explícitamente.
- Se reforzó `ventas.ts` para validar juntos pack y remanente de una misma variante.
- Follow-up del mapeo: el chip de último agregado ahora resuelve el id tras conversión y al bajar un pack automático de 1 vuelve a N-1 unidades.
- Se agregó `app/lib/pos/aplicarPrecioPack.test.ts` (`node --experimental-strip-types --test`).

### Problemas Encontrados

- El lint completo conserva advertencias preexistentes, sin errores nuevos.
- La migración quedó creada pero debe aplicarse al proyecto Supabase del entorno correspondiente.
- La validación UI con scanner físico queda pendiente en un entorno conectado a Supabase.