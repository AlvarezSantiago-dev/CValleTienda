# Plan: Dashboard / Métricas

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** Convertir la home `/dashboard` en un panel real de control diario con KPIs, gráficos simples y links rápidos a la operación.

---

## Descripción General

### Qué Logra Este Plan

Transforma la página `/dashboard` (hoy un placeholder con saldos y estado de caja) en un **panel de control accionable** que en una sola vista responde: ¿cómo voy hoy?, ¿cómo voy este mes?, ¿qué tengo que atender ahora? Incluye KPIs de ventas, devoluciones, ticket promedio, gráfico de ventas de los últimos 14 días, top productos, top clientes, stock bajo y últimas operaciones — todo con links profundos a los módulos correspondientes.

### Por Qué Importa

- **Cierra el MVP**: Caja, POS, Ventas, Stock, Productos, Clientes, Devoluciones y Configuración están listos. El dashboard era el único módulo restante y es la primera pantalla que ve el dueño cada mañana.
- **Diferenciador comercial real**: las planillas de Excel de la competencia no muestran KPIs en tiempo real. Un panel claro vende el sistema en la primera demo.
- **Reduce fricción operativa**: el operador entra y sabe sin clickear dónde está parado (caja abierta/cerrada, ventas del día, alertas de stock). Los links a `/stock?bajo=1`, `/ventas`, `/devoluciones` evitan navegación manual.
- **Alineado con la estrategia Q2 2026**: para conseguir las primeras 2-3 tiendas pagas (objetivo del trimestre) hay que mostrar producto pulido, no un placeholder.

---

## Estado Actual

### Estructura Existente Relevante

**Página actual** ([app/app/(dashboard)/dashboard/page.tsx](app/app/(dashboard)/dashboard/page.tsx)):

- Server component muy simple (~70 líneas).
- Lee `cuentas_fondos` activas y muestra saldos con color por tipo.
- Lee `sesiones_caja` con estado='abierta' y muestra banner verde/amarillo.
- **No hay**: ventas del día, métricas, comparativos, gráficos, alertas de stock, top productos/clientes.

**Datos disponibles (todos los módulos ya consultables):**

- `app/lib/ventas/queries.ts` — `listarVentas(opts)` con filtros por desde/hasta/clienteId, retorna `VentaListItem[]` + total + suma de monto.
- `app/lib/devoluciones/queries.ts` — `listarDevoluciones(opts)` con filtros desde/hasta/tipo.
- `app/lib/clientes/queries.ts` — `listarClientes(opts)` con paginación.
- `app/lib/stock/queries.ts` — `contarVariantesBajoStock()` y `listarStock({ bajoStock: true })`.
- `app/lib/caja/queries.ts` — `obtenerSesionAbierta()` con totales, `listarSesiones(limit)`.
- `app/lib/configuracion/queries.ts` — `listarCuentasFondos(soloActivas)`.

**Tablas DB con datos brutos accesibles directamente:**

- `ventas` (tienda_id, total, created_at, estado, cliente_id) — para KPIs y series temporales.
- `detalles_venta` (cantidad, total_linea, nombre_producto, variante_id) — para top productos y unidades vendidas.
- `devoluciones` (total_devuelto, created_at, estado) — para neto del día/mes.
- `clientes` (total_compras, monto_total) — métricas precalculadas por trigger.
- `cuentas_fondos.saldo_actual` — saldos en vivo.
- `variantes_producto.stock_actual` + `producto.stock_minimo` — para alertas.

**UI primitivas reutilizables:**

- `Button`, `LinkButton` de `@/components/ui/Button`.
- `EmptyState` de `@/components/ui/EmptyState`.
- `formatARS`, `formatDateTime`, `formatDate` de `@/lib/format`.
- Patrón de cards `bg-white rounded-xl border border-gray-200 p-5` ya consolidado en módulos previos.

