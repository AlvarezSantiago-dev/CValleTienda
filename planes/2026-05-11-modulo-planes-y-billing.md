# Plan: Módulo de Planes y Billing

**Creado:** 2026-05-11
**Estado:** Borrador
**Pedido:** Implementar sistema de planes (Básico/Pro + trial 14 días), limitar módulos según plan, y área /superadmin para gestión manual de upgrades.

---

## Descripción General

### Qué Logra Este Plan

Agrega a la tabla `tiendas` los campos de plan/billing, define en código los límites de cada plan, aplica guards en los módulos protegidos (banner de upgrade en lugar de bloqueo duro), y crea un área `/superadmin` (protegida por email) donde el owner puede ver todas las tiendas, cambiar su plan y extender el trial.

### Por Qué Importa

CValleTienda pasa de ser un sistema "gratis para todos" a un producto SaaS monetizable. El modelo manual (sin pasarela de pago automática por ahora) es correcto para la etapa de primeros clientes: el upgrade llega como solicitud al superadmin, quien lo activa manualmente. Esto permite validar el producto antes de integrar MercadoPago suscripciones.

---

## Estado Actual

### Estructura Existente Relevante

- `supabase/migrations/20260419000001_tiendas.sql` — tabla `tiendas` sin campos de plan
- `app/lib/supabase/context.ts` — `getContextoTienda()` devuelve `{userId, tiendaId, rubro, nombre}` — hay que extender con `plan` y `trial_hasta`
- `app/app/(dashboard)/layout.tsx` — DashboardLayout lee tienda; ideal para inyectar contexto de plan
- `app/components/layout/Sidebar.tsx` — sidebar estático sin indicador de plan
- Módulos protegidos: **Remitos**, **Devoluciones**, **CRM completo** (límite productos en Básico)

### Brechas o Problemas que se Abordan

- No existe ninguna distinción de plan — cualquier tienda accede a todo
- No hay forma de gestionar tiendas como admin
- No hay trial automático al crear tienda
- No hay feedback visual cuando el plan no incluye una funcionalidad

---

## Planes Definidos

### Plan BÁSICO — $19.900 ARS/mes

| Feature | Límite |
|---------|--------|
| POS, Tickets, Caja, Dashboard, Etiquetas (plantilla fija) | ✅ Incluido |
| Productos | Hasta 300 |
| Usuarios | 1 |
| Clientes | Solo asignar en venta (sin CRM completo) |
| Ventas (listado) | ✅ |
| Remitos | ❌ Bloqueado |
| Devoluciones | ❌ Bloqueado |
| CRM (historial, cuenta corriente, ficha detalle) | ❌ Bloqueado |
| Importación CSV | ❌ Bloqueado |
| Diseñador de etiquetas | ❌ Bloqueado |
| Facturación electrónica | ❌ Bloqueado |

### Plan PRO — $39.900 ARS/mes

Todo ilimitado. Sin restricciones.

### Trial — 14 días gratis desde registro

Comportamiento igual a PRO. Al vencer queda como BÁSICO hasta que el owner gestione upgrade.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva migración SQL: agrega `plan`, `trial_hasta`, `plan_activo_desde` a `tiendas`
- `lib/planes/config.ts` — constantes y función `puedeUsar(plan, feature)`
- `lib/supabase/context.ts` — extender `ContextoTienda` con `plan` y `esTrial`
- `app/(dashboard)/layout.tsx` — leer plan de tienda, pasar a `RubroProvider` (o nuevo `PlanProvider`)
- Nuevo `components/layout/PlanProvider.tsx` — Context de plan accesible en cliente
- Nuevo `components/planes/UpgradeBanner.tsx` — banner reutilizable "Upgrade a Pro"
- Nuevo `components/planes/UpgradeGate.tsx` — wrapper que muestra banner si el plan no alcanza
- Guards en páginas protegidas: `/remitos`, `/devoluciones`, `/clientes/[id]`, `/configuracion/importar`, `/configuracion/etiquetas`, `/configuracion/facturacion`
- Sidebar: badge de plan (TRIAL / BÁSICO / PRO) debajo del nombre de tienda
- Nueva ruta `/planes` — página de upgrade dentro del dashboard (muestra los 2 planes, botón "Solicitar upgrade")
- Nueva ruta `/superadmin` — protegida por variable de entorno `SUPERADMIN_EMAIL`
  - Lista todas las tiendas con plan/estado/trial
  - Botones para cambiar plan y extender trial
  - Acciones server-side directo a Supabase con service_role key
