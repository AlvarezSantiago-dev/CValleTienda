# Design System v2 — CValleTienda

**Versión:** 2.0 (Fase 0 del plan `planes/2026-07-28-rediseno-uiux-completo-fable.md`)
**Fuente de código:** `app/app/globals.css` (tokens) · `/design` (documentación viva, solo owner)
**Producto:** gestor tipo CRM/POS profesional multi-rubro. "Turno" = sesión de caja.

> **Regla de oro:** todo componente v2 consume tokens semánticos (utilities de `@theme` o `var(--token)`). Nunca paletas crudas (`lime-500`, `gray-700`, `bg-white` para superficies) en código nuevo.

---

## 1. Principios

1. **Evolución, no revolución** — lime sigue siendo la marca (los clientes activos la reconocen). Lo premium viene de jerarquía, espaciado, tipografía y micro-interacciones.
2. **Mobile-first real** — todo componente se diseña desde 360px. Target táctil mínimo 44px. Font-size de inputs ≥16px en mobile (evita zoom iOS).
3. **Semántico primero** — el color comunica significado (primary = acción, danger = destructivo, warning = atención). Dark mode futuro = re-mapear la capa semántica, cero cambios de código.
4. **Denso pero legible** — es una herramienta de trabajo diario: densidad alta en desktop (POS, tablas), respiración en mobile. Cuerpo mínimo `text-sm` (14px); prohibido `text-[10px]`/`text-[11px]` para contenido.
5. **Un solo lenguaje** — un ícono set (lucide), una escala de z-index, un anillo de foco, una familia de sombras.

---

## 2. Color

### 2.1 Capas

- **Primitivos** (`--brand-*`, `--neutral-*`, `--green/amber/red/blue-*`): solo alimentan la capa semántica. No usar en componentes.
- **Semánticos**: lo que se consume. Utilities generadas: `bg-primary`, `text-fg-muted`, `border-border-default`, `bg-danger-soft`, etc.

### 2.2 Tokens semánticos (light)

| Token | Utility | Valor | Uso |
|---|---|---|---|
| `--background` | `bg-background` | `#fafaf9` | Fondo de página (cálido, no blanco puro) |
| `--surface` | `bg-surface` | `#ffffff` | Cards, paneles, modales, inputs |
| `--surface-sunken` | `bg-surface-sunken` | `#f5f5f3` | Wells, headers de tabla, zonas hundidas |
| `--surface-hover` | `bg-surface-hover` | `#f5f5f3` | Hover de filas/ítems |
| `--surface-overlay` | `bg-surface-overlay` | `rgb(10 10 9/.45)` | Scrim detrás de modal/drawer |
| `--foreground` | `text-fg` | `#0a0a09` | Títulos y texto principal |
| `--fg-secondary` | `text-fg-secondary` | `#44433e` | Cuerpo secundario |
| `--fg-muted` | `text-fg-muted` | `#5b5a54` | Labels, captions — **AA sobre blanco (≈6.5:1)** |
| `--fg-subtle` | `text-fg-subtle` | `#a9a8a2` | Placeholders, disabled (no esencial) |
| `--fg-inverse` | `text-fg-inverse` | `#ffffff` | Texto sobre sólidos oscuros |
| `--fg-brand` | `text-fg-brand` | `#4d7c0f` | Texto de marca sobre claro — **AA (≈4.9:1)** |
| `--border-subtle/default/strong` | `border-border-*` | `#f5f5f3 / #e9e8e5 / #d7d6d2` | Divisores / bordes estándar / bordes de controles |
| `--border-focus` | — | `#84cc16` | Anillo de foco (utility `focus-ring`) |

### 2.3 Acción primaria

| Token | Valor | Uso |
|---|---|---|
| `--primary` | brand-600 `#65a30d` | Fondo de botón primario (con `--primary-fg` blanco; contraste 3.4:1 — válido para UI/texto grande; para texto normal usar `--fg-brand`) |
| `--primary-hover` / `--primary-active` | brand-700 / brand-800 | Estados |
| `--primary-soft` / `--primary-soft-fg` | brand-50 / brand-800 | Fondos tintados, ítem activo de navegación (contraste ≈8:1) |
| `--primary-border` | brand-200 | Bordes de elementos primarios suaves |
| `--accent` | brand-500 `#84cc16` | Indicadores, highlights, sparklines |

