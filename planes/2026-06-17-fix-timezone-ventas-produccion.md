# Plan: Fix desfase horario ventas en producción (UTC vs Argentina)

**Creado:** 2026-06-17
**Estado:** Implementado
**Pedido:** Analizar por qué en producción el ticket muestra la hora correcta pero la venta en el sistema aparece corrida ~3 h; evaluar si migrar la DB de US (Ohio) a Brasil resuelve el problema sin perder datos de clientes activos.

---

## Descripción General

### Qué Logra Este Plan

Documenta la **causa raíz** del desfase (formato de fechas en el servidor Next.js/Vercel sin timezone explícita vs tickets formateados en Postgres con `America/Argentina/Buenos_Aires`), descarta la migración de región de Supabase como solución, y define un **fix de código** de bajo riesgo: centralizar timezone Argentina en helpers y aplicarlo en UI + filtros por fecha. **No toca datos existentes** en la base.

### Por Qué Importa

Clientes activos confían en la hora de ventas para caja, devoluciones y auditoría. Un desfase de 3 h en listados/detalle — mientras el ticket impreso es correcto — genera desconfianza y puede afectar filtros “ventas de hoy”, KPIs del dashboard y reportes. La solución debe ser **deploy de código**, no una migración de infraestructura arriesgada.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivo / patrón | Comportamiento |
|------|------------------|----------------|
| **Ticket (correcto en prod)** | `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql` | `'fecha', to_char(v_venta.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI')` |
| **Detalle venta (incorrecto en prod)** | `app/app/(dashboard)/ventas/[id]/page.tsx` L75-78 | `new Date(venta.created_at).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })` **sin `timeZone`** |
| **Listado ventas** | `app/app/(dashboard)/ventas/page.tsx` L17-21 | `formatDateTime` inline, sin timezone |
| **Helper compartido** | `app/lib/format.ts` L15-25 | `formatDateTime` / `formatDate` sin `timeZone` |
| **Email cierre (correcto)** | `app/lib/email/templates/cierre-caja.ts` L47-54 | **Sí** usa `timeZone: 'America/Argentina/Buenos_Aires'` |
| **Almacenamiento DB** | columnas `timestamptz` + `default now()` | Postgres guarda instante UTC; región del cluster **no altera** el valor almacenado |
| **Filtros “hoy”** | `app/lib/ventas/queries.ts` L177-180, `app/lib/dashboard/queries.ts` L94-115 | `new Date(); setHours(0,0,0,0); toISOString()` usa **medianoche del servidor** (UTC en Vercel), no medianoche Argentina |
| **Infra** | Supabase `us-east-2` (Ohio), deploy Vercel | Servidor Node en **UTC**; usuario en Argentina (UTC−3) |

### Brechas o Problemas que se Abordan

| # | Problema | Evidencia |
|---|----------|-----------|
| B1 | UI formatea fechas con locale `es-AR` pero **timezone del host** | Localhost (Windows AR) = OK; Vercel (UTC) = +3 h vs ticket |
| B2 | Ticket usa timezone explícita en SQL | Mismo `created_at`, distinta presentación |
| B3 | Filtros por día usan límites UTC | “Ventas de hoy” / KPIs pueden incluir/excluir ventas incorrectas cerca de medianoche |
| B4 | Hipótesis “migrar DB a Brasil” | **No corrige** el render en Vercel; riesgo innecesario con clientes activos |

### Diagnóstico técnico (causa raíz)

```
Venta a las 21:47 en Cinco Saltos (ART, UTC−3)
        │
        ▼
Postgres guarda: 2026-06-18T00:47:00.000Z  (timestamptz UTC — CORRECTO)
        │
        ├─► build_payload_ticket_venta (SQL)
        │       AT TIME ZONE 'America/Argentina/Buenos_Aires'
        │       → "17/06/2026 21:47"  ✅
        │
        └─► ventas/[id]/page.tsx (Next.js SSR en Vercel UTC)
                toLocaleString('es-AR') sin timeZone
                → usa UTC → "18/06/2026, 00:47" o equivalente  ❌ (+3 h)
```

