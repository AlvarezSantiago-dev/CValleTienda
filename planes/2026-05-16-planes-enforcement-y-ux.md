# Plan: Enforcement de Planes — Límites Reales y UX de Upgrade

**Creado:** 2026-05-16
**Estado:** Borrador
**Pedido:** Completar y profundizar el módulo de planes: bloquear el sistema según plan activo, forzar el límite de 300 productos en Básico, y mejorar el flujo de upgrade para que el usuario entienda en todo momento en qué plan está y qué puede hacer.

---

## Descripción General

### Qué Logra Este Plan

La infraestructura de planes (config, PlanProvider, UpgradeBanner, guards en páginas Pro, superadmin) ya está implementada. Lo que **falta** es el enforcement real del límite numérico de productos (300 en Básico), la visibilidad del trial en el dashboard, y hacer el path de upgrade obvio para el usuario. Este plan cierra esas brechas.

### Por Qué Importa

Sin el límite de productos implementado, un cliente Básico puede cargar infinitos productos. Sin un banner de trial vencido, el usuario no sabe por qué de repente "dejaron de funcionar" features. Sin `/planes` en el sidebar, el upgrade queda oculto y nunca se solicita.

---

## Estado Actual — Qué YA Está Implementado

| Feature | Estado |
|---------|--------|
| `lib/planes/config.ts` — tipos, puedeUsar, getPlanEfectivo | ✅ |
| `lib/supabase/context.ts` — plan, planEfectivo, esTrial, diasTrial | ✅ |
| `components/layout/PlanProvider.tsx` — Context client | ✅ |
| `components/layout/Sidebar.tsx` — badge TRIAL/PRO/BÁSICO | ✅ |
| `components/planes/UpgradeBanner.tsx` — bloqueo visual + CTA a /planes | ✅ |
| `components/planes/SolicitarUpgradeForm.tsx` — form de solicitud | ✅ |
| Guard en `/remitos` | ✅ |
| Guard en `/devoluciones` | ✅ |
| Guard en `/clientes/[id]` | ✅ |
| Guard en `/configuracion/etiquetas` | ✅ |
| Guard en `/configuracion/facturacion` | ✅ |
| Guard en `/configuracion/importar` | ✅ |
| `/superadmin` con cambiarPlan y extenderTrial | ✅ |
| `/planes` — tabla comparativa + SolicitarUpgradeForm | ✅ |
| Migración SQL `20260511000001_planes_billing.sql` | ✅ |

---

## Brechas Actuales — Qué Falta

| Brecha | Impacto |
|--------|---------|
| `crearProducto` no verifica el límite de 300 productos | Un Básico puede cargar 500+ productos sin restricción |
| `/productos/nuevo` no bloquea al llegar al límite | Formulario accesible aunque se haya superado el límite |
| `/productos` (lista) no muestra advertencia de límite | Usuario no sabe que está cerca del tope |
| Sidebar no tiene link a `/planes` | El usuario no puede llegar fácilmente a la página de upgrade |
| Badge de plan en sidebar no es clickeable | Oportunidad perdida de educación del usuario |
| Dashboard no avisa cuando el trial venció | Usuario confundido: "¿por qué no puedo entrar a Remitos?" |

---

## Cambios Propuestos

### Resumen de Cambios

- `actions/productos.ts` → guard en `crearProducto`: contar productos activos de la tienda, bloquear si plan=basico y count >= 300
- `app/(dashboard)/productos/page.tsx` → banner de límite (warning ≥250, error ≥300) para plan Básico
- `app/(dashboard)/productos/nuevo/page.tsx` → bloqueo con UpgradeBannerProductos si ya tiene 300+
- `components/layout/Sidebar.tsx` → agregar `/planes` al grupo Sistema + hacer badge clickeable
- `app/(dashboard)/dashboard/page.tsx` → banner de trial vencido visible en el tope del dashboard

### Archivos a Crear

| Ruta | Propósito |
|------|-----------|
| — | No se crean archivos nuevos |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `app/app/actions/productos.ts` | Guard en `crearProducto`: count + bloqueo si Básico ≥300 |
| `app/app/(dashboard)/productos/page.tsx` | Banner de límite para plan Básico (warning/error) |
| `app/app/(dashboard)/productos/nuevo/page.tsx` | Bloqueo completo si plan Básico y count ≥300 |
| `app/components/layout/Sidebar.tsx` | Agregar link `/planes` en nav + badge clickeable |
| `app/app/(dashboard)/dashboard/page.tsx` | Banner trial vencido |

