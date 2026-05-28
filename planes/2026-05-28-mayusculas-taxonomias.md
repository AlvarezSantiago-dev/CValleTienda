# Plan: Normalización de Mayúsculas en Categorías, Tallas y Colores

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Normalizar automáticamente el casing al crear/editar categorías, tallas y colores para evitar duplicados y mantener consistencia visual.

---

## Descripción General

### Qué Logra Este Plan

Cuando un operador escribe "REMERA", "remera" o "Remera" al crear una categoría, el sistema las guarda como texto idéntico y normalizado. Se aplica **title case** (primera letra de cada palabra en mayúscula) para categorías y colores, y **UPPERCASE** para tallas/variante1 del rubro ropa (donde las tallas son XS, S, M, L, XL). Los demás rubros usan title case en sus var1 también.

### Por Qué Importa

Sin normalización, el selector de tallas puede mostrar "xl", "XL", "Xl" y "xL" como cuatro entradas distintas. Esto ensucia los dropdowns, confunde al operador y genera inconsistencia en reportes. La normalización automática elimina el problema en el origen.

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Rol |
|---------|-----|
| `app/app/actions/productos.ts` | `crearCategoriaInline`, `crearTallaInline`, `crearColorInline`, `crearCategoria`, `crearTalla`, `crearColor`, `actualizarCategoria`, `actualizarTalla`, `actualizarColor` |
| `app/components/productos/InlineCreate.tsx` | Componente de creación rápida dentro del formulario de producto |
| `app/components/productos/TaxonomyManager.tsx` | Componente CRUD completo en las páginas de administración de taxonomías |
| `app/components/productos/VariantesEditor.tsx` | Usa `InlineCreate` para crear tallas y colores desde el form de variantes |
| `app/components/productos/ProductoForm.tsx` | Usa `InlineCreate` para crear categorías desde el form de producto |
| `app/app/(dashboard)/productos/tallas/page.tsx` | Página de gestión de tallas — usa `TaxonomyManager` |
| `app/app/(dashboard)/productos/colores/page.tsx` | Página de gestión de colores — usa `TaxonomyManager` |
| `app/app/(dashboard)/productos/categorias/page.tsx` | Página de gestión de categorías — usa `TaxonomyManager` |
| `app/lib/rubro/config.ts` | Define `usarHexVar2`, `labelVar1`, `labelVar2` por rubro |

### Brechas o Problemas que se Abordan

- Actualmente la única normalización es `nombre.trim()` — conserva el casing exacto que el usuario tipea.
- No hay defensa contra duplicados por capitalización: "sancor", "Sancor" y "SANCOR" crean 3 registros distintos.
- El usuario ve dropdowns de tallas con entradas inconsistentes ("xl", "XL", "Xl").
- No existe un utility de normalización de texto reutilizable en el proyecto.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear función `titleCase(texto)` en `lib/utils/text.ts`
- Agregar prop `transform?: (texto: string) => string` a `InlineCreate` — aplica la transformación en tiempo real mientras se escribe Y antes de enviar
- Agregar prop `normalize?: (texto: string) => string` a `TaxonomyManager` — aplica la transformación en los inputs de creación y edición
- Aplicar la normalización correspondiente en cada punto de llamada:
  - **Categorías**: `titleCase` en ProductoForm + página de categorías
  - **Var1 (tallas) — ropa**: `UPPERCASE` en VariantesEditor + página de tallas
  - **Var1 (tallas) — otros rubros**: `titleCase` en VariantesEditor + página de tallas
  - **Var2 (colores/material)**: `titleCase` en VariantesEditor + página de colores
