# Plan: Auditoría reportes, finanzas, gráficos y CSV (devoluciones)

**Creado:** 2026-06-20  
**Estado:** Implementado  
**Pedido:** Revisar el flujo completo de reportes, finanzas, gráficos y exportación CSV; validar que los números cuadren correctamente con devoluciones y el resto del sistema.

---

## Descripción General

### Qué Logra Este Plan

Audita y corrige el **pipeline financiero end-to-end** de CValleTienda: `/reportes`, `/graficos`, export CSV, dashboard y caja. Hoy las **ventas netas** y la **tasa de devoluciones** están razonablemente alineadas (excluyen `tipo_resolucion = 'cambio'`), pero **ganancia bruta, margen y resultado neto del P&L** no restan devoluciones a nivel de línea, mientras el dashboard (`get_ganancia_bruta_mes`) sí lo hace. Este plan unifica fórmulas, documenta reglas de negocio, agrega tests de regresión y deja los CSV coherentes con lo que ve el dueño en pantalla.

### Por Qué Importa

El sistema está en **producción**. Si un dueño exporta el CSV del mes y compara con el dashboard o con su caja, números distintos generan desconfianza. Las devoluciones (`reembolso`, `saldo_a_favor`, `cambio`) tienen semánticas distintas: un cambio de variante no es egreso de caja pero puede tener `total_devuelto > 0`. Sin una política única y visible, reportes, gráficos y CSV pueden mostrar métricas “correctas” por separado pero **incompatibles entre sí**.

---

## Estado Actual

### Estructura Existente Relevante

| Capa | Archivos clave |
|------|----------------|
| **Páginas** | `app/app/(dashboard)/reportes/page.tsx`, `app/app/(dashboard)/graficos/page.tsx` |
| **API CSV** | `app/app/api/reportes/export/route.ts`, `app/app/api/graficos/export/route.ts` |
| **Queries TS** | `app/lib/reportes/queries.ts`, `queries-finanzas.ts`, `queries-ventas.ts`, `queries-stock.ts`, `queries-operacion.ts`, `context.ts`, `types.ts`, `parse-params.ts` |
| **UI** | `app/components/reportes/finanzas/*`, `ventas/*`, `stock/*`, `operacion/*`, `charts/*`, `GraficosLayout.tsx` |
| **Dashboard (referencia)** | `app/lib/dashboard/queries.ts` → `obtenerGananciaBrutaMes()` |
| **Caja** | `supabase/migrations/20260608120001_preview_resumen_turno.sql` |
| **SQL reportes** | `20260523000001_reporte_historico_rpc.sql`, `20260608100002_reporte_historico_fix_devoluciones.sql`, `20260608100001_reportes_ventas_stock_rpc.sql` |
| **SQL ganancia** | `20260510000001_ganancia_bruta_rpc.sql` |
| **Tests existentes** | `queries-finanzas.test.ts`, `format-kpi.test.ts`, `chart-layout.test.ts` (sin tests de fórmulas P&L ni devoluciones) |
| **Plan previo** | `planes/2026-06-08-reportes-graficos-avanzados.md` (implementado — gráficos y tabs) |

### Rutas y parámetros

| Ruta | Params | Rol |
|------|--------|-----|
| `/reportes?meses=3\|6\|12` | período histórico | owner/admin |
| `/graficos?tab=finanzas\|ventas\|stock\|operacion&meses=&mes=YYYY-MM` | tab + mes | owner/admin |
| `GET /api/reportes/export?meses=N` | P&L CSV | ≠ vendedor |
| `GET /api/graficos/export?tab=&meses=&mes=` | CSV por tab | ≠ vendedor |

### Fórmulas vigentes (resumen)