**Sidebar** ([app/components/layout/Sidebar.tsx](app/components/layout/Sidebar.tsx)): "🏠 Inicio" apunta a `/dashboard` (primer link, default).

### Brechas o Problemas que se Abordan

- **Dashboard inutilizable como panel**: solo muestra saldos, no responde "¿cómo va el negocio?".
- **Falta de visibilidad operativa**: para saber ventas del día hay que ir a `/ventas`, filtrar fecha, sumar manualmente.
- **Sin alertas**: stock bajo o caja cerrada se descubren por accidente, no proactivamente.
- **Sin tendencia**: el dueño no ve si los últimos 7 días suben o bajan respecto a la semana anterior.
- **Falta storytelling de producto**: para vender el SaaS necesitamos una pantalla que impacte en la demo.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear `app/lib/dashboard/queries.ts` con todas las queries agregadas (KPIs día/mes, serie temporal, top productos, top clientes, stock bajo).
- Reescribir `app/app/(dashboard)/dashboard/page.tsx` como server component que orqueste todas las queries en paralelo (`Promise.all`).
- Crear componentes pequeños y enfocados en `app/components/dashboard/`:
  - `KpiCard.tsx` — tarjeta de KPI con valor, label, delta opcional, ícono.
  - `VentasChart.tsx` — gráfico de barras SVG inline (sin librerías) con últimos 14 días.
  - `TopProductosCard.tsx` — top 5 productos por unidades del mes.
  - `TopClientesCard.tsx` — top 5 clientes por monto del mes.
  - `StockBajoCard.tsx` — recuento + link a `/stock?bajo=1`.
  - `UltimasVentasCard.tsx` — últimas 5 ventas.
  - `UltimasDevolucionesCard.tsx` — últimas 5 devoluciones (oculto si no hay).
  - `EstadoCajaBanner.tsx` — refactor del banner actual + link a `/caja`.
  - `SaldosCard.tsx` — refactor del bloque de saldos actual.
- Layout responsive: 1 columna en mobile, 2 columnas en md, 3-4 columnas para los KPIs en lg.

### Nuevos Archivos a Crear

| Ruta del Archivo                                                | Propósito                                                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `app/lib/dashboard/queries.ts`                                  | Queries agregadas: KPIs día/mes, serie diaria, top productos, top clientes, stock bajo, últimas operaciones           |
| `app/components/dashboard/KpiCard.tsx`                          | Tarjeta visual reutilizable con título, valor grande, delta % opcional, color por tendencia, link opcional            |
| `app/components/dashboard/VentasChart.tsx`                      | Gráfico de barras SVG puro (sin recharts) — eje X días, eje Y monto, tooltip al hover, sin dependencias              |
| `app/components/dashboard/TopProductosCard.tsx`                 | Lista top 5 productos del mes con unidades y monto                                                                    |
| `app/components/dashboard/TopClientesCard.tsx`                  | Lista top 5 clientes del mes con compras y monto                                                                      |
| `app/components/dashboard/StockBajoCard.tsx`                    | Card alerta con cantidad de variantes bajo stock + link a `/stock?bajo=1`                                             |
| `app/components/dashboard/UltimasVentasCard.tsx`                | Card con últimas 5 ventas (número, fecha, monto, link a detalle)                                                      |
| `app/components/dashboard/UltimasDevolucionesCard.tsx`          | Card con últimas 5 devoluciones (número, fecha, monto, motivo corto, link)                                            |
| `app/components/dashboard/EstadoCajaBanner.tsx`                 | Banner de estado de caja con CTA dinámico: "Abrir caja" / "Ver caja"                                                  |
| `app/components/dashboard/SaldosCard.tsx`                       | Refactor del bloque de saldos por cuenta (extraído del page actual)                                                   |

### Archivos a Modificar

