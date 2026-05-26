# Plan: Módulo Reportes + Resultado Neto en Dashboard

**Creado:** 2026-05-23
**Estado:** Borrador
**Pedido:** Nueva página /reportes con datos mensuales avanzados de ganancia, y mostrar "Resultado neto = ganancia bruta − egresos manuales" en el dashboard.

---

## Descripción General

### Qué Logra Este Plan

Dos mejoras concretas al sistema de métricas:

1. **Dashboard — Resultado neto del mes:** Ampliar la card `GananciaBrutaCard` para mostrar los egresos manuales del mes y el resultado neto (`ganancia bruta − egresos`). Sin migración de base de datos — se agrega una query JS sobre `movimientos_fondos`.

2. **Módulo Reportes `/reportes`:** Nueva página con tabla histórica mes a mes (últimos 12 meses) que muestra: ventas brutas, devoluciones, ventas netas, costo, ganancia bruta, egresos manuales, resultado neto y margen %. Incluye una fila de totales y navegación en el sidebar.

### Por Qué Importa

El dueño necesita entender su rentabilidad real — no solo cuánto vendió, sino cuánto le quedó después de pagar proveedores (ganancia bruta) y gastos operativos (resultado neto). El módulo de reportes llena el vacío entre "ver ventas individualmente" y "entender el negocio mes a mes".

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Estado |
|---------|--------|
| `app/lib/dashboard/queries.ts` | ✅ `GananciaBrutaMes` interface + `obtenerGananciaBrutaMes()` vía RPC |
| `app/components/dashboard/GananciaBrutaCard.tsx` | ✅ Muestra ganancia, costo, margen. No muestra egresos ni resultado neto |
| `supabase/migrations/20260510000001_ganancia_bruta_rpc.sql` | ✅ RPC `get_ganancia_bruta_mes` (no incluye egresos) |
| `movimientos_fondos` tabla | ✅ Tiene `tipo` ('ingreso'/'egreso'/'ajuste'), `monto`, `venta_id` (null = manual), `created_at` |
| `app/components/layout/Sidebar.tsx` | ✅ Grupos: Ventas / Inventario / Gestión / Sistema |
| `app/components/layout/SidebarIcons.tsx` | ✅ Íconos SVG — sin ícono de reportes todavía |
| `app/lib/reportes/` | ❌ No existe |
| `app/app/(dashboard)/reportes/` | ❌ No existe |

### Brechas que se Abordan

| Brecha | Impacto |
|--------|---------|
| Dashboard muestra ganancia bruta pero no el impacto de egresos | El dueño no ve su rentabilidad real del mes |
| No hay vista histórica por mes | Imposible comparar rentabilidad entre meses |
| No hay suma de egresos manuales en ninguna vista analítica | Los gastos operativos son invisibles |

---

## Cambios Propuestos

### Resumen

**Feature 1 — Dashboard resultado neto (sin migración):**
- `app/lib/dashboard/queries.ts` → nueva función `obtenerEgresosManualesMes()` + extender `GananciaBrutaMes` con `totalEgresos` y `resultadoNeto`
- `app/components/dashboard/GananciaBrutaCard.tsx` → agregar fila "Egresos" + "Resultado neto"
- `app/app/(dashboard)/dashboard/page.tsx` → ya llama `obtenerGananciaBrutaMes()`, no requiere cambios si fusionamos las queries

**Feature 2 — Módulo Reportes:**
- `supabase/migrations/20260523000001_reporte_historico_rpc.sql` → nueva RPC `get_reporte_historico_meses`
- `app/lib/reportes/queries.ts` → nuevo, exporta `obtenerReporteHistorico()`
- `app/app/(dashboard)/reportes/page.tsx` → nueva página server component
- `app/components/layout/SidebarIcons.tsx` → agregar `IconReportes`
- `app/components/layout/Sidebar.tsx` → agregar item Reportes en grupo Gestión

---

## Archivos a Crear

