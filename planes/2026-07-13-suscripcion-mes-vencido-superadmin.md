# Plan: Suscripción mensual — bloqueo por mes vencido (superadmin)

**Creado:** 2026-07-13
**Estado:** Implementado
**Pedido:** Sistema de mes vencido gestionable desde superadmin; si no renuevan, no pueden usar nada hasta renovar.

---

## Descripción General

### Qué Logra Este Plan

Agrega a cada tienda una fecha **`acceso_hasta`** (fin del período pago) y un mecanismo de **bloqueo total del dashboard** cuando esa fecha ya pasó (y no hay trial vigente). El superadmin puede registrar un pago renovando N días/meses y ver de un vistazo quién está al día, por vencer o vencido. Sin cobro automático: el flujo sigue siendo manual (transferencia / MercadoPago link fuera de la app).

### Por Qué Importa

Hoy un cliente Pro o Básico puede seguir usando el sistema indefinidamente aunque no pague: solo se distinguen features (`basico` vs `pro`) y un trial. Para monetizar de verdad hace falta un **interruptor de acceso por tiempo**, operable desde `/superadmin`, sin depender aún de una pasarela de suscripciones.

---

## Estado Actual

### Estructura Existente Relevante

| Pieza | Estado |
|-------|--------|
| `tiendas.plan` (`basico` \| `pro`) | ✅ |
| `tiendas.trial_hasta` | ✅ — trial 14 días al crear tienda |
| `tiendas.plan_activo_desde` | ✅ — no controla vencimiento |
| `/superadmin` + `cambiarPlan` / `extenderTrial` / `setTrialFecha` | ✅ |
| Guards de features Pro (`puedeUsar`, UpgradeBanner) | ✅ — no bloquean acceso completo |
| Middleware (`lib/supabase/middleware.ts`) | Auth + rol cajero; **sin chequeo de pago** |
| Dashboard layout + `PlanProvider` / `getContextoTienda` | Leen `plan` + `trial_hasta` |

**Archivos clave:**

- `supabase/migrations/20260511000001_planes_billing.sql`
- `app/lib/planes/config.ts`
- `app/app/actions/superadmin.ts`
- `app/components/superadmin/SuperAdminPanel.tsx`
- `app/app/superadmin/page.tsx`
- `app/app/(dashboard)/layout.tsx`
- `app/lib/supabase/context.ts`
- `app/lib/supabase/middleware.ts`

### Brechas o Problemas que se Abordan

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | No existe fecha de fin de mes pago | Un Pro “permanente” no vence nunca |
| B2 | Superadmin no puede marcar “pagó el mes” | Gestión ad-hoc fuera del sistema |
| B3 | No hay bloqueo duro de POS/caja/stock | Cliente moroso sigue operando |
| B4 | Trial y plan no modelan el ciclo comercial mensual | Confusión entre “tiene Pro” y “está al día” |

---

## Cambios Propuestos

### Resumen de Cambios

