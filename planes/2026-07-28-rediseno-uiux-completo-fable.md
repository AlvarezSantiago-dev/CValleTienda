# Plan: Reestructuración y Rediseño UI/UX Completo (Proyecto "Fable")

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Rediseño masivo y completo de UI/UX del SaaS CValleTienda — interfaz, navegación, componentes base y experiencia de usuario — manteniendo intacta la lógica de negocio, con enfoque mobile-first real y sin interrumpir a los clientes activos.

---

## Descripción General

### Qué Logra Este Plan

Es el **plan maestro** de un rediseño visual y estructural completo de CValleTienda: se formaliza un Design System premium (tokens, primitives, patrones), se reconstruye el shell de navegación (sidebar, header, navegación mobile) y luego se rediseña **módulo por módulo** cada una de las ~55 rutas del dashboard, reutilizando la capa de datos existente (Server Actions + queries) sin tocarla. Cada fase entrega valor deployable de forma independiente.

### Por Qué Importa

- El producto tiene **clientes activos pagando**: la percepción de calidad visual afecta retención y ventas nuevas.
- La UI actual creció orgánicamente: 12 primitives en `components/ui/` conviven con ~170 componentes de dominio con clases hardcodeadas, modales ad-hoc sin base común, tablas reimplementadas por página, sin vista mobile real en tablas/POS y sin dark mode.
- La navegación (sidebar drawer + tabs secundarios) no escala bien en mobile ni comunica jerarquía; no hay bottom-nav ni command palette.
- Formalizar el sistema de diseño primero hace que el rediseño de las 55 pantallas sea mayormente **presentacional y de bajo riesgo** (la lógica vive en Server Actions/queries que no se modifican).

### Aclaración de Dominio (resuelta)

**Confirmado por el usuario (2026-07-28):** el producto es un **gestor tipo CRM/POS profesional** — la mención a "gestor de turnos" fue una confusión. En este codebase "turno" = sesión de caja (`sesiones_caja`, módulo `/caja`). No se agrega módulo de agenda/citas.

---

## Estado Actual

### Estructura Existente Relevante

```
app/
  app/
    globals.css                    ← Tokens CSS (@theme inline, Tailwind 4): brand lime, surface, radius, shadows
    layout.tsx                     ← Root: fuentes Geist Sans/Mono
    (auth)/                        ← login, registro, recuperar-password, confirmar-email (layout split con AuthBrandPanel)
    (dashboard)/                   ← ~45 páginas protegidas: dashboard, pos, ventas, caja, clientes,
                                     productos, stock, devoluciones, remitos, reportes, graficos,
                                     precios, planes, configuracion/* (7 subpáginas), onboarding
    superadmin/                    ← panel global con layout propio
    actions/                       ← Server Actions por módulo (NO SE TOCAN)
  components/
    ui/                            ← 12 primitives propios: Button, Input, Textarea, Select, PasswordInput,
                                     InputMonedaARS, Card, Badge, EmptyState, Pagination, Skeleton, RubroSelector
    layout/                        ← AppShell (sidebar fijo lg+ / drawer mobile), Sidebar, SidebarIcons, Header,
                                     PageContext, PlanProvider, RubroProvider, TabsConfiguracion, TabsProductos
    pos/ (21), productos/ (24), reportes/ (19), configuracion/ (17), caja/ (15),
    dashboard/ (13), impresion/ (9), clientes/ (7), stock/, devoluciones/, remitos/,
    ventas/, landing/, planes/, voz/, auth/, onboarding/, precios/, superadmin/
  lib/                             ← queries.ts por módulo, hooks (useBarcodeScanner, useAutoFocus, usePrint)
  styles/print.css                 ← estilos de impresión (NO SE TOCAN salvo compatibilidad)
```

**Stack:** Next.js 16.2.4 · React 19.2.4 · Tailwind CSS 4 (sin `tailwind.config`, tokens vía `@theme inline`) · lucide-react · framer-motion · sonner · Supabase SSR. **Sin** shadcn/Radix/Headless UI, sin React Query/Zustand, sin dark mode, sin librería de charts (SVG propios).

**Patrón de datos:** Server Components async + Server Actions + `lib/*/queries.ts`. ~122 componentes `'use client'` para interactividad. Filtros vía URL `searchParams`. Contextos: `PlanProvider`, `RubroProvider`, `PageContext`, `VoiceProvider`.

**Planes previos relacionados:** `2026-05-22-design-system-y-redesign-ui.md` (mini design system v1, implementado parcialmente), `2026-05-13-responsive-completo-sin-overflow.md`, `2026-05-10-dashboard-layout-sidebar-redesign.md`. Este plan los **supera y reemplaza** como referencia de diseño.

### Brechas o Problemas que se Abordan

1. **Tokens incompletos y poco usados**: existen `--brand-*`, `--surface`, `--radius-*` en `globals.css`, pero la mayoría del código usa `lime-*`/`gray-*` hardcodeado. Sin tokens de spacing, tipografía ni semánticos (success/warning/danger/info).
2. **Primitives insuficientes**: no hay `Modal/Dialog` base (6+ modales ad-hoc), no hay `DataTable` genérico (cada listado reimplementa `<table>`), no hay `Tabs`, `Tooltip`, `Dropdown/Menu`, `Combobox`, `DatePicker`, `Switch`, `Checkbox`/`Radio` estilizados, `Drawer/Sheet`, `Toast` unificado (sonner sin theming).
3. **Navegación no fluida**: sidebar con 4 grupos y muchos ítems planos; en mobile solo drawer hamburguesa (2 taps para todo); tabs secundarios inconsistentes (`TabsConfiguracion` vs `TabsProductos`); sin breadcrumbs ni command palette; sin accesos rápidos a las acciones más frecuentes (vender, cobrar, buscar producto).
4. **Responsive incompleto**: tablas desktop-only en varios listados, POS pensado para desktop/tablet, sin bottom navigation mobile, tipografía muy densa (`text-[13px]`, `text-[10px]`).
5. **Inconsistencias visuales**: `setup/page.tsx` en indigo (fuera de marca), iconos mezclados (lucide + SVG inline + emojis), focus rings y espaciados dispares, jerarquía tipográfica ad-hoc.
6. **Sin dark mode** ni preparación para theming.
7. **Sin documentación viva del sistema**: no hay página interna de referencia de componentes.