- `app/actions/superadmin.ts` — server actions para cambiar plan (solo accesibles si email == SUPERADMIN_EMAIL)
- Migración: trigger en `tiendas` para setear `trial_hasta = now() + 14 days` en INSERT

---

## Archivos a Crear

| Ruta | Propósito |
|------|-----------|
| `supabase/migrations/20260511000001_planes_billing.sql` | Agrega campos plan/trial a tiendas, trigger trial automático |
| `app/lib/planes/config.ts` | Constantes PLANES, función `puedeUsar(plan, feature)`, helpers |
| `app/components/layout/PlanProvider.tsx` | React Context de plan para componentes client-side |
| `app/components/planes/UpgradeBanner.tsx` | Banner visual "Esta función es Pro — Solicitar upgrade" |
| `app/components/planes/UpgradeGate.tsx` | HOC/wrapper: si plan no alcanza, muestra UpgradeBanner en lugar del children |
| `app/app/(dashboard)/planes/page.tsx` | Página de upgrade: muestra tabla comparativa Básico vs Pro, CTA "Solicitar upgrade" |
| `app/app/superadmin/layout.tsx` | Layout superadmin: verifica SUPERADMIN_EMAIL, redirect si no coincide |
| `app/app/superadmin/page.tsx` | Lista todas las tiendas con plan, estado, trial, botones de acción |
| `app/actions/superadmin.ts` | Server actions: cambiarPlan, extenderTrial (con guard de email) |

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `app/lib/supabase/context.ts` | Extender `ContextoTienda` con `plan: PlanTipo`, `trial_hasta: string \| null`, `esTrial: boolean`, `planEfectivo: PlanTipo` |
| `app/app/(dashboard)/layout.tsx` | Leer `plan` y `trial_hasta` de tienda, pasar al `PlanProvider` que envuelve el layout |
| `app/components/layout/Sidebar.tsx` | Agregar badge de plan (TRIAL / PRO / BÁSICO) debajo del nombre de tienda. Leer del PlanProvider. |
| `app/types/database.ts` | Agregar `PlanTipo = 'basico' \| 'pro'` y campos en interface `Tienda` |

---

## Detalles de Implementación

### SQL — Nuevos campos en `tiendas`

```sql
alter table public.tiendas
  add column plan            text not null default 'basico' check (plan in ('basico', 'pro')),
  add column trial_hasta     timestamptz,
  add column plan_activo_desde timestamptz;

-- Trigger: al crear tienda, setear trial_hasta = now() + 14 días
create or replace function public.set_trial_on_insert()
returns trigger language plpgsql as $$
begin
  new.trial_hasta = now() + interval '14 days';
  new.plan_activo_desde = now();
  return new;
end;
$$;

create trigger tiendas_set_trial
  before insert on public.tiendas
  for each row execute function public.set_trial_on_insert();
```

### `lib/planes/config.ts`

```ts
export type PlanTipo = 'basico' | 'pro'

export type Feature =
  | 'remitos'
  | 'devoluciones'
  | 'crm_completo'         // ficha detalle cliente + historial + cuenta corriente
  | 'importar_csv'
  | 'disenador_etiquetas'
  | 'facturacion'
  | 'usuarios_multiples'   // future

export const LIMITES_BASICO = {
  max_productos: 300,
}

const FEATURES_PRO: Feature[] = [
  'remitos', 'devoluciones', 'crm_completo',
  'importar_csv', 'disenador_etiquetas', 'facturacion', 'usuarios_multiples',
]

export function puedeUsar(planEfectivo: PlanTipo, feature: Feature): boolean {
  if (planEfectivo === 'pro') return true
  return !FEATURES_PRO.includes(feature)
}

// Plan efectivo considera el trial
export function getPlanEfectivo(plan: PlanTipo, trial_hasta: string | null): PlanTipo {
  if (trial_hasta && new Date(trial_hasta) > new Date()) return 'pro'
  return plan
}
```

