# Plan: Módulo de Configuración (MVP)

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** Configuración mínima viable: personalización del ticket, datos fiscales y métodos de pago.

---

## Descripción General

### Qué Logra Este Plan

Habilita al dueño de una tienda a personalizar los datos esenciales antes de empezar a vender: **datos fiscales** (razón social, CUIT, dirección), **personalización del ticket** (encabezado, pie, ancho, mostrar logo/IVA, prefijo de numeración), y **métodos de pago** activos con sus comisiones y cuenta de fondos asociada. Es prerequisito directo para el POS: el ticket usa los textos configurados y el cobro usa los métodos definidos acá.

### Por Qué Importa

Sin configuración, el ticket sale vacío y el POS no tiene métodos de pago disponibles. Es el último bloque de "preparación" antes del módulo de ventas. El esquema ya está listo (migrations 007/008/009 con seed automático en `inicializar_tienda`), así que esto es 100% UI + actions.

---

## Estado Actual

### Estructura Existente Relevante

- **Migrations relevantes (ya aplicadas):**
  - `20260419000007_configuracion.sql` → tabla `configuracion_tienda` (1 fila por tienda, creada por trigger `tiendas_inicializar`)
  - `20260419000008_cuentas_fondos.sql` → tabla `cuentas_fondos` + función `seed_cuentas_fondos`
  - `20260419000009_metodos_pago.sql` → tabla `metodos_pago` + `pagos_venta` + función `seed_metodos_pago`
- **RLS:** SELECT abierto a la tienda; INSERT/UPDATE solo a `owner|admin`. Aceptable para MVP (el usuario es solo founder, único rol owner).
- **Página actual:** [app/app/(dashboard)/configuracion/page.tsx](app/app/(dashboard)/configuracion/page.tsx) es un placeholder de 7 líneas.
- **Patrones de referencia (recién implementados en módulo Productos):**
  - `app/lib/<modulo>/queries.ts` — funciones de lectura
  - `app/app/actions/<modulo>.ts` — server actions con `'use server'`, retornan `ActionResult = { ok, data?, error? }`
  - `requireTiendaId()` para obtener la tienda actual
  - Componentes de UI base: [Button.tsx](app/components/ui/Button.tsx), [Input.tsx](app/components/ui/Input.tsx), [Select.tsx](app/components/ui/Select.tsx), [Textarea.tsx](app/components/ui/Textarea.tsx)
  - Form pattern: client component con `useState` + `useTransition`, llama server action, hace `router.refresh()`

### Brechas o Problemas que se Abordan

- No hay UI para editar datos fiscales → ticket sale sin razón social/CUIT.
- No hay UI para cambiar texto del ticket → no se puede personalizar "Gracias por tu compra".
- No hay UI para activar/desactivar/editar métodos de pago → quedan los 6 del seed sin posibilidad de adaptar comisiones reales.
- No hay UI para administrar cuentas de fondos → si la tienda usa una cuenta bancaria distinta, no la puede agregar.

---

## Cambios Propuestos

### Resumen de Cambios