**Conclusión:** No es un bug de datos ni de región de Supabase. Es **inconsistencia de timezone entre capas**: SQL explícito vs JavaScript implícito.

---

## Cambios Propuestos

### Resumen de Cambios

- **NO migrar** la DB de Ohio a Brasil/São Paulo como fix principal
- Crear módulo `app/lib/datetime.ts` con timezone fija `America/Argentina/Buenos_Aires`
- Actualizar `app/lib/format.ts` para usar ese módulo
- Reemplazar copias inline de `formatDateTime` / `toLocaleString` en páginas y componentes server-side
- Corregir helpers de rango de día (`inicioDia`, `soloHoy`, KPIs) para usar **día calendario Argentina**
- Agregar tests unitarios de formato y bounds
- Validar en staging/producción con una venta de prueba
- Documentar en comentario/README interno: “Toda fecha de negocio = Argentina”

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/datetime.ts` | Constante `TIENDA_TZ`, `formatDateTime`, `formatDate`, `formatDateLong`, `ymdArgentina`, `inicioDiaArgentina`, `finDiaArgentina`, `ahoraArgentinaYmd` |
| `app/lib/datetime.test.ts` | Tests: ISO UTC → string AR esperado; bounds de medianoche AR |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/format.ts` | Delegar `formatDateTime` / `formatDate` a `datetime.ts` |
| `app/app/(dashboard)/ventas/[id]/page.tsx` | Usar `formatDateTime` centralizado |
| `app/app/(dashboard)/ventas/page.tsx` | Eliminar `formatDateTime` inline; usar lib |
| `app/lib/ventas/queries.ts` | Filtros `soloHoy` / `fecha` con bounds Argentina |
| `app/lib/dashboard/queries.ts` | Reemplazar `inicioDia` / `ymd` basados en TZ servidor |
| `app/lib/reportes/parse-params.ts` | Mes/año “actual” según Argentina si aplica |
| `app/components/caja/CierreDetalle.tsx` | Inline → lib |
| `app/components/caja/HistorialCajaMes.tsx` | Inline → lib |
| `app/components/caja/SesionAbiertaPanel.tsx` | Inline → lib |
| `app/components/dashboard/SaldosCard.tsx` | Inline → lib |
| `app/components/devoluciones/TablaDevoluciones.tsx` | Inline → lib |
| `app/app/(dashboard)/devoluciones/[id]/page.tsx` | Inline → lib |
| `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` | Inline → lib |
| `app/app/(dashboard)/dashboard/page.tsx` | Fecha “hoy” en header |
| `app/components/layout/Header.tsx` | Fecha del header |
| Otros con `toLocaleString`/`toLocaleDateString` sobre `created_at` | Migrar oportunisticamente en el mismo PR |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **No migrar región Supabase**: Los datos `timestamptz` ya están bien; migrar us-east-2 → sa-east-1 implica downtime, cambio de connection strings, posible ventana de mantenimiento, costos y **no arregla** el SSR en Vercel (sigue UTC). Rechazado.

2. **Timezone explícita en código (`America/Argentina/Buenos_Aires`)**: Misma convención que `build_payload_ticket_venta` y emails de cierre. Argentina no usa DST desde 2009; `Intl` con IANA zone es la opción correcta.

3. **Centralizar en `lib/datetime.ts`**: Evita repetir el bug. `format.ts` re-exporta para no romper imports existentes.

4. **Fix de filtros además de display**: Si solo se arregla la UI, “ventas de hoy” seguiría mal cerca de las 21:00–00:00 AR. Corregir ambos en el mismo deploy.

5. **Sin migración SQL de datos**: `created_at` no se reescribe. Cero riesgo de pérdida para clientes activos.

6. **Opcional secundario (no sustituto)**: Variable de entorno `TZ=America/Argentina/Buenos_Aires` en Vercel como red de seguridad. **Insuficiente sola** porque componentes cliente en browser usan TZ del usuario y no reemplaza la necesidad de `timeZone` explícito en formatters.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Migrar DB a Brasil (sa-east-1) | No cambia Vercel UTC; riesgo operativo alto; beneficio nulo para display |
| Guardar fechas como `timestamp` local sin TZ | Rompe modelo actual; requiere migración masiva |
| Formatear solo en cliente (`'use client'`) | Parpadeo/hidratación; no arregla SSR ni queries server-side |
| Offset fijo `-03:00` en strings | Funciona hoy pero peor que IANA zone; emails/SQL ya usan zone name |
| Reescribir timestamps históricos | Innecesario; datos UTC son correctos |