| Ruta del Archivo                                          | Cambios                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `app/app/(dashboard)/dashboard/page.tsx`                  | Reescritura completa: orquesta `Promise.all` de queries de dashboard y compone los nuevos componentes        |
| `app/app/(dashboard)/stock/page.tsx`                      | Confirmar que acepta `?bajo=1` en searchParams para filtro (si no, agregarlo) — para link desde StockBajoCard |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Sin librerías de charts (recharts/chart.js)**: Implementamos `VentasChart` con SVG puro. Razones: (a) bundle size — recharts son ~80KB gzipped, demasiado para una sola pantalla; (b) consistencia visual con el resto de la app que es Tailwind crudo; (c) un gráfico de barras simple con 14 puntos es trivial en SVG. Si más adelante el dashboard pide gráficos sofisticados (líneas múltiples, donuts), reconsideramos.

2. **Server Components puros para todo el dashboard**: cada card recibe data ya calculada en server. No hay client components con `useEffect` ni revalidación cliente. Razones: (a) el dashboard se rinde una sola vez al entrar, (b) Next 16 + React 19 server components soportan perfectamente este patrón, (c) cero JS en el cliente para esta página = TTI casi instantáneo.

3. **Queries en paralelo con `Promise.all`**: `app/lib/dashboard/queries.ts` expone funciones independientes; el page las invoca con `Promise.all`. Esto reduce TTI dramáticamente (10 queries en 1 round-trip de latencia, no 10).

4. **Comparativos día-vs-día y mes-vs-mes**: KPIs muestran delta % vs período anterior (hoy vs ayer, este mes vs mes anterior a misma fecha). Razón: un KPI sin contexto es ruido; el delta lo convierte en señal.

5. **Métricas incluyen devoluciones (neto)**: ventas del día = bruto - devolucionesBrutas. Mostramos ambos (bruto y neto) en la card principal con neto destacado. Razón: el dueño quiere saber la plata real que entró, no el bruto facturado.

6. **Top productos por unidades del mes en curso**: agregamos sobre `detalles_venta.cantidad` agrupado por `nombre_producto` para los últimos 30 días o mes calendario actual. Decisión: **mes calendario actual** (más intuitivo que "últimos 30 días" para retail).

7. **Top clientes usa `clientes.total_compras` y `clientes.monto_total`**: estos campos ya se mantienen actualizados por triggers (lo verificamos al implementar Clientes y Devoluciones). Esto evita un join pesado contra `ventas`. Limitación aceptada: estos totales son acumulados, no del mes — mostramos el ranking acumulado y lo aclaramos en el título de la card ("Top clientes — Histórico"). Si el usuario pide "top clientes del mes" en el futuro, agregamos otra query.

8. **Stock bajo: solo recuento + link, no listado**: el dashboard no es el lugar para ver el detalle. Una alerta simple ("12 variantes bajo stock — Ver →") con link a `/stock?bajo=1` evita ruido visual y reusa el módulo Stock.

9. **Layout fijo sin personalización**: por ahora no hay preferencias de "qué cards muestro/oculto". Si el feedback de las primeras tiendas lo pide, se agrega después.

10. **Última fecha como referencia**: todos los KPIs y la serie temporal usan `created_at` en zona horaria del servidor (PostgreSQL UTC). Para "hoy" filtramos `created_at::date = current_date`. Si en el futuro la zona horaria local de Argentina (-03) genera desfases, agregamos un helper `inicioDelDiaTienda()` con timezone fijo.

### Alternativas Consideradas

- **Vistas materializadas en Postgres**: agregaríamos `mv_dashboard_diario` con refresh nocturno. Rechazado por ahora — el volumen de una tienda sola no justifica la complejidad y la frescura inmediata es más valiosa que el ahorro de cómputo. Reconsiderar cuando una tienda supere ~10k ventas/mes.
- **Recharts / Chart.js / ApexCharts**: más bonito de fábrica pero pesado y rompe el estilo Tailwind plano. Rechazado.
- **Polling cliente cada N segundos**: agrega complejidad sin valor — el dueño puede recargar la página. Rechazado.
- **Dashboard "tiempo real" con Supabase Realtime**: descartado para MVP. Sumaría complejidad y costo (websockets siempre abiertos) sin pedido del usuario.
- **Cards arrastrables / personalizables**: rechazado para MVP.