- Migración SQL: columna `acceso_hasta` (+ opcional `ultimo_pago_at`) en `tiendas`.
- Reglas de acceso: `tieneAcceso = trial activo OR acceso_hasta >= hoy`.
- Bloqueo total del dashboard (salvo pantalla de vencido + logout + superadmin).
- Superadmin: renovar 30/60/90 días, fijar fecha exacta, badge VENCIDO / POR VENCER / AL DÍA.
- Avisos soft: banner 7 días antes y 3 días antes (sin bloquear).
- Al marcar pago / activar plan pago desde superadmin: setear o extender `acceso_hasta`.
- Al crear tienda: `acceso_hasta = trial_hasta` (mismo 14 días) para un solo mecanismo de tiempo.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | ---------------------------------- |
| `supabase/migrations/20260713000001_acceso_hasta_suscripcion.sql` | Columna `acceso_hasta`, backfill desde trial, comentarios |
| `app/components/planes/AccesoVencidoScreen.tsx` | Pantalla full-page cuando no hay acceso: mensaje + contacto + logout |
| `app/components/planes/AvisoAccesoPorVencer.tsx` | Banner amarillo en dashboard cuando quedan ≤7 días |
| `app/lib/planes/acceso.ts` | Helpers: `tieneAcceso`, `diasRestantesAcceso`, `estadoAcceso` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/planes/config.ts` | Re-export o documentar relación trial vs acceso; sin mezclar conceptualmente |
| `app/lib/supabase/context.ts` | Incluir `acceso_hasta`, `tieneAcceso`, `diasAcceso`, `estadoAcceso` |
| `app/app/(dashboard)/layout.tsx` | Leer `acceso_hasta`; si sin acceso → render `AccesoVencidoScreen` (sin AppShell operativo) |
| `app/app/actions/superadmin.ts` | Actions: `renovarAcceso`, `setAccesoHasta`; al `cambiarPlan` a pro → setear +30d si no tiene acceso futuro |
| `app/components/superadmin/SuperAdminPanel.tsx` | UI renovación, badges, stats “Vencidos” / “Por vencer” |
| `app/app/superadmin/page.tsx` | Select `acceso_hasta` |
| `app/components/layout/PlanProvider.tsx` | Exponer estado de acceso al cliente |
| `contexto/estrategia.md` o `proyectos.md` | Nota breve del modelo comercial (opcional, mínimo) |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Campo `acceso_hasta` (timestamptz) en `tiendas`**: Una sola fecha “puede usar hasta…”. Más simple que tabla de pagos para el MVP manual. Opcional `ultimo_pago_at` para auditoría liviana sin historial completo.

2. **Bloqueo total (hard lock), no solo banner**: Si venció, no POS, no caja, no stock, no reportes. Solo pantalla “Suscripción vencida” + cerrar sesión. Motivo: el pedido es “que no puedan usar nada hasta renovar”.

3. **Trial cuenta como acceso**: Mientras `trial_hasta > now()`, hay acceso aunque `acceso_hasta` esté vacío o vencido. Así no se rompe el onboarding actual. Al crear tienda: setear `acceso_hasta = trial_hasta` vía trigger (o en el trigger existente).

4. **Renovación desde superadmin = operación principal**: Botones `+30 días`, `+60`, `+90` y date picker. Extiende desde `max(ahora, acceso_hasta_actual)` igual que `extenderTrial`.

5. **Sin pasarela en este plan**: MercadoPago suscripciones queda fuera. El owner cobra por transferencia / link y marca el mes en superadmin.

6. **Superadmin nunca bloqueado**: Rutas `/superadmin` y auth fuera del layout dashboard; el chequeo de acceso solo aplica a `(dashboard)/layout.tsx` (y opcionalmente middleware de refuerzo).

7. **Enforcement en layout (primary) + recomendación middleware (secondary)**: Layout cubre todas las páginas del AppShell. Middleware opcional: si se puede leer `acceso_hasta` sin roundtrip caro, redirigir a `/acceso-vencido`. Para MVP: **layout + ruta dedicada `/acceso-vencido`** dentro del grupo dashboard o page exclusiva fuera del shell.

8. **Cajeros también bloqueados**: Si la tienda no pagó, el cajero tampoco vende. Mismo destino.

9. **Básico también paga / también vence**: El bloqueo no distingue plan. Plan = features; `acceso_hasta` = derecho a usar. Un Básico vencido tampoco entra.

### Alternativas Consideradas

| Alternativa | Por qué se rechaza (por ahora) |
|-------------|-------------------------------|
| Solo bajar a Básico al vencer | No cumple “no puedan usar nada” |
| Tabla `pagos_suscripcion` completa | Útil después; overkill para marcar mes a mano |
| Cron automático que “suspende” | Innecesario si el check es `acceso_hasta < now()` en cada request |
| Bloqueo solo POS (dejar reportes) | Debilita coerción de cobro |
| Integrar MercadoPago suscripciones ya | Fuera de alcance; aparece en “Notas / futuro” |

### Preguntas Abiertas (si las hay)

1. **¿Días de gracia después del vencimiento?** Propuesta por defecto: **0** (bloquea el día siguiente a las 00:00 según `acceso_hasta`). Confirmar.
2. **¿Texto de contacto en pantalla vencida?** (WhatsApp / teléfono / email del founder). Confirmar dato a mostrar.
3. **¿Al activar Pro desde superadmin sin setear fecha, auto +30 días?** Propuesta: **sí**.
4. **Backfill tiendas existentes:** ¿poner `acceso_hasta = now() + 30 days` a todas, o solo a las con trial vigente y el resto vencidas? Propuesta: **+30 días a todas existentes** para no cortar clientes activos al deploy.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración SQL — `acceso_hasta`

Crear `supabase/migrations/20260713000001_acceso_hasta_suscripcion.sql`:

```sql
-- Fin del período de acceso pago (o alineado al trial).
alter table public.tiendas
  add column if not exists acceso_hasta timestamptz,
  add column if not exists ultimo_pago_at timestamptz;

