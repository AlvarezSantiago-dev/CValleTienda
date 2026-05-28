# Plan: Configuración dinámica por rubro — ordenamiento y visibilidad contextual

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Reestructurar la configuración de la tienda para mostrar solo las secciones relevantes al rubro del negocio, con mejor ordenamiento. Ej: una tienda de ropa no ve la sección de balanza ni de remito.

---

## Descripción General

### Qué Logra Este Plan

Hace que la página de configuración principal (`/configuracion`) sea consciente del rubro actual y muestre únicamente las secciones aplicables: una tienda de ropa nunca ve "Balanza electrónica" ni "Remito"; una carnicería no ve "Remito"; un corralón las ve todas. Además reordena las secciones en un flujo más lógico.

### Por Qué Importa

Hoy `DatosTiendaForm` muestra **todas** las secciones a todos los rubros, generando confusión ("¿necesito configurar la balanza?", "¿qué es un remito?"). Cada rubro tiene necesidades distintas y el formulario debe reflejarlo: menos ruido → mejor UX → dueño configura más rápido.

---

## Estado Actual

### Estructura Existente Relevante

```
app/components/configuracion/DatosTiendaForm.tsx   ← Form con 4 secciones siempre visibles
app/app/(dashboard)/configuracion/page.tsx          ← Llama a obtenerConfiguracionTienda()
app/lib/rubro/config.ts                             ← ConfigRubro con usarRemitos, usarDevoluciones
app/lib/configuracion/queries.ts                    ← obtenerConfiguracionTienda(), obtenerRubroTienda()
app/app/actions/configuracion.ts                    ← actualizarConfiguracionTienda()
```

**Secciones actuales en `DatosTiendaForm`:**
1. Datos fiscales → siempre visible
2. Ticket impreso → siempre visible
3. Remito → siempre visible (debería ser condicional)
4. Balanza electrónica → siempre visible (debería ser condicional)
5. Margen de ganancia default → en estado `form` pero renderizado al final

**`ConfigRubro` ya tiene:**
- `usarRemitos: boolean`
- `usarDevoluciones: boolean`

**Lo que falta:** `usarBalanza: boolean`

### Brechas o Problemas que se Abordan

| Problema | Impacto |
|----------|---------|
| Ropa ve "Balanza electrónica" y "Remito" que nunca usará | Confusión, form largo innecesario |
| Farmacia ve "Remito" que no usa | Idem |
| Carnicería/Verdulería ve "Remito" que no usa | Idem |
| `usarBalanza` no existe en `ConfigRubro` | No hay dato estructurado para condicionar la sección |
| Sección "Margen de ganancia" no tiene heading propio | Queda suelta al final del form |
| El campo `texto_pie_remito` y `estilo_remito` son parte del remito pero siempre visibles | Misma confusión |

---

## Diseño de la Solución

### Matriz rubro → secciones visibles

| Rubro | Ticket | Remito | Balanza | Margen |
|-------|--------|--------|---------|--------|
| ropa | ✅ | ❌ | ❌ | ✅ |
| ferreteria | ✅ | ✅ | ❌ | ✅ |
| corralon | ✅ | ✅ | ✅ | ✅ |
| despensa | ✅ | ❌ | ✅ | ✅ |
| libreria | ✅ | ❌ | ❌ | ✅ |
| carniceria | ✅ | ❌ | ✅ | ✅ |
| farmacia | ✅ | ❌ | ❌ | ✅ |
| verduleria | ✅ | ❌ | ✅ | ✅ |
| generico | ✅ | ✅ | ✅ | ✅ |

**Regla balanza:** cualquier rubro cuyas `unidadesDisponibles` incluyan `'kg'` o `'gramo'` → usarBalanza = true.
- corralon ✅ (kg, tonelada)
- despensa ✅ (kg, gramo)
- carniceria ✅ (kg, gramo)
- verduleria ✅ (kg, gramo)
- generico ✅ (incluye kg, gramo)
- ropa ❌, ferreteria ❌, libreria ❌, farmacia ❌

### Orden final de secciones

1. **Datos fiscales** (siempre) — razón social, CUIT, condición IVA, dirección
2. **Ticket impreso** (siempre) — encabezado, pie, prefijo, ancho, impresora, logo, IVA
3. **Balanza electrónica** (si `usarBalanza`) — formato código de barras balanza
4. **Remito** (si `usarRemitos`) — pie del remito, estilo de impresión
5. **Productos** (siempre) — margen de ganancia default

---

## Archivos a Modificar

### Paso 1 — `app/lib/rubro/config.ts`

**Agregar** `usarBalanza: boolean` a la interfaz `ConfigRubro` y a cada entrada del map.

```typescript
// En la interfaz ConfigRubro:
/** Mostrar sección de balanza electrónica (solo rubros que venden por peso) */
usarBalanza: boolean
```

Valores por rubro:
```
ropa:       usarBalanza: false
ferreteria: usarBalanza: false
corralon:   usarBalanza: true
despensa:   usarBalanza: true
libreria:   usarBalanza: false
generico:   usarBalanza: true
carniceria: usarBalanza: true
farmacia:   usarBalanza: false
verduleria: usarBalanza: true
```

---

### Paso 2 — `app/app/(dashboard)/configuracion/page.tsx`

**Agregar** fetch del rubro junto con la config, pasarlo al form.