---

## Cambios Propuestos

### Resumen de Cambios

- **Fase 0 — Fundaciones**: Design System v2 completo en `globals.css` (tokens semánticos, tipografía, spacing, motion, dark-ready) + página interna `/design` de documentación viva.
- **Fase 1 — Primitives**: reescritura/creación de ~25 componentes base en `components/ui/` (incluye Modal, Drawer, DataTable responsive, Tabs, Dropdown, Combobox, Switch, Tooltip, PageHeader, StatCard).
- **Fase 2 — Shell y Navegación**: nuevo AppShell con sidebar colapsable (iconos + expandido), bottom navigation mobile con acción central "Vender", header con breadcrumbs + acciones contextuales, command palette (Ctrl+K), tabs secundarios unificados.
- **Fases 3–9 — Módulos**: rediseño pantalla por pantalla en orden de impacto: Dashboard → POS/Cobro → Caja → Productos/Stock → Ventas/Devoluciones/Remitos → Clientes/Reportes/Gráficos → Configuración/Planes/Onboarding.
- **Fase 10 — Auth, Landing y pulido final**: pantallas de auth, setup (fix indigo), estados vacíos/carga/error globales, auditoría de accesibilidad y QA responsive integral.
- **Regla de oro en todas las fases**: no se modifican Server Actions, queries, tipos ni rutas. Solo capa de presentación.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/components/ui/Modal.tsx` | Dialog base accesible (focus trap, Escape, overlay, tamaños, variante fullscreen mobile) — reemplaza los 6 modales ad-hoc |
| `app/components/ui/Drawer.tsx` | Sheet lateral/inferior para filtros, detalle rápido y formularios en mobile |
| `app/components/ui/DataTable.tsx` | Tabla responsive genérica: `<table>` en desktop, cards apiladas en mobile; sorting visual, empty state y skeleton integrados |
| `app/components/ui/Tabs.tsx` | Tabs unificados (underline + pill), scroll horizontal en mobile — reemplaza TabsConfiguracion/TabsProductos |
| `app/components/ui/DropdownMenu.tsx` | Menú de acciones (kebab) para filas de tabla y header |
| `app/components/ui/Combobox.tsx` | Select con búsqueda (clientes, productos, categorías) |
| `app/components/ui/Switch.tsx` | Toggle para configuración |
| `app/components/ui/Checkbox.tsx` | Checkbox estilizado con label |
| `app/components/ui/RadioGroup.tsx` | Radios estilizados (métodos de pago, opciones de rubro) |
| `app/components/ui/Tooltip.tsx` | Tooltip liviano CSS-first para iconos y truncados |
| `app/components/ui/PageHeader.tsx` | Encabezado de página estándar: título, descripción, breadcrumb, slot de acciones |
| `app/components/ui/StatCard.tsx` | KPI card unificada (valor, delta, icono, sparkline opcional) |
| `app/components/ui/SegmentedControl.tsx` | Selector de períodos/vistas (hoy/semana/mes) |
| `app/components/ui/SearchInput.tsx` | Input de búsqueda con icono, clear y atajo de teclado |
| `app/components/ui/Avatar.tsx` | Avatar con iniciales para equipo/clientes |
| `app/components/ui/Separator.tsx` | Divisor semántico |
| `app/components/ui/Spinner.tsx` | Indicador de carga inline unificado |
| `app/components/layout/BottomNav.tsx` | Navegación inferior mobile (5 ítems, acción central "Vender" destacada) |
| `app/components/layout/CommandPalette.tsx` | Búsqueda global Ctrl+K: navegar a rutas, buscar productos/clientes |
| `app/components/layout/Breadcrumbs.tsx` | Breadcrumb derivado de la ruta + PageContext |
| `app/components/layout/SidebarV2.tsx` | Sidebar nuevo: colapsable a iconos en desktop, grupos con jerarquía clara, badge de plan/trial |
| `app/app/(dashboard)/design/page.tsx` | Página interna de documentación viva del Design System (solo owner/superadmin, o detrás de flag) |
| `referencia/design-system-v2.md` | Especificación escrita del sistema: paleta, tipografía, spacing, patrones de página, do/don't |

*(Los archivos nuevos por módulo — p. ej. vistas mobile del POS — se detallarán en los sub-planes de cada fase.)*

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/globals.css` | Design System v2: tokens semánticos completos (`--color-primary/success/warning/danger/info`, escala de superficie, tipografía fluida, spacing, motion, z-index), estructura dark-ready con `color-scheme` |
| `app/components/ui/Button.tsx` | Rediseño: nuevas variantes/tamaños, `loading`, icon-only, tamaño táctil mínimo 44px en mobile |
| `app/components/ui/Input.tsx`, `Select.tsx`, `Textarea.tsx`, `PasswordInput.tsx`, `InputMonedaARS.tsx` | Rediseño consistente: alturas unificadas, estados error/disabled/focus con tokens, tamaño de fuente ≥16px en mobile (evita zoom iOS) |
| `app/components/ui/Card.tsx`, `Badge.tsx`, `EmptyState.tsx`, `Pagination.tsx`, `Skeleton.tsx` | Alinear a tokens v2; Pagination con variante mobile compacta |
| `app/components/layout/AppShell.tsx` | Integrar SidebarV2 + BottomNav + CommandPalette; sidebar colapsable persistente (localStorage) |
| `app/components/layout/Header.tsx` | Breadcrumbs, slot de acciones por página, buscador global, indicador de caja abierta/cerrada |
| `app/components/layout/Sidebar.tsx` | Deprecado → migrar consumo a SidebarV2 y eliminar al final de Fase 2 |
| `app/components/layout/TabsConfiguracion.tsx`, `TabsProductos.tsx` | Reemplazar implementación interna por primitive `Tabs` |
| `app/app/(dashboard)/**/page.tsx` (~45 páginas) | Rediseño por fases: PageHeader, DataTable, primitives nuevos, layouts responsive (detalle en sub-planes por módulo) |
| `app/components/{pos,caja,dashboard,productos,stock,clientes,ventas,devoluciones,remitos,reportes,configuracion,planes,onboarding}/**` | Migración presentacional a primitives v2, misma interfaz de props y mismas Server Actions |
| `app/app/(auth)/**` y `app/components/auth/**` | Rediseño auth consistente con la nueva marca visual |
| `app/app/setup/page.tsx` | Eliminar paleta indigo, alinear a marca |
| `app/CLAUDE.md` / `CLAUDE.md` raíz | Documentar Design System v2, página `/design` y convenciones nuevas |
| `contexto/proyectos.md` | Registrar el proyecto de rediseño y su avance por fases |