### Preguntas Abiertas

Ninguna bloqueante. Asumimos:

- Las métricas "del mes" usan **mes calendario actual** (1 al día actual).
- Los deltas comparan con el período inmediatamente anterior (ayer / mes anterior a la misma fecha).
- "Top clientes" muestra el ranking histórico de la tienda (no del mes), basado en `clientes.total_compras` y `clientes.monto_total`.

Si el usuario prefiere "últimos 30 días" en vez de mes calendario, lo ajustamos en implementación con un cambio mínimo.

---

## Tareas Paso a Paso

### Paso 1: Crear `app/lib/dashboard/queries.ts`

Centraliza toda la agregación de datos del dashboard. Cada función es independiente y devuelve un tipo claro.

**Funciones a exportar:**

1. **`obtenerKpisDia()`** — devuelve:
   ```ts
   {
     ventasHoy: { cantidad: number; monto: number },
     ventasAyer: { cantidad: number; monto: number },
     devolucionesHoy: { cantidad: number; monto: number },
     ticketPromedioHoy: number,
     deltaCantidadPct: number | null, // null si ayer = 0
     deltaMontoPct: number | null,
     netoHoy: number, // ventasHoy.monto - devolucionesHoy.monto
   }
   ```
   Una sola query select sobre `ventas` con filtro `created_at >= current_date - 1 day` y agrupado en JS por fecha. Otra para `devoluciones`.

2. **`obtenerKpisMes()`** — análogo a `obtenerKpisDia` pero comparando mes actual (desde día 1) vs mes anterior hasta la misma fecha del día.

3. **`obtenerSerieVentas14Dias()`** — devuelve `Array<{ fecha: string; monto: number; cantidad: number }>` con 14 entradas (día más viejo primero). Rellenamos días sin ventas con 0.

4. **`obtenerTopProductosMes(limit = 5)`** — agrega `detalles_venta` por `nombre_producto` filtrando ventas del mes calendario actual con estado='completada'. Devuelve `Array<{ nombre: string; unidades: number; monto: number }>`.

5. **`obtenerTopClientesHistorico(limit = 5)`** — `select id, nombre, apellido, total_compras, monto_total from clientes where activo and total_compras > 0 order by monto_total desc limit 5`. Devuelve `Array<{ id, nombre_completo, total_compras, monto_total }>`.

6. **`contarStockBajo()`** — reusa `contarVariantesBajoStock()` de `lib/stock/queries.ts`.

7. **`obtenerUltimasVentas(limit = 5)`** — reusa `listarVentas({ pageSize: 5 })`.

8. **`obtenerUltimasDevoluciones(limit = 5)`** — reusa `listarDevoluciones({ pageSize: 5 })`.

9. **`obtenerSaldosCuentas()`** — reusa `listarCuentasFondos(true)` (todas activas).

**Patrón estructural:**

- Todas usan `getCtx()` interno (helper privado, copiar patrón de `devoluciones/queries.ts`).
- Todas filtran por `tienda_id` explícito (RLS lo refuerza pero filtramos por defensa en profundidad).
- Funciones que no devuelven listados completos deben ser puramente agregadas — no devolver filas crudas.

**Archivos afectados:**

- `app/lib/dashboard/queries.ts` (nuevo)

---

### Paso 2: Crear `app/components/dashboard/KpiCard.tsx`

Card visual reutilizable. Server component (sin "use client").

**Props:**

```ts
interface KpiCardProps {
  label: string
  valor: string // ya formateado (ARS o número)
  sub?: string // ej. "vs ayer" o "vs mes pasado"
  delta?: number | null // porcentaje, ej. 12.5 = +12.5%
  href?: string // si hay link, toda la card es clickable
  icono?: string // emoji opcional
  destacar?: boolean // borde indigo si es el KPI principal
}
```