comment on column public.tiendas.acceso_hasta is
  'Último día/instante hasta el cual la tienda puede usar el sistema (pago mensual). Null o fecha pasada = sin acceso (salvo trial activo).';
comment on column public.tiendas.ultimo_pago_at is
  'Timestamp del último registro de pago/renovación hecho por superadmin.';

-- Backfill: tiendas existentes → 30 días de margen al deploy
update public.tiendas
set acceso_hasta = now() + interval '30 days'
where acceso_hasta is null;

-- Extender trigger de trial para alinear acceso_hasta al crear tienda
create or replace function public.set_trial_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.trial_hasta      := coalesce(new.trial_hasta, now() + interval '14 days');
  new.plan_activo_desde := coalesce(new.plan_activo_desde, now());
  new.acceso_hasta     := coalesce(new.acceso_hasta, new.trial_hasta);
  return new;
end;
$$;
```

**Acciones:**

- Escribir y aplicar la migración en entorno local/staging/prod según el flujo del proyecto (Supabase CLI o SQL Editor).
- Verificar con `select id, nombre, trial_hasta, acceso_hasta from tiendas limit 20`.

**Archivos afectados:**

- `supabase/migrations/20260713000001_acceso_hasta_suscripcion.sql`

---

### Paso 2: Helpers de acceso en `lib/planes`

Crear `app/lib/planes/acceso.ts`:

```typescript
export type EstadoAcceso = 'activo' | 'por_vencer' | 'vencido' | 'trial'

export function tieneAcceso(params: {
  acceso_hasta: string | null | undefined
  trial_hasta: string | null | undefined
  now?: Date
}): boolean {
  const now = params.now ?? new Date()
  if (params.trial_hasta && new Date(params.trial_hasta) > now) return true
  if (params.acceso_hasta && new Date(params.acceso_hasta) > now) return true
  return false
}