### Archivos a Eliminar

| Archivo | Cuándo | Por qué |
| ------- | ------ | ------- |
| `app/components/layout/Sidebar.tsx` + `SidebarIcons.tsx` | Fin de Fase 2 | Reemplazados por SidebarV2 (iconos lucide) |
| Modales ad-hoc duplicados (estructura interna) | Progresivo por módulo | Migran a `Modal.tsx` base; el componente de dominio queda pero sin markup duplicado |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Evolución de marca, no revolución**: se mantiene lime como color primario (identidad ya reconocida por clientes activos) pero refinado — lime como acento sobre una base neutra más sofisticada (grises cálidos, más blanco, sombras suaves). El "premium" viene de tipografía, espaciado, jerarquía y micro-interacciones, no de cambiar el color.
2. **Sistema propio sobre Tailwind 4, sin adoptar shadcn/Radix**: ya hay 12 primitives propios funcionando, React 19 + Tailwind 4 CSS-first encajan perfecto con componentes propios, y evitamos una migración masiva de dependencias. Se toman los *patrones* de shadcn (composición, variantes, accesibilidad) sin el vendor.
3. **Migración estranguladora (strangler pattern), no big-bang**: los primitives v2 conviven con los actuales; cada módulo migra completo en su fase y se deploya. Los clientes nunca ven una app a medio romper. Las rutas NO cambian (bookmarks y hábitos de clientes intactos).
4. **Navegación en 3 niveles**: (a) Desktop: sidebar colapsable a rail de iconos; (b) Mobile: bottom navigation con 5 accesos (Inicio, Ventas, **Vender** central destacado, Productos, Menú) + drawer para el resto; (c) Transversal: command palette Ctrl+K y breadcrumbs. Los ítems del menú actual se conservan todos (cero pérdida de funcionalidad), solo se re-jerarquizan.
5. **Mobile-first en componentes, adaptativo en flujos**: los primitives se diseñan desde 360px hacia arriba. El POS mantiene su flujo denso optimizado para desktop/tablet con teclado+scanner (así trabajan las cajas hoy) y gana una vista phone operativa, sin sacrificar la velocidad desktop.
6. **DataTable responsive con patrón tabla→cards**: en `<md` cada fila se renderiza como card con campos priorizados. Un solo componente para todos los listados (ventas, productos, stock, clientes, movimientos).
7. **Tokens semánticos primero**: todo componente v2 consume `var(--color-*)` / utilidades `@theme`, nunca `lime-500` directo. Esto deja dark mode como un cambio de valores, no de código (dark mode se prepara pero NO se activa en este proyecto).
8. **Orden de fases por impacto de negocio**: Dashboard y POS/Caja son las pantallas que los clientes ven todos los días → van primero después de las fundaciones.
9. **Página `/design` como documentación viva**: renderiza todos los primitives con sus variantes; sirve de QA visual y evita Storybook (overhead innecesario para un equipo de 1).
10. **Roles y rubros se respetan tal cual**: SidebarV2 y BottomNav reutilizan la lógica existente de filtrado por rol (`owner`/`admin`/`vendedor`) y flags de rubro (`usarRemitos`, `usarDevoluciones`).

### Alternativas Consideradas

- **Adoptar shadcn/ui + Radix**: descartado — implica añadir ~10 dependencias, re-theming completo y riesgo de conflictos con React 19/Tailwind 4; el beneficio no justifica el costo dado que ya existe una base propia sana.
- **Rebuild en repo/carpeta paralela con cutover final**: descartado — con clientes activos, un cutover big-bang es el mayor riesgo posible; el strangler pattern permite validar módulo a módulo en producción.
- **Cambiar navegación a top-nav horizontal**: descartado — con 20+ rutas y 4 grupos, un sidebar jerárquico + bottom nav mobile escala mejor que una top-nav.
- **Activar dark mode dentro de este proyecto**: pospuesto — se deja la arquitectura lista (tokens semánticos) pero activarlo duplica el QA de 55 pantallas; será un proyecto corto posterior.
- **Storybook**: descartado en favor de `/design` (cero dependencias, siempre sincronizado con producción).

### Preguntas Abiertas (necesitan input del usuario antes de implementar)

1. **Identidad visual**: ¿confirmás mantener lime como color primario refinado, o querés explorar una paleta nueva? (La recomendación es mantenerlo por los clientes activos.) — *Fase 0 avanzó con la recomendación: lime refinado sobre neutros cálidos.*
2. ~~**"Gestor de turnos"**~~ **RESUELTA (2026-07-28)**: el usuario confirmó que es un gestor tipo CRM/POS profesional; no hay módulo de agenda/citas. No se agrega Fase 11.
3. **Bottom nav mobile — 5 accesos propuestos**: Inicio / Ventas / **Vender (central)** / Productos / Menú. ¿Cambiarías alguno? (Por ejemplo, Caja en lugar de Productos para perfiles cajero.) — *Fase 2 implementó la propuesta: admin = Inicio/Ventas/Vender/Productos/Menú; cajero = Caja/Ventas/Vender/Precios/Menú.*
4. **Tipografía**: ¿mantener Geist o evaluar una fuente de marca distinta para display/títulos? — *Sin cambio; se mantiene Geist.*
5. **Ritmo de deploy**: ¿cada fase se deploya a producción al completarse (recomendado), o preferís acumular y validar en un entorno de preview? — *Pendiente; no bloquea implementación.*

---

## Tareas Paso a Paso

