# Plan: POS — Flujo Barcode-First y Manejo de Peso

**Fecha:** 2026-05-16  
**Pedido:** Mejorar el POS con flujo barcode-first completo y manejar correctamente los productos vendidos por peso (kg/gramo/metro/litro), considerando todos los rubros.

---

## Diagnóstico del estado actual

### ¿Qué funciona bien?
- `useBarcodeScanner` detecta escaneos globales (foco fuera del input)
- `BuscadorVariantes` con `RE_CODIGO` auto-agrega si hay **1 único resultado** exacto
- `Carrito` ya tiene `esDecimal(unidad)` y acepta cantidades con decimales
- `agregarVariante` ya guarda `unidad_de_medida` en cada `CartItem`

### Problemas concretos a resolver

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Código escaneado no encontrado → solo muestra "Sin resultados" sin opción de crear el producto | Bloquea al cajero |
| 2 | Productos con `unidad_de_medida: 'kg'/'gramo'/'litro'/etc.` siempre se agregan con `cantidad: 1` | Incorrecto para carnicería, verdulería, corralón |
| 3 | Balanzas imprimen EAN-13 con precio/peso **embebido en el código** → no hay lookup ni parsing | Automatable pero requiere configuración |
| 4 | No hay configuración de balanza por tenant | Necesario para el paso 3 |

---

## Rubros y su relación con el peso

| Rubro | Unidades que aplican | ¿Usa balanza? | Tipo |
|-------|---------------------|---------------|------|
| `carniceria` | `kg`, `gramo` | Sí (común) | Peso manual o balanza |
| `verduleria` | `kg`, `gramo`, `unidad` | Sí (común) | Peso manual o balanza |
| `corralon` | `kg`, `m3`, `metro` | Raro | Peso/medida manual |
| `despensa` | `kg`, `gramo` (granel) | A veces | Peso manual |
| `generico` | `kg`, `gramo`, `litro`, `metro`, `m2`, `m3` | Posible | Depende |
| `ropa`, `ferreteria`, `libreria`, `farmacia` | `unidad`, `pack`, `caja` | No | Solo cantidades enteras |

**Regla:** mostrar el diálogo de cantidad cuando `unidad_de_medida` está en `UNIDADES_MEDIBLES = ['kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada']`.

---

## Cómo funciona una balanza en Argentina (contexto crítico)

Las balanzas electrónicas en carnicerías y verdulerías imprimen etiquetas con códigos **EAN-13** de uso interno. Hay dos formatos estándar:

```
EAN-13: 2 CCCCC VVVVV D
         │ │     │     └── dígito verificador
         │ │     └──────── 5 dígitos de valor
         │ └────────────── 5 dígitos de código interno del producto (PLU)
         └──────────────── prefijo "2" (GS1: uso interno)
```

**Formato precio-embebido:** `VVVVV / 100` = precio en ARS  
- Ejemplo: `2012501250X` → PLU `01250`, precio `$12.50`  
- La variante se agrega con `cantidad: 1` y `precio_unitario: 12.50`

**Formato peso-embebido:** `VVVVV / 1000` = peso en kg  
- Ejemplo: `2012500135X` → PLU `01250`, peso `0.135 kg`  
- La variante se agrega con `cantidad: 0.135` y el precio queda del producto

**En el sistema:** el comerciante registra el producto con `codigo_barras` que comienza con `2CCCCC` (solo 6 dígitos) ó con `codigo_base = 'CCCCC'` (5 dígitos). El lookup es por esos primeros caracteres.

---

## Solución en 4 pasos

### Paso 1 — "Código no encontrado" en el POS

**Objetivo:** Cuando un código escaneado no tiene ninguna variante en la BD, el cajero ve un banner visible con la opción de crear el producto, en lugar del silencioso "Sin resultados".

**Archivos a modificar:**

**`app/components/pos/BuscadorVariantes.tsx`**
- Agregar prop `onCodigoNoEncontrado?: (codigo: string) => void`
- En el efecto, cuando `isCodigo && data.length === 0` → llamar `onCodigoNoEncontrado?.(q)` y limpiar el query

**`app/components/pos/POSContainer.tsx`**
- Agregar state `codigoNoEncontrado: string | null`  
- Callback `handleCodigoNoEncontrado(codigo)` → setea el state
- En `useBarcodeScanner.onScan`: cuando `res.data.length === 0` → también llamar `handleCodigoNoEncontrado`
- En el JSX, mostrar un banner dismissable debajo del buscador cuando `codigoNoEncontrado !== null`:

```tsx
// Banner a agregar en POSContainer JSX
{codigoNoEncontrado && (
  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
    <span className="text-amber-800">
      Código <code className="font-mono font-semibold">{codigoNoEncontrado}</code> no encontrado en el sistema.
    </span>
    <div className="flex items-center gap-3 shrink-0">
      <a
        href={`/productos/nuevo?codigo=${encodeURIComponent(codigoNoEncontrado)}`}
        target="_blank"
        rel="noopener"
        className="text-indigo-600 hover:underline font-medium"
      >
        Crear producto →
      </a>
      <button
        type="button"
        onClick={() => setCodigoNoEncontrado(null)}
        className="text-amber-500 hover:text-amber-700 text-lg leading-none"
      >×</button>
    </div>
  </div>
)}
```

---

### Paso 2 — Modal de peso/cantidad para unidades medibles

**Objetivo:** Cuando se agrega al carrito una variante con unidad medible (kg, gramo, litro, etc.), mostrar un diálogo rápido que pide la cantidad antes de agregarlo. El input tiene foco automático para que el cajero escriba y presione Enter sin usar el mouse.

**Archivo nuevo:** `app/components/pos/PesoModal.tsx`

```tsx
// Interfaz
interface PesoModalProps {
  variante: VarianteResultado
  onConfirm: (cantidad: number) => void
  onCancel: () => void
}
```

- Overlay semi-transparente con card centrado
- Muestra: nombre del producto, unidad de medida, precio por unidad
- Input numérico decimal (step=0.001) con autofocus
- Muestra el subtotal calculado en tiempo real: `cantidad × precio`
- Confirma con Enter o botón "Agregar"
- Cancela con Escape o ×

**`app/components/pos/POSContainer.tsx`**
- Agregar constante `UNIDADES_MEDIBLES = new Set(['kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada'])`
- Agregar state `pesoModalPendiente: VarianteResultado | null`
- Modificar `agregarVariante(v)`:
  - Si `UNIDADES_MEDIBLES.has(v.unidad_de_medida)` → `setPesoModalPendiente(v)` (no agregar aún)
  - Si no → comportamiento actual (agregar con `cantidad: 1`)
- Nueva función `confirmarPeso(cantidad: number)`:
  - Agrega `pesoModalPendiente` al carrito con la cantidad dada
  - `setPesoModalPendiente(null)`
  - Devuelve foco al buscador
- Renderizar `<PesoModal>` cuando `pesoModalPendiente !== null`

**Nota importante:** Si el producto ya estaba en el carrito, **sumar** la nueva cantidad a la existente (no reemplazar).

---

### Paso 3 — Lookup de códigos de balanza

**Objetivo:** Si el código escaneado no se encuentra en la BD Y parece ser un código de balanza (EAN-13, 13 dígitos, comienza con `2`), intentar un segundo lookup extrayendo el código interno de producto (dígitos 2-6) y el valor embebido (precio o peso).

**Archivo nuevo:** `app/lib/pos/balanza.ts`

```typescript
/** Detecta si el string es un EAN-13 con prefijo de uso interno (2x). */
export function esCodigoBalanza(barcode: string): boolean

/** 
 * Parsea un código de balanza.
 * @returns null si no es un código de balanza válido
 */
export interface BalanzaParseado {
  codigoInterno: string  // dígitos 2-6 (PLU del producto)
  valor: number          // VVVVV como número entero
  precio: number         // valor / 100 (para formato precio)
  peso: number           // valor / 1000 (para formato peso, en kg)
}
export function parseBalanza(barcode: string): BalanzaParseado | null
```

**`app/app/actions/ventas.ts`** — nueva action:

```typescript
export async function buscarVarianteBalanzaAction(
  codigoInterno: string
): Promise<ActionResult<VarianteResultado | null>>
```

- Busca en `variantes_producto` donde `codigo_barras LIKE '2{codigoInterno}%'`  
- O busca en `productos` donde `codigo_base = codigoInterno`
- Devuelve la primera variante activa encontrada (o null)

**`app/components/pos/POSContainer.tsx`** — modificar `useBarcodeScanner.onScan`:

```typescript
onScan: async (codigo) => {
  const res = await buscarVariantesAction(codigo)
  if (res.ok && res.data && res.data.length === 1) {
    agregarVariante(res.data[0])
    return
  }
  if (res.ok && res.data && res.data.length > 1) {
    buscadorRef.current?.setQuery(codigo)
    return
  }
  // Sin resultados — intentar balanza
  const balanza = parseBalanza(codigo)
  if (balanza && configuracion?.balanza_formato) {
    const res2 = await buscarVarianteBalanzaAction(balanza.codigoInterno)
    if (res2.ok && res2.data) {
      const variante = res2.data
      if (configuracion.balanza_formato === 'precio') {
        // Precio embebido: agregar con cantidad=1 y precio del código
        agregarVarianteConOverride(variante, { cantidad: 1, precio_unitario: balanza.precio })
      } else {
        // Peso embebido: agregar con cantidad=peso (en kg), precio del producto
        agregarVarianteConOverride(variante, { cantidad: balanza.peso })
      }
      return
    }
  }
  // Definitivamente no encontrado
  handleCodigoNoEncontrado(codigo)
},
```