**Visual:**

- Fondo blanco, border gray-200, rounded-xl, padding 5.
- Si `destacar=true` → border-indigo-200 bg-indigo-50.
- Label gris pequeño arriba.
- Valor grande (text-2xl o text-3xl, font-bold).
- Delta con color: verde si >0, rojo si <0, gris si null. Formato: `▲ 12.5%` / `▼ 3.2%` / `— sin datos`.
- Sub-text gris muy pequeño abajo.
- Si `href`, envolver con `<Link>` y agregar hover.

**Archivos afectados:**

- `app/components/dashboard/KpiCard.tsx` (nuevo)

---

### Paso 3: Crear `app/components/dashboard/VentasChart.tsx`

Gráfico de barras SVG puro. Server component.

**Props:**

```ts
interface VentasChartProps {
  serie: Array<{ fecha: string; monto: number; cantidad: number }>
}
```

**Visual:**

- SVG `viewBox="0 0 700 220"` responsive con `width="100%"`.
- Una barra por día (14 barras, ancho ~36px con padding 8px).
- Altura de barra proporcional al máximo de la serie.
- Color: bg `fill-indigo-500` por defecto, `fill-indigo-700` el día actual.
- Eje X con etiquetas dd/MM cada 2 días para no saturar.
- Eje Y con 3 marcas (0, max/2, max) formateadas `formatARS()` cortas (ej. `$10k`).
- Si todas las barras son 0 → mostrar `<p>Sin ventas en los últimos 14 días</p>`.
- **Sin tooltips JS** (mantener server). En su lugar, debajo del SVG una pequeña tabla resumen "Total 14d" + "Promedio diario".

**Helper de formato compacto** (inline en el componente):

```ts
function formatARSCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}
```

**Archivos afectados:**

- `app/components/dashboard/VentasChart.tsx` (nuevo)

---

### Paso 4: Crear `app/components/dashboard/TopProductosCard.tsx`

Card con tabla compacta de top 5 productos.

**Props:**

```ts
interface TopProductosCardProps {
  items: Array<{ nombre: string; unidades: number; monto: number }>
}
```

**Visual:**

- Card estándar.
- Título "Top productos del mes" + subtítulo "por unidades vendidas".
- Tabla densa: # | Producto | Unid. | Total. Sin botón "ver más" (los productos no tienen vista de ranking propia).
- Si `items.length === 0` → mensaje "Sin ventas este mes".

**Archivos afectados:**

- `app/components/dashboard/TopProductosCard.tsx` (nuevo)

---

### Paso 5: Crear `app/components/dashboard/TopClientesCard.tsx`

Card con top 5 clientes históricos.

**Props:**

```ts
interface TopClientesCardProps {
  items: Array<{ id: string; nombre_completo: string; total_compras: number; monto_total: number }>
}
```

**Visual:**

- Card estándar.
- Título "Top clientes" + subtítulo "histórico — por monto total".
- Cada fila linkable a `/clientes/{id}`.
- Mostrar nombre, compras, monto.
- Si `items.length === 0` → "Aún no tenés clientes con compras registradas".

**Archivos afectados:**

- `app/components/dashboard/TopClientesCard.tsx` (nuevo)

---

### Paso 6: Crear `app/components/dashboard/StockBajoCard.tsx`

Card de alerta + CTA.

**Props:**

```ts
interface StockBajoCardProps {
  cantidad: number
}
```

**Visual:**

- Si `cantidad === 0`: card verde sutil ("✓ Stock OK — todas las variantes con stock suficiente").
- Si `cantidad > 0`: card amber con número grande, label "variantes bajo stock", botón link a `/stock?bajo=1`.

**Archivos afectados:**