| Ruta | Propósito |
|------|-----------|
| `supabase/migrations/20260523000001_reporte_historico_rpc.sql` | RPC que devuelve una fila por mes con todas las métricas |
| `app/lib/reportes/queries.ts` | Queries para el módulo de reportes |
| `app/app/(dashboard)/reportes/page.tsx` | Página Server Component: tabla histórica + totales |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `app/lib/dashboard/queries.ts` | Extender `GananciaBrutaMes` + `obtenerGananciaBrutaMes()` para incluir egresos |
| `app/components/dashboard/GananciaBrutaCard.tsx` | Mostrar egresos + resultado neto |
| `app/components/layout/SidebarIcons.tsx` | Agregar `IconReportes` |
| `app/components/layout/Sidebar.tsx` | Agregar item `/reportes` en grupo Gestión |

---

## Implementación Detallada

### Paso 1 — Extender `obtenerGananciaBrutaMes()` con egresos

**Archivo:** `app/lib/dashboard/queries.ts`

**Cambio en la interfaz:**
```ts
export interface GananciaBrutaMes {
  ganancia: number        // suma (precio_unitario - costo_unitario) * cantidad
  costoTotal: number
  ventasNetas: number
  margenPct: number | null
  tieneData: boolean
  totalEgresos: number    // NUEVO: sum(monto) WHERE tipo='egreso' AND venta_id IS NULL
  resultadoNeto: number   // NUEVO: ganancia - totalEgresos
}
```

**Cambio en la función:** Después de obtener `ganancia` del RPC, hacer una segunda query (en paralelo con `Promise.all` o en serie) sobre `movimientos_fondos`:
```ts
const { data: egresosRaw } = await supabase
  .from('movimientos_fondos')
  .select('monto')
  .eq('tienda_id', tiendaId)
  .eq('tipo', 'egreso')
  .is('venta_id', null)
  .gte('created_at', inicioMes.toISOString())
  .lt('created_at', finMes)

const totalEgresos = (egresosRaw ?? []).reduce((acc, r) => acc + Number((r as {monto: number}).monto), 0)
```

Ambas queries (`rpc` + `movimientos_fondos`) se pueden ejecutar en `Promise.all` para no agregar latencia.

**Retorno actualizado:**
```ts
return {
  ganancia:      Math.round(ganancia    * 100) / 100,
  costoTotal:    Math.round(costoTotal  * 100) / 100,
  ventasNetas:   Math.round(ventasNetas * 100) / 100,
  totalEgresos:  Math.round(totalEgresos * 100) / 100,
  resultadoNeto: Math.round((ganancia - totalEgresos) * 100) / 100,
  margenPct: ventasNetas > 0 && tieneData
    ? Math.round((ganancia / ventasNetas) * 1000) / 10
    : null,
  tieneData,
}
```

---

### Paso 2 — Actualizar `GananciaBrutaCard`

**Archivo:** `app/components/dashboard/GananciaBrutaCard.tsx`

Agregar después de la grilla de 3 columnas (ganancia / costo / margen) una nueva sección separada por un `border-t`:

```
┌──────────────────────────────────────────┐
│ 📊 Ganancia bruta (mes)                  │
├──────────────────────────────────────────┤
│  Ganancia    Costo total    Margen       │
│  $65.000     $80.000        44.8%        │
│  ─────────────────────────────────────── │
│  Egresos manuales          −$10.000      │
│  Resultado neto             $55.000      │
└──────────────────────────────────────────┘
```

- "Egresos manuales" en rojo si > 0, con tooltip/sub "retiros, pagos, gastos del turno"
- "Resultado neto" en verde si positivo, rojo si negativo
- Solo mostrar esta sección si `totalEgresos > 0` (no contaminar la vista cuando no hay egresos)

---

### Paso 3 — Migración RPC `get_reporte_historico_meses`