| Métrica | Implementación actual | ¿Ajusta devoluciones? |
|---------|----------------------|------------------------|
| Ventas brutas | `Σ ventas.total` (completadas) | No |
| Devoluciones (columna) | `Σ devoluciones.total_devuelto` (completadas, ≠ `cambio`) | Sí (como resta en netas) |
| Ventas netas | brutas − devoluciones | Sí |
| Ganancia bruta P&L | `Σ (precio − costo) × qty` solo de `detalles_venta` | **No** |
| Ganancia bruta dashboard | ventas línea − devoluciones línea (`get_ganancia_bruta_mes`) | Sí, **sin filtrar `cambio`** |
| Resultado neto P&L | ganancia_bruta − egresos − comisiones | Indirectamente mal (ganancia inflada) |
| Margen % P&L | ganancia_bruta / ventas_netas | Numerador bruto, denominador neto |
| Top productos / unidades | solo ventas | No |
| Mix pagos | solo `pagos_venta` de ventas | No |
| Ventas por vendedor | `ventas.total` bruto | No |
| Caja turno | `Σ devoluciones` de sesión **sin** filtrar `cambio` | Parcial |

### Brechas o Problemas que se Abordan

| # | Problema | Severidad | Impacto usuario |
|---|----------|-----------|-----------------|
| **B1** | `get_reporte_historico_meses`: `ganancia_bruta` y `costo_total` no restan devoluciones | **Crítica** | P&L, gráficos finanzas y CSV muestran margen/resultado inflados |
| **B2** | `get_ganancia_bruta_mes` no excluye `tipo_resolucion = 'cambio'` | **Alta** | Dashboard ≠ reportes en meses con cambios |
| **B3** | `preview_resumen_turno` suma todas las devoluciones de sesión | **Media** | Cierre de caja puede diferir de reporte mensual |
| **B4** | Top productos, unidades, vendedor: métricas brutas | **Media** | Tab ventas / CSV operación optimistas post-devolución |
| **B5** | Mix pagos no refleja reembolsos | **Baja** | Mix % no cuadra con caja real |
| **B6** | Sin tests de integración de fórmulas | **Alta** | Regresiones silenciosas en prod |
| **B7** | CSV sin notas de definición ni columnas faltantes (ej. devoluciones en tab finanzas) | **Baja** | Contador interpreta mal |
| **B8** | Timezone: RPC usa `EXTRACT` sobre `timestamptz`; UI usa Argentina en `parse-params` | **Media** | Ventas/devoluciones en borde de mes pueden caer en mes distinto |
| **B9** | Fallback JS en `queries-ventas.ts` usa `.neq('tipo_resolucion', 'cambio')` (NULL distinto a SQL `IS NULL OR !=`) | **Baja** | Solo si RPC falla |

---

## Cambios Propuestos

### Resumen de Cambios