export function diasRestantesAcceso(acceso_hasta: string | null | undefined, now = new Date()): number {
  if (!acceso_hasta) return 0
  const diff = new Date(acceso_hasta).getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/** Umbral “por vencer”: ≤ 7 días y con acceso */
export function estadoAcceso(...): EstadoAcceso { /* trial | por_vencer | activo | vencido */ }
```

**Acciones:**

- Implementar helpers puros y testeables.
- Documentar en comentario: plan (features) ≠ acceso (pago).

**Archivos afectados:**

- `app/lib/planes/acceso.ts` (nuevo)
- Opcional: re-export desde `config.ts`

---

### Paso 3: Extender contexto y layout — bloqueo duro

**Acciones:**

1. En `getContextoTienda`: seleccionar `acceso_hasta`; calcular `tieneAcceso`, `diasAcceso`, `estadoAcceso`.
2. En `(dashboard)/layout.tsx`:
   - Leer `acceso_hasta` junto con plan/trial.
   - Si `!tieneAcceso` → **no renderizar AppShell con children operativos**; renderizar `AccesoVencidoScreen` (nombre tienda, fechas, CTA WhatsApp/contacto, botón logout vía `logoutAction`).
   - Permitir solo logout en esa pantalla.
3. Extender `PlanProvider` con campos de acceso para banners client-side.
4. Insertar `AvisoAccesoPorVencer` en layout o dashboard cuando `estadoAcceso === 'por_vencer'`.

**Contenido mínimo de `AccesoVencidoScreen`:**

- Título: “Tu suscripción está vencida”
- Texto: “El acceso se reactivará cuando registremos tu pago. Contactanos para renovar.”
- Datos: plan actual, fecha de vencimiento formateada `es-AR`
- Botón contacto (link `wa.me/...` o mailto — usar dato de pregunta abierta; placeholder en env `NEXT_PUBLIC_WHATSAPP_SOPORTE` si existe, o texto fijo editable)
- Botón “Cerrar sesión”

**Archivos afectados:**

- `app/lib/supabase/context.ts`
- `app/app/(dashboard)/layout.tsx`
- `app/components/layout/PlanProvider.tsx`
- `app/components/planes/AccesoVencidoScreen.tsx`
- `app/components/planes/AvisoAccesoPorVencer.tsx`

---

### Paso 4: Server actions superadmin — renovar acceso

En `app/app/actions/superadmin.ts` agregar:

```typescript
export async function renovarAcceso(tiendaId: string, dias: number)
// max(now, acceso_hasta) + dias; set ultimo_pago_at = now()

export async function setAccesoHasta(tiendaId: string, fechaISO: string | null)
// date picker; si setea futuro, opcionalmente set ultimo_pago_at
```

Modificar `cambiarPlan`:

- Si `plan === 'pro'`: además de `plan_activo_desde`, si `acceso_hasta` está vacío o vencido → `acceso_hasta = now() + 30 days` y `ultimo_pago_at = now()` (salvo que se pase opción explícita).
- Si baja a `basico`: **no** tocar `acceso_hasta` (sigue bloqueado o no según fecha).

**Acciones:**

- Implementar con `assertSuperAdmin` + `createAdminClient`.
- Validar `dias` ∈ {30, 60, 90} o positivo genérico.

**Archivos afectados:**

- `app/app/actions/superadmin.ts`

---

### Paso 5: UI SuperAdmin — renovación y badges

**Acciones:**

1. Select `acceso_hasta`, `ultimo_pago_at` en `superadmin/page.tsx`.
2. En `SuperAdminPanel`:
   - Stats: Vencidos | Por vencer (≤7d) | Al día | Trial.
   - Badge por fila: `VENCIDO` (rojo), `POR VENCER` (ámbar), `AL DÍA` (verde), `TRIAL` (ámbar existente).
   - En panel expandido:
     - Mostrar `acceso_hasta` como date input + Guardar (`setAccesoHasta`).
     - Botones `+30d` `+60d` `+90d` → `renovarAcceso`.
     - Texto auxiliar: “Extiende desde hoy o desde la fecha actual si aún no venció.”
   - Orden sugerido de lista: vencidos primero, luego por vencer, luego resto (opcional `sort` en page).

**Archivos afectados:**

- `app/app/superadmin/page.tsx`
- `app/components/superadmin/SuperAdminPanel.tsx`

---

### Paso 6 (opcional reforzado): middleware redirect

Si se desea cortar navegación temprana (cajero a `/pos`, deep links):

**Acciones:**

- En middleware, después de auth, para rutas del dashboard (no `/superadmin`, no auth públicas): join perfil → tienda `acceso_hasta` + `trial_hasta`; si sin acceso, redirect a una ruta tipo `/suscripcion-vencida` **fuera** del layout operativo **o** misma app con layout mínimo.
- Cuidado de latencia: una query extra por request. Alternativa MVP aceptable: **solo layout** (Paso 3) y deferir middleware.

**Recomendación del plan:** implementar **primero solo layout**; middleware como mejora si se detectan deep links sin pasar por layout (poco probable en App Router group).

**Archivos afectados (si se hace):**

- `app/lib/supabase/middleware.ts`
- Posible `app/app/(blocked)/suscripcion-vencida/page.tsx`

---

### Paso 7: Tipos DB / TypeScript

**Acciones:**

- Si el proyecto regenera types desde Supabase, regenerar; si no, agregar `acceso_hasta` y `ultimo_pago_at` en `types/database.ts` (tabla `tiendas`) manualmente.

**Archivos afectados:**

- `app/types/database.ts` (o generado)

---

### Paso 8: Validación manual

**Acciones (checklist QA):**

1. Tienda con `acceso_hasta` futuro → dashboard normal.
2. Superadmin pone fecha ayer → usuario ve pantalla vencida; no puede ir a `/pos` ni vía URL (layout lo atrapa).
3. Superadmin `+30d` → acceso restaurado.
4. Trial activo con `acceso_hasta` null/pasado → **sigue entrando** (trial).
5. Cajero de tienda vencida → también bloqueado.
6. Superadmin con email correcto → siempre entra a `/superadmin`.
7. Banner por vencer visible con ≤7 días y acceso aún válido.
8. Nueva tienda al registrarse → `trial_hasta` y `acceso_hasta` ~14 días.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/planes/page.tsx` — copy puede mencionar “suscripción mensual / renovación”
- `contexto/estrategia.md` — pricing ya definido; agregar modelo de cobranza manual
- `planes/2026-05-11-modulo-planes-y-billing.md` — plan original sin vencimiento

### Actualizaciones Necesarias para Consistencia

- UI `/planes`: una línea “El acceso se renueva cada mes. Si vence, el sistema se pausa hasta confirmar el pago.”
- Documentar en superadmin ayuda inline (ya en el panel).

### Impacto en Flujos de Trabajo Existentes

- Upgrade Pro deja de ser “para siempre” implícito: al activar Pro se debe renovar mes a mes.
- Trial sigue siendo el onboarding gratis; al vencer sin pago → bloqueo (si `acceso_hasta` no se extendió).
- Cobranza: proceso operativo del founder = cobrar → abrir superadmin → `+30d`.

---

## Lista de Validación

- [x] Migración creada; columnas `acceso_hasta` / `ultimo_pago_at` (aplicar en Supabase)
- [x] Tiendas nuevas: trigger alinea `acceso_hasta` a trial
- [x] `tieneAcceso` / `estadoAcceso` usados en layout
- [x] Pantalla de vencido sin AppShell operativo
- [x] Superadmin puede renovar +30/60/90 y setear fecha
- [x] Stats y badges VENCIDO / POR VENCER / AL DÍA / TRIAL
- [x] Trial vigente mantiene acceso (helper)
- [x] Cajeros bloqueados si tienda vencida (mismo layout)
- [x] Banner ≤7 días antes del vencimiento
- [x] Types TS actualizados
- [ ] QA en runtime post-migración (Paso 8 — manual en prod/staging)

---

## Criterios de Éxito

1. Un comercio con `acceso_hasta` en el pasado (y sin trial) **no puede operar** ninguna pantalla del sistema hasta que el superadmin renueve.
2. El founder puede gestionar el mes de cada tienda en **&lt; 15 segundos** desde `/superadmin` (`+30d`).
3. Queda clara la separación: **plan = features**, **acceso_hasta = derecho a usar**.

---

## Notas

### Flujo operativo sugerido (mensual)

1. Cliente paga (transferencia / link MP).
2. Fundador entra a `/superadmin` → tienda → `+30d` (o setea día exacto).
3. Cliente entra y sigue trabajando.
4. Si no paga: el día después de `acceso_hasta` ve pantalla de bloqueo.

### Futuro (fuera de este plan)

- Historial de pagos en tabla `pagos_suscripcion`
- Webhook MercadoPago / recordatorios WhatsApp automáticos
- Período de gracia configurable
- Impresión PDF de recibo de pago

### Defaults recomendados si el usuario no responde las preguntas abiertas

| Pregunta | Default |
|----------|---------|
| Gracia | 0 días |
| Contacto pantalla | `NEXT_PUBLIC_WHATSAPP_SOPORTE` o texto “Contactá a soporte para renovar” |
| Activar Pro → +30d | Sí |
| Backfill existentes | +30 días desde deploy |

---

## Notas de Implementación

**Implementado:** 2026-07-13

### Resumen

- Migración `20260713000001_acceso_hasta_suscripcion.sql` con backfill +30d y trigger de alta.
- Helpers `lib/planes/acceso.ts` + re-export en `config.ts`.
- Layout del dashboard bloquea con `AccesoVencidoScreen` si no hay acceso.
- Banner `AvisoAccesoPorVencer` (≤7 días).
- Superadmin: `renovarAcceso`, `setAccesoHasta`, badges y stats; Activar Pro auto +30d si sin acceso.
- Copy en `/planes` y nota en `contexto/estrategia.md`.

### Desviaciones del Plan

- Middleware de redirect no implementado (plan lo marcaba opcional; enforcement vía layout).
- Defaults de preguntas abiertas aplicados sin respuesta explícita del usuario.

### Problemas Encontrados

- Ninguno en código. **Pendiente crítico:** aplicar la migración SQL en Supabase (local/prod) para que las columnas existan; sin eso fallarán los selects.