**Archivo:** `supabase/migrations/20260523000001_reporte_historico_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_reporte_historico_meses(
  p_tienda_id  uuid,
  p_meses      integer  -- cuántos meses hacia atrás (ej: 12)
)
RETURNS TABLE (
  anio              integer,
  mes               integer,
  ventas_brutas     numeric,
  cantidad_ventas   integer,
  devoluciones      numeric,
  ventas_netas      numeric,
  costo_total       numeric,
  ganancia_bruta    numeric,
  egresos_manuales  numeric,
  resultado_neto    numeric,
  margen_pct        numeric,
  tiene_costos      boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  meses_serie AS (
    -- Genera una fila por cada mes desde hace p_meses hasta hoy
    SELECT
      EXTRACT(YEAR  FROM gs)::integer AS anio,
      EXTRACT(MONTH FROM gs)::integer AS mes,
      date_trunc('month', gs)         AS inicio_mes,
      date_trunc('month', gs) + interval '1 month' AS fin_mes
    FROM generate_series(
      date_trunc('month', now() - (p_meses - 1) * interval '1 month'),
      date_trunc('month', now()),
      interval '1 month'
    ) gs
  ),
  ventas_mes AS (
    SELECT
      EXTRACT(YEAR  FROM v.created_at)::integer AS anio,
      EXTRACT(MONTH FROM v.created_at)::integer AS mes,
      COUNT(*)::integer                          AS cantidad_ventas,
      COALESCE(SUM(v.total), 0)                 AS ventas_brutas
    FROM ventas v
    WHERE v.tienda_id = p_tienda_id
      AND v.estado    = 'completada'
      AND v.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  devs_mes AS (
    SELECT
      EXTRACT(YEAR  FROM d.created_at)::integer AS anio,
      EXTRACT(MONTH FROM d.created_at)::integer AS mes,
      COALESCE(SUM(d.total_devuelto), 0)         AS devoluciones
    FROM devoluciones d
    WHERE d.tienda_id = p_tienda_id
      AND d.estado    = 'completada'
      AND d.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  costos_mes AS (
    SELECT
      EXTRACT(YEAR  FROM v.created_at)::integer        AS anio,
      EXTRACT(MONTH FROM v.created_at)::integer        AS mes,
      COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0) AS costo_total,
      COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0) AS ganancia_bruta,
      BOOL_OR(dv.costo_unitario > 0)                    AS tiene_costos
    FROM detalles_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id = p_tienda_id
      AND v.estado     = 'completada'
      AND v.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  egresos_mes AS (
    SELECT
      EXTRACT(YEAR  FROM mf.created_at)::integer AS anio,
      EXTRACT(MONTH FROM mf.created_at)::integer AS mes,
      COALESCE(SUM(mf.monto), 0)                  AS egresos_manuales
    FROM movimientos_fondos mf
    WHERE mf.tienda_id = p_tienda_id
      AND mf.tipo      = 'egreso'
      AND mf.venta_id IS NULL
      AND mf.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  )
  SELECT
    ms.anio,
    ms.mes,
    COALESCE(vm.ventas_brutas,  0)                               AS ventas_brutas,
    COALESCE(vm.cantidad_ventas, 0)                              AS cantidad_ventas,
    COALESCE(dm.devoluciones,   0)                               AS devoluciones,
    COALESCE(vm.ventas_brutas,  0) - COALESCE(dm.devoluciones, 0) AS ventas_netas,
    COALESCE(cm.costo_total,    0)                               AS costo_total,
    COALESCE(cm.ganancia_bruta, 0)                               AS ganancia_bruta,
    COALESCE(em.egresos_manuales, 0)                             AS egresos_manuales,
    COALESCE(cm.ganancia_bruta, 0) - COALESCE(em.egresos_manuales, 0) AS resultado_neto,
    CASE
      WHEN COALESCE(vm.ventas_brutas, 0) - COALESCE(dm.devoluciones, 0) > 0
           AND COALESCE(cm.tiene_costos, false)
      THEN ROUND(
        COALESCE(cm.ganancia_bruta, 0) /
        (COALESCE(vm.ventas_brutas, 0) - COALESCE(dm.devoluciones, 0)) * 100,
        1
      )
      ELSE NULL
    END                                                           AS margen_pct,
    COALESCE(cm.tiene_costos, false)                              AS tiene_costos
  FROM meses_serie ms
  LEFT JOIN ventas_mes vm ON vm.anio = ms.anio AND vm.mes = ms.mes
  LEFT JOIN devs_mes    dm ON dm.anio = ms.anio AND dm.mes = ms.mes
  LEFT JOIN costos_mes  cm ON cm.anio = ms.anio AND cm.mes = ms.mes
  LEFT JOIN egresos_mes em ON em.anio = ms.anio AND em.mes = ms.mes
  ORDER BY ms.anio DESC, ms.mes DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_historico_meses(uuid, integer)
  TO authenticated, service_role;
```