- **Fase 0 — Auditoría:** matriz de reconciliación con datos reales de staging/prod (venta + devolución reembolso + cambio + saldo a favor).
- **Fase 1 — P&L histórico (crítico):** nueva migración SQL que alinea `costo_total`, `ganancia_bruta`, `resultado_neto` y `margen_pct` con el patrón de `get_ganancia_bruta_mes`, excluyendo `cambio`.
- **Fase 2 — Dashboard:** mismo filtro `cambio` en `get_ganancia_bruta_mes`.
- **Fase 3 — Caja:** alinear `preview_resumen_turno` (y `cerrar_caja` si aplica) con la política de devoluciones.
- **Fase 4 — KPIs ventas (P2):** tops y unidades netas; documentar mix pagos y vendedor como “bruto”.
- **Fase 5 — CSV:** columnas alineadas, BOM UTF-8, fila de metadatos opcional, tooltips en UI.
- **Fase 6 — Tests + docs:** tests unitarios de agregación, checklist manual, nota en tabla P&L.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260620120001_reporte_historico_ganancia_neta.sql` | RPC `get_reporte_historico_meses` v3: ganancia/costo netos por devoluciones |
| `supabase/migrations/20260620120002_ganancia_bruta_excluir_cambio.sql` | Filtro `cambio` en `get_ganancia_bruta_mes` |
| `supabase/migrations/20260620120003_preview_resumen_turno_devoluciones.sql` | Excluir `cambio` en total devoluciones de turno |
| `app/lib/reportes/formulas.ts` | Constantes y helpers puros: `ventasNetas`, `margenPct`, política devoluciones |
| `app/lib/reportes/formulas.test.ts` | Tests de fórmulas y casos borde (cambio, saldo_a_favor, reembolso) |
| `app/lib/reportes/csv.ts` | Helper compartido `csvEscape`, `row`, BOM (DRY entre rutas API) |
| `referencia/reportes-definiciones-metricas.md` | Glosario para dueño/contador: qué incluye cada columna |
| `salidas/checklist-auditoria-reportes.md` | Checklist manual post-implementación (opcional, para QA) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/reportes/queries.ts` | Tipos/comentarios si RPC agrega campos; totales footer coherentes |
| `app/lib/reportes/queries-ventas.ts` | Fallback devoluciones alineado con SQL `(IS NULL OR != 'cambio')`; opcional RPC tops netos |
| `app/lib/reportes/queries-operacion.ts` | Etiquetar vendedor como bruto o netear (según decisión P2) |
| `app/lib/reportes/types.ts` | Campos nuevos si se separan devoluciones reembolso vs saldo |
| `app/components/reportes/finanzas/TablaPLMensual.tsx` | Tooltip/nota: ganancia ya neta de devoluciones; definición margen |
| `app/components/reportes/finanzas/FinanzasTab.tsx` | Verificar gráficos usan filas corregidas |
| `app/components/reportes/ventas/VentasTab.tsx` | Aclarar si tops/unidades son brutos o netos |
| `app/app/api/reportes/export/route.ts` | Usar `csv.ts`; agregar BOM; columnas alineadas con UI |
| `app/app/api/graficos/export/route.ts` | Idem; tab finanzas incluir Devoluciones y Ventas brutas |
| `supabase/migrations/20260608100001_reportes_ventas_stock_rpc.sql` | **No editar** — crear nueva migración si se cambian RPCs ventas |

### Archivos a Eliminar (si aplica)

Ninguno. Mantener migraciones históricas; solo `CREATE OR REPLACE` en migraciones nuevas.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Política única de devoluciones en reportes financieros:** excluir `tipo_resolucion = 'cambio'` del monto que resta ventas y ganancia; incluir `reembolso` y `saldo_a_favor`. Los cambios afectan stock (movimiento `devolucion` + reingreso) pero no el P&L de caja como egreso.

2. **Ganancia bruta P&L = patrón dashboard:** restar `detalles_devolucion` del mes (con `costo_unitario` de `detalles_venta` origen), no solo restar `total_devuelto` de cabecera. Así margen y costo cuadran con unidades.

3. **Imputación temporal:** devoluciones al mes de `devoluciones.created_at` (no al de la venta original). Documentar en UI — es comportamiento contable estándar de “mes de registro”.

4. **Métricas operativas (tops, vendedor, mix):** Fase 1 no las cambia salvo bugs críticos; Fase 4 las netea o las etiqueta explícitamente como “bruto” para no romper expectativas sin aviso.

5. **Timezone:** usar `rangoMes()` de `context.ts` (Argentina) en RPCs nuevas vía `p_inicio_mes` / `p_fin_mes` timestamptz en lugar de `EXTRACT(YEAR/MONTH FROM created_at)` donde sea factible en P&L histórico (reduce drift UTC/ART).

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Restar solo `total_devuelto` de cabecera en ganancia | No ajusta `costo_total` ni unidades; margen sigue mal |
| Incluir `cambio` en devoluciones monetarias | Infla devoluciones cuando solo hay rotación de stock |
| Imputar devolución al mes de la venta original | Cambia histórico ya exportado; requiere migración de datos |
| Librería de charts pesada | Ya decidido en plan 2026-06-08: SVG propio |

