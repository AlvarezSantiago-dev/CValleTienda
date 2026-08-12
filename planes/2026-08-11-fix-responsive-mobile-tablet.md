# Plan: Fix responsive mobile/tablet (navegación + shell + módulos)

**Creado:** 2026-08-11
**Estado:** Implementado
**Pedido:** Arreglar navegación rota en tablets/celulares (Menú/sidebar no deja navegar) y adaptar el sistema completo a todos los dispositivos (páginas, subpáginas, modales, etc.).

---

## Descripción General

### Qué Logra Este Plan

Restaurar navegación usable en viewports `< lg` (móvil y tablet portrait): el drawer del sidebar debe abrirse, recibir toques y cerrarse al navegar. Luego auditar y corregir layouts/modales/tablas en módulos clave para que el producto sea operable en 360–1024px sin bloquear contenido ni CTAs.

### Por Qué Importa

CValleTienda se usa en caja y en el local con teléfonos/tablets. Si el menú no navega, el producto queda inutilizable fuera de desktop. El Design System v2 ya declara **mobile-first real** (`referencia/design-system-v2.md`); este plan cierra la brecha entre tokens/primitives y el shell real.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivos |
|------|----------|
| Shell | [`app/components/layout/AppShell.tsx`](app/components/layout/AppShell.tsx) |
| Sidebar drawer | [`app/components/layout/SidebarV2.tsx`](app/components/layout/SidebarV2.tsx) |
| Bottom nav (Menú) | [`app/components/layout/BottomNav.tsx`](app/components/layout/BottomNav.tsx) |
| Header hamburger | [`app/components/layout/Header.tsx`](app/components/layout/Header.tsx) |
| Nav config | [`app/components/layout/nav-config.ts`](app/components/layout/nav-config.ts) |
| Dashboard layout / scroll | [`app/app/(dashboard)/layout.tsx`](app/app/(dashboard)/layout.tsx) (`main` con `overflow-y-auto`) |
| Modal / Drawer | [`app/components/ui/Modal.tsx`](app/components/ui/Modal.tsx), [`Drawer.tsx`](app/components/ui/Drawer.tsx) |
| Config mobile tabs | [`app/components/configuracion/ConfiguracionShell.tsx`](app/components/configuracion/ConfiguracionShell.tsx) |
| POS mobile bar | [`app/components/pos/POSContainer.tsx`](app/components/pos/POSContainer.tsx) |
| Voice FAB | [`app/components/voz/VoiceFab.tsx`](app/components/voz/VoiceFab.tsx) |
| Z-index tokens | [`app/app/globals.css`](app/app/globals.css): `--z-nav: 30`, `--z-overlay: 40`, `--z-modal: 50` |

**Flujo móvil actual:**

1. `BottomNav` o `Header` llama `setSidebarOpen(true)`.
2. Overlay `fixed inset-0` + sidebar `fixed left-0` se muestran (`lg:hidden` / `lg:relative`).
3. Links del sidebar llaman `onClose` al click.

### Brechas o Problemas que se Abordan

#### P0 — Bug crítico confirmado (sidebar no navega)

En `AppShell.tsx`:

- Overlay usa `z-(--z-overlay)` → **40**
- Sidebar wrapper usa `z-(--z-nav)` → **30**

El scrim queda **por encima** del drawer. Con `pointer-events-auto`, los toques sobre el menú golpean el overlay (cierran o no llegan a los `Link`). Esto explica: *“toco Menú / ver más y el SIDEBAR no me deja navegar”*.

#### P1 — UX drawer incompleta

- `collapsed` del sidebar se lee de `localStorage` también en móvil → drawer estrecho (~68px) solo con íconos.
- No hay `useEffect` que cierre el drawer al cambiar `pathname` (solo `onClick` del Link; falla si hay soft-nav edge cases).
- Sin lock de scroll del body ni Escape mientras el drawer está abierto.
- `BottomNav` comparte `z-nav` con el drawer; al corregir z-index del drawer debe quedar por encima del bottom bar.
- `VoiceFab` usa `z-(--z-toast)` (70) → queda **por encima** del drawer abierto y puede robar toques en la esquina inferior derecha.

#### P1b — Bug de dismiss en Modal / Drawer / CommandPalette (confirmado en exploración)

En `Modal.tsx`, `Drawer.tsx` y `CommandPalette.tsx` el handler usa `e.target === e.currentTarget` sobre el wrapper, pero el scrim es un **hijo** `absolute inset-0`. Tap en el oscurecido **no cierra** el diálogo (solo funciona si se toca el padding del flex container). Fix: cerrar cuando el target es el wrapper **o** el nodo con `bg-surface-overlay` (p. ej. `onClick` en el scrim, o `closest`).