---

### Paso 4 — Crear `app/lib/reportes/queries.ts`

```ts
import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

const getCtx = cache(async () => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles').select('tienda_id').eq('id', auth.user.id).maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
})

export interface FilaMesReporte {
  anio: number
  mes: number               // 1-12
  mesLabel: string          // "Mayo 2026"
  cantidadVentas: number
  ventasBrutas: number
  devoluciones: number
  ventasNetas: number
  costoTotal: number
  gananciaBruta: number
  egresosManuales: number
  resultadoNeto: number
  margenPct: number | null
  tieneCostos: boolean
}

export interface ReporteHistorico {
  filas: FilaMesReporte[]
  totales: Omit<FilaMesReporte, 'anio' | 'mes' | 'mesLabel' | 'margenPct' | 'tieneCostos'> & {
    margenPct: number | null
    tieneCostos: boolean
  }
}

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export async function obtenerReporteHistorico(meses = 12): Promise<ReporteHistorico> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase.rpc('get_reporte_historico_meses', {
    p_tienda_id: tiendaId,
    p_meses: meses,
  })

  if (error || !data) return { filas: [], totales: { cantidadVentas:0, ventasBrutas:0, devoluciones:0, ventasNetas:0, costoTotal:0, gananciaBruta:0, egresosManuales:0, resultadoNeto:0, margenPct:null, tieneCostos:false } }

  const filas: FilaMesReporte[] = (data as unknown as Array<Record<string, unknown>>).map((r) => ({
    anio:             Number(r.anio),
    mes:              Number(r.mes),
    mesLabel:         `${MESES_ES[Number(r.mes) - 1]} ${r.anio}`,
    cantidadVentas:   Number(r.cantidad_ventas ?? 0),
    ventasBrutas:     Number(r.ventas_brutas   ?? 0),
    devoluciones:     Number(r.devoluciones    ?? 0),
    ventasNetas:      Number(r.ventas_netas    ?? 0),
    costoTotal:       Number(r.costo_total     ?? 0),
    gananciaBruta:    Number(r.ganancia_bruta  ?? 0),
    egresosManuales:  Number(r.egresos_manuales ?? 0),
    resultadoNeto:    Number(r.resultado_neto  ?? 0),
    margenPct:        r.margen_pct != null ? Number(r.margen_pct) : null,
    tieneCostos:      Boolean(r.tiene_costos),
  }))

  // Totales acumulados
  const tot = filas.reduce((acc, f) => ({
    cantidadVentas:  acc.cantidadVentas  + f.cantidadVentas,
    ventasBrutas:    acc.ventasBrutas    + f.ventasBrutas,
    devoluciones:    acc.devoluciones    + f.devoluciones,
    ventasNetas:     acc.ventasNetas     + f.ventasNetas,
    costoTotal:      acc.costoTotal      + f.costoTotal,
    gananciaBruta:   acc.gananciaBruta   + f.gananciaBruta,
    egresosManuales: acc.egresosManuales + f.egresosManuales,
    resultadoNeto:   acc.resultadoNeto   + f.resultadoNeto,
    tieneCostos:     acc.tieneCostos || f.tieneCostos,
  }), { cantidadVentas:0, ventasBrutas:0, devoluciones:0, ventasNetas:0, costoTotal:0, gananciaBruta:0, egresosManuales:0, resultadoNeto:0, tieneCostos:false })

  return {
    filas,
    totales: {
      ...tot,
      margenPct: tot.ventasNetas > 0 && tot.tieneCostos
        ? Math.round((tot.gananciaBruta / tot.ventasNetas) * 1000) / 10
        : null,
    },
  }
}
```

---

### Paso 5 — Crear `app/app/(dashboard)/reportes/page.tsx`

**Server Component.** Acepta `searchParams` para el parámetro `meses` (3/6/12, default 12).