- 1 archivo de queries: `app/lib/configuracion/queries.ts`
- 1 archivo de server actions: `app/app/actions/configuracion.ts` (3 áreas: tienda, métodos de pago, cuentas de fondos)
- 4 componentes UI: `TabsConfiguracion`, `DatosTiendaForm`, `MetodosPagoManager`, `CuentasFondosManager`
- 4 páginas: layout-tab principal + 3 sub-páginas (`/configuracion`, `/configuracion/metodos-pago`, `/configuracion/cuentas-fondos`)
- Reemplazo del placeholder en `configuracion/page.tsx`

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/lib/configuracion/queries.ts` | `obtenerConfiguracionTienda()`, `listarMetodosPago()`, `listarCuentasFondos()` |
| `app/app/actions/configuracion.ts` | `actualizarConfiguracionTienda`, `crearMetodoPago`, `actualizarMetodoPago`, `eliminarMetodoPago` (soft = activo:false), `crearCuentaFondo`, `actualizarCuentaFondo`, `eliminarCuentaFondo` |
| `app/components/configuracion/TabsConfiguracion.tsx` | Navegación entre las 3 sub-páginas (idéntico patrón a `TabsProductos`) |
| `app/components/configuracion/DatosTiendaForm.tsx` | Form con todos los campos editables de `configuracion_tienda` |
| `app/components/configuracion/MetodosPagoManager.tsx` | Tabla con CRUD inline: nombre, cuenta_fondo (select), comisión %, días acreditación, activo |
| `app/components/configuracion/CuentasFondosManager.tsx` | Tabla con CRUD inline: nombre, tipo (select), descripción, color, activo. Saldo readonly. |
| `app/app/(dashboard)/configuracion/metodos-pago/page.tsx` | Server page que monta `MetodosPagoManager` |
| `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx` | Server page que monta `CuentasFondosManager` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/(dashboard)/configuracion/page.tsx` | Reemplazar placeholder por server page que carga `configuracion_tienda` y monta `DatosTiendaForm` con `TabsConfiguracion` |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **3 tabs en lugar de un solo formulario gigante.** Refleja la separación que ya existe en el schema (3 tablas) y permite enfocar cada vista. Consistente con el patrón de tabs del módulo Productos.
2. **Una sola fila editable de `configuracion_tienda`.** El trigger `tiendas_inicializar` ya garantiza que exista. La acción es solo UPDATE; jamás INSERT desde la UI.
3. **Eliminar método de pago = soft delete (`activo = false`).** Hay FK desde `pagos_venta` con `on delete set null`, pero igual conviene mantener histórico. Mismo criterio que `eliminarProducto`.
4. **Eliminar cuenta de fondos = soft delete con guard.** No permitir si tiene `metodos_pago.cuenta_fondo_id` activos apuntando a ella (FK con `on delete restrict`). Mostrar error claro.
5. **Configuración de etiquetas queda fuera del MVP.** Hay tabla `configuracion_etiquetas`, pero el módulo de impresión de etiquetas no existe aún. Postergar a un plan futuro junto al módulo de impresión.
6. **Sin gestión de saldos manuales.** El saldo se actualiza automáticamente vía triggers de `pagos_venta`. Los ajustes manuales (`tipo='ajuste'` en `movimientos_fondos`) son funcionalidad de **Caja**, no de Configuración.
7. **Validación mínima del lado servidor.** CUIT solo se guarda como texto (sin validar dígito verificador en MVP); razón social y nombres opcionales. Comisión rango 0–99.99, días ≥ 0 (ya hay CHECK en DB; igual validar antes para mensaje claro).
8. **Tipos en TS recreados localmente.** Como en Productos, se usan interfaces locales (`ConfiguracionTienda`, `MetodoPago`, `CuentaFondo`) en lugar del genérico de Database (que está deshabilitado).

### Alternativas Consideradas

- **Una sola página con 3 secciones colapsables** → descartado: la pantalla de métodos de pago va a tener mucho contenido (tabla con varias filas), mejor separar.
- **Modal para crear/editar método de pago** → descartado por simplicidad: edición inline en la tabla es más rápido para un solo founder. Si en el futuro la UX se complica, se puede migrar.
- **Soft-delete con campo separado `eliminado_at`** → descartado: el campo `activo` ya cumple ese rol y es lo que la query filtra.

### Preguntas Abiertas

- **¿Mostrar moneda/separadores como editables?** El schema los tiene, pero en Argentina son siempre ARS / `,` / `.`. **Decisión propuesta:** mostrarlos como readonly en MVP, editables en futuro multi-país.
- **¿Validar CUIT con algoritmo módulo-11?** **Decisión propuesta:** no en MVP. Solo `length` y dígitos.

---

## Tareas Paso a Paso

### Paso 1: Queries de configuración

Crear `app/lib/configuracion/queries.ts` con:

- `interface ConfiguracionTienda` — tipa la fila de `configuracion_tienda`.
- `interface MetodoPago` — incluye `cuenta_fondo: { id, nombre, tipo, color }` (join).
- `interface CuentaFondo` — fila de `cuentas_fondos` + `metodos_count` (count de métodos activos asociados, para guard de eliminación).
- `obtenerConfiguracionTienda()` — `select * from configuracion_tienda where tienda_id = ...` (limit 1 → single).
- `listarMetodosPago(soloActivos = false)` — orden por `orden ASC`, con join a cuenta_fondo.
- `listarCuentasFondos(soloActivas = false)` — orden por `orden ASC`, con count agregado de métodos activos.

**Acciones:**
- Importar `requireTiendaId` y `createClient` (server).
- Manejar `error` retornando array vacío / null.

**Archivos afectados:**
- `app/lib/configuracion/queries.ts`

---

### Paso 2: Server actions

Crear `app/app/actions/configuracion.ts` con `'use server'`:

**Tienda:**
- `actualizarConfiguracionTienda(input: ConfigTiendaInput): Promise<ActionResult>`
  - Campos: razon_social, cuit, condicion_iva, direccion_legal, texto_encabezado, texto_pie, mostrar_logo, mostrar_iva, prefijo_ticket, impresora_ticket, ancho_ticket_mm.
  - Valida `ancho_ticket_mm in (58, 80)`.
  - `revalidatePath('/configuracion')`.

**Métodos de pago:**
- `crearMetodoPago({ nombre, cuenta_fondo_id, descripcion, comision_porcentaje, dias_acreditacion, orden })` → INSERT.
- `actualizarMetodoPago(id, partial)` → UPDATE.
- `eliminarMetodoPago(id)` → UPDATE `activo = false`.
- `revalidatePath('/configuracion/metodos-pago')`.

**Cuentas de fondos:**
- `crearCuentaFondo({ nombre, tipo, descripcion, color, icono, orden })`.
- `actualizarCuentaFondo(id, partial)`.
- `eliminarCuentaFondo(id)` → primero verifica que no tenga métodos activos:
  ```ts
  const { count } = await supabase
    .from('metodos_pago')
    .select('id', { count: 'exact', head: true })
    .eq('cuenta_fondo_id', id)
    .eq('activo', true)
  if (count > 0) return { ok: false, error: 'Tiene métodos de pago activos asociados' }
  ```
  Luego UPDATE `activo = false`.
- `revalidatePath('/configuracion/cuentas-fondos')` y `/metodos-pago` (porque el select de cuentas cambia).

**Archivos afectados:**
- `app/app/actions/configuracion.ts`

---

### Paso 3: Componente `TabsConfiguracion`

Copia mínima de `TabsProductos`: nav con 3 links (`/configuracion`, `/configuracion/metodos-pago`, `/configuracion/cuentas-fondos`), prop `active: 'tienda' | 'metodos-pago' | 'cuentas-fondos'`.

**Archivos afectados:**
- `app/components/configuracion/TabsConfiguracion.tsx`

---

### Paso 4: `DatosTiendaForm` (client)

Form controlado con `useState` (objeto `form`) + `useTransition`.

**Secciones visuales (separadas por subtítulos):**
1. **Datos fiscales** — razón_social, CUIT, condición_iva (Select: Monotributista/RI/Exento/Consumidor final), dirección_legal.
2. **Ticket** — texto_encabezado (Textarea), texto_pie (Textarea), prefijo_ticket, mostrar_logo (checkbox), mostrar_iva (checkbox), ancho_ticket_mm (Select 58/80), impresora_ticket.

Botón "Guardar cambios" → llama `actualizarConfiguracionTienda`. Mostrar mensaje de éxito/error inline (banner verde/rojo).

**Archivos afectados:**
- `app/components/configuracion/DatosTiendaForm.tsx`

---

### Paso 5: `MetodosPagoManager` (client)

Tabla con columnas: Nombre · Cuenta de fondos (select) · Comisión % · Días acred. · Orden · Activo · Acciones.

**Funcionalidad:**
- Fila al final con inputs vacíos + botón "+ Agregar".
- Cada fila existente es editable inline (mismo patrón que `TaxonomyManager` pero con más columnas).
- Botón "Guardar" por fila modificada (para evitar guardado prematuro).
- Botón "Desactivar" (no eliminar duro). Filas inactivas se muestran con opacity-50.
- Recibe como prop `cuentasFondos: CuentaFondo[]` para popular el select de cuenta.