- `app/components/dashboard/StockBajoCard.tsx` (nuevo)

---

### Paso 7: Crear `app/components/dashboard/UltimasVentasCard.tsx` y `UltimasDevolucionesCard.tsx`

Listas compactas con últimas 5 operaciones de cada tipo.

**UltimasVentasCard props:**

```ts
interface UltimasVentasCardProps {
  items: VentaListItem[] // del lib/ventas/queries
}
```

**UltimasDevolucionesCard props:**

```ts
interface UltimasDevolucionesCardProps {
  items: DevolucionListItem[] // del lib/devoluciones/queries
}
```

**Visual:**

- Card con header "Últimas ventas" / "Últimas devoluciones" + link "Ver todas →" en la esquina.
- Filas compactas: "#1234 · hace 5 min · $4.500 · Cliente X" linkable a detalle.
- `UltimasDevolucionesCard` se renderiza solo si `items.length > 0` (para no mostrar card vacía cuando todavía no hay devoluciones).

**Archivos afectados:**

- `app/components/dashboard/UltimasVentasCard.tsx` (nuevo)
- `app/components/dashboard/UltimasDevolucionesCard.tsx` (nuevo)

---

### Paso 8: Crear `app/components/dashboard/EstadoCajaBanner.tsx` y `SaldosCard.tsx`

Refactor del banner y los saldos del page actual.

**EstadoCajaBanner props:**

```ts
interface EstadoCajaBannerProps {
  sesion: SesionConTotales | null // de lib/caja/queries
}
```

**Visual:**

- Si `sesion`: banner verde con "Caja abierta desde {hora} · {ventas_count} ventas · {monto_ingreso}" + link "Ver caja".
- Si `sesion === null`: banner amber "Caja cerrada" + LinkButton "Abrir caja" → `/caja`.

**SaldosCard props:**

```ts
interface SaldosCardProps {
  cuentas: CuentaFondo[] // de lib/configuracion/queries
}
```

**Visual:** mismo grid que el page actual pero como componente independiente.

**Archivos afectados:**

- `app/components/dashboard/EstadoCajaBanner.tsx` (nuevo)
- `app/components/dashboard/SaldosCard.tsx` (nuevo)

---

### Paso 9: Reescribir `app/app/(dashboard)/dashboard/page.tsx`

Server component que orquesta todo en paralelo.

**Estructura:**

```tsx
export default async function DashboardPage() {
  const [
    sesion,
    cuentas,
    kpisDia,
    kpisMes,
    serie14d,
    topProductos,
    topClientes,
    stockBajo,
    ultimasVentas,
    ultimasDevoluciones,
  ] = await Promise.all([
    obtenerSesionAbierta(),
    listarCuentasFondos(true),
    obtenerKpisDia(),
    obtenerKpisMes(),
    obtenerSerieVentas14Dias(),
    obtenerTopProductosMes(5),
    obtenerTopClientesHistorico(5),
    contarVariantesBajoStock(),
    obtenerUltimasVentas(5),
    obtenerUltimasDevoluciones(5),
  ])

  return (
    <div className="space-y-6">
      <Header />
      <EstadoCajaBanner sesion={sesion} />

      {/* Fila 1: KPIs principales (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ventas hoy (neto)" valor={...} delta={...} sub="vs ayer" destacar />
        <KpiCard label="Cant. ventas hoy" valor={...} delta={...} sub="vs ayer" />
        <KpiCard label="Ticket promedio hoy" valor={...} sub="por venta" />
        <KpiCard label="Ventas del mes" valor={...} delta={...} sub="vs mes pasado" />
      </div>

      {/* Fila 2: Chart + StockBajo (2 columnas, chart 2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h2>Ventas últimos 14 días</h2>
          <VentasChart serie={serie14d} />
        </div>
        <StockBajoCard cantidad={stockBajo} />
      </div>

      {/* Fila 3: Top productos + Top clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductosCard items={topProductos} />
        <TopClientesCard items={topClientes} />
      </div>

      {/* Fila 4: Últimas operaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UltimasVentasCard items={ultimasVentas.items} />
        {ultimasDevoluciones.items.length > 0 && (
          <UltimasDevolucionesCard items={ultimasDevoluciones.items} />
        )}
      </div>

      {/* Fila 5: Saldos */}
      <SaldosCard cuentas={cuentas} />
    </div>
  )
}
```

