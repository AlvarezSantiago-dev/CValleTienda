# Plan: Remito — Sistema Completo

**Creado:** 2026-05-17
**Estado:** Borrador
**Pedido:** Completar el módulo de remitos con cobro, tipo, items propios y CRM

---

## Descripción General

### Qué Logra Este Plan

Extiende el módulo de remitos para soportar dos flujos reales: entregas de ventas ya cobradas y ventas a cuenta corriente (fiado). Agrega seguimiento de cobro, items propios (cuando no hay venta asociada), vínculo al CRM de clientes y UI para registrar pagos. El resultado es un módulo funcional y completo que cualquier tienda puede usar en su operación diaria.

### Por Qué Importa

Hoy los remitos son solo comprobantes de entrega sin ningún valor de gestión financiera. Una parte importante del negocio de ropa es el fiado y la cuenta corriente — sin esto el sistema no cubre la operativa real y los clientes van a seguir usando cuadernos o Excel para ese seguimiento.

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Estado |
|---|---|
| `supabase/migrations/20260509000004_fase3.sql` | Define tabla `remitos` — sin cobro ni tipo |
| `app/app/actions/remitos.ts` | `crearRemito`, `actualizarEstadoRemito` — sin cobro |
| `app/lib/remitos/queries.ts` | `listarRemitos`, `obtenerRemito`, `contarRemitosPendientes` |
| `app/app/(dashboard)/remitos/page.tsx` | Lista con estado delivery, sin estado cobro |
| `app/app/(dashboard)/remitos/[id]/page.tsx` | Detalle, items vienen solo de `detalles_venta` |
| `app/app/(dashboard)/remitos/nuevo/page.tsx` | Formulario sin tipo ni cliente |
| `app/components/remitos/NuevoRemitoForm.tsx` | Form sin tipo, sin cliente_id, sin items propios |
| `app/components/remitos/RemitoAcciones.tsx` | Solo botones de estado de entrega |
| `app/types/database.ts` | `EstadoRemito = 'borrador' | 'emitido' | 'entregado' | 'anulado'` |

### Brechas o Problemas que se Abordan

1. **Sin tipo de remito**: no se puede distinguir entrega pagada de fiado/cuenta corriente
2. **Sin cobro**: no hay forma de saber si se cobró o cuánto se debe
3. **Sin items propios**: si el remito no tiene `venta_id`, la tabla de ítems queda vacía (inutilizable como remito independiente)
4. **Sin cliente_id**: el destinatario es solo texto libre, no vincula al CRM
5. **Sin monto almacenado**: el total se calcula de `detalles_venta` — imposible para remitos sin venta

---

## Cambios Propuestos

### Resumen de Cambios