> **Metodología:** este es el plan maestro. Las Fases 0–2 se implementan directamente desde este documento. Las Fases 3–10 (módulos) generan cada una un **sub-plan detallado** (`/crear-plan`) al momento de iniciarse, con el inventario exacto de componentes de ese módulo. Regla transversal: **cero cambios** en `app/app/actions/`, `app/lib/*/queries.ts`, tipos y rutas.

### Paso 1 — Fase 0: Design System v2 (fundaciones)

Definir y codificar el lenguaje visual completo antes de tocar cualquier pantalla.

**Acciones:**

- Reescribir `app/app/globals.css`: tokens semánticos de color (primary/success/warning/danger/info + escala de superficie y texto), escala tipográfica fluida (`clamp`), spacing, radius, sombras (3 niveles suaves), motion (duraciones + easings), z-index; estructura preparada para dark mode (`color-scheme`, variables invertibles).
- Definir reglas de densidad: alturas estándar de controles (40px desktop / 44px táctil), `text-sm` como cuerpo mínimo (adiós `text-[10px]` en navegación), grillas de página estándar (`max-w`, paddings responsive).
- Estandarizar iconografía: **lucide-react en todo el sistema**, tamaños 16/20/24; eliminar SVG inline duplicados progresivamente.
- Crear `referencia/design-system-v2.md` con la especificación (paleta con contrastes AA verificados, tipografía, spacing, patrones de página: listado / detalle / formulario / wizard / modal).
- Crear la página `/design` con secciones vacías que se completan en Fase 1.

**Archivos afectados:**

- `app/app/globals.css`
- `referencia/design-system-v2.md`
- `app/app/(dashboard)/design/page.tsx`

---

### Paso 2 — Fase 1: Primitives v2 (componentes base)

Construir/reescribir la librería de componentes. Todo consume tokens, nada hardcodea color.

**Acciones:**