- Aplicar la misma normalización en las server actions como capa de seguridad

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|-----------------|-----------|
| `app/lib/utils/text.ts` | Utilidades de normalización: `titleCase()` y `upperCaseTrim()` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|-----------------|---------|
| `app/components/productos/InlineCreate.tsx` | Agregar prop `transform`, aplicar en `onChange` y en `handleConfirm` |
| `app/components/productos/TaxonomyManager.tsx` | Agregar prop `normalize`, aplicar en `handleCrear`, `handleGuardarEdit` y en los inputs |
| `app/components/productos/VariantesEditor.tsx` | Pasar `transform` a InlineCreate de tallas (uppercase si ropa, titleCase si no) y de colores (titleCase) |
| `app/components/productos/ProductoForm.tsx` | Pasar `transform={titleCase}` a InlineCreate de categorías |
| `app/app/(dashboard)/productos/tallas/page.tsx` | Pasar `normalize` a TaxonomyManager según rubro |
| `app/app/(dashboard)/productos/colores/page.tsx` | Pasar `normalize={titleCase}` a TaxonomyManager |
| `app/app/(dashboard)/productos/categorias/page.tsx` | Pasar `normalize={titleCase}` a TaxonomyManager |
| `app/app/actions/productos.ts` | Aplicar normalización en `crearCategoria`, `crearTalla`, `crearColor`, `actualizarCategoria`, `actualizarTalla`, `actualizarColor`, y las tres `*Inline` |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Normalizar en el componente Y en la server action**: El componente lo hace para feedback visual inmediato (el usuario ve el texto transformarse mientras escribe). La server action lo hace como capa de seguridad para cualquier llamada programática futura. El componente transforma primero, la action recibe ya el texto correcto.

2. **UPPERCASE solo para ropa en var1**: Las tallas de ropa son universalmente en mayúscula (XS, S, M, L, XL). Para ferretería "6mm", despensa "Sancor", carnicería "Asado" — title case es más natural. El rubro se lee desde `useRubro()` en VariantesEditor y desde la config en las páginas de tallas.

3. **title case para var2 (colores) sin excepciones**: Colores como "Rojo Oscuro", "Azul Marino", "Material Material" quedan bien con title case en todos los rubros.

4. **No usar `toLowerCase().replace()` complejo**: La función `titleCase` opera palabra por palabra con `.split(' ')` para que "6mm" → "6mm" (el número no se altera), "XL" → "Xl" solo en title case (pero para ropa se usa uppercase directo, no title case).

5. **transform en InlineCreate aplica on-change (live)**: Para que el usuario vea "XS" mientras escribe "xs" — no solo al guardar. Esto da feedback inmediato y evita confusión.

6. **En las server actions de tallas no se puede saber el rubro sin una query extra**: Por eso las actions de tallas aplican `titleCase` como default seguro. Si el componente ya envía en UPPERCASE (ropa), `titleCase("XS")` devuelve `"Xs"` ← **problema**. Solución: las server actions de tallas NO normalizan — solo hacen `trim()`. La normalización es responsabilidad 100% del componente. Se agrega un comentario explicativo en la action.

   Las actions de `crearCategoria` y `crearColor` SÍ aplican `titleCase` como capa de seguridad porque para estas entidades el resultado es consistente independientemente del rubro.

### Alternativas Consideradas

- **Normalizar solo en server actions**: Descartado porque no brinda feedback visual al usuario mientras escribe.
- **Guardar todo en lowercase y mostrar con CSS `text-transform`**: Descartado porque los datos ya están en la DB con casing inconsistente (datos existentes) y CSS solo afecta la vista, no los datos nuevos.
- **Agregar `UNIQUE CONSTRAINT` en la DB con `lower(nombre)`**: Válido como complemento futuro, pero no en scope de este plan (requiere migración de Supabase).

### Preguntas Abiertas

Ninguna — las reglas de normalización por rubro están claras.

---

## Tareas Paso a Paso

### T1 — Crear `app/lib/utils/text.ts`

Crear el archivo con dos funciones exportadas:

```typescript
/**
 * Title case: primera letra de cada palabra en mayúscula, resto en minúscula.
 * "remera básica" → "Remera Básica"
 * "sancor" → "Sancor"
 * "6mm tornillo" → "6mm Tornillo"  (número no se altera)
 */
export function titleCase(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

/**
 * Uppercase limpio: todo en mayúsculas, sin espacios múltiples.
 * "xs" → "XS", "x large" → "X LARGE"
 */
export function upperCaseTrim(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toUpperCase()
}
```

**Archivos afectados:**
- `app/lib/utils/text.ts` (nuevo)

---

### T2 — Agregar prop `transform` a `InlineCreate`

El componente recibe una función opcional `transform?: (texto: string) => string`. Se aplica:
1. En el `onChange` del input para transformar en tiempo real (el usuario ve el resultado mientras escribe)
2. En `handleConfirm()` antes de llamar a `onConfirm()`

```typescript
// Agregar al interface:
transform?: (texto: string) => string

// Agregar al desestructurado:
transform,

// En onChange:
onChange={(e) => setNombre(transform ? transform(e.target.value) : e.target.value)}

// En handleConfirm:
const nombreFinal = transform ? transform(nombre) : nombre.trim()
const result = await onConfirm(nombreFinal, withColor ? hex : undefined)
```

**Archivos afectados:**
- `app/components/productos/InlineCreate.tsx`

---

### T3 — Agregar prop `normalize` a `TaxonomyManager`

El componente recibe `normalize?: (texto: string) => string`. Se aplica:
1. En el `onChange` del input de creación (`nuevoNombre`)
2. En el `onChange` del input de edición (`editNombre`)
3. Antes de llamar `onCrear` y `onActualizar` en los submit handlers (capa de seguridad adicional)

```typescript
// Agregar al interface:
normalize?: (texto: string) => string

// Agregar al desestructurado:
normalize,

// En los onChange de los inputs de nombre:
onChange={(e) => setNuevoNombre(normalize ? normalize(e.target.value) : e.target.value)}
onChange={(e) => setEditNombre(normalize ? normalize(e.target.value) : e.target.value)}
```

**Archivos afectados:**
- `app/components/productos/TaxonomyManager.tsx`

---

### T4 — Pasar `transform` en `VariantesEditor`

`VariantesEditor` ya tiene `useRubro()` que expone el campo `rubro`. Se importa `titleCase` y `upperCaseTrim` desde `@/lib/utils/text`.

```typescript
import { titleCase, upperCaseTrim } from '@/lib/utils/text'

// En el render:
const transformVar1 = rubro === 'ropa' ? upperCaseTrim : titleCase
const transformVar2 = titleCase

// InlineCreate de tallas:
<InlineCreate
  label={labelVar1}
  transform={transformVar1}
  buttonClassName="..."
  ...
/>

// InlineCreate de colores:
<InlineCreate
  label={labelVar2}
  withColor={usarHexVar2}
  transform={transformVar2}
  buttonClassName="..."
  ...
/>
```

**Archivos afectados:**
- `app/components/productos/VariantesEditor.tsx`

---

### T5 — Pasar `transform` en `ProductoForm` para categorías

ProductoForm tiene `useRubro()` disponible pero para categorías la regla es siempre `titleCase` sin importar el rubro.

```typescript
import { titleCase } from '@/lib/utils/text'

// InlineCreate de categorías:
<InlineCreate
  label="categoría"
  transform={titleCase}
  onConfirm={...}
  onCreated={...}
/>
```

**Archivos afectados:**
- `app/components/productos/ProductoForm.tsx`

---

### T6 — Pasar `normalize` en las páginas de administración

**`categorias/page.tsx`** — importa `titleCase`:
```typescript
import { titleCase } from '@/lib/utils/text'
// ...
<TaxonomyManager normalize={titleCase} ... />
```

**`colores/page.tsx`** — importa `titleCase`:
```typescript
import { titleCase } from '@/lib/utils/text'
// ...
<TaxonomyManager normalize={titleCase} ... />
```