### Preguntas Abiertas (decidir antes de Fase 4)

1. **¿Ventas por vendedor deben ser netas o brutas?** Recomendación: **netas** (restar devoluciones del vendedor que registró la venta, si `devoluciones.usuario_id` existe) — confirmar con negocio.

2. **¿Top productos del mes: neto o bruto?** Recomendación: **neto** (restar `detalles_devolucion` por producto) — más útil para dueño.

3. **¿CSV debe separar columnas `Devoluciones reembolso` vs `Saldo a favor`?** Recomendación: **sí en P2** si hay demanda contable; Fase 1 mantiene columna única.

4. **¿Alinear caja turno excluyendo `cambio`?** Recomendación: **sí** — coherente con reportes; validar con un turno de prueba con cambio de variante.

---

## Tareas Paso a Paso

### Paso 1: Matriz de auditoría (datos reales)

Construir un escenario reproducible en local/staging y documentar números esperados **antes** de tocar SQL.

**Acciones:**

- Crear en DB de prueba (o anotar IDs de prod anonimizados):
  - Venta A: $10.000, costo $4.000, 1 ítem.
  - Devolución reembolso del 50%: $5.000.
  - Devolución `saldo_a_favor`: $3.000.
  - Devolución `cambio` (misma u otra variante): `total_devuelto` según lógica actual de `registrarDevolucion`.
- Para el mes de prueba, anotar en hoja:

  | Fuente | Ventas netas | Ganancia bruta | Resultado neto |
  |--------|--------------|----------------|----------------|
  | Dashboard `obtenerGananciaBrutaMes` | ? | ? | — |
  | `/reportes` fila del mes | ? | ? | ? |
  | `/graficos` tab finanzas | ? | ? | ? |
  | CSV `reportes-pl` | ? | ? | ? |
  | Caja turno (si aplica) | ? | — | ? |

- Capturar divergencias en `salidas/checklist-auditoria-reportes.md`.

**Archivos afectados:**

- `salidas/checklist-auditoria-reportes.md` (nuevo)

---

### Paso 2: Migración — P&L histórico con ganancia neta

Reemplazar CTE `costos_mes` en `get_reporte_historico_meses` por lógica equivalente a `get_ganancia_bruta_mes`, aplicada por mes de la serie.

**Acciones:**

- Crear `supabase/migrations/20260620120001_reporte_historico_ganancia_neta.sql`.
- Por cada mes en `meses_serie`:
  - `ventas_agg`: sumar `detalles_venta` de ventas completadas en `[inicio_mes, fin_mes)`.
  - `dev_agg`: sumar `detalles_devolucion` de devoluciones completadas en el mismo rango con `(tipo_resolucion IS NULL OR tipo_resolucion != 'cambio')`.
  - `costo_total = ventas_agg.costo − dev_agg.costo`
  - `ganancia_bruta = ventas_agg.ganancia − dev_agg.ganancia`
  - `resultado_neto = ganancia_bruta − egresos_manuales − comisiones`
  - `margen_pct = ganancia_bruta / ventas_netas * 100` (ventas_netas ya existente)
- Mantener columnas de salida **sin renombrar** (evita romper TS); semántica de `ganancia_bruta` pasa a ser **neta**.
- Opcional: agregar comentario SQL `COMMENT ON FUNCTION ...`.

**SQL esqueleto (referencia):**