---

## Decisiones de Diseño

### Decisiones Clave

1. **Bloqueo en server action + en página**: Doble protección. La action bloquea el insert real; la página bloquea el UX antes de que el usuario llene el formulario. El check en la action es la fuente de verdad de seguridad.

2. **Warning gradual en lista de productos**: A los 250 productos mostrar banner amarillo ("Estás cerca del límite — 50 restantes"). A los 300 mostrar banner rojo ("Límite alcanzado — no podés agregar más productos en el plan Básico").

3. **Badge clickeable → `/planes`**: El badge TRIAL/BÁSICO/PRO en el sidebar es el elemento más visible del plan. Convertirlo en link a `/planes` tiene costo cero y máximo impacto de conversión.

4. **Banner trial vencido en dashboard**: Cuando `trial_hasta` es pasado y `plan === 'basico'`, mostrar un banner amber en el tope del dashboard explicando qué pasó. Se descarta después de hacer click en "Ver planes" (o se mantiene hasta que el usuario upgradee — se mantiene siempre por simplicidad).

5. **No se bloquea la lista `/productos`**: Los 300 productos ya cargados siguen visibles. Solo se bloquea la creación de nuevos.

### Alternativas Consideradas

- **Límite en DB (trigger SQL)**: Más seguro pero más complejo de mantener y de dar mensajes de error amigables. Se descarta por ahora — la action es suficiente.
- **Ocultar link `/planes` hasta que el trial venza**: Mala idea. El usuario debe poder ver los planes en cualquier momento para hacer upgrade proactivo.

---

## Tareas Paso a Paso

### Paso 1: Guard en `crearProducto` (server action)

Antes de insertar un producto nuevo, contar cuántos productos activos tiene la tienda. Si el plan efectivo es `basico` y el count ≥ LIMITES_BASICO.max_productos, retornar error.

**Acciones:**
- Importar `getContextoTienda` y `LIMITES_BASICO` en `actions/productos.ts`
- Al inicio de `crearProducto`, después de `requireTiendaId()`, obtener el contexto y verificar el plan
- Contar productos activos: `supabase.from('productos').select('id', { count: 'exact', head: true }).eq('tienda_id', tiendaId).eq('activo', true)`
- Si `planEfectivo === 'basico' && count >= LIMITES_BASICO.max_productos` → retornar `{ ok: false, error: 'Alcanzaste el límite de 300 productos del plan Básico. Upgrade a Pro para productos ilimitados.' }`

**Archivos afectados:**
- `app/app/actions/productos.ts`

---

### Paso 2: Bloqueo en `/productos/nuevo` (página)

Si el usuario ya tiene 300+ productos y está en plan Básico, mostrar directamente el UpgradeBanner en lugar del formulario.

**Acciones:**
- En `app/app/(dashboard)/productos/nuevo/page.tsx`, importar `getContextoTienda`, `puedeUsar` y `UpgradeBanner`... wait, no hay una feature "productos_ilimitados". Usar lógica directa: leer `ctx.planEfectivo` y contar productos activos
- Si `planEfectivo === 'basico'`:
  - Contar productos activos con query a Supabase (igual que en la action)
  - Si count >= 300 → renderizar un componente de límite alcanzado (igual estructura que UpgradeBanner pero con mensaje específico: "Alcanzaste los 300 productos del plan Básico")
- Import del createClient de server para hacer el count

**Código de referencia para el bloqueo:**
```tsx
// Al inicio del componente de página (Server Component)
const ctx = await getContextoTienda()
if (ctx && ctx.planEfectivo === 'basico') {
  const supabase = await createClient()
  const { count } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('tienda_id', ctx.tiendaId)
    .eq('activo', true)
  if ((count ?? 0) >= LIMITES_BASICO.max_productos) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">📦</span>
          </div>
          <h2 className="text-[22px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
            Límite de productos alcanzado
          </h2>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            Tu plan Básico permite hasta 300 productos. Upgrade a Pro para productos ilimitados.
          </p>
          <Link href="/planes" className="inline-flex items-center justify-center w-full h-11 bg-[#0A0A0A] hover:bg-gray-800 text-white text-sm font-semibold rounded-full transition-colors">
            Ver planes y solicitar upgrade
          </Link>
        </div>
      </div>
    )
  }
}
```

**Archivos afectados:**
- `app/app/(dashboard)/productos/nuevo/page.tsx`

---

### Paso 3: Banner de límite en lista de productos