**Archivos afectados:**
- `app/components/configuracion/MetodosPagoManager.tsx`

---

### Paso 6: `CuentasFondosManager` (client)

Tabla con columnas: Nombre · Tipo · Descripción · Color (input type=color) · Saldo (readonly) · Orden · Activo · Acciones.

**Funcionalidad:**
- Mismo patrón inline que `MetodosPagoManager`.
- Tipo: Select con valores `efectivo | mercado_pago | banco | otro`.
- Saldo sale en formato `$ 0,00` y no es editable.
- Al desactivar, server action verifica métodos asociados → si falla, mostrar error inline en la fila.

**Archivos afectados:**
- `app/components/configuracion/CuentasFondosManager.tsx`

---

### Paso 7: Página principal `/configuracion` (datos de tienda)

Reemplazar el placeholder.

```tsx
export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const config = await obtenerConfiguracionTienda()
  return (
    <div>
      <h1>Configuración</h1>
      <p>Datos de tu tienda y personalización del ticket.</p>
      <TabsConfiguracion active="tienda" />
      <DatosTiendaForm initial={config} />
    </div>
  )
}
```

**Archivos afectados:**
- `app/app/(dashboard)/configuracion/page.tsx`

---

### Paso 8: Página `/configuracion/metodos-pago`

Server page: carga `listarMetodosPago()` + `listarCuentasFondos(true)` (solo activas), pasa ambos al `MetodosPagoManager`.

**Archivos afectados:**
- `app/app/(dashboard)/configuracion/metodos-pago/page.tsx`

---

### Paso 9: Página `/configuracion/cuentas-fondos`

Server page: carga `listarCuentasFondos()`, pasa al `CuentasFondosManager`.

**Archivos afectados:**
- `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx`

---

### Paso 10: Validación

- `node ./node_modules/typescript/bin/tsc --noEmit` debe pasar sin errores.
- Probar manualmente con `npm run dev`:
  1. Entrar a `/configuracion`, editar razón social, guardar, refrescar — persiste.
  2. Cambiar ancho_ticket_mm a 58 → 80 — persiste.
  3. Crear nuevo método de pago "Naranja X" con cuenta efectivo, 5% comisión.
  4. Desactivar "Tarjeta crédito" — desaparece de activos.
  5. Crear cuenta de fondos "Cuenta USD" tipo otro — aparece en select de métodos.
  6. Intentar desactivar cuenta efectivo — falla con mensaje claro.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/layout/Sidebar.tsx` — ya tiene link "Configuración" (no requiere cambio).
- **Futuro POS** — leerá `listarMetodosPago(true)` para mostrar opciones de cobro.
- **Futuro Caja** — leerá `listarCuentasFondos(true)` para mostrar saldos.
- **Futuro generador de tickets** — leerá `obtenerConfiguracionTienda()` para encabezado/pie/numeración.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` raíz: no requiere cambios (módulos no se documentan ahí, solo flujos de workspace).
- `contexto/proyectos.md`: opcional — mover "MVP" a sección de avance, pero no es bloqueante.

### Impacto en Flujos de Trabajo Existentes

Ninguno. Es funcionalidad nueva sobre páginas placeholder.

---

## Lista de Validación

- [ ] `tsc --noEmit` pasa sin errores
- [ ] `/configuracion` carga la fila existente (creada por trigger) y permite editarla
- [ ] Cambios en razón social/CUIT persisten tras refrescar
- [ ] Nuevo método de pago aparece en la lista y queda guardado
- [ ] Desactivar método de pago lo oculta de "activos" pero sigue en histórico
- [ ] Crear nueva cuenta de fondos funciona y queda disponible en el select de métodos
- [ ] Intentar desactivar cuenta con métodos activos → muestra error y no rompe
- [ ] Saldo de cuenta sale como readonly y formateado en pesos

---

## Criterios de Éxito

El módulo está completo cuando:

1. El usuario puede personalizar **todos los campos** que aparecen en un ticket impreso (sin necesidad de tocar SQL).
2. El usuario puede **activar/desactivar y editar comisiones** de los 6 métodos sembrados, y agregar métodos nuevos.
3. El usuario puede **agregar nuevas cuentas de fondos** (ej. una segunda cuenta bancaria) y vincularlas a métodos.
4. La UI sigue el mismo lenguaje visual que el módulo Productos (mismos componentes base, misma estructura tabs).
5. El módulo POS (siguiente plan) puede consumir `listarMetodosPago(true)` sin cambios adicionales.

---

## Estimación de Alcance

- **Archivos nuevos:** 8
- **Archivos modificados:** 1
- **Migraciones:** 0 (todo el schema ya existe)
- **Server actions:** 7
- **Complejidad:** baja-media (es CRUD sobre tablas ya creadas; la complejidad real está en la UI inline de las tablas).


---

## Notas de Implementación

**Implementado:** 2026-04-29

### Resumen
Módulo completo y funcional. 8 archivos nuevos + 1 reemplazo de placeholder. `tsc --noEmit` pasa sin errores. Cero migraciones (todo el schema ya existía).

### Archivos creados
- `app/lib/configuracion/queries.ts` — `obtenerConfiguracionTienda`, `listarMetodosPago`, `listarCuentasFondos` (con count agregado de métodos por cuenta)
- `app/app/actions/configuracion.ts` — 9 server actions (1 tienda + 4 métodos + 4 cuentas, incluye `reactivar*`)
- `app/components/configuracion/TabsConfiguracion.tsx`
- `app/components/configuracion/DatosTiendaForm.tsx` — form con secciones "Datos fiscales" y "Ticket"
- `app/components/configuracion/MetodosPagoManager.tsx` — tabla CRUD inline + toggle inactivos + guard "sin cuentas activas"
- `app/components/configuracion/CuentasFondosManager.tsx` — tabla CRUD inline con saldo readonly + columna "Métodos asociados"
- `app/app/(dashboard)/configuracion/metodos-pago/page.tsx`
- `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx`

### Archivos modificados
- `app/app/(dashboard)/configuracion/page.tsx` — placeholder reemplazado por server page real

### Desviaciones del Plan
- **Se agregaron `reactivarMetodoPago` y `reactivarCuentaFondo`** (no estaban en el plan): el toggle "mostrar inactivos" obliga a poder volver a activar. Cero costo agregar.
- **`listarCuentasFondos` sin join de count.** Postgrest no soporta nested aggregate count en una sola query; se hizo en dos queries (cuentas + lista de `metodos_pago.cuenta_fondo_id` activos) y se agrupó en JS. Performance ok (siempre será una lista chica).
- **Validación CUIT más estricta que el plan**: regex `/^\d{8,13}$/` después de quitar guiones/espacios. El plan decía "solo length y dígitos", esto cubre eso.
- **Guard cross-RLS al eliminar cuenta:** el plan proponía leer `metodos_pago` para verificar; se hizo con `count: 'exact', head: true` que es ~equivalente a `COUNT(*)` y respeta RLS.
- **No se editan moneda/separadores en el form** — confirmado como readonly futuro (decisión del plan).

### Problemas Encontrados
1. **Server Actions y Client Components.** Mismo issue que en módulo Productos (Categorías/Tallas/Colores): las funciones inline pasadas como prop a un Client Component requieren `'use server'`. En este módulo no aplica porque cada Manager importa directamente las actions desde `@/app/actions/configuracion` y las llama por sí mismo, no las recibe como prop.

### Pendiente para el usuario
1. **Probar end-to-end** (`npm run dev`):
   - `/configuracion` → editar razón social, CUIT, encabezado/pie del ticket → guardar → refrescar.
   - `/configuracion/metodos-pago` → editar comisión de "QR Mercado Pago" → guardar. Crear "Naranja X" con cuenta efectivo. Desactivar uno y reactivarlo.
   - `/configuracion/cuentas-fondos` → crear "Cuenta USD" tipo otro → debe aparecer en el select de métodos. Intentar desactivar una cuenta con métodos activos → error claro.
2. **Sin migraciones nuevas** — no hay nada que aplicar en Supabase.