### Preguntas Abiertas

1. **¿Deploy en Vercel confirmado?** (contexto dice Vercel; si hay otro host, validar que también corre UTC.)
2. **¿Algún cliente fuera de Argentina?** Hoy el producto apunta a Cinco Saltos/Río Negro; si hubiera tenants en otra TZ, convendría `timezone` por tienda en `configuracion_tienda` (fase 2, fuera de scope).
3. **¿Querés setear `TZ` en Vercel además del código?** Recomendado como complemento, no como única medida.

---

## Tareas Paso a Paso

### Paso 1: Crear `app/lib/datetime.ts`

**Descripción:** Módulo único de timezone de negocio.

**Contenido mínimo:**

```typescript
export const TIENDA_TZ = 'America/Argentina/Buenos_Aires' as const

export function formatDateTime(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string
export function formatDate(iso: string | null | undefined): string
export function formatDateLong(iso: string | null | undefined): string

/** YYYY-MM-DD del calendario en Argentina para un instante dado */
export function ymdArgentina(date: Date = new Date()): string

/** Inicio del día calendario AR (00:00:00.000 ART) como ISO UTC */
export function inicioDiaArgentina(ymd: string): string

/** Inicio del día siguiente (para queries con `<`) */
export function inicioDiaSiguienteArgentina(ymd: string): string

/** YMD de hoy en Argentina */
export function hoyArgentinaYmd(): string
```

**Implementación sugerida para bounds** (sin dependencias nuevas):

```typescript
export function ymdArgentina(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIENDA_TZ }) // YYYY-MM-DD
}

export function inicioDiaArgentina(ymd: string): string {
  // Parse YYYY-MM-DD como día en Argentina vía offset IANA
  const [y, m, d] = ymd.split('-').map(Number)
  // Truco: construir fecha interpretando componentes en TZ AR
  const utcGuess = Date.UTC(y, m - 1, d, 3, 0, 0) // ART = UTC+3 → midnight AR ≈ 03:00 UTC
  // Refinar con formatter para DST edge (AR no tiene DST, simplifica)
  ...
}
```

**Alternativa robusta:** usar el patrón de “formatear partes en TZ” o agregar `date-fns-tz` si el equipo prefiere — evaluar en implementación; prioridad es **correctitud** con tests.

**Acciones:**

- Implementar funciones
- Exportar tipos/options reutilizables

**Archivos afectados:**

- `app/lib/datetime.ts` (nuevo)

---

### Paso 2: Tests unitarios

**Acciones:**

- Test: `'2026-06-18T00:47:00.000Z'` → `formatDateTime` contiene `21:47` y fecha `17/06` o `17 de junio` según estilo
- Test: `inicioDiaArgentina('2026-06-17')` → ISO que corresponde a `2026-06-17T03:00:00.000Z` (medianoche AR)
- Test: `hoyArgentinaYmd()` mockeando `Date` si hace falta

**Archivos afectados:**

- `app/lib/datetime.test.ts` (nuevo)

---

### Paso 3: Actualizar `app/lib/format.ts`

**Acciones:**

- Re-exportar `formatDateTime` y `formatDate` desde `datetime.ts`
- Mantener `formatARS`, `formatNumber`, etc. sin cambios

**Archivos afectados:**

- `app/lib/format.ts`

---

### Paso 4: Corregir UI de ventas (caso reportado)

**Acciones:**

- `ventas/[id]/page.tsx`: reemplazar bloque L75-78 por `formatDateLong(venta.created_at)` importado de `@/lib/datetime` o `@/lib/format`
- `ventas/page.tsx`: eliminar función local `formatDateTime`; importar de lib

**Validación manual:** Tras deploy, venta hecha a las 21:47 AR debe mostrar **misma hora** en título y ticket preview.

**Archivos afectados:**

- `app/app/(dashboard)/ventas/[id]/page.tsx`
- `app/app/(dashboard)/ventas/page.tsx`