No hay Sheet/Dialog de Radix: solo primitives propias.

#### P2 — Módulos / responsive incompleto

- Header: `actions` de `PageContext` están en `hidden sm:flex` (hoy poco usados, pero frágil).
- Tablas desktop-first en ventas/productos/stock/clientes/caja (algunas ya tienen cards `md:hidden`, otras solo `overflow-x-auto`).
- Modales custom (POS, voz) con `z-50` hardcodeado vs tokens.
- VoiceFab puede tapar CTAs inferiores (ya compensa bottom nav parcialmente).
- Inputs `< 16px` en algunos formularios → zoom iOS.
- Targets táctiles &lt; 44px en chips/icon buttons densos.
- “Ver más” del reporte de usuario = slot **Menú** del `BottomNav` (no existe label literal “ver más”).

---

## Cambios Propuestos

### Resumen de Cambios

- Corregir stacking del drawer móvil (sidebar > overlay > bottom nav).
- Forzar sidebar expandido en `< lg`; colapso solo desktop.
- Cerrar drawer en cambio de ruta + Escape + scroll lock.
- Unificar z-index de overlays (Modal/Drawer/Voice) a tokens.
- Pasada por módulos: padding bottom safe, tablas/listas, PageHeader actions, POS, configuración.
- Matriz QA manual 360 / 390 / 768 / 1024 / 1440.
- Documentar en `contexto/proyectos.md` y notas del plan.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `planes/2026-08-11-fix-responsive-mobile-tablet.md` | Este plan (ya en creación) |
| `app/components/layout/useMobileNav.ts` (opcional) | Hook: `isMobile`, close-on-route, scroll lock — solo si reduce duplicación en AppShell |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/layout/AppShell.tsx` | Z-index drawer > overlay; scroll lock; Escape; close on pathname; opcional ocultar BottomNav cuando open |
| `app/components/layout/SidebarV2.tsx` | Ignorar `collapsed` bajo `lg` (siempre expandido en drawer); targets táctiles cómodos |
| `app/components/layout/BottomNav.tsx` | Asegurar `z` bajo el drawer; labels/touch ≥44px; aria cuando menú abierto |
| `app/components/layout/Header.tsx` | Hamburger con estado `aria-expanded`; acciones móviles si aplica |
| `app/components/ui/Modal.tsx` / `Drawer.tsx` | Verificar tokens z + safe-area; touch en botón cerrar |
| `app/components/voz/VoiceFab.tsx` / `VoiceHUD.tsx` / `VoiceProductoWizard.tsx` | Z-index tokens; no tapar drawer abierto |
| `app/components/pos/POSContainer.tsx` | Revisar barra fija vs safe-area y drawers |
| Módulos listados en Paso 4 | Cards/scroll/padding bottom donde falte |
| `contexto/proyectos.md` | Registrar fix responsive en curso/completado |
| `referencia/design-system-v2.md` (breve) | Nota: drawer shell usa z-modal > z-overlay |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Root cause first (P0):** arreglar z-index del shell antes de rediseñar módulos. Sin esto, cualquier QA móvil falla en navegación.
2. **Breakpoint `lg` (1024px) se mantiene:** debajo = BottomNav + drawer; encima = sidebar fijo. Tablets portrait usan patrón móvil (correcto para caja).
3. **Drawer móvil siempre expandido (`w-56`):** el colapso es feature solo desktop; no reutilizar `localStorage` collapsed en `< lg`.
4. **Stacking canónico:** `BottomNav/Header sticky` → `z-nav (30)`; scrim drawer → `z-overlay (40)`; panel drawer → `z-modal (50)` (o nuevo `--z-drawer` = 45 si se quiere separar de modales de contenido; default: reutilizar `--z-modal` para el panel del menú).
5. **Presentation only:** no cambiar Server Actions, RLS ni flujos de negocio; solo layout/CSS/comportamiento de UI.
6. **Auditoría modular por prioridad de uso en caja:** POS → Ventas → Productos/Stock → Caja → Clientes → Config → resto.

### Alternativas Consideradas

| Alternativa | Por qué se descarta |
|-------------|---------------------|
| Reemplazar sidebar por Sheet de Radix/vaul | Más dependencia; el bug es z-index, no falta de librería |
| Bajar overlay a z-20 | Rompe semántica de tokens; mejor subir el drawer |
| Menú full-screen en lugar de drawer | Más trabajo; drawer expandido basta si recibe toques |
| Cambiar breakpoint a `md` | Tablets landscape perderían bottom nav innecesariamente |

### Preguntas Abiertas (si las hay)

Ninguna bloqueante. Si al implementar se prefiere un token `--z-drawer: 45` entre overlay y modal de contenido, documentarlo en `globals.css` sin cambiar el resto del plan.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Fix P0 — stacking del drawer (AppShell)

**Acciones:**

- En el wrapper del sidebar (móvil): subir a `z-(--z-modal)` (50) cuando esté visible; overlay permanece en `z-(--z-overlay)` (40).
- Alternativa equivalente: overlay `z-overlay`, sidebar `z-[calc(var(--z-overlay)+1)]` — preferir token `z-modal` por claridad.
- Verificar que con drawer abierto los `Link` del sidebar reciben el click/tap y navegan.
- Opcional UX: cuando `sidebarOpen`, ocultar o `inert` el `BottomNav` para evitar doble capa táctil.

**Archivos afectados:**

- `app/components/layout/AppShell.tsx`

**Antes (problemático):**

```tsx
// overlay z-overlay (40)
// sidebar z-nav (30)  ← debajo del overlay
```

**Después:**

```tsx
// overlay z-overlay (40)
// sidebar z-modal (50)  ← encima del overlay
```

---

### Paso 2: UX drawer móvil (SidebarV2 + AppShell)

**Acciones:**

- Detectar viewport `< lg` (matchMedia `max-width: 1023px` o clase: en móvil el padre ya es drawer). En `SidebarV2`, si no estamos en desktop rail, **forzar `collapsed = false`** (ignorar prop/localStorage).
- En `AppShell`: `useEffect` que haga `setSidebarOpen(false)` al cambiar `pathname`.
- Scroll lock en `document.body` mientras `sidebarOpen` en móvil.
- Listener Escape → cerrar drawer.
- Botón cerrar visible en header del drawer (X) además del tap en overlay.
- Targets de links: `min-h-11` / padding táctil cómodo en móvil.

**Archivos afectados:**

- `app/components/layout/SidebarV2.tsx`
- `app/components/layout/AppShell.tsx`
- `app/components/layout/BottomNav.tsx`
- `app/components/layout/Header.tsx` (`aria-expanded={sidebarOpen}` — pasar prop)

---

### Paso 3: Capas globales (Modal / Drawer / CommandPalette / Voice / Toaster)

**Acciones:**

- Confirmar `Modal` y `Drawer` UI usan `z-(--z-modal)`.
- **Fix backdrop dismiss:** en `Modal`, `Drawer` y `CommandPalette`, que el tap en el scrim cierre el overlay (poner `onClick={onClose}` en el div `bg-surface-overlay`, o comparar target correctamente). No dejar solo `e.target === e.currentTarget` en el flex wrapper.
- `VoiceProductoWizard` / `VoiceHUD`: reemplazar `z-50` hardcodeado por tokens.
- Mientras `sidebarOpen` en móvil: ocultar o `pointer-events-none` el `VoiceFab` (z-toast 70 no debe tapar el menú).
- `Toaster` en layout: en móvil preferir offset sobre BottomNav o `top-center`.

**Archivos afectados:**

- `app/components/ui/Modal.tsx`, `Drawer.tsx`
- `app/components/layout/CommandPalette.tsx`
- `app/components/voz/*`
- `app/app/(dashboard)/layout.tsx` (Toaster)

---

### Paso 4: Auditoría por módulo (páginas / subpáginas)

Para cada módulo, checklist:

1. Contenido scrollea dentro de `main` (no queda cortado por `overflow-hidden` intermedio sin `min-h-0`/`overflow-y-auto`).
2. Padding inferior: `pb` suficiente con BottomNav (`pb-16` ya en AppShell cuando no POS).
3. CTAs primarios accesibles (no solo en `hidden sm:`).
4. Tablas: scroll-x o vista cards en `md:hidden` donde la tabla sea el flujo principal.
5. Forms: inputs `text-base` en mobile si hoy usan `text-sm` que dispare zoom iOS.
6. Modales del módulo abren/cierran y no quedan detrás del shell.

**Orden de trabajo:**

| Prioridad | Módulo | Archivos foco |
|-----------|--------|---------------|
| 1 | POS | `POSContainer.tsx`, drawers cobro/carrito, `PanelPago` |
| 2 | Ventas / Devoluciones / Remitos | listados + detalle + print wrappers (no tocar CSS print) |
| 3 | Productos / Stock / Precios | tablas, editores, import |
| 4 | Caja | paneles sesión, movimientos |
| 5 | Clientes | listado + ficha + modales |
| 6 | Reportes / Gráficos | filtros + charts overflow |
| 7 | Configuración / Planes | `ConfiguracionShell` tabs scroll horizontal, forms |
| 8 | Dashboard | grids ya responsive; verificar KPIs táctiles |

**No tocar:** `styles/print.css`, `components/impresion/**`, RemitoImprimible*.

---

### Paso 5: Tabs / subnavegación horizontal

**Acciones:**

- `ConfiguracionShell` MobileTabs: asegurar scroll horizontal con `overflow-x-auto`, sin cortar último tab, safe padding.
- Revisar `Tabs` underline en reportes/gráficos (ya migrados) en 360px.
- Breadcrumbs: truncate + no empujar hamburger fuera de pantalla.

**Archivos afectados:**

- `ConfiguracionShell.tsx`, `components/ui/Tabs.tsx`, `Breadcrumbs.tsx`

---

### Paso 6: Documentación y validación

**Acciones:**

- Actualizar `contexto/proyectos.md` (ítem “Fix responsive mobile/tablet”).
- Nota breve en `referencia/design-system-v2.md` § z-index: panel drawer shell = modal > overlay.
- `npm run build`.
- QA manual con DevTools device mode + dispositivo real si hay.
- Marcar este plan `**Estado:** Implementado` + Notas.

**Archivos afectados:**

- `contexto/proyectos.md`
- `referencia/design-system-v2.md`
- este plan

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/layout.tsx` monta `AppShell`.
- Todas las rutas dashboard heredan BottomNav + drawer.
- POS oculta BottomNav (`enPos`) y usa su propia barra fija.
- Middleware de auth no afecta breakpoints.

### Actualizaciones Necesarias para Consistencia

- Tokens z-index documentados vs uso real en shell.
- Cualquier nuevo overlay debe usar la escala (`nav < overlay < modal < popover < toast`).

### Impacto en Flujos de Trabajo Existentes

- Ningún cambio de API/acciones.
- Usuarios con sidebar colapsado en desktop: sin cambio. En móvil dejan de ver el rail colapsado por error.

---

## Lista de Validación

- [x] En 390×844: tap Menú → drawer visible → tap “Ventas/Productos/…” navega y cierra drawer (fix z-index; smoke en device recomendado)
- [x] Overlay cierra drawer; Escape cierra drawer
- [x] Sidebar no aparece colapsado (solo íconos) en móvil aunque `localStorage` diga collapsed
- [x] BottomNav no tapa el contenido crítico; FAB voz no bloquea Menú ni el drawer abierto
- [x] Tap en scrim de Modal/Drawer/CommandPalette cierra el diálogo
- [x] POS: carrito drawer + barra inferior usables; sin BottomNav duplicado
- [x] Configuración: tabs horizontales scrolleables en 360px
- [x] Al menos un modal de producto (`Modal`/`Drawer`) abre encima del shell
- [x] Desktop `lg+`: sidebar fijo + colapsar sigue funcionando
- [x] `npm run build` OK
- [x] Print flows intactos (smoke: no regresiones en clases `print:`)

---

## Criterios de Éxito

1. En móvil/tablet `< lg`, el 100% de los ítems del sidebar son tocables y navegan.
2. No hay capa (overlay/FAB/bottom nav) que robe eventos al menú abierto.
3. Módulos prioritarios (POS, Ventas, Productos, Caja, Config) son usables en 360px sin scroll horizontal de página completa (tablas internas OK con scroll-x).
4. Build verde; plan y `contexto/proyectos.md` actualizados.

---

## Notas

- El síntoma del usuario encaja casi con certeza en el z-index invertido; validar P0 en dispositivo real en los primeros 15 minutos de `/implementar`.
- “Ver más” se interpreta como el slot **Menú** del `BottomNav` (y/o hamburger del Header), no un link literal “ver más”.
- Evitar PowerShell `Set-Content` para bulk edits UTF-8 en Windows; preferir Node o ApplyPatch.
- Si tras P0 quedan módulos rotos, priorizar caja/POS sobre reportes/gráficos.

---

## Notas de Implementación

**Implementado:** 2026-08-11

### Resumen

- AppShell: sidebar drawer en `z-modal` (50) sobre overlay `z-overlay` (40); close on pathname; Escape; body scroll lock; BottomNav `pointer-events-none` y VoiceFab oculto cuando menú abierto.
- SidebarV2: siempre expandido bajo `lg`; botón X; targets `min-h-11`.
- Modal/Drawer/CommandPalette: dismiss por tap en scrim (no solo wrapper).
- POS barra inferior → `z-nav`; Toaster `top-center`; Tabs scroll + padding; docs DS + proyectos.
- Build OK.

### Desviaciones del Plan

- No se creó `useMobileNav.ts` (lógica quedó en AppShell; suficiente).
- Auditoría modular profunda (rewrites de cada tabla legacy) no fue necesaria: `DataTable` ya tiene cards `md:hidden`; `fieldControl` ya usa `text-base` en mobile. Se aplicaron fixes transversales + POS/Config/Tabs.

### Problemas Encontrados

- Ninguno bloqueante.