**Layout:**
```
/reportes
────────────────────────────────────────────────
Reportes
Historial financiero mensual

[ 3 meses ] [ 6 meses ] [ 12 meses ]   ← botones query param

┌ Tabla ──────────────────────────────────────────────────────────────────────┐
│ Mes       │ Ventas  │ Devoluc. │ Neto   │ Costo  │ G.Bruta│ Egresos│ Resul. │ Margen│
│ May 2026  │$150.000 │$5.000    │$145.000│$80.000 │$65.000 │$10.000 │$55.000 │ 44.8%│
│ Abr 2026  │ ...     │ ...      │ ...    │ ...    │ ...    │ ...    │ ...    │ ...  │
│ ──────────────────────────────────────────────────────────────────────────── │
│ TOTAL     │$xxx     │$xxx      │$xxx    │$xxx    │$xxx    │$xxx    │$xxx    │ x.x% │
└─────────────────────────────────────────────────────────────────────────────┘

Nota: Egresos = retiros, pagos y gastos registrados manualmente en Caja.
      Ganancia bruta = requiere precio de costo cargado en productos.
```

**Columnas a mostrar:**
| Col | Campo | Formato |
|-----|-------|---------|
| Mes | `mesLabel` | texto |
| Tickets | `cantidadVentas` | número |
| Ventas brutas | `ventasBrutas` | ARS |
| Devoluciones | `devoluciones` | ARS, rojo si > 0 |
| Ventas netas | `ventasNetas` | ARS, bold |
| Costo (si tieneCostos) | `costoTotal` | ARS |
| Ganancia bruta (si tieneCostos) | `gananciaBruta` | ARS, verde |
| Egresos manuales | `egresosManuales` | ARS, rojo si > 0 |
| Resultado neto | `resultadoNeto` | ARS, verde/rojo |
| Margen (si tieneCostos) | `margenPct` | %, con color |

**Nota:** Columnas de costo/ganancia/margen se muestran con `opacity-40` si `!tieneCostos` con tooltip "Cargá precios de costo en productos".

**Sin loading states** — es Server Component, los datos llegan antes de renderizar.

---

### Paso 6 — Agregar `IconReportes` al sidebar

**Archivo:** `app/components/layout/SidebarIcons.tsx`

Agregar al final del archivo:
```tsx
export function IconReportes() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4"  />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}
```

---

### Paso 7 — Agregar ítem al Sidebar

**Archivo:** `app/components/layout/Sidebar.tsx`

1. Importar `IconReportes` desde `./SidebarIcons`
2. En el grupo `'Gestión'`, agregar después de `clientes`:
```ts
{ href: '/reportes', label: 'Reportes', icon: <IconReportes />, showWhen: 'always' },
```

---

## Migration SQL (Paso 3)

Ver implementación completa en el Paso 3 arriba. El archivo a crear es:
`supabase/migrations/20260523000001_reporte_historico_rpc.sql`

No hay cambios de schema (sin ALTER TABLE) — solo una nueva función RPC. Sin rollback necesario (se puede DROP FUNCTION si hay problemas).

---

## Orden de Implementación

1. **Migración** `20260523000001_reporte_historico_rpc.sql` → aplicar en Supabase Dashboard
2. **`app/lib/dashboard/queries.ts`** → extender `GananciaBrutaMes` + `obtenerGananciaBrutaMes()`
3. **`app/components/dashboard/GananciaBrutaCard.tsx`** → mostrar egresos + resultado neto
4. **`app/lib/reportes/queries.ts`** → crear archivo nuevo
5. **`app/app/(dashboard)/reportes/page.tsx`** → crear página nueva
6. **`app/components/layout/SidebarIcons.tsx`** → agregar `IconReportes`
7. **`app/components/layout/Sidebar.tsx`** → agregar item navegación
8. **TypeScript check** → `npx tsc --noEmit`

---

## Criterios de Aceptación

- [ ] `GananciaBrutaCard` muestra sección "Egresos" + "Resultado neto" cuando hay egresos manuales en el mes
- [ ] Cuando no hay egresos manuales, la card se ve igual que antes (sin cambios visuales)
- [ ] `/reportes` carga y muestra tabla mes a mes sin errores
- [ ] Selector de 3/6/12 meses funciona via query param `?meses=N`
- [ ] Fila de totales al pie de la tabla suma correctamente
- [ ] Columnas de costo/ganancia/margen se ocultan o muestran según `tieneCostos`
- [ ] Link "Reportes" aparece en el sidebar bajo Gestión
- [ ] `npx tsc --noEmit` sin errores