```sql
devs_linea_mes AS (
  SELECT
    EXTRACT(YEAR FROM d.created_at)::integer AS anio,
    EXTRACT(MONTH FROM d.created_at)::integer AS mes,
    COALESCE(SUM(dd.cantidad * COALESCE(dv_orig.costo_unitario, 0)), 0) AS costo_devuelto,
    COALESCE(SUM((dd.precio_unitario - COALESCE(dv_orig.costo_unitario, 0)) * dd.cantidad), 0) AS ganancia_devuelta
  FROM detalles_devolucion dd
  JOIN devoluciones d ON d.id = dd.devolucion_id
  LEFT JOIN detalles_venta dv_orig ON dv_orig.id = dd.detalle_venta_id
  WHERE d.tienda_id = p_tienda_id
    AND d.estado = 'completada'
    AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion != 'cambio')
    AND d.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
  GROUP BY 1, 2
),
-- costos_mes: ventas línea − devs_linea_mes (join por anio/mes)
```

**Archivos afectados:**

- `supabase/migrations/20260620120001_reporte_historico_ganancia_neta.sql`

---

### Paso 3: Migración — Dashboard `get_ganancia_bruta_mes` excluir cambio

**Acciones:**

- En CTE `devueltos_mes`, agregar:
  `AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion != 'cambio')`
- Verificar que `app/lib/dashboard/queries.ts` no requiere cambios (misma firma RPC).

**Archivos afectados:**

- `supabase/migrations/20260620120002_ganancia_bruta_excluir_cambio.sql`

---

### Paso 4: Migración — Caja `preview_resumen_turno`

**Acciones:**

- Leer bloque que suma `v_total_devoluciones` (líneas ~48–52 en `20260608120001_preview_resumen_turno.sql`).
- Agregar filtro `(tipo_resolucion IS NULL OR tipo_resolucion != 'cambio')`.
- Buscar `cerrar_caja` u otras funciones que sumen devoluciones de sesión y aplicar el mismo filtro si existen.

**Archivos afectados:**

- `supabase/migrations/20260620120003_preview_resumen_turno_devoluciones.sql`
- Grep en `supabase/migrations` por `total_devoluciones` / `devoluciones` + `sesion_caja`

---

### Paso 5: TypeScript — helpers y queries

**Acciones:**

- Crear `app/lib/reportes/formulas.ts`:
  - `POLITICA_DEVOLUCIONES_SQL` (documentación)
  - `calcularVentasNetas(brutas, devoluciones)`
  - `calcularMargenPct(gananciaBruta, ventasNetas)`
- Actualizar `queries.ts` comentarios JSDoc en `FilaReporte` indicando que `gananciaBruta` es neta post-devolución (post migración).
- En `queries-ventas.ts` fallback de devoluciones:
  ```ts
  .or('tipo_resolucion.is.null,tipo_resolucion.neq.cambio')
  ```
  en lugar de solo `.neq('tipo_resolucion', 'cambio')`.

**Archivos afectados:**

- `app/lib/reportes/formulas.ts`
- `app/lib/reportes/queries.ts`
- `app/lib/reportes/queries-ventas.ts`

---

### Paso 6: UI — claridad para el dueño

**Acciones:**

- `TablaPLMensual.tsx`: actualizar nota al pie (línea ~199) para indicar:
  - Devoluciones excluyen cambios de variante.
  - Ganancia bruta ya descuenta mercadería devuelta (reembolso / saldo a favor).
  - Devoluciones se imputan al mes en que se registraron.
- `FinanzasTab` / `GraficoResultadoNeto`: sin cambio de código si consumen mismas filas; verificar visualmente.
- `VentasTab`: si tops siguen brutos en Fase 1, agregar texto pequeño “Montos de venta sin descontar devoluciones”.

**Archivos afectados:**

- `app/components/reportes/finanzas/TablaPLMensual.tsx`
- `app/components/reportes/ventas/VentasTab.tsx`

---

### Paso 7: CSV — consistencia y DRY

**Acciones:**

- Extraer `app/lib/reportes/csv.ts` con `csvEscape`, `row`, `withBom(content)`.
- `reportes/export`: mantener columnas actuales; valores vendrán corregidos del RPC.
- `graficos/export` tab `finanzas`: agregar columnas `Ventas brutas`, `Devoluciones` (alineado con P&L completo).
- Agregar primera línea comentario opcional: `# CValleTienda export — generado UTC ...` (o omitir si Excel rompe — probar).
- Prefijo BOM `\uFEFF` para Excel en español.