Cambio en el Server Component:
```tsx
// Antes:
const config = await obtenerConfiguracionTienda()
// ...
<DatosTiendaForm initial={config} />

// Después:
const [config, rubroRaw] = await Promise.all([
  obtenerConfiguracionTienda(),
  obtenerRubroTienda(),
])
const rubro = rubroRaw as Rubro
// ...
<DatosTiendaForm initial={config} rubro={rubro} />
```

Import necesario:
```tsx
import type { Rubro } from '@/lib/rubro/config'
import { obtenerRubroTienda } from '@/lib/configuracion/queries'
```

---

### Paso 3 — `app/components/configuracion/DatosTiendaForm.tsx`

**Cambios:**

1. Agregar prop `rubro: Rubro` a `DatosTiendaFormProps`
2. Importar `getConfigRubro` y `Rubro`
3. Calcular `const configRubro = getConfigRubro(rubro)` al inicio del componente
4. Envolver sección **Remito** con `{configRubro.usarRemitos && ( ... )}`
5. Envolver sección **Balanza electrónica** con `{configRubro.usarBalanza && ( ... )}`
6. Mover sección Balanza **antes** de Remito (orden: Ticket → Balanza → Remito → Productos)
7. Dar nombre propio a la sección de margen: "Productos" con su heading `<h2>`

Estructura final del JSX:
```tsx
interface DatosTiendaFormProps {
  initial: ConfiguracionTienda | null
  rubro: Rubro  // NUEVO
}

export function DatosTiendaForm({ initial, rubro }: DatosTiendaFormProps) {
  const configRubro = getConfigRubro(rubro)
  // ...
  return (
    <form ...>
      {/* 1. Datos fiscales — siempre */}
      <section> ... </section>

      {/* 2. Ticket impreso — siempre */}
      <section> ... </section>

      {/* 3. Balanza electrónica — solo si usarBalanza */}
      {configRubro.usarBalanza && (
        <section> ... </section>
      )}

      {/* 4. Remito — solo si usarRemitos */}
      {configRubro.usarRemitos && (
        <section> ... </section>
      )}

      {/* 5. Productos — siempre */}
      <section>
        <h2>Productos</h2>
        {/* margen_ganancia_default */}
      </section>

      {/* Botón guardar */}
    </form>
  )
}
```

---

## Archivos Afectados — Resumen

| Archivo | Tipo de cambio |
|---------|---------------|
| `app/lib/rubro/config.ts` | Agregar campo `usarBalanza` a interfaz + 9 rubros |
| `app/app/(dashboard)/configuracion/page.tsx` | Fetch paralelo de rubro + prop al form |
| `app/components/configuracion/DatosTiendaForm.tsx` | Prop `rubro`, lógica condicional, reordenamiento |

**Sin cambios necesarios en:**
- Base de datos / SQL — `usarBalanza` es un dato de config estático en frontend
- Actions de configuracion (`actions/configuracion.ts`) — no hay campos nuevos en DB
- Tabs de configuración (`TabsConfiguracion.tsx`) — las tabs no cambian
- Tipos TypeScript (`types/database.ts`) — no aplica

---

## Tareas de Implementación

### T1 — `lib/rubro/config.ts`: agregar `usarBalanza`
- [ ] Agregar `usarBalanza: boolean` a la interfaz `ConfigRubro`
- [ ] Asignar valor en los 9 rubros según la matriz definida arriba
- [ ] Verificar que TypeScript no marque errores

### T2 — `configuracion/page.tsx`: fetch paralelo del rubro
- [ ] Importar `obtenerRubroTienda` y `type Rubro`
- [ ] Cambiar fetch serial a `Promise.all([obtenerConfiguracionTienda(), obtenerRubroTienda()])`
- [ ] Pasar `rubro={rubro}` a `<DatosTiendaForm />`

### T3 — `DatosTiendaForm.tsx`: hacerlo rubro-aware
- [ ] Agregar prop `rubro: Rubro` a la interfaz del componente
- [ ] Importar `getConfigRubro` y `type Rubro`
- [ ] Calcular `const configRubro = getConfigRubro(rubro)` al inicio
- [ ] Mover sección Balanza arriba de Remito
- [ ] Envolver Balanza con `{configRubro.usarBalanza && (...)}`
- [ ] Envolver Remito con `{configRubro.usarRemitos && (...)}`
- [ ] Agregar heading `<h2>Productos</h2>` a la sección del margen de ganancia

### T4 — Verificación
- [ ] `npx tsc --noEmit` sin errores
- [ ] Verificar visualmente en `/configuracion` con un rubro `ropa` (no debe ver Balanza ni Remito)
- [ ] Verificar con rubro `carniceria` (debe ver Balanza, no Remito)
- [ ] Verificar con rubro `corralon` (debe ver Balanza y Remito)
- [ ] Verificar con rubro `generico` (debe ver todo)

---

## Notas de Implementación

- **Sin migraciones SQL**: toda la lógica de visibilidad es frontend-only. `usarBalanza` vive en `lib/rubro/config.ts` igual que `usarRemitos` y `usarDevoluciones`.
- **El sidebar ya usa `usarRemitos`** para mostrar/ocultar el módulo Remitos: esta es la misma lógica aplicada a la configuración.
- **Compatibilidad**: Si `rubro` llega como `undefined` o vacío, `getConfigRubro` ya tiene fallback a `generico` (que muestra todo) — no hay riesgo de romper el form.
- **`texto_pie_remito` y `estilo_remito`**: ambos campos pertenecen conceptualmente al remito, por eso quedan dentro de la sección Remito condicional. No queda ningún campo huérfano.
