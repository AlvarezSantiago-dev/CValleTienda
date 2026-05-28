# Plan: Sugerencia de precio de venta por margen configurable

**Creado:** 2026-05-27
**Estado:** Implementado
**Pedido:** Desde configuración poder definir un porcentaje de markup/margen default. Al cargar precio de compra en un producto, el sistema sugiere automáticamente el precio de venta.

---

## Descripción General

Cuando un comerciante carga un producto nuevo, el flujo actual requiere que calcule mentalmente el precio de venta. Esta feature automatiza ese cálculo: el sistema recuerda el porcentaje de ganancia habitual del negocio y lo aplica automáticamente al ingresar el precio de compra, reduciendo fricción y errores.

**Flujo target:**
1. El dueño entra a Configuración → define su margen habitual (ej: 80%)
2. Al crear/editar un producto, ingresa precio de compra ($1.000)
3. El sistema muestra instantáneamente el precio sugerido ($1.800) y lo pre-llena
4. El usuario puede aceptarlo o ajustarlo manualmente
5. En todo momento se muestra el margen real calculado sobre el precio actual

---

## Decisiones Técnicas y de UX

### Tipo de cálculo: Markup vs Margen

Dos conceptos distintos que los comerciantes suelen confundir:

| Tipo | Fórmula | Ejemplo ($1.000 costo, 80%) |
|------|---------|---------------------------|
| **Markup** (% sobre costo) | `venta = compra × (1 + %/100)` | $1.800 |
| **Margen** (% del precio de venta) | `venta = compra / (1 - %/100)` | $5.000 |

**Decisión:** implementar **markup** como opción única en V1 — es lo más intuitivo y usado en comercios minoristas argentinos ("le meto el 80% de ganancia al costo"). Se puede agregar el tipo configurable en V2 si hay demanda.

### Lógica de auto-sugerencia en el formulario

- **Auto-aplicar al escribir** precio de compra: si `precioVenta === 0` O `precioVentaFueManualmenteEditado === false`, recalcular en tiempo real
- **Indicador de margen real**: siempre visible bajo el campo precio_venta — muestra el % de ganancia que representa el precio actual respecto al costo
- **Botón de recalcular** (ícono de sync): si el usuario editó el precio manualmente, aparece este botón para volver a aplicar el % de la config sin tener que borrarlo
- **Tooltip informativo**: muestra cómo se calculó el precio sugerido

### Campo en configuración

Nueva sección en `Configuración > Tienda` llamada **"Precios y márgenes"**:
- Input numérico: `Margen de ganancia por defecto (%)`
- Descripción aclarativa: "Si cargás un precio de compra en un producto, el sistema calculará el precio de venta sumando este porcentaje sobre el costo. Podés ajustarlo en cada producto."
- Valor 0 = feature desactivada (no sugiere nada)

---

## Archivos a Modificar

1. `supabase/migrations/` — nueva migración SQL
2. `app/lib/configuracion/queries.ts` — agregar campo `margen_ganancia_default` a `ConfiguracionTienda`
3. `app/app/actions/configuracion.ts` — agregar campo a `ConfigTiendaInput` + update query
4. `app/components/configuracion/DatosTiendaForm.tsx` — nueva sección en el form
5. `app/components/productos/ProductoForm.tsx` — lógica de sugerencia + indicador real-time
6. `app/app/(dashboard)/productos/nuevo/page.tsx` — pasar `margenDefault` al form
7. `app/app/(dashboard)/productos/[id]/page.tsx` — pasar `margenDefault` al form en edición

---

## Tareas

### TAREA 1 — Migración Supabase

Crear archivo `supabase/migrations/20260527000001_margen_ganancia_default.sql`:

```sql
-- Agrega campo de margen de ganancia default a configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS margen_ganancia_default numeric(5,2) NOT NULL DEFAULT 0
    CHECK (margen_ganancia_default >= 0 AND margen_ganancia_default <= 9999);

COMMENT ON COLUMN configuracion_tienda.margen_ganancia_default IS
  'Porcentaje de markup sobre precio de compra para sugerencia automática de precio de venta. 0 = desactivado.';
```

> **Nota:** Usar `numeric(5,2)` permite valores hasta 9999.99% (útil para rubros con márgenes altos como librería/farmacia) con 2 decimales de precisión.

---

### TAREA 2 — Actualizar interfaz `ConfiguracionTienda`

**Archivo:** `app/lib/configuracion/queries.ts`

Agregar campo al final de la interfaz `ConfiguracionTienda`:

```typescript
/** Porcentaje de markup default para sugerencia de precio de venta. 0 = desactivado. */
margen_ganancia_default: number
```