---

### Paso 5: Corregir filtros por fecha en queries

**Acciones en `app/lib/ventas/queries.ts`:**

Reemplazar:

```typescript
const hoy = new Date()
hoy.setHours(0, 0, 0, 0)
q = q.gte('created_at', hoy.toISOString())
```

Por:

```typescript
const ymd = hoyArgentinaYmd()
q = q.gte('created_at', inicioDiaArgentina(ymd)).lt('created_at', inicioDiaSiguienteArgentina(ymd))
```

Para filtro `fecha` (YYYY-MM-DD del date picker):

```typescript
q = q.gte('created_at', inicioDiaArgentina(fecha))
   .lt('created_at', inicioDiaSiguienteArgentina(fecha))
```

Eliminar `parseFechaLocal` + `setHours` que interpretan día en TZ del servidor.

**Acciones en `app/lib/dashboard/queries.ts`:**

- Reemplazar `ymd`, `inicioDia`, `inicioDiaSiguiente` por equivalentes Argentina
- Revisar serie de gráficos “últimos 7 días” — agrupar por `ymdArgentina(venta.created_at)`

**Archivos afectados:**

- `app/lib/ventas/queries.ts`
- `app/lib/dashboard/queries.ts`
- `app/lib/reportes/parse-params.ts` (si usa `new Date()` para mes actual)

---

### Paso 6: Migrar formatters inline restantes

**Acciones:**

- Buscar: `toLocaleString('es-AR'` y `toLocaleDateString('es-AR'` aplicados a campos `created_at`, `fecha_*`, `changed_at`
- Reemplazar por helpers centralizados **cuando el valor es timestamp de negocio**
- **No tocar** formatters de montos (`toLocaleString` para números/currency)

**Archivos prioritarios** (lista del grep):

- `CierreDetalle.tsx`, `HistorialCajaMes.tsx`, `SesionAbiertaPanel.tsx`
- `SaldosCard.tsx`, `TablaDevoluciones.tsx`
- `devoluciones/[id]/page.tsx`, `caja/sesiones/[id]/page.tsx`
- `dashboard/page.tsx`, `Header.tsx`
- `remitos/*` (fechas de remitos)

**Archivos afectados:**

- ~15–20 archivos (ver grep en implementación)

---

### Paso 7: Alineación con SQL existente (sin cambios obligatorios)

**Acciones:**

- Verificar que RPCs de ticket/cierre siguen usando `America/Argentina/Buenos_Aires` — **no modificar** salvo unificar nombre vía constante documentada
- Opcional futuro: función SQL `fn_format_fecha_ar(timestamptz)` para DRY en Postgres — **fuera de scope** de este fix

**Archivos afectados:**

- Ninguno (solo verificación)

---

### Paso 8: Configuración Vercel (opcional complementaria)

**Acciones:**

- En Vercel → Project Settings → Environment Variables: `TZ=America/Argentina/Buenos_Aires` para Production/Preview
- Documentar que esto **no reemplaza** Paso 1–6

**Archivos afectados:**

- Documentación en plan / nota en `contexto/info-negocio.md` (opcional)

---

### Paso 9: Validación en producción (sin riesgo de datos)

**Acciones:**

1. Deploy a preview/staging
2. Crear venta de prueba en horario nocturno AR (ej. 21:30)
3. Confirmar:
   - Detalle venta: hora = ticket
   - Listado ventas: misma hora
   - Dashboard “ventas hoy” incluye la venta
4. **No** ejecutar migración de región Supabase
5. Monitorear 24 h con clientes activos — solo cambio de presentación/filtros

**Archivos afectados:**