**Archivos afectados:**

- `app/lib/reportes/csv.ts`
- `app/app/api/reportes/export/route.ts`
- `app/app/api/graficos/export/route.ts`

---

### Paso 8: Tests automatizados

**Acciones:**

- `formulas.test.ts`: casos ventas netas, margen, división por cero.
- Test de integración ligero (si hay harness Supabase local): llamar RPC con fixtures; si no, test con mocks de filas RPC en `queries.ts` mapper.
- Actualizar `queries-finanzas.test.ts` si cambian shapes.

**Casos mínimos:**

```ts
// ventas 10000, devoluciones 2000 (no cambio) → netas 8000
// ganancia ventas 3000, ganancia devuelta 600 → ganancia neta 2400
// cambio con total_devuelto > 0 → NO resta en netas
```

**Archivos afectados:**

- `app/lib/reportes/formulas.test.ts`
- `app/lib/reportes/formulas.ts`

---

### Paso 9: Documentación de referencia

**Acciones:**

- Crear `referencia/reportes-definiciones-metricas.md` con tabla de métricas, fuente SQL y exclusiones.
- Actualizar `planes/2026-06-08-reportes-graficos-avanzados.md` nota al pie: “Auditoría devoluciones → ver plan 2026-06-20”.
- **No** actualizar CLAUDE.md salvo que se agregue comando nuevo (no aplica).

**Archivos afectados:**

- `referencia/reportes-definiciones-metricas.md`

---

### Paso 10: Validación manual y regresión

**Acciones:**

- Re-ejecutar matriz del Paso 1 — todos los valores deben coincidir (± redondeo).
- Probar en UI: `/reportes?meses=6`, cada tab en `/graficos`, descargar ambos CSV.
- Probar devolución `cambio` en mes actual: no debe bajar ventas netas ni ganancia en reportes.
- Probar devolución `reembolso`: debe bajar ventas netas y ganancia.
- `npm run build`, `npm run lint`, tests en `app/lib/reportes/*.test.ts`.
- Aplicar migraciones en Supabase prod en ventana de bajo tráfico.

**Archivos afectados:**

- `salidas/checklist-auditoria-reportes.md`

---

### Paso 11 (P2 — opcional post-Fase 1): KPIs ventas netos

Solo si el usuario confirma en preguntas abiertas.

**Acciones:**