### 2.4 Estados semánticos

Cada estado tiene: **sólido** (`bg-success`), **hover**, **soft** (`bg-success-soft`), **soft-fg** (`text-success-soft-fg`, AA sobre el soft) y **border**.

| Estado | Sólido | Uso |
|---|---|---|
| `success` | green-600 `#059669` | Confirmaciones, stock OK, caja cuadrada. **No usar la marca lime para éxito** — success es verde-esmeralda, distinguible del brand. |
| `warning` | amber-500 `#f59e0b` (texto sobre sólido: `--warning-fg` `#451a03`) | Stock bajo, trial por vencer, atención |
| `danger` | red-600 `#dc2626` | Destructivo, errores, anulaciones |
| `info` | blue-600 `#2563eb` | Informativo neutro, tips |

### 2.5 Reglas

- Badges/alerts/estados → siempre par `*-soft` + `*-soft-fg` + `*-border`.
- Un solo elemento primario sólido por vista/sección; el resto secondary/outline/ghost.
- Nunca color como único indicador (agregar ícono o texto).
- Gradientes: solo decorativos (auth/landing), con rampa `brand-*`.

---

## 3. Tipografía

**Familia:** Geist Sans (UI) / Geist Mono (números tabulares, códigos, montos en tablas). Se mantiene.

| Utility | Tamaño | Uso |
|---|---|---|
| `text-display` | fluido 30→40px, lh 1.1, ls -0.02em | Números hero (total del día), landing |
| `text-title` | fluido 22→28px, lh 1.2, ls -0.01em | Título de página (PageHeader) |
| `text-heading` | fluido 18→20px, lh 1.3 | Título de sección/card |
| `text-base` | 16px | Cuerpo en mobile, formularios |
| `text-sm` | 14px | **Cuerpo estándar de la app** (tablas, listas) |
| `text-xs` | 12px | Captions, metadata, badges — **mínimo absoluto** |

Reglas: line-height 1.5–1.6 en párrafos; montos con `font-mono tabular-nums`; inputs mobile ≥16px; prohibido crear tamaños ad-hoc (`text-[13px]`, `text-[10px]`).

---

## 4. Espaciado, radios, sombras, elevación

### 4.1 Densidad y controles

| Token | Valor | Uso |
|---|---|---|
| `h-control-sm` | 32px | Controles compactos (filtros inline, acciones de fila) |
| `h-control-md` | 40px | **Estándar desktop** (inputs, selects, botones) |
| `h-control-lg` | 44px | **Mínimo táctil** — todo control en mobile |
| `h-control-xl` | 48px | Acciones principales POS / bottom-nav / CTA mobile |

### 4.2 Grilla de página

- Contenedor: `max-w-7xl mx-auto` (reportes/tablas anchas pueden ser full).
- Padding de página: `p-4 md:p-6` (lo da el layout del dashboard).
- Gaps: 8px entre relacionados, 16px entre grupos, 24px entre secciones (`gap-2/4/6`).
- Sin overflow horizontal en ninguna vista (regla heredada del plan 2026-05-13).

### 4.3 Radios (`var(--radius-*)`)

`sm` 6px (badges, chips) · `md` 8px (inputs, botones) · `lg` 12px (cards, modales) · `xl` 16px (paneles hero) · `full` (pills, avatares).

### 4.4 Sombras (suaves, redefinen las de Tailwind)

`shadow-xs` (controles) · `shadow-sm` (cards) · `shadow-md` (dropdowns, popovers) · `shadow-lg` (drawers) · `shadow-overlay` (modales). Elevación siempre acompañada de borde `border-border-subtle` — nunca sombra dura sola.

---