### `UpgradeGate.tsx` — uso en páginas

```tsx
// En /remitos/page.tsx (Server Component):
const ctx = await getContextoTienda()
if (!puedeUsar(ctx.planEfectivo, 'remitos')) {
  return <UpgradeBanner feature="remitos" />
}
// ... resto de la página
```

### `UpgradeBanner.tsx`

Banner visual con:
- Ícono de candado
- Título: "Esta función está disponible en el plan Pro"
- Precio: "$39.900/mes — todo incluido, sin límites"
- CTA: botón negro rounded-full → enlaza a `/planes`
- Descripción breve de qué incluye Pro

### Página `/planes`

Tabla comparativa Básico vs Pro con checkmarks. CTA "Solicitar upgrade" envía un request (server action) que:
1. Inserta en tabla `solicitudes_upgrade` (nueva tabla simple)
2. Manda email al superadmin (o simplemente queda registrado para ver en `/superadmin`)

No se necesita pasarela de pago ahora — el owner activa manualmente desde superadmin.

### `/superadmin`

- Acceso: solo si `user.email === process.env.SUPERADMIN_EMAIL`
- Lista: todas las tiendas, columnas: nombre, rubro, plan, trial_hasta, plan_activo_desde, solicitud_pendiente
- Acciones por fila:
  - **Activar Pro** — llama `cambiarPlan(tiendaId, 'pro')`
  - **Bajar a Básico** — llama `cambiarPlan(tiendaId, 'basico')`
  - **+30 días trial** — llama `extenderTrial(tiendaId, 30)`
- También muestra la lista de `solicitudes_upgrade` pendientes

### Sidebar badge

Debajo del nombre de tienda, una línea con:
- 🟡 **TRIAL** (días restantes) — si está en trial
- ⚫ **PRO** — si es pro activo
- ⚪ **BÁSICO** — si es básico sin trial

---

## Orden de Implementación

1. **SQL** — migración con campos + trigger trial
2. **`lib/planes/config.ts`** — la base de todo
3. **Extender `ContextoTienda`** + `types/database.ts`
4. **`PlanProvider`** + modificar `layout.tsx` para inyectarlo
5. **`UpgradeBanner`** + **`UpgradeGate`**
6. **Guards en páginas protegidas** (remitos, devoluciones, clientes/[id], importar, etiquetas, facturacion)
7. **Badge en Sidebar**
8. **Página `/planes`** + tabla `solicitudes_upgrade`
9. **`/superadmin`** completo con server actions

---

## Consideraciones de Seguridad

- El guard de superadmin debe hacerse en **Server Component / layout**, nunca solo en cliente
- `SUPERADMIN_EMAIL` como variable de entorno, nunca hardcodeada
- Las server actions de superadmin verifican el email del usuario autenticado antes de ejecutar cualquier cambio
- RLS en `tiendas`: solo el service_role puede actualizar el campo `plan` (los usuarios normales no pueden hacerse Pro solos)

---

## Precios Definidos

- **Básico:** $19.900 ARS/mes
- **Pro:** $39.900 ARS/mes
- **Trial:** 14 días gratis al registrarse (funciona como Pro)

---

## Notas

- No hay integración con pasarela de pago en este plan. El flujo es: solicitud → superadmin activa manualmente → el cliente paga por transferencia/MercadoPago link
- En el futuro se puede integrar MercadoPago Suscripciones automáticas encima de esta base
- El campo `plan` en DB ya queda preparado para automatización futura