En la página `/productos`, si el plan es Básico, mostrar un banner contextual sobre la tabla de productos indicando cuántos productos quedan disponibles.

**Acciones:**
- En `app/app/(dashboard)/productos/page.tsx`, obtener el contexto y el count de productos activos (si planEfectivo === 'basico')
- Renderizar un banner debajo del header, antes de la tabla:
  - Si count >= 300: banner rojo/error — "Límite de 300 productos alcanzado. No podés agregar más. [Upgrade a Pro →]"
  - Si count >= 250 && count < 300: banner amarillo/warning — "Te quedan {300 - count} productos disponibles en tu plan Básico. [Ver planes →]"
  - Si count < 250: no mostrar nada (no molestar al usuario en el día a día)
- Pasar el count como prop al componente del banner (inline en la página, no crear componente separado)

**Archivos afectados:**
- `app/app/(dashboard)/productos/page.tsx`

---

### Paso 4: `/planes` en Sidebar + badge clickeable

Agregar "Planes" al grupo Sistema de la navegación y convertir el badge de plan en un link clickeable.

**Acciones en `Sidebar.tsx`:**

A. En `navGroups`, al grupo `'Sistema'` agregar el item:
```ts
{ href: '/planes', label: 'Planes', icon: <IconPlanes /> }
```
Donde `IconPlanes` es un SVG simple de estrella o tag de precio (agregar en `SidebarIcons.tsx` o inline).

B. El badge de plan en el header del sidebar (actualmente `<span>`) convertirlo en `<Link href="/planes">` — mismos estilos, cursor pointer.

**Archivos afectados:**
- `app/components/layout/Sidebar.tsx`
- `app/components/layout/SidebarIcons.tsx` (agregar IconPlanes)

---

### Paso 5: Banner "Trial vencido" en Dashboard

Cuando el trial venció y el usuario quedó en plan Básico, mostrar un aviso claro en el dashboard.

**Condición exacta:**
```ts
const trialVencido = ctx.plan === 'basico' && ctx.trial_hasta !== null && new Date(ctx.trial_hasta) < new Date()
```

**Acciones:**
- En `app/app/(dashboard)/dashboard/page.tsx`, calcular `trialVencido`
- Si true, renderizar un banner amber al **tope de la página**, antes de `<EstadoCajaBanner>`:

```tsx
{trialVencido && (
  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-amber-800">Tu período de prueba gratuita venció</p>
      <p className="text-xs text-amber-700 mt-0.5">
        Ahora estás en el plan Básico. Algunos módulos como Remitos y Devoluciones requieren plan Pro.
      </p>
    </div>
    <Link
      href="/planes"
      className="shrink-0 h-8 px-4 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-full transition-colors"
    >
      Ver planes
    </Link>
  </div>
)}
```

**Archivos afectados:**
- `app/app/(dashboard)/dashboard/page.tsx`

---

### Paso 6: Verificar errores

Correr `get_errors` en todos los archivos modificados para asegurar que no hay errores TypeScript.

**Archivos a verificar:**
- `app/app/actions/productos.ts`
- `app/app/(dashboard)/productos/page.tsx`
- `app/app/(dashboard)/productos/nuevo/page.tsx`
- `app/components/layout/Sidebar.tsx`
- `app/components/layout/SidebarIcons.tsx`
- `app/app/(dashboard)/dashboard/page.tsx`

---

## Orden de Implementación

1. Paso 1 — Guard en action (base de seguridad real)
2. Paso 2 — Bloqueo en página nuevo (UX consistente)
3. Paso 3 — Banner warning en lista de productos
4. Paso 4 — Planes en sidebar + badge clickeable
5. Paso 5 — Banner trial vencido en dashboard
6. Paso 6 — Verificar errores

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/planes/config.ts` — fuente de verdad de LIMITES_BASICO y puedeUsar
- `app/lib/supabase/context.ts` — provee plan/planEfectivo/esTrial/diasTrial
- `app/app/(dashboard)/layout.tsx` — inyecta PlanProvider con datos del contexto
- `app/components/layout/Sidebar.tsx` — badge visual del plan

### Notas

- El campo `plan` en DB default es `'basico'` — tiendas existentes creadas antes de la migración tienen plan=basico automáticamente.
- El trigger `set_trial_on_insert` solo aplica a tiendas creadas DESPUÉS de la migración. Tiendas previas no tienen trial_hasta. Esto es correcto — esas tiendas están en Básico directo.
- `SUPERADMIN_EMAIL` debe estar en `.env.local` y en Vercel para que `/superadmin` funcione.