**Archivos afectados:**

- `app/app/(dashboard)/dashboard/page.tsx` (reescritura completa)

---

### Paso 10: Confirmar/agregar filtro `?bajo=1` en `/stock`

Verificar que `app/app/(dashboard)/stock/page.tsx` interpreta `searchParams.bajo === '1'` y pasa `bajoStock: true` a `listarStock`. Si no lo hace, agregarlo.

**Archivos afectados:**

- `app/app/(dashboard)/stock/page.tsx` (verificar/extender)

---

### Paso 11: Validación TypeScript

Correr `tsc --noEmit` y resolver errores hasta exit 0.

```powershell
Set-Location G:\proyectos\tienda-ropa\CValleTienda\app
node ./node_modules/typescript/bin/tsc --noEmit
```

**Archivos afectados:** todos los nuevos.

---

### Paso 12: Validación visual manual

Probar el dashboard en `http://localhost:3000/dashboard` con:

- Caja abierta + caja cerrada (probar ambos estados del banner).
- 0 ventas hoy (deltas null, valores en 0).
- Con ventas y sin devoluciones (UltimasDevolucionesCard oculta).
- Con stock bajo > 0 y stock bajo === 0 (card verde vs amber).
- Con 0 productos vendidos en el mes (top productos vacío).

**Archivos afectados:** ninguno (smoke test).

---

### Paso 13: Marcar plan como Implementado

Editar este archivo: `Estado: Borrador` → `Estado: Implementado`. Agregar sección `## Notas de Implementación` al final con:

- Fecha de implementación.
- Resultado de tsc.
- Cualquier desviación menor del plan.
- Decisiones tomadas durante la implementación que valga la pena documentar.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/layout/Sidebar.tsx`: link "🏠 Inicio" → `/dashboard`. Sin cambios.
- `app/app/(dashboard)/layout.tsx`: layout del dashboard. Sin cambios.
- `app/app/page.tsx` (root): probablemente redirige a `/dashboard` o `/login`. Sin cambios.

### Actualizaciones Necesarias para Consistencia

- Ninguna actualización de docs externos (CLAUDE.md no necesita cambios — el dashboard ya estaba mencionado).
- Si decidimos exponer las funciones de `lib/dashboard/queries.ts` a otros módulos en el futuro, mantenemos la convención existente.

### Impacto en Flujos de Trabajo Existentes

- **Cero breaking changes** en otros módulos. Solo lectura de tablas existentes.
- **Performance**: el dashboard hace ~10 queries en paralelo. En desarrollo local debería renderizar < 500ms. Para volúmenes altos (>50k ventas históricas) considerar agregar índices `(tienda_id, created_at)` que ya están en migración 005 y 011.
- **El sidebar y resto de la navegación no cambian** — el dashboard sigue siendo la home.

---

## Lista de Validación

- [ ] `app/lib/dashboard/queries.ts` creado con las 9 funciones documentadas y tipos exportados.
- [ ] 9 componentes nuevos creados en `app/components/dashboard/`.
- [ ] `app/app/(dashboard)/dashboard/page.tsx` reescrito y rinde sin errores.
- [ ] `Promise.all` paraleliza las queries (verificar que no haya `await` secuenciales).
- [ ] `KpiCard` muestra deltas con color correcto (verde +, rojo -).
- [ ] `VentasChart` rinde 14 barras con eje X en dd/MM y eje Y en formato compacto.
- [ ] `StockBajoCard` muestra estado verde si cantidad === 0 y amber si > 0.
- [ ] `UltimasDevolucionesCard` se oculta si no hay devoluciones.
- [ ] Links de navegación funcionan: `/stock?bajo=1`, `/clientes/{id}`, `/ventas/{id}`, `/devoluciones/{id}`, `/caja`.
- [ ] `tsc --noEmit` exit code 0.
- [ ] Smoke test visual: dashboard rinde con caja abierta, caja cerrada, 0 ventas, ventas con devoluciones, stock OK y stock bajo.
- [ ] Plan marcado como `Implementado` con notas de implementación.

---

## Criterios de Éxito

La implementación está completa cuando:

1. **El dashboard responde "cómo va el negocio" en una sola pantalla**: ventas hoy con delta vs ayer, mes con delta vs mes pasado, ticket promedio, alertas de stock, top productos, top clientes y últimas operaciones — todo visible sin scroll en pantalla 1080p.
2. **Cero JS de cliente**: la página es 100% server components y no agrega bundle JS más allá del shared chunk de Next.
3. **Performance aceptable**: TTFB < 500ms en desarrollo local con 100 ventas seed.
4. **Navegación profunda**: cada KPI relevante es clickable y lleva a la vista de detalle correspondiente.
5. **Robustez con datos vacíos**: el dashboard rinde sin crashear en tienda recién creada (0 ventas, 0 clientes, 0 productos).

---

## Notas

- **Futuras iteraciones (no en este plan):**
  - Selector de rango temporal (hoy / semana / mes / personalizado).
  - Comparativos por método de pago (qué % es efectivo, transferencia, tarjeta).
  - Gráfico de torta o barras apiladas por categoría/producto.
  - Exportar dashboard a PDF.
  - Vista alternativa "modo TV" para mostrar en pantalla en el local.
  - Notificaciones push cuando entra una venta o se cierra caja.
- **Métricas que deliberadamente no incluimos en MVP:**
  - Margen / utilidad: requiere `costo` por producto, no implementado todavía.
  - Comisiones de métodos de pago netas: aunque hay datos (`monto_neto` en `pagos_venta`), los KPIs muestran bruto para no confundir hasta que el dueño entienda bien la diferencia.
  - Análisis de retención de clientes: necesita más historial.
- **Consideración de timezone**: si en producción detectamos que las ventas cerca de medianoche aparecen en el día equivocado, agregar un helper `inicioDelDiaArgentina()` que use `'America/Argentina/Buenos_Aires'`. No es bloqueante para MVP.

---

## Notas de Implementaci�n

- Implementado: 2026-04-29. tsc --noEmit exit 0 al primer intento.
- `app/lib/dashboard/queries.ts`: 9 funciones agregadas. obtenerKpisDia/Mes hacen UNA query por tabla y agrupan en JS para evitar viajes de ida/vuelta. Top productos del mes filtra detalles_venta con !inner sobre ventas (estado='completada' + rango de fechas).
- `app/components/dashboard/`: 9 componentes server-only. VentasChart hecho 100% en SVG inline (sin librer�as), con 14 barras, eje Y de 3 marcas en formato compacto (\/\.5M), tooltip v�a <title> SVG nativo, totales (suma/promedio/cantidad) en footer.
- KpiCard soporta destacar (borde indigo), icono emoji, delta con flecha y color (verde/rojo/gris).
- /stock?bajo=1 ya estaba soportado en stock/page.tsx (par�metro 'bajo' ? soloBajoStock). No requiri� cambios.
- Si no hay devoluciones recientes la fila 4 muestra una card placeholder en vez de ocultarse, para mantener el grid balanceado.
- Fechas: las queries usan toISOString() del servidor; si en producci�n la timezone Argentina (-03) genera desfases cerca de medianoche, agregar helper inicioDelDiaArgentina() con 'America/Argentina/Buenos_Aires'. No bloqueante para MVP.