- **Migration SQL**: agregar columnas a `remitos` + nueva tabla `remito_items`
- **Types**: extender `Remito` con nuevos campos + `TipoRemito` + `EstadoCobro`
- **Actions**: agregar `registrarCobroRemito`, actualizar `crearRemito` con nuevos campos
- **Queries**: actualizar `listarRemitos` (mostrar estado cobro), `obtenerRemito` (incluir items propios), agregar `listarRemitosPendientesCobro`
- **NuevoRemitoForm**: agregar tipo, cliente, monto y sección de items cuando no hay venta
- **RemitoAcciones**: agregar botón "Registrar cobro"
- **Lista page**: columna de estado cobro
- **Detalle page**: panel de cobro

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `supabase/migrations/20260517000001_remito_cobro_items.sql` | Migración: columnas de cobro + tabla remito_items |
| `app/components/remitos/RegistrarCobroModal.tsx` | Modal para registrar cobro parcial o total |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/types/database.ts` | Agregar `TipoRemito`, `EstadoCobro`, extender `Remito` |
| `app/app/actions/remitos.ts` | Agregar `registrarCobroRemito`, actualizar `crearRemito` |
| `app/lib/remitos/queries.ts` | Actualizar queries para incluir nuevos campos e items propios |
| `app/components/remitos/NuevoRemitoForm.tsx` | Tipo, cliente, monto, items propios |
| `app/components/remitos/RemitoAcciones.tsx` | Botón registrar cobro |
| `app/app/(dashboard)/remitos/page.tsx` | Columna estado cobro, filtro |
| `app/app/(dashboard)/remitos/[id]/page.tsx` | Panel de cobro |
| `app/app/(dashboard)/remitos/nuevo/page.tsx` | Pasar clientes al form |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Dos tipos, no tres**: Solo `entrega` y `cuenta_corriente`. La consignación es un caso edge raro — se puede agregar después sin romper nada.
2. **`monto_total` almacenado**: Al crear el remito se guarda el total. Si tiene `venta_id`, se calcula automáticamente desde `detalles_venta`. Si no tiene venta, se toma del monto que ingresa el usuario. Esto desacopla el remito de la venta para queries de cobro.
3. **`remito_items` independiente**: Permite remitos sin venta asociada con sus propios ítems (texto libre, no FK a variantes). Para remitos con venta, los ítems se siguen leyendo de `detalles_venta` en el imprimible; `remito_items` queda vacío — sin duplicar datos.
4. **`estado_cobro` simple**: `no_aplica | pendiente | cobrado`. Sin `parcial` en esta versión — simplifica la UI enormemente y cubre el 90% de los casos. Si se cobró algo pero no todo, se registra como `pendiente` con `monto_cobrado` actualizado.
5. **Cobro reemplaza, no acumula**: `registrarCobroRemito` recibe el monto cobrado total (no incremental). Más simple y menos propenso a errores.
6. **cliente_id opcional siempre**: No rompe el flujo existente. Si no hay cliente en CRM, sigue usando texto libre en `destinatario`.

### Alternativas Consideradas

- **Tabla de pagos separada (historial)**: permite múltiples pagos parciales con fechas. Descartada por complejidad — agregar después si se pide.
- **`parcial` en estado_cobro**: Requiere lógica adicional y un cartel más complejo. Descartado por ahora.

---

## Tareas Paso a Paso

### Paso 1: Migración SQL

Crear `supabase/migrations/20260517000001_remito_cobro_items.sql` con:

```sql
-- Columnas nuevas en remitos
ALTER TABLE public.remitos
  ADD COLUMN IF NOT EXISTS tipo         text NOT NULL DEFAULT 'entrega'
    CHECK (tipo IN ('entrega', 'cuenta_corriente')),
  ADD COLUMN IF NOT EXISTS cliente_id   uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monto_total  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_cobrado numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_cobro text NOT NULL DEFAULT 'no_aplica'
    CHECK (estado_cobro IN ('no_aplica', 'pendiente', 'cobrado')),
  ADD COLUMN IF NOT EXISTS fecha_cobro  date;

CREATE INDEX IF NOT EXISTS remitos_cliente_id_idx    ON public.remitos(cliente_id);
CREATE INDEX IF NOT EXISTS remitos_estado_cobro_idx  ON public.remitos(estado_cobro);