---

### TAREA 3 — Actualizar action `actualizarConfiguracionTienda`

**Archivo:** `app/app/actions/configuracion.ts`

**3a.** Agregar campo a `ConfigTiendaInput`:
```typescript
/** Porcentaje de markup default. 0 = desactivado. */
margen_ganancia_default: number
```

**3b.** Agregar validación antes del update:
```typescript
if (input.margen_ganancia_default < 0 || input.margen_ganancia_default > 9999) {
  return { ok: false, error: 'El margen debe estar entre 0 y 9999%' }
}
```

**3c.** Agregar al objeto `update(...)`:
```typescript
margen_ganancia_default: input.margen_ganancia_default,
```

---

### TAREA 4 — Actualizar `DatosTiendaForm.tsx`

**Archivo:** `app/components/configuracion/DatosTiendaForm.tsx`

**4a.** Agregar `margen_ganancia_default` al estado inicial:
```typescript
margen_ganancia_default: initial?.margen_ganancia_default ?? 0,
```

**4b.** Agregar nueva sección de UI **después** de la sección existente de impresión/ticket, antes del botón de guardar:

```tsx
{/* Sección: Precios y márgenes */}
<div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
  <div>
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400 mb-1">
      Precios y márgenes
    </h3>
    <p className="text-[12px] text-gray-400">
      Al cargar el precio de compra de un producto, el sistema calculará y sugerirá automáticamente el precio de venta.
    </p>
  </div>
  <div className="max-w-xs">
    <Input
      label="Margen de ganancia por defecto (%)"
      type="number"
      step="0.01"
      min="0"
      max="9999"
      value={form.margen_ganancia_default}
      onChange={(e) => update('margen_ganancia_default', Number(e.target.value) || 0)}
      placeholder="Ej: 80 (80% sobre el costo)"
    />
    {form.margen_ganancia_default > 0 && (
      <p className="mt-1 text-[11px] text-indigo-600">
        Compra $1.000 → sugiere ${Math.round(1000 * (1 + form.margen_ganancia_default / 100)).toLocaleString('es-AR')} de venta
      </p>
    )}
    {form.margen_ganancia_default === 0 && (
      <p className="mt-1 text-[11px] text-gray-400">
        Con 0% la sugerencia automática está desactivada.
      </p>
    )}
  </div>
</div>
```

---

### TAREA 5 — Lógica de sugerencia en `ProductoForm.tsx`

**Archivo:** `app/components/productos/ProductoForm.tsx`

Esta es la tarea más sustancial. Se necesitan varios cambios coordinados.

**5a.** Agregar prop `margenDefault`:
```typescript
interface ProductoFormProps {
  // ... props existentes ...
  /** Porcentaje de markup de la configuración de tienda. 0 = sin sugerencia. */
  margenDefault?: number
}
```

Y destructurar en el componente:
```typescript
export function ProductoForm({
  // ... props existentes ...
  margenDefault = 0,
}: ProductoFormProps) {
```

**5b.** Agregar estado de control para saber si el precio de venta fue editado manualmente:
```typescript
// false = puede auto-sugerirse; true = el usuario lo modificó a mano
const [precioVentaManual, setPrecioVentaManual] = useState<boolean>(
  modo === 'editar' ? true : (initial?.precio_venta ?? 0) > 0
)
```

**5c.** Agregar función helper de cálculo:
```typescript
function calcularPrecioSugerido(compra: number): number {
  if (!margenDefault || margenDefault <= 0 || !compra) return 0
  return Math.round(compra * (1 + margenDefault / 100))
}
```

**5d.** Modificar el handler del campo `precioCompra`:

Reemplazar el onChange del Input precio compra por:
```typescript
onChange={(e) => {
  const compra = Number(e.target.value)
  setPrecioCompra(compra)
  // Si el precio de venta no fue editado manualmente, auto-sugerir
  if (!precioVentaManual && margenDefault > 0) {
    setPrecioVenta(calcularPrecioSugerido(compra))
  }
}}
```

**5e.** Modificar el Input de precio venta para:
- Detectar edición manual y marcar el estado
- Mostrar indicador de margen real
- Mostrar botón de recalcular si fue editado y hay margen configurado