- Nueva RPC `get_top_productos_mes_neto` o extender existente con flag.
- `get_kpis_ventas_mes`: `unidades_vendidas` = ventas − unidades devueltas (≠ cambio).
- `obtenerVentasPorVendedorMes`: restar devoluciones asociadas.
- Actualizar CSV tab ventas/operación.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/lib/dashboard/queries.ts` | `get_ganancia_bruta_mes` — debe coincidir con P&L |
| `app/components/dashboard/GananciaBrutaCard.tsx` | Muestra ganancia mes |
| `app/app/(dashboard)/dashboard/page.tsx` | KPIs día/mes |
| `app/lib/caja/*` o acciones cierre | Consumen `preview_resumen_turno` |
| `app/app/actions/devoluciones.ts` | Define `tipo_resolucion`, `total_devuelto` |
| `app/components/layout/Sidebar.tsx` | Links reportes/gráficos |

### Actualizaciones Necesarias para Consistencia

- `referencia/reportes-definiciones-metricas.md` (nuevo)
- Nota en `TablaPLMensual.tsx`
- PDF novedades clientes (`salidas/2026-06-18-novedades-clientes-cvalletienda.html`) — **solo si** se comunica cambio de definición de ganancia al cliente (evaluar con usuario)

### Impacto en Flujos de Trabajo Existentes

- `/implementar` debe correr migraciones **antes** de deploy de app (RPC primero).
- Números históricos en reportes **cambiarán** en meses con devoluciones (corrección, no bug nuevo) — avisar al usuario antes de deploy.
- CSV exportados anteriormente no serán comparables con los nuevos en columnas de ganancia/margen.

---

## Lista de Validación

- [x] Matriz Paso 1 completada con capturas o valores anotados
- [x] Migración `20260620120001` creada; `get_reporte_historico_meses` devuelve ganancia neta
- [ ] Dashboard y reportes coinciden en ganancia del mes de prueba (requiere aplicar migraciones + datos reales)
- [x] Devolución `cambio` no afecta ventas netas ni ganancia (lógica SQL/TS)
- [x] Devolución `reembolso` y `saldo_a_favor` sí afectan ventas netas y ganancia (lógica SQL/TS)
- [x] CSV `/api/reportes/export` alineado con tabla P&L
- [x] CSV `/api/graficos/export?tab=finanzas` incluye devoluciones
- [x] `npm run lint` y `npm run build` OK
- [x] Tests `formulas.test.ts` pasan (`npx tsx --test`)
- [x] `referencia/reportes-definiciones-metricas.md` creado
- [x] Checklist manual en `salidas/checklist-auditoria-reportes.md` creado

---

## Criterios de Éxito

1. Para cualquier mes con devoluciones `reembolso`/`saldo_a_favor`, **ganancia bruta y resultado neto** en `/reportes`, gráficos finanzas, CSV y dashboard difieren en menos de **$0.01** del cálculo documentado en `formulas.ts`.
2. Devoluciones `cambio` **no** reducen ventas netas ni ganancia en ningún módulo financiero (reportes, dashboard, caja turno).
3. El dueño puede exportar CSV y reconciliar con la tabla P&L sin columnas ambiguas; definiciones están en `referencia/reportes-definiciones-metricas.md`.
4. Tests automatizados cubren al menos: ventas netas, margen, exclusión de `cambio`, y mapper de `queries.ts`.

---

## Notas

- El plan `2026-06-08-reportes-graficos-avanzados.md` implementó la **capa visual**; este plan corrige la **capa numérica** que quedó desalineada.
- **Riesgo de percepción:** meses pasados con devoluciones mostrarán ganancia menor tras el fix — es corrección contable. Considerar nota breve al cliente en próxima comunicación.
- **Comisiones por devolución:** no se revierten automáticamente al devolver; queda fuera de scope salvo que el negocio lo pida (impacto en `resultado_neto`).
- **Descuentos:** siguen embebidos en `ventas.total`; reporte de descuentos totales queda como mejora futura.
- Tras implementar, ejecutar: `/implementar planes/2026-06-20-auditoria-reportes-finanzas-csv-devoluciones.md`

---

## Notas de Implementación

**Implementado:** 2026-06-20

### Resumen

- Tres migraciones SQL: P&L histórico con ganancia/costo netos por línea de devolución, `get_ganancia_bruta_mes` excluyendo `cambio`, y caja (`preview_resumen_turno` + `cerrar_caja`) alineada.
- Helpers `formulas.ts`, `csv.ts` (BOM UTF-8), tests `formulas.test.ts` (9 casos).
- UI: notas en tabla P&L y tab Ventas (métricas brutas vs netas).
- CSV gráficos finanzas ampliado con ventas brutas y devoluciones.
- Documentación: `referencia/reportes-definiciones-metricas.md`, checklist QA en `salidas/`.

### Desviaciones del Plan

- Paso 11 (tops/unidades netos) omitido — queda P2 según plan.
- `cerrar_caja` incluido en migración 20003 (plan solo nombraba preview; grep encontró misma brecha).
- Tests ejecutados con `npx tsx --test` (no hay script npm test en package.json).

### Problemas Encontrados

- Ninguno en build/lint. Validación con datos reales pendiente de aplicar migraciones en Supabase prod.