- Rediseñar los 12 primitives existentes (`Button`, `Input`, `Select`, `Textarea`, `PasswordInput`, `InputMonedaARS`, `Card`, `Badge`, `EmptyState`, `Pagination`, `Skeleton`, `RubroSelector`) manteniendo sus props públicas (drop-in: las pantallas actuales mejoran solas sin migración).
- Crear los primitives nuevos: `Modal`, `Drawer`, `DataTable`, `Tabs`, `DropdownMenu`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Tooltip`, `PageHeader`, `StatCard`, `SegmentedControl`, `SearchInput`, `Avatar`, `Separator`, `Spinner`.
- Accesibilidad en cada uno: roles ARIA, navegación por teclado, focus visible, focus trap en Modal/Drawer.
- Theming de `sonner` (toasts) a la nueva paleta.
- Documentar cada primitive con todas sus variantes en `/design`.
- QA responsive de cada primitive en 360px / 768px / 1280px.

**Archivos afectados:**

- `app/components/ui/*` (12 modificados + 17 nuevos)
- `app/app/(dashboard)/design/page.tsx`

---

### Paso 3 — Fase 2: Shell y Navegación

Reconstruir la estructura de navegación completa. Es el cambio más visible para clientes: se cuida la continuidad (mismos nombres de secciones, mismas rutas).

**Acciones:**

- Crear `SidebarV2`: colapsable a rail de iconos (desktop, estado persistido en localStorage), grupos re-jerarquizados con los mismos ítems actuales, filtrado por rol/rubro reutilizando la lógica existente, indicador de plan/trial, logout claro.
- Crear `BottomNav` mobile: 5 accesos con "Vender" central destacado; visible solo `<lg`; oculta en POS activo para maximizar espacio.
- Rediseñar `Header`: breadcrumbs (`Breadcrumbs.tsx` derivado de ruta + PageContext), slot de acciones por página, `SearchInput` global que abre el command palette, indicador de estado de caja (abierta/cerrada) siempre visible.
- Crear `CommandPalette` (Ctrl+K / botón en header): navegación a todas las rutas + búsqueda rápida de productos y clientes (reutiliza queries existentes).
- Actualizar `AppShell`: integrar todo lo anterior; safe-areas iOS (`env(safe-area-inset-*)`); mantener integración de voz (`VoiceFab`) reposicionada para no chocar con BottomNav.
- Migrar `TabsConfiguracion` y `TabsProductos` al primitive `Tabs`.
- Eliminar `Sidebar.tsx` y `SidebarIcons.tsx` viejos al validar.

**Archivos afectados:**

- `app/components/layout/SidebarV2.tsx`, `BottomNav.tsx`, `CommandPalette.tsx`, `Breadcrumbs.tsx` (nuevos)
- `app/components/layout/AppShell.tsx`, `Header.tsx`, `TabsConfiguracion.tsx`, `TabsProductos.tsx` (modificados)
- `app/components/layout/Sidebar.tsx`, `SidebarIcons.tsx` (eliminados al final)

---

### Paso 4 — Fase 3: Dashboard

Primera pantalla migrada de punta a punta; establece el patrón de migración de módulos.

**Acciones:**

- Generar sub-plan `2026-XX-XX-fase3-dashboard-redesign.md` con inventario exacto de los 13 componentes de `components/dashboard/`.
- Rediseñar: `StatCard` para KPIs, layout responsive (1 col mobile → 4 col desktop), `SegmentedControl` de período, charts con la nueva paleta, `TurnosHoyCard` y saldos con Card v2, skeletons reales en Suspense.

**Archivos afectados:** `app/app/(dashboard)/dashboard/page.tsx`, `dashboard/loading.tsx`, `app/components/dashboard/**`

---

### Paso 5 — Fase 4: POS y Cobro

La pantalla más crítica del negocio: se rediseña **sin degradar la velocidad de caja** (barcode-first, teclado, cobro guiado).

**Acciones:**

- Sub-plan con inventario de los 21 componentes de `components/pos/`.
- Desktop/tablet: refinamiento visual del layout denso actual (carrito, búsqueda, cobro guiado) con primitives v2; todos los atajos de teclado y el flujo scanner se preservan y se testean explícitamente.
- Mobile: vista phone operativa (carrito colapsable como Drawer inferior, botón cobrar fijo).
- Migrar `CobroGuiadoModal`, `PesoModal`, `NuevoClienteModal`, `CodigoDesconocidoModal`, `PrintSelectionModal` a `Modal` base (fullscreen en mobile).
- QA con clientes-tipo: venta con scanner, multi-pago, descuentos, pack por variante, peso.

**Archivos afectados:** `app/app/(dashboard)/pos/page.tsx`, `app/components/pos/**`, `app/app/(dashboard)/precios/page.tsx`

---

### Paso 6 — Fase 5: Caja (turnos)

**Acciones:**

- Sub-plan con inventario de los ~15 componentes de `components/caja/`.
- Rediseñar apertura/cierre de turno (wizard claro con conciliación por cuenta), historial del mes con `DataTable`, detalle de sesión (`/caja/sesiones/[id]`) con resumen visual del turno, movimientos manuales con `Modal` v2.

**Archivos afectados:** `app/app/(dashboard)/caja/**`, `app/components/caja/**`

---

### Paso 7 — Fase 6: Productos y Stock

**Acciones:**

- Sub-plan con inventario (24 componentes de productos + stock).
- Catálogo con `DataTable` + vista card mobile; formulario de producto reorganizado en secciones (el flujo rápido de carga y variantes se preserva); taxonomías (categorías/tallas/colores) unificadas en un patrón común; import CSV con wizard claro; stock con ajuste rápido desde mobile.

**Archivos afectados:** `app/app/(dashboard)/productos/**`, `app/app/(dashboard)/stock/**`, `app/components/productos/**`, `app/components/stock/**`

---

### Paso 8 — Fase 7: Ventas, Devoluciones y Remitos

**Acciones:**

- Sub-plan. Listados con `DataTable` + filtros en `Drawer` (mobile) / inline (desktop); detalle de venta con timeline de estados; flujo de devolución paso a paso; remitos con preview. Compatibilidad de impresión verificada (no tocar `styles/print.css` ni componentes de `impresion/` salvo lo imprescindible).

**Archivos afectados:** `app/app/(dashboard)/ventas/**`, `devoluciones/**`, `remitos/**`, `app/components/{ventas,devoluciones,remitos}/**`

---

### Paso 9 — Fase 8: Clientes, Reportes y Gráficos

**Acciones:**

- Sub-plan. Clientes: listado + ficha con historial y cuenta corriente rediseñados. Reportes: tabs v2, tablas responsive (patrón desktop/mobile ya iniciado en `TablaPLMensualMobile` se generaliza). Gráficos: charts SVG re-tematizados con paleta v2, tooltips y leyendas consistentes.

**Archivos afectados:** `app/app/(dashboard)/clientes/**`, `reportes/**`, `graficos/**`, `app/components/{clientes,reportes}/**`

---

### Paso 10 — Fase 9: Configuración, Planes y Onboarding

**Acciones:**

- Sub-plan. Configuración: layout de settings moderno (nav lateral de secciones en desktop, lista en mobile) sobre las 7 subpáginas; `Switch`/`RadioGroup` para opciones; equipo con `Avatar`. Planes: pricing cards v2, estados de trial claros. Onboarding: wizard rediseñado con `RubroSelector` v2. Superadmin: pase de pintura mínimo con primitives.

**Archivos afectados:** `app/app/(dashboard)/configuracion/**`, `planes/**`, `onboarding/**`, `app/app/superadmin/**`, `app/components/{configuracion,planes,onboarding,superadmin}/**`

---

### Paso 11 — Fase 10: Auth, Setup y Pulido Final

**Acciones:**

- Rediseñar login/registro/recuperación/confirmación con la nueva identidad (AuthBrandPanel v2).
- Fix `setup/page.tsx` (paleta indigo → marca).
- Auditoría transversal final: estados vacíos/carga/error en las 55 rutas, contraste AA, navegación por teclado, QA responsive integral (360/390/768/1024/1440), Lighthouse en rutas clave.
- Eliminar código muerto: primitives viejos sin consumidores, SVG inline reemplazados, clases hardcodeadas remanentes (grep de `lime-` y `text-[1[0-2]px]` fuera de tokens).

**Archivos afectados:** `app/app/(auth)/**`, `app/app/setup/page.tsx`, `app/components/auth/**`, barrido global

---

### Paso 12 — Documentación y cierre

**Acciones:**

- Actualizar `app/CLAUDE.md` y `CLAUDE.md` raíz: Design System v2, página `/design`, convención "primitives-first" para todo desarrollo futuro.
- Actualizar `contexto/proyectos.md` (proyecto completado) y `referencia/design-system-v2.md` (estado final).
- Marcar este plan y los sub-planes como `**Estado:** Implementado` con notas de implementación.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/layout.tsx` monta `AppShell` + providers → cualquier cambio de shell pasa por ahí.
- `PageContext` es consumido por Header y páginas → Breadcrumbs debe integrarse sin romper `usePageTitle`.
- `PlanProvider` / `RubroProvider` alimentan el filtrado del sidebar → SidebarV2 los reutiliza tal cual.
- `VoiceProvider` + `VoiceFab` viven en AppShell → reposicionar, no eliminar.
- `styles/print.css` + `components/impresion/**` + PrintBridge: **frontera intocable**; los rediseños de POS/ventas/etiquetas no deben alterar el markup imprimible.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` (raíz y `app/`) tras Fases 0–2 y al cierre.
- `contexto/proyectos.md` al iniciar y al cerrar el proyecto.
- Sub-planes por fase en `planes/` con el prefijo `faseN-`.

### Impacto en Flujos de Trabajo Existentes

- **Clientes activos**: rutas, roles, datos y flujos operativos idénticos; solo cambia presentación. Deploy por fases minimiza el shock; considerar un aviso in-app breve ("Estamos renovando la interfaz") en las fases más visibles (2 y 4).
- **Desarrollo futuro**: toda pantalla nueva se construye con primitives v2 (regla en CLAUDE.md).
- **Planes previos de diseño** (`2026-05-22`, `2026-05-13`, `2026-05-10`): quedan superados; se anota en cada uno una nota de reemplazo.

---

## Lista de Validación

- [ ] `globals.css` define todos los tokens v2 y ningún primitive v2 usa colores Tailwind hardcodeados
- [ ] `/design` renderiza todos los primitives con todas sus variantes sin errores
- [ ] `npm run build` pasa sin errores ni warnings nuevos al final de cada fase
- [ ] Navegación: sidebar colapsable funciona y persiste; bottom nav visible solo en mobile; command palette abre con Ctrl+K y navega a todas las rutas
- [ ] Todas las rutas existentes responden igual que antes (sin 404 nuevos, redirects legacy intactos)
- [ ] Filtrado por rol (vendedor no ve configuración/reportes) y por rubro (remitos/devoluciones) intacto en SidebarV2 y BottomNav
- [ ] POS: venta completa con scanner + multi-pago + ticket impreso funciona idéntico post-rediseño (test manual explícito)
- [ ] Impresión de tickets, etiquetas y remitos idéntica (comparación visual antes/después)
- [ ] QA responsive en 360px, 768px y 1280px en todas las pantallas migradas de la fase
- [ ] Sin overflow horizontal en ninguna ruta (regla del plan 2026-05-13 se mantiene)
- [ ] Contraste AA en textos y controles de la nueva paleta
- [ ] `CLAUDE.md`, `contexto/proyectos.md` y `referencia/design-system-v2.md` actualizados

---

## Criterios de Éxito

1. Las ~55 rutas del producto usan exclusivamente primitives v2 y tokens del Design System, verificable con grep (cero `focus:ring-indigo`, cero paletas fuera de marca, cero modales ad-hoc).
2. La app es plenamente operable desde un teléfono de 360px: navegar, vender, cobrar, consultar stock y cerrar caja sin overflow ni controles inaccesibles.
3. La navegación requiere ≤2 interacciones para llegar a cualquier módulo en desktop (sidebar) y mobile (bottom nav + menú), y ≤1 para las acciones frecuentes (Vender, buscar).
4. Cero regresiones funcionales: mismas Server Actions, mismas rutas, mismos permisos, misma impresión — validado fase a fase en producción con clientes reales.
5. Existe documentación viva (`/design` + `referencia/design-system-v2.md`) que permite construir cualquier pantalla futura consistente sin decisiones ad-hoc.

---

## Notas

- **Estimación de esfuerzo relativo por fase** (para priorizar sesiones): F0-F1 fundaciones ≈ 20%, F2 shell ≈ 10%, F4 POS ≈ 15%, F6 productos/stock ≈ 15%, resto de módulos ≈ 35%, pulido ≈ 5%.
- **Riesgo mayor**: POS (velocidad de caja) e impresión. Ambos tienen validación manual explícita en sus fases.
- **Dark mode**: la arquitectura queda lista; activarlo será un plan corto posterior (invertir valores de tokens + QA visual).
- **Módulo de agenda/turnos-citas**: si se confirma (pregunta abierta #2), se planifica como Fase 11 nativa del nuevo Design System.
- Los sub-planes de las Fases 3–10 se crean con `/crear-plan fase N — <módulo>` referenciando este documento como fuente de verdad de diseño.

---

## Notas de Implementación

### Fase 0 — Design System v2 (fundaciones)

**Implementada:** 2026-07-28

**Resumen:**

- `app/app/globals.css` reescrito: capa de tokens primitivos (rampa lime completa 50–950, neutros cálidos propios, paletas de estado green/amber/red/blue) + capa semántica (superficies, texto con contrastes AA, bordes, primary/success/warning/danger/info con variantes sólido/soft/soft-fg/border), tipografía fluida (`text-display/title/heading` con clamp), alturas de control (`h-control-sm/md/lg/xl` = 32/40/44/48px), sombras suaves (redefinen `shadow-xs..lg` + `shadow-overlay`), motion (duraciones + `ease-standard`/`ease-emphasized`), escala z-index, utility `focus-ring`, `::selection` de marca y respeto global a `prefers-reduced-motion`.
- Dark mode **preparado e inerte** en `[data-theme="dark"]` (nada setea el atributo).
- `referencia/design-system-v2.md` creado: spec completa con paleta y contrastes, tipografía, densidad, motion, z-index, iconografía (lucide único set), estados de interacción, patrones de página y tabla Do/Don't.
- `app/app/(dashboard)/design/page.tsx` creado: documentación viva (solo rol `owner`, otros roles redirigen a `/dashboard`) con fundaciones renderizadas y placeholders de los 29 primitives para Fase 1.
- `contexto/proyectos.md` actualizado con el proyecto en curso.

**Desviaciones del plan:** ninguna funcional. Detalles de implementación: el fondo de página pasó de blanco puro a neutro cálido `#fafaf9` (base premium); los valores de `--radius-*` se mantuvieron idénticos a v1 para no alterar la geometría existente; sombras y easings viven en un bloque `@theme` propio (no `inline`) para evitar autorreferencias de variables.

**Preguntas abiertas restantes:** #3 (bottom nav), #4 (tipografía display — Fase 0 mantuvo Geist), #5 (ritmo de deploy). La #1 avanzó con la recomendación (lime refinado) y la #2 quedó resuelta.

**Próximo paso:** Fase 1 — Primitives v2 (Paso 2 de este plan).

---

### Fase 1 — Primitives v2

**Implementada:** 2026-07-28

**Resumen:**

- Rediseño drop-in de los 12 primitives existentes (`Button`, `Input`, `Select`, `Textarea`, `PasswordInput`, `InputMonedaARS`, `Card`, `Badge`, `EmptyState`, `Pagination`, `Skeleton`, `RubroSelector`) consumiendo tokens semánticos v2. Props públicas preservadas; pantallas actuales heredan el look nuevo sin migración.
- 17 primitives nuevos: `Modal`, `Drawer`, `DataTable` (tabla≥md / cards&lt;md), `Tabs` + `ControlledTabs`, `DropdownMenu`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Tooltip`, `PageHeader`, `StatCard`, `SegmentedControl`, `SearchInput`, `Avatar`, `Separator`, `Spinner`.
- Helpers: `cn.ts`, `fieldStyles.ts` (estilos compartidos de controles).
- Accesibilidad: focus trap + Escape en Modal/Drawer, roles ARIA, `focus-ring`, labels/aria-invalid en forms.
- Theming de `sonner` en layout del dashboard (classNames con tokens).
- `/design` actualizado a Fase 1 con fundaciones + `DesignShowcase` interactivo (modales, drawers, toasts, DataTable, etc.).
- `RubroSelector`: emojis reemplazados por íconos lucide (alineado a la regla del design system).
- `npm run build` OK.

**Desviaciones del Plan:**

- `Tabs` se exporta en dos formas: `Tabs` (routing con Next Link, para reemplazar TabsConfiguracion/TabsProductos en Fase 2) y `ControlledTabs` (estado local, demos/filtros).
- `Button` agregó sizes `lg` e `icon` (además de xs/sm/md) sin romper consumidores.
- Helper `DesignShowcase.tsx` vive en `components/ui/` (no solo en la page) para mantener la page como Server Component de auth.

**Problemas Encontrados:** Ninguno bloqueante.

**Próximo paso:** Fase 2 — Shell y Navegación (Paso 3). Resolver preguntas abiertas #3 (bottom nav) y #5 (ritmo de deploy) preferentemente antes.

---

### Fase 2 — Shell y Navegación

**Implementada:** 2026-07-28

**Resumen:**

- `nav-config.ts`: fuente única de ítems/grupos de navegación (lucide) + filtros por rol/rubro + labels de breadcrumbs.
- `SidebarV2`: sidebar colapsable a rail de iconos (persistencia localStorage), mismos ítems/roles, badge de plan/trial, avatar + logout.
- `BottomNav` mobile (<lg): 5 slots con **Vender** central destacado; oculto en `/pos`; admin = Inicio/Ventas/Vender/Productos/Menú; cajero = Caja/Ventas/Vender/Precios/Menú; safe-area iOS.
- `Header` v2: breadcrumbs, badge de caja abierta/cerrada, botón buscar (abre palette), slot `usePageActions`.
- `CommandPalette` (Ctrl/Cmd+K): navegación filtrada + búsqueda rápida de productos/clientes vía `buscarRapido` (reutiliza `listarProductos`/`listarClientes`).
- `AppShell` reescrito: SidebarV2 + BottomNav + CommandPalette + padding inferior para bottom nav.
- `VoiceFab` reposicionado encima del bottom nav en mobile.
- `TabsConfiguracion` / `TabsProductos` migrados al primitive `Tabs`.
- Eliminados `Sidebar.tsx` y `SidebarIcons.tsx`.
- Layout dashboard pasa `cajaAbierta` al shell.
- `npm run build` OK.

**Desviaciones del Plan:**

- Bottom nav para cajero usa Precios en el 4º slot (en lugar de Productos, que no ven por rol).
- Acción `app/actions/busqueda.ts` añadida como wrapper fino de queries existentes (necesario para búsqueda en cliente).
- `PageContext` extendido con `actions`/`setActions` para el slot del header.

**Problemas Encontrados:** Type mismatch LucideIcon en CommandPalette — resuelto tipando desde `lucide-react`.

**Próximo paso:** Fase 3 — Dashboard (generar sub-plan e implementar).

---

### Fase 3 — Dashboard

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase3-dashboard-redesign.md` con inventario de 13 componentes.
- Shell `DashboardSectionCard` unifica headers de secciones.
- Cards migradas a tokens v2: TurnosHoy (tabla+cards mobile), Últimas ventas/devoluciones, Ganancia bruta (sin emoji), Saldos (Modal v2), Top productos/clientes/var1, KpiCard pulido.
- Page: `PageHeader`, KPIs con lucide, trial banner tokens, `VentasChartSection` con `SegmentedControl` 7d/14d (slice client-side, sin nuevas queries).
- `loading.tsx` alineado al layout real.
- Eliminado `DashboardIcons.tsx`.
- Queries y Server Actions intactos. Build OK.

**Desviaciones:** Period control es client-side sobre la serie de 14 días ya cargada (no hay query de 7 días separada).

**Próximo paso:** Fase 4 — POS y Cobro.

---

### Fase 4 — POS y Cobro

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase4-pos-cobro-redesign.md` con inventario POS.
- Modales migrados a `Modal` v2: `PesoModal`, `PrintSelectionModal`, `CobroGuiadoModal` (Enter intacto; Escape vía Modal), `CodigoDesconocidoModal`, `NuevoClienteModal`.
- Mobile: carrito en `Drawer` inferior + barra sticky (tap total abre carrito; Cobrar inicia cobro). Desktop: grid 3+2 sin cambios de flujo.
- `pos/page.tsx`: PageHeader + Badge + EmptyState con lucide. `precios/page.tsx`: PageHeader.
- Tokens en shell de búsqueda, Carrito header, PanelCobroResumen, PanelPago (superficies/botones).
- Lógica de ventas, scanner, hotkeys e impresión intacta. `npm run build` OK.

**Desviaciones:**

- En mobile, `PanelCobroResumen` (modo guiado) se oculta — sticky + CobroGuiadoModal cubren el flujo. `PanelPago` (modo clásico) permanece visible para configurar pagos.
- `CobroGuiadoModal` usa `size="full"` (`max-w-5xl`) porque `xl` del Modal era demasiado angosto vs. el wizard previo.

**Problemas Encontrados:** Ninguno bloqueante.

**Próximo paso:** Fase 5 — Caja (turnos).

---

### Fase 5 — Caja (turnos)

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase5-caja-redesign.md` con inventario de 14 componentes.
- Modales v2: `RegistrarMovimientoForm`, `EditarMovimientoForm`, emergencia en `SesionAbiertaPanel`, `ReopenCajaButton`.
- Apertura/cierre/sesión/cierre detalle/historial con tokens + `Badge` + `PageHeader`.
- `HistorialCajaMes` migrado a `DataTable` (desktop/mobile) + KPIs de mes.
- `ImprimirCierreButton` con `Button` v2. Queries/actions/print intactos. Build OK.

**Desviaciones:**

- Cierre de caja sigue siendo formulario inline de 2 pasos (no wizard Modal) — el plan pedía “wizard claro”; se pulió visualmente sin cambiar el flujo de confirmación inline.
- `Breadcrumbs` en detalle de sesión usa el componente auto (pathname), no crumbs custom.

**Problemas Encontrados:** Ninguno bloqueante.

**Próximo paso:** Fase 6 — Productos y Stock.

---

### Fase 6 — Productos y Stock

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase6-productos-stock-redesign.md`.
- `ListaProductos` y `TablaStock` → `DataTable` + Badge (pack/kit/stock bajo).
- Páginas productos/stock con `PageHeader`; taxonomías unificadas vía `TaxonomyManager` (Modal confirm eliminar).
- Import CSV page + ImportadorCSV tokens; `AjusteForm` con Modal de confirmación (reemplaza `window.confirm`).
- Token sweep en ProductoForm, variantes, kits, filtros, movimientos. Build OK.

**Desviaciones:**

- Formulario de producto: shell/tokens sin reorganizar en secciones nuevas (flujo rápido preservado).
- Print popovers (`BotonImprimirEtiquetas*`) solo tokenizados; no migrados a Drawer/DropdownMenu en esta fase.
- Import “wizard” = pasos existentes con look v2 (sin rediseño de steps).

**Problemas Encontrados:** Ninguno bloqueante.

**Próximo paso:** Fase 7 — Ventas, Devoluciones y Remitos.

---

### Fase 7 — Ventas, Devoluciones y Remitos

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase7-ventas-devoluciones-remitos.md`.
- Listados: `TablaVentas`, `TablaRemitos`, `TablaDevoluciones` → `DataTable` + `Badge` (`estadoVentaBadge` incluye `anulada`).
- Pages listado con `PageHeader`; filtros de devoluciones con tokens.
- Modales v2: `AnularVentaButton` / `AnularVentaInlineButton`, `RegistrarCobroModal`, `EmitirFacturaButton`.
- Detalle venta: `PageHeader` + timeline Badge (estado → factura → devoluciones); cards tokenizadas; `TicketVentaRenderer` / print intactos.
- Detalle devolución / remito + flujos nueva: `PageHeader` + Badge + tokens. `RemitoImprimible*` y `print.css` no tocados.
- Forms (`DevolucionForm`, `NuevoRemitoForm`, `RemitoAcciones`, Cambio*) token sweep. `npm run build` OK.

**Desviaciones:**

- Filtros mobile: quedan inline (sin Drawer) — el plan sugería Drawer donde aporte; los filtros actuales son pocos y caben en una fila.
- Link remito→venta por `venta_numero` (preexistente) no se cambió.

**Problemas Encontrados:** Ninguno bloqueante.

**Próximo paso:** Fase 8 — Clientes, Reportes y Gráficos.

---

### Fase 8 — Clientes, Reportes y Gráficos

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase8-clientes-reportes-graficos.md`.
- Clientes: `TablaClientes` + `ClienteHistorial` → `DataTable` + Badge; pages con `PageHeader`; ficha con `StatCard` + saldo tokens; `AccionesCliente` → Modal v2; filtros/form/selector tokenizados.
- Reportes: `PageHeader` + pills de período; `TablaPLMensual`/`Mobile` con tokens semánticos (margen/resultado).
- Gráficos: `GraficosLayout` con `Tabs` v2 + PageHeader; `CHART_COLORS` alineado a brand v2; charts/tabs token sweep. Loading pages alineados.
- Queries/actions intactos. `npm run build` OK.

**Desviaciones:**

- Período en reportes/gráficos sigue siendo pills Link (no SegmentedControl) — mismo patrón visual que fases previas y compatible con URL search params.
- Patrón mobile de P&L (`TablaPLMensualMobile`) se mantuvo; no se forzó DataTable por densidad de columnas financieras.
- **Fix post-fase:** se quitó `max-w-6xl` de reportes/gráficos (comprimía el contenido a la izquierda dentro del shell). Tabs de gráficos usan `matchKeys: ['tab']`.

**Problemas Encontrados:** Ninguno bloqueante.

**Próximo paso:** Fase 9 — Configuración, Planes y Onboarding.

---

### Fase 9 — Configuración, Planes y Onboarding

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase9-config-planes-onboarding.md`.
- `ConfiguracionShell`: nav lateral en desktop + Tabs underline en mobile; PageHeader en todas las páginas de settings.
- Token sweep forms/managers; `Switch` en redondeo efectivo; `Avatar`+`Badge` en equipo; opciones cobro/POS tokenizadas.
- Planes: pricing cards v2 + badges trial/actual.
- OnboardingWizard: indigo → brand tokens.
- Superadmin layout + panel: pase de pintura con tokens.
- Build OK.

**Desviaciones:**

- Onboarding no usa `RubroSelector` (el rubro ya se elige en registro; el wizard solo completa datos).
- `TabsConfiguracion` queda como wrapper legacy (shell lo reemplaza); redirects de rutas viejas intactos.
- Superadmin: paint visual sin rediseño de flujos/acciones.

**Problemas Encontrados:** Corrupción UTF-8 al tokenizar SuperAdminPanel con PowerShell — restaurado y reaplicado con Node UTF-8.

**Próximo paso:** Fase 10 — Auth, Setup y Pulido Final.

---

### Fase 10 — Auth, Setup y Pulido Final + cierre (Paso 12)

**Implementada:** 2026-07-28

**Resumen:**

- Sub-plan `planes/2026-07-28-fase10-auth-setup-pulido.md`.
- AuthBrandPanel v2 (lucide + tokens); layout auth; login/registro/recuperar/confirmar tokenizados.
- Setup: indigo → brand.
- Barrido global `lime-*`/`indigo-*` (+ corrección `bg-primary-soft0` por orden de replace).
- Docs: `CLAUDE.md`, `app/CLAUDE.md`, `referencia/design-system-v2.md`, `contexto/proyectos.md`.
- Plan maestro marcado Implementado.

**Desviaciones:**

- QA Lighthouse / responsive integral de las 55 rutas no automatizado en esta sesión (queda como verificación manual).
- `#0A0A0A` en `api/productos/pdf/route.ts` y CSS de impresión se mantienen (frontera print).
- Landing conserva composición marketing; colores alineados a brand tokens.

**Problemas Encontrados:** Prefijo `bg-lime-50` en el sweep convertía `bg-lime-500` → `bg-primary-soft0`; corregido en segundo pase Node UTF-8.