- Ninguno (proceso QA)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql` | Formato ticket — referencia de TZ correcta |
| `app/lib/email/templates/cierre-caja.ts` | Patrón ya correcto con `timeZone` |
| `app/lib/format.ts` | Punto de entrada para muchos módulos |
| `app/lib/dashboard/queries.ts` | KPIs afectados por bounds incorrectos |
| `app/lib/ventas/queries.ts` | zh | Filtro cajero “solo hoy” |

### Actualizaciones Necesarias para Consistencia

- Agregar nota en `contexto/info-negocio.md` (opcional): “Timezone de negocio: America/Argentina/Buenos_Aires en app y SQL”
- No requiere actualizar CLAUDE.md salvo que se documente convención global

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Detalle/listado ventas | Hora visible alineada con ticket |
| POS → venta nocturna | Aparece en “hoy” correctamente |
| Dashboard KPIs | Conteos por día AR correctos |
| Reportes por mes | Revisar si `parse-params` usa mes AR |
| Tickets impresos | **Sin cambio** (ya correctos) |
| Clientes activos / datos | **Sin pérdida** — no hay ALTER TABLE |

---

## Lista de Validación

- [ ] Causa raíz documentada: SSR UTC vs SQL Argentina
- [ ] Decisión explícita: **no migrar DB** como fix
- [ ] `app/lib/datetime.ts` creado con `TIENDA_TZ`
- [ ] Tests pasan (`npm test` en app)
- [ ] Venta 21:47 AR: UI = ticket en producción
- [ ] Filtro “solo hoy” incluye ventas hasta 23:59 AR
- [ ] Build OK (`npm run build`)
- [ ] Sin cambios en datos Supabase

---

## Criterios de Éxito

1. En **producción**, la hora mostrada en detalle y listado de ventas coincide con la del ticket para la misma venta (ej. screenshot local: 17/06/2026 21:47 en ambos).
2. **Cero migración de datos** y **cero downtime** de base de datos; deploy de aplicación únicamente.
3. Filtros “hoy” y KPIs diarios usan día calendario Argentina, verificados con venta cerca de medianoche.
4. Código centralizado evita regresiones en futuros módulos.

---

## Notas

### Respuesta directa a la pregunta del usuario

> ¿Simplemente tengo que cambiar de Estados Unidos la DB a Brasil y se soluciona?

**No.** La DB en Ohio guarda bien los instantes (`timestamptz` en UTC). El ticket ya se ve bien porque Postgres convierte explícitamente a Argentina. El bug está en **Next.js en Vercel**, que formatea con la zona horaria del servidor (UTC). Mover Supabase a São Paulo:

- **No cambia** cómo Vercel renderiza las páginas
- Implica **riesgo operativo** (migración de proyecto, URLs, posible ventana de indisponibilidad)
- **No reescribe** timestamps existentes de forma que arregle la UI
- Brasil y Argentina comparten UTC−3, pero eso no ayuda al servidor en UTC

**Solución recomendada:** fix de código (timezone explícita) + deploy. Seguro para clientes activos.

### Por qué localhost funciona

La máquina de desarrollo en Windows Argentina tiene `TZ` del sistema = `America/Argentina/Buenos_Aires`, entonces `toLocaleString('es-AR')` sin `timeZone` “funciona por accidente”. Producción no.

### Referencia visual (caso local correcto)

En localhost, venta T-0021: UI “17 de junio de 2026 a las 9:47 p. m.” = ticket “17/06/2026 21:47”. En producción hoy solo coincide el ticket.

### Ejecutar implementación

```
/implementar planes/2026-06-17-fix-timezone-ventas-produccion.md
```

---

## Notas de Implementación

**Implementado:** 2026-06-17

### Resumen

- Creado `app/lib/datetime.ts` con timezone fija `America/Argentina/Buenos_Aires` (formato, bounds de día/mes, helpers para queries).
- `app/lib/format.ts` delega fechas a `datetime.ts`.
- Corregidos filtros “hoy” y KPIs en `ventas/queries.ts`, `dashboard/queries.ts` y `reportes/parse-params.ts`.
- Migrados ~20 componentes/páginas que formateaban fechas sin timezone explícita.
- Tests en `datetime.test.ts`; build OK.

### Desviaciones del Plan

- No se configuró `TZ` en Vercel (paso opcional — hacer manualmente en el dashboard).
- No se actualizó `contexto/info-negocio.md` (opcional).

### Problemas Encontrados

- Imports rotos en 3 archivos durante migración (Header, devoluciones, NuevoRemitoForm) — corregidos.
- Tests usan formato 12h es-AR (`9:47 p. m.`) en lugar de `21:47` — assertions ajustadas.