## 5. Motion

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` (150ms) | `duration-(--duration-fast)` | Hover, focus, toggles |
| `--duration-base` (200ms) | | Dropdowns, tooltips, tabs |
| `--duration-slow` (300ms) | | Modal, drawer, page-level |
| `ease-standard` | `cubic-bezier(0.2,0,0,1)` | Transiciones generales |
| `ease-emphasized` | `cubic-bezier(0.16,1,0.3,1)` | Entradas de modal/drawer |

Reglas: animar solo `transform`/`opacity`; hover sin layout shift (nada de `scale` que empuje contenido); `prefers-reduced-motion` ya se respeta globalmente en `globals.css`.

---

## 6. Z-index (escala única)

`--z-sticky` 20 · `--z-nav` 30 (sidebar/bottom-nav) · `--z-overlay` 40 (scrim) · `--z-modal` 50 · `--z-popover` 60 (dropdown/combobox) · `--z-toast` 70 · `--z-tooltip` 80. Uso: `z-(--z-modal)`. Prohibido `z-[999]` ad-hoc.

---

## 7. Iconografía

- **Set único: `lucide-react`.** Prohibido: emojis como íconos, SVG inline nuevos (los existentes se migran progresivamente en Fases 2–10).
- Tamaños: 16 (inline/botones sm), 20 (estándar en controles md/lg), 24 (navegación, empty states).
- `strokeWidth` por defecto (2); 1.75 en tamaños 24+ para look más fino.
- Ícono-solo → siempre `aria-label`.

---

## 8. Estados de interacción (todo componente v2)

1. **Focus:** utility `focus-ring` (outline 2px `--border-focus`, offset 2px) — visible solo con teclado (`:focus-visible`).
2. **Hover:** feedback por color/sombra con `duration-fast`; `cursor-pointer` en todo clickeable.
3. **Disabled:** `opacity-60` + `cursor-not-allowed`; nunca quitar el label.
4. **Loading:** botones con spinner integrado y `disabled` automático durante async.
5. **Error (inputs):** borde `--danger` + mensaje `text-danger-soft-fg` junto al campo.

---

## 9. Patrones de página (se implementan en Fases 1–2)

| Patrón | Composición |
|---|---|
| **Listado** | `PageHeader` (título + acción primaria) → filtros (inline desktop / Drawer mobile) → `DataTable` (tabla ≥md, cards apiladas <md) → `Pagination` |
| **Detalle** | `PageHeader` con breadcrumb + acciones → grid 2/3-1/3 en desktop, apilado en mobile → secciones en `Card` |
| **Formulario** | Secciones agrupadas en cards con heading; acciones sticky al fondo en mobile; 1 columna <md, máx 2 columnas ≥md |
| **Wizard** | Indicador de pasos arriba, un paso por pantalla, acciones fijas abajo (onboarding, cierre de caja) |
| **Modal** | `Modal` base: centrado ≥md, fullscreen/bottom-sheet <md; focus trap + Escape + click en scrim |
| **Empty/loading/error** | `EmptyState` con ícono + CTA; `Skeleton` que replica el layout final (sin content jumping); errores con retry |

---

## 10. Dark mode (preparado, NO activo)

- Los overrides viven en `[data-theme="dark"]` en `globals.css`; nada setea ese atributo aún.
- Activarlo (proyecto posterior) = setear `data-theme="dark"` en `<html>` + completar overrides de estados semánticos + QA visual completo.
- Por eso: **nunca** hardcodear `bg-white`/`text-black` en componentes v2 — usar `bg-surface`/`text-fg`.

---

## 11. Do / Don't rápidos

| ✔ Do | ✘ Don't |
|---|---|
| `bg-primary text-primary-fg` | `bg-lime-600 text-white` |
| `text-fg-muted` | `text-gray-500` |
| `border-border-default` | `border-gray-200` |
| `bg-danger-soft text-danger-soft-fg` | `bg-red-50 text-red-700` |
| `rounded-[var(--radius-md)]` o `rounded-md` | `rounded-[7px]` ad-hoc |
| `h-control-md` / `h-control-lg` | `h-9`, `h-[38px]` |
| `z-(--z-modal)` | `z-[9999]` |
| Ícono lucide 20px | Emoji 🛒 o SVG inline nuevo |
| `text-sm` mínimo para contenido | `text-[11px]` |
| `focus-ring` | `focus:ring-lime-500/60` repetido a mano |

---

## 12. Estado de adopción

- **Fases 0–10 (completadas, 2026-07-28):** tokens v2, primitives en `app/components/ui/`, shell, módulos (dashboard → auth/setup), barrido final `lime-*`/`indigo-*` en TSX (excepto impresión/PDF).
- Showcase vivo: `/design` (`DesignShowcase` + fundaciones).
- Spec canónica: este archivo + `app/app/globals.css`.
- Convención futura: **primitives-first** (ver `CLAUDE.md` raíz y `app/CLAUDE.md`).
- Frontera intocable: `styles/print.css`, `components/impresion/**`, RemitoImprimible*.