```tsx
<div className="space-y-1">
  <div className="relative">
    <Input
      label="Precio venta *"
      type="number"
      step="0.01"
      min="0"
      value={precioVenta}
      onChange={(e) => {
        setPrecioVentaManual(true)
        setPrecioVenta(Number(e.target.value))
      }}
      required
    />
    {/* Botón recalcular: solo si fue editado manualmente y hay margen y hay costo */}
    {precioVentaManual && margenDefault > 0 && precioCompra > 0 && (
      <button
        type="button"
        title={`Recalcular con ${margenDefault}% de markup`}
        onClick={() => {
          setPrecioVenta(calcularPrecioSugerido(precioCompra))
          setPrecioVentaManual(false)
        }}
        className="absolute right-2 top-[30px] text-indigo-500 hover:text-indigo-700 transition-colors"
      >
        {/* ícono de sync/refresh — usar SVG inline */}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
      </button>
    )}
  </div>
  {/* Indicador de margen real — siempre visible si hay precio compra > 0 */}
  {precioCompra > 0 && precioVenta > 0 && (
    <p className="text-[11px] text-gray-400">
      {(() => {
        const margenReal = ((precioVenta - precioCompra) / precioCompra) * 100
        const ganancia = precioVenta - precioCompra
        return margenReal >= 0
          ? `Ganancia: +${margenReal.toFixed(1)}% sobre el costo ($${ganancia.toLocaleString('es-AR')} por unidad)`
          : `⚠️ Precio de venta por debajo del costo`
      })()}
    </p>
  )}
  {/* Badge de sugerencia automática activa */}
  {!precioVentaManual && margenDefault > 0 && precioCompra > 0 && (
    <p className="text-[11px] text-indigo-500">
      ✦ Precio sugerido (markup {margenDefault}%)
    </p>
  )}
</div>
```

> **Nota sobre posicionamiento del botón:** el Input component existente puede o no aceptar un `className` para `relative` positioning. Si no acepta children/overlay, envolver el Input en un `<div className="relative">` y posicionar el botón absolutamente. Revisar la implementación real del componente `Input`.

---

### TAREA 6 — Pasar `margenDefault` desde página `nuevo/page.tsx`

**Archivo:** `app/app/(dashboard)/productos/nuevo/page.tsx`

**6a.** Importar query:
```typescript
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
```

**6b.** Agregar al `Promise.all` existente:
```typescript
const [sp, categorias, tallas, colores, config] = await Promise.all([
  searchParams,
  listarCategorias(true),
  listarTallas(true),
  listarColores(true),
  obtenerConfiguracionTienda(),
])
```

**6c.** Pasar al componente `ProductoForm`:
```tsx
<ProductoForm
  modo="crear"
  categorias={categorias}
  tallas={tallas}
  colores={colores}
  initialCodigoBarras={codigoPreLlenado}
  margenDefault={config?.margen_ganancia_default ?? 0}
/>
```

---

### TAREA 7 — Pasar `margenDefault` desde página `[id]/page.tsx`

**Archivo:** `app/app/(dashboard)/productos/[id]/page.tsx`

Mismo patrón que la tarea 6: agregar `obtenerConfiguracionTienda()` al Promise.all y pasar `margenDefault` al `ProductoForm` en modo editar.

---

## Consideraciones Adicionales

### Para el VoiceWizard (`VoiceProvider.tsx`)
El wizard de voz ya captura `precioCompra` y `precioVenta` como pasos separados. Si en el futuro se quiere integrar la sugerencia automática en el voice wizard, la lógica está centralizada en `calcularPrecioSugerido()` y se puede importar o replicar fácilmente. **No es parte de este plan** para no complicar el scope.

### Seguridad
- Validación en server action: margen entre 0 y 9999
- El margen default es solo una sugerencia — el precio final lo decide el usuario
- No hay cambio en RLS ni en permisos

### Edge cases
- Si `margenDefault = 0` → feature completamente silenciosa, no aparece ningún UI adicional
- Si `precioCompra = 0` → no se sugiere nada (evita mostrar $0 como sugerencia)
- En modo editar: `precioVentaManual` inicia en `true` para no sobreescribir precios existentes; solo aparece el botón de recalcular

---

## Resumen de Archivos

| Archivo | Tipo de cambio |
|---------|---------------|
| `supabase/migrations/20260527000001_margen_ganancia_default.sql` | NUEVO |
| `app/lib/configuracion/queries.ts` | Agregar campo a interface |
| `app/app/actions/configuracion.ts` | Agregar campo + validación + update |
| `app/components/configuracion/DatosTiendaForm.tsx` | Nueva sección UI |
| `app/components/productos/ProductoForm.tsx` | Lógica sugerencia + UX indicador |
| `app/app/(dashboard)/productos/nuevo/page.tsx` | Pasar margenDefault |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Pasar margenDefault |

**Estimación:** 7 archivos, cambios incrementales y no destructivos.