-- Tabla de ítems propios del remito (para remitos sin venta_id)
CREATE TABLE IF NOT EXISTS public.remito_items (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_id       uuid         NOT NULL REFERENCES public.remitos(id) ON DELETE CASCADE,
  tienda_id       uuid         NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  nombre_producto text         NOT NULL,
  talla           text,
  color           text,
  cantidad        integer      NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario numeric(12,2) NOT NULL DEFAULT 0,
  total_linea     numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS remito_items_remito_id_idx ON public.remito_items(remito_id);

ALTER TABLE public.remito_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY remito_items_policy ON public.remito_items
  USING  (tienda_id = get_tienda_id())
  WITH CHECK (tienda_id = get_tienda_id());
```

**Archivos afectados:**
- `supabase/migrations/20260517000001_remito_cobro_items.sql` (nuevo)

---

### Paso 2: Actualizar tipos TypeScript

En `app/types/database.ts` agregar/modificar:

```typescript
export type TipoRemito    = 'entrega' | 'cuenta_corriente'
export type EstadoCobro   = 'no_aplica' | 'pendiente' | 'cobrado'
// Agregar a la interfaz Remito:
tipo:          TipoRemito
cliente_id:    string | null
monto_total:   number
monto_cobrado: number
estado_cobro:  EstadoCobro
fecha_cobro:   string | null
```

**Archivos afectados:**
- `app/types/database.ts`

---

### Paso 3: Actions — crearRemito y registrarCobroRemito

En `app/app/actions/remitos.ts`:

**Actualizar `CrearRemitoInput`:**
```typescript
export interface CrearRemitoInput {
  venta_id:          string | null
  cliente_id:        string | null      // nuevo
  tipo:              TipoRemito         // nuevo
  destinatario:      string
  direccion_entrega: string
  telefono_entrega:  string
  observaciones:     string
  fecha_entrega:     string
  monto_total:       number             // nuevo
  items:             RemitoItemInput[]  // nuevo — vacío si tiene venta_id
}
export interface RemitoItemInput {
  nombre_producto: string
  talla:           string | null
  color:           string | null
  cantidad:        number
  precio_unitario: number
}
```

**En `crearRemito`:** al insertar, calcular `estado_cobro` según tipo:
- `tipo === 'entrega'` → `estado_cobro = 'no_aplica'`, `requiere_cobro = false`
- `tipo === 'cuenta_corriente'` → `estado_cobro = 'pendiente'`

Si `venta_id` existe, calcular `monto_total` desde `detalles_venta` (ignorar el campo del form).
Si no tiene `venta_id`, insertar los `items` en `remito_items` tras crear el remito.

**Agregar `registrarCobroRemito`:**
```typescript
export async function registrarCobroRemito(
  id: string,
  montoCobrado: number,
  fechaCobro: string
): Promise<{ ok: boolean; error?: string }>
```
- Valida que `montoCobrado > 0`
- Determina `estado_cobro`:
  - `montoCobrado >= monto_total` → `'cobrado'`
  - `montoCobrado < monto_total` → `'pendiente'` (con monto_cobrado actualizado)
- Hace `UPDATE remitos SET monto_cobrado, estado_cobro, fecha_cobro WHERE id`
- `revalidatePath` en `/remitos/${id}` y `/remitos`

**Archivos afectados:**
- `app/app/actions/remitos.ts`

---

### Paso 4: Queries — actualizar listarRemitos y obtenerRemito

En `app/lib/remitos/queries.ts`:

**`RemitoListItem`:** agregar `tipo`, `estado_cobro`, `monto_total`, `monto_cobrado`, `cliente_nombre`

**`listarRemitos`:** en el SELECT agregar `tipo, estado_cobro, monto_total, monto_cobrado, cliente_id` + join a `clientes(nombre)` para mostrar nombre.

**`obtenerRemito`:** 
- JOIN a `clientes(nombre)` para `cliente_nombre`
- Agregar campos nuevos al return
- En la sección de items: leer primero `remito_items` del remito; si está vacío y hay `venta_id`, caer al fallback de `detalles_venta`

**Nueva función `listarRemitosPendientesCobro`:**
```typescript
export async function listarRemitosPendientesCobro(): Promise<{
  remitos: RemitoListItem[]
  totalDeuda: number
}>
```
Filtra `estado_cobro = 'pendiente'` y suma `monto_total - monto_cobrado`.

**Archivos afectados:**
- `app/lib/remitos/queries.ts`

---

### Paso 5: NuevoRemitoForm — tipo, cliente, monto, items

En `app/components/remitos/NuevoRemitoForm.tsx`:

**Props nuevas:**
```typescript
clientes: Array<{ id: string; nombre: string }>
```

**Nuevo estado:**
```typescript
const [tipo, setTipo] = useState<TipoRemito>('entrega')
const [clienteId, setClienteId] = useState('')
const [montoTotal, setMontoTotal] = useState(0)
const [items, setItems] = useState<RemitoItemInput[]>([])
```

**Sección nueva en el form (antes de Destinatario):**

1. **Tipo de remito**: dos botones tipo tab:
   - "Entrega" (ya cobrado) → `tipo = 'entrega'`
   - "Cuenta corriente" (a cobrar) → `tipo = 'cuenta_corriente'` + muestra campo monto

2. **Cliente CRM** (opcional): dropdown de clientes. Al seleccionar, auto-completa `destinatario` con el nombre del cliente.

3. **Items propios** (solo si `ventaId === ''`): tabla editable con "+" para agregar filas (nombre, talla, color, cantidad, precio). El total se calcula automáticamente.

4. **Monto total** (solo si `tipo === 'cuenta_corriente'` y no tiene `venta_id`): campo editable pre-calculado desde los items.

**Actualizar `handleSubmit`:** pasar `tipo`, `cliente_id`, `monto_total`, `items`.

**Archivos afectados:**
- `app/components/remitos/NuevoRemitoForm.tsx`

---

### Paso 6: Página nuevo — pasar clientes

En `app/app/(dashboard)/remitos/nuevo/page.tsx`:
- Importar `listarClientesActivos` (de lib/clientes/queries)
- Pasar al `NuevoRemitoForm`

**Archivos afectados:**
- `app/app/(dashboard)/remitos/nuevo/page.tsx`

---

### Paso 7: RegistrarCobroModal

Crear `app/components/remitos/RegistrarCobroModal.tsx`:

```tsx
interface Props {
  remitoId:     string
  montoTotal:   number
  montoCobrado: number
  onClose:      () => void
}
```

- Muestra "Saldo pendiente: $XXX"
- Campo de monto a cobrar (default: saldo pendiente completo)
- Campo fecha (default: hoy)
- Botón "Registrar cobro" → llama `registrarCobroRemito`
- Toast de éxito al confirmar (usando `sonner`)

**Archivos afectados:**
- `app/components/remitos/RegistrarCobroModal.tsx` (nuevo)

---

### Paso 8: RemitoAcciones — botón cobro

En `app/components/remitos/RemitoAcciones.tsx`:

- Agregar props: `tipo`, `estadoCobro`, `montoTotal`, `montoCobrado`
- Si `tipo === 'cuenta_corriente'` y `estadoCobro !== 'cobrado'`:
  - Mostrar badge del saldo pendiente: `"Debe: $X"`
  - Botón "Registrar cobro" → abre `RegistrarCobroModal`
- Mostrar `RegistrarCobroModal` con estado local `modalOpen`

**Archivos afectados:**
- `app/components/remitos/RemitoAcciones.tsx`

---

### Paso 9: Página detalle — panel de cobro

En `app/app/(dashboard)/remitos/[id]/page.tsx`:

- Pasar `tipo`, `estadoCobro`, `montoTotal`, `montoCobrado` a `RemitoAcciones`
- Agregar panel en pantalla (solo si `tipo === 'cuenta_corriente'`):

```
┌─────────────────────────────────────┐
│  Cobro                              │
│  Total:      $5.000                 │
│  Cobrado:    $2.000                 │
│  Pendiente:  $3.000   [PENDIENTE]   │
└─────────────────────────────────────┘
```

Con badge verde `COBRADO` o amarillo `PENDIENTE`.

**Archivos afectados:**
- `app/app/(dashboard)/remitos/[id]/page.tsx`

---

### Paso 10: Lista de remitos — columna cobro

En `app/app/(dashboard)/remitos/page.tsx`:

- En tabla desktop: agregar columna "Cobro" entre Estado y fecha
  - Si `tipo = 'entrega'`: `—` en gris
  - Si `tipo = 'cuenta_corriente'` y `estado_cobro = 'pendiente'`: badge amarillo `Pendiente $X`
  - Si `tipo = 'cuenta_corriente'` y `estado_cobro = 'cobrado'`: badge verde `Cobrado`

**Archivos afectados:**
- `app/app/(dashboard)/remitos/page.tsx`

---

### Paso 11: Verificar errores TypeScript

Correr `get_errors` en todos los archivos modificados y corregir lo que sea necesario.

**Archivos a verificar:**
- `app/types/database.ts`
- `app/app/actions/remitos.ts`
- `app/lib/remitos/queries.ts`
- `app/components/remitos/NuevoRemitoForm.tsx`
- `app/components/remitos/RemitoAcciones.tsx`
- `app/components/remitos/RegistrarCobroModal.tsx`
- `app/app/(dashboard)/remitos/page.tsx`
- `app/app/(dashboard)/remitos/[id]/page.tsx`
- `app/app/(dashboard)/remitos/nuevo/page.tsx`

---

## Resumen Visual del Flujo

```
Crear remito
  ├── tipo: "entrega"
  │     └── estado_cobro = no_aplica → sin gestión de cobro
  └── tipo: "cuenta corriente"
        ├── estado_cobro = pendiente
        ├── aparece badge "Debe $X" en lista y detalle
        └── botón "Registrar cobro" → modal → cobrado ✓

Items del remito
  ├── con venta_id → items de detalles_venta (igual que antes, lectura)
  └── sin venta_id → items propios en remito_items (nuevo)
```