---

### Paso 4 — Configuración de balanza en `configuracion_tienda`

**Objetivo:** Cada tenant configura si tiene balanza y qué formato usa. Sin configuración, el paso 3 no se activa (comportamiento seguro por defecto).

**Migración Supabase:**
```sql
ALTER TABLE configuracion_tienda 
ADD COLUMN IF NOT EXISTS balanza_formato text 
CHECK (balanza_formato IN ('precio', 'peso'));
```

**`app/lib/configuracion/queries.ts`**
- Agregar `balanza_formato: 'precio' | 'peso' | null` al tipo `ConfiguracionTienda`

**UI en Configuración** (en la sección de ticket/impresión o crear nueva sección "Punto de venta"):
- Toggle ON/OFF para balanza
- Si ON: selector "Formato de código" → "Precio embebido (₱)" / "Peso embebido (⚖)"
- Breve explicación: "Si tu balanza imprime códigos EAN-13 comenzando en 2, activá esto."

---

## Archivos involucrados

| Archivo | Acción | Notas |
|---------|--------|-------|
| `app/components/pos/BuscadorVariantes.tsx` | Modificar | Agregar `onCodigoNoEncontrado` callback |
| `app/components/pos/POSContainer.tsx` | Modificar | Banner not-found, PesoModal, balanza flow |
| `app/components/pos/PesoModal.tsx` | **Crear** | Modal de peso |
| `app/lib/pos/balanza.ts` | **Crear** | Parser de códigos de balanza |
| `app/app/actions/ventas.ts` | Modificar | Agregar `buscarVarianteBalanzaAction` |
| `app/lib/configuracion/queries.ts` | Modificar | Agregar `balanza_formato` al tipo |
| `app/components/configuracion/*.tsx` | Modificar | UI para configurar balanza |
| `supabase/migrations/XXXX_balanza_formato.sql` | **Crear** | Migración de columna |

---

## Orden de implementación recomendado

1. **Paso 1 primero** — más fácil y mayor impacto inmediato. Solo 2 archivos.
2. **Paso 2** — crea `PesoModal.tsx` y modifica `POSContainer`. No depende de DB.
3. **Paso 4** — migración y tipo primero (desbloquea el paso 3)
4. **Paso 3** — la parte más compleja. Puede quedar para después.

> **El paso 3 es opcional** si los clientes target (carnicería/verdulería) no tienen balanzas que generen EAN-13 con precio/peso embebido. Muchas verdulerías pequeñas simplemente pesan el producto, escriben el kg en el ticket a mano y cobran a ojo. En ese caso con el Paso 2 (modal de peso) es más que suficiente.

---

## Consideraciones especiales por rubro

| Rubro | Flujo esperado |
|-------|---------------|
| **Ropa** | Escanear → auto-agregar (cantidad=1 siempre). Sin peso. |
| **Ferretería / Librería / Farmacia** | Escanear → auto-agregar. Unidades siempre enteras. |
| **Despensa / Kiosco** | Escanear → auto-agregar. Si el producto es por kg (granel): PesoModal. |
| **Carnicería** | Escanear → PesoModal siempre (todo es por kg). Si tiene balanza: Paso 3. |
| **Verdulería** | Escanear → si `unidad=kg` → PesoModal. Si `unidad=unidad` → auto-agregar. |
| **Corralón** | Escanear → si medible (m3/metro/kg) → PesoModal. Raro que usen barcodes. |
| **Genérico** | Depende de la unidad configurada en el producto. |

---

## Casos edge importantes

- **Producto por kg ya en carrito**: Si se escanea de nuevo, PesoModal debe mostrar la cantidad ya en carrito como referencia y **sumar** la nueva cantidad.
- **Balanza con peso en gramos**: Si `unidad_de_medida = 'gramo'`, la cantidad a agregar es `balanza.peso * 1000`.
- **Código de balanza pero sin configuración activa**: No hacer lookup secundario, ir directo a "no encontrado".
- **Código EAN-13 legítimo que empieza con 2**: Primero se hace el lookup normal. Solo si falla Y hay config de balanza activa se intenta el parsing. No hay conflicto.
- **Cantidad 0 en PesoModal**: No permitir confirmar, mostrar error inline.
- **Cancelar PesoModal**: Devolver foco al buscador, no agregar nada al carrito.