**`tallas/page.tsx`** — importa ambas, elige según rubro:
```typescript
import { titleCase, upperCaseTrim } from '@/lib/utils/text'
// ...
const normalizarTalla = ctx?.rubro === 'ropa' ? upperCaseTrim : titleCase
// ...
<TaxonomyManager normalize={normalizarTalla} ... />
```

**Archivos afectados:**
- `app/app/(dashboard)/productos/categorias/page.tsx`
- `app/app/(dashboard)/productos/colores/page.tsx`
- `app/app/(dashboard)/productos/tallas/page.tsx`

---

### T7 — Agregar normalización en server actions

**Regla:** Las actions de `categorias` y `colores` aplican `titleCase`. Las actions de `tallas` NO normalizan (el componente ya lo hizo correctamente con contexto de rubro). Solo hacen `trim()`.

En `app/app/actions/productos.ts`:

```typescript
// Al inicio del archivo, importar:
import { titleCase } from '@/lib/utils/text'

// crearCategoriaInline:
nombre: titleCase(nombre)  // en lugar de nombre.trim()

// crearTallaInline:
nombre: nombre.trim()       // SIN normalización adicional — el componente ya aplicó upperCase o titleCase

// crearColorInline:
nombre: titleCase(nombre)

// crearCategoria:
nombre: titleCase(nombre)

// crearTalla:
nombre: nombre.trim()       // igual

// crearColor:
nombre: titleCase(nombre)

// actualizarCategoria:
nombre: titleCase(nombre)

// actualizarTalla:
nombre: nombre.trim()

// actualizarColor:
nombre: titleCase(nombre)
```

Agregar un comentario en las funciones de talla:
```typescript
// NOTA: La normalización de casing para tallas es responsabilidad del componente
// (uppercase para ropa, titleCase para otros rubros). La action solo hace trim().
```

**Archivos afectados:**
- `app/app/actions/productos.ts`

---

### T8 — QA y verificación

**Checklist:**

- [ ] TypeScript: `tsc --noEmit` sin errores
- [ ] En ropa: escribir "xs" en InlineCreate de tallas → se muestra "XS" mientras escribís
- [ ] En ropa: escribir "xs" en página de tallas → se muestra "XS" mientras escribís
- [ ] En despensa: escribir "sancor" en InlineCreate de marcas → se muestra "Sancor"
- [ ] En cualquier rubro: escribir "remera basica" en categorías → se guarda "Remera Basica"
- [ ] En ropa: escribir "rojo oscuro" en colores → se guarda "Rojo Oscuro"
- [ ] Editar una talla existente en la página de tallas: el input también normaliza
- [ ] El `transform` en InlineCreate no afecta el color picker (hex)
- [ ] `crearCategoriaInline` en la DB guarda con titleCase
- [ ] `crearTallaInline` en la DB guarda el texto que envía el componente (uppercase si ropa)

---

## Lista de Validación Final

- [ ] T1 completado: `lib/utils/text.ts` creado y exporta `titleCase` y `upperCaseTrim`
- [ ] T2 completado: `InlineCreate` acepta prop `transform` y aplica live + antes de submit
- [ ] T3 completado: `TaxonomyManager` acepta prop `normalize` y aplica en inputs
- [ ] T4 completado: `VariantesEditor` pasa transform correcto según rubro
- [ ] T5 completado: `ProductoForm` pasa `titleCase` a InlineCreate de categorías
- [ ] T6 completado: 3 páginas de administración pasan el normalize correcto
- [ ] T7 completado: server actions de categorías y colores aplican titleCase; tallas solo trim
- [ ] T8 completado: QA verificado

---

## Criterios de Éxito

1. No es posible crear "XL" y "xl" como dos tallas distintas en ropa — el sistema las normaliza a "XL".
2. No es posible crear "Sancor" y "sancor" como dos marcas distintas en despensa — ambas se convierten a "Sancor".
3. El operador ve el texto transformado en tiempo real mientras tipea — sin sorpresas al guardar.
4. Sin errores TypeScript en ninguno de los 8 archivos modificados.
