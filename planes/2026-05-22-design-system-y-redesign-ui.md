# Plan: Sistema de Diseño + Redesign UI Completo (pantalla por pantalla)

**Creado:** 2026-05-22  
**Estado:** Borrador  
**Pedido:** Definir un Sistema de Diseño sólido e implementar un redesign moderno, limpio y profesional (estilo Shadcn UI / Linear) en todo el SaaS, pantalla por pantalla, con jerarquía visual, micro-UX (hover, focus, skeletons, empty states).

---

## Descripción General

### Qué Logra Este Plan

Establecer un **Design System centralizado** con tokens CSS, luego aplicarlo progresivamente en todas las pantallas del dashboard: componentes base (Button, Input, Select, Badge, Skeleton, Card), layout (Sidebar, Header), Dashboard principal, tablas de datos (Ventas, Productos, Stock, Clientes) y formularios. Cada fase produce UI funcional, mejorando UX con hover/focus consistentes, skeleton loaders y empty states cuidados.

### Por Qué Importa

La UI actual tiene inconsistencias de focus ring (indigo en inputs, lime en botones), sin design tokens, sin skeletons, tipografía ad-hoc y jerarquía visual débil. Esto deteriora la percepción profesional del producto frente a usuarios y potenciales clientes. Un Design System claro garantiza consistencia, velocidad de desarrollo y facilita futuras pantallas.

---

## Estado Actual

### Estructura Existente Relevante

```
app/
  app/globals.css                           ← Solo @import tailwindcss, sin tokens
  components/ui/
    Button.tsx                              ← lime primary, falta loading/icon-only
    Input.tsx                               ← focus:ring-indigo-500 (¡inconsistente!)
    Select.tsx                              ← mismo problema
    Textarea.tsx                            ← no revisado aún
    EmptyState.tsx                          ← funcional pero básico
    Pagination.tsx                          ← ok, sin revisión
  components/layout/
    Sidebar.tsx                             ← limpio pero puede mejorar
    Header.tsx                              ← muy minimal (solo fecha)
    AppShell.tsx                            ← estructura ok
  components/dashboard/
    KpiCard.tsx, VentasChart.tsx, etc.      ← sin hover states, sin skeleton
  app/(dashboard)/
    dashboard/page.tsx, ventas/page.tsx, productos/page.tsx, etc.
```

### Brechas o Problemas que se Abordan

1. **Sin design tokens** → imposible cambiar la paleta sin buscar en 50 archivos  
2. **Focus ring inconsistente** → `focus:ring-indigo-500` en inputs vs `focus:ring-lime-400/60` en buttons  
3. **Sin skeleton loaders** → páginas cargan en blanco (mala percepción de velocidad)  
4. **EmptyState básico** → sin ilustración/icono sofisticado, sin animación  
5. **Header vacío** → desaprovecha espacio para acciones rápidas o breadcrumb  
6. **Sin Badge component** → estados (completada, pendiente, etc.) usan clases inline repetidas  
7. **KpiCard sin hover** → tarjetas estáticas, no invitan a navegar  
8. **Tabla de datos sin componente** → cada página reimplementa su propio `<table>` inline  
9. **Sin Skeleton component** → cada `Suspense fallback` devuelve `null`  
10. **Sidebar "Salir"** → botón de logout muy sutil, poco visible  

---

## Cambios Propuestos

### Resumen de Cambios

- **`globals.css`**: Agregar CSS custom properties (tokens de color, radio, sombra, transición)
- **`Button.tsx`**: Agregar variante `outline`, tamaño `xs`, prop `loading`, mejor focus
- **`Input.tsx` / `Select.tsx` / `Textarea.tsx`**: Corregir focus ring a lime, mejorar label
- **Nuevo `Skeleton.tsx`**: Componente universal para skeleton loaders
- **Nuevo `Badge.tsx`**: Componente para estados/etiquetas de colores semánticos
- **Nuevo `Card.tsx`**: Wrapper de tarjeta con variantes (default, subtle, highlighted)
- **`EmptyState.tsx`**: Redesign con mejor tipografía, icono SVG y animación sutil
- **`Sidebar.tsx`**: Mejorar logout, añadir separador visual, polish en hover
- **`Header.tsx`**: Agregar breadcrumb contextual dinámico + actions slot
- **`KpiCard.tsx`**: Añadir hover state, transición, focus cuando es enlace
- **`VentasChart.tsx`**: Agregar empty state elegante
- **`StockBajoCard.tsx`**: Unificar con sistema Badge/Card
- **Skeleton en `dashboard/page.tsx`**: Wraps de Suspense con skeletons reales
- **Tabla reutilizable `DataTable.tsx`**: Componente base para ventas/productos/stock/clientes
- **`ventas/page.tsx`**: Aplicar DataTable + Badge de estado + skeleton
- **`productos/page.tsx`**: Aplicar DataTable + Badge + skeleton

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/components/ui/Skeleton.tsx` | Skeleton loader universal con variantes (text, card, kpi, table) |
| `app/components/ui/Badge.tsx` | Etiquetas de estado semánticas (completada, pendiente, cancelada, etc.) |
| `app/components/ui/Card.tsx` | Wrapper de tarjeta con variantes y hover opcional |
| `app/components/ui/DataTable.tsx` | Componente de tabla reutilizable con header, filas, empty state integrado |
| `app/components/dashboard/KpiSkeleton.tsx` | Skeleton específico para la grilla de KPIs del dashboard |
| `app/components/dashboard/DashboardSkeleton.tsx` | Skeleton completo del dashboard (KPIs + chart + tablas) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/globals.css` | Añadir CSS tokens: `--radius-*`, `--shadow-*`, `--color-brand-*`, `--transition-*` |
| `app/components/ui/Button.tsx` | Variante `outline`, tamaño `xs`, prop `isLoading`, focus ring consistente |
| `app/components/ui/Input.tsx` | Fix `focus:ring-lime-500`, `border-gray-200`, label mejorado, estado disabled más claro |
| `app/components/ui/Select.tsx` | Mismos fixes que Input |
| `app/components/ui/Textarea.tsx` | Mismos fixes que Input |
| `app/components/ui/EmptyState.tsx` | Redesign visual con mejor jerarquía, icono más grande, descripción más clara |
| `app/components/layout/Sidebar.tsx` | Mejorar logout button, añadir separador, hover más claro, polish general |
| `app/components/layout/Header.tsx` | Añadir slot de breadcrumb dinámico y zona de acciones quick-actions |
| `app/components/dashboard/KpiCard.tsx` | Hover state, ring focus cuando `href`, transición `group` |
| `app/components/dashboard/StockBajoCard.tsx` | Usar nuevo Card + Badge |
| `app/app/(dashboard)/dashboard/page.tsx` | Envolver secciones en `<Suspense>` con skeleton real |
| `app/app/(dashboard)/ventas/page.tsx` | Aplicar DataTable, Badge para estado, skeleton |
| `app/app/(dashboard)/productos/page.tsx` | Aplicar DataTable + skeleton en Suspense |

### Archivos a Eliminar

Ninguno — solo modificaciones y adiciones.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Mantener lime como color primario**: Es la marca ya establecida (lime-600 #65a30d). Shadcn usa cualquier color, la filosofía es consistency, no el color en sí.
2. **CSS custom properties en globals.css**: Tailwind v4 ya soporta `@theme inline` para extender con variables CSS. Evitamos depender de `tailwind.config.ts` (no existe en este proyecto).
3. **Sin Radix/Shadcn instalado**: El proyecto no tiene estas deps. Construimos los mismos patterns (composición, cn(), variantes) pero con implementación propia en Tailwind puro. Más liviano, 0 deps nuevas.
4. **Sin recharts/chart.js**: El VentasChart es SVG puro — lo mantenemos así (sin deps nuevas) pero lo mejoramos visualmente.
5. **Skeleton con Tailwind animate-pulse**: Nativo, 0 deps. Patrón estándar y reconocible.
6. **DataTable como componente "headless-lite"**: Acepta `columns`, `data`, `isLoading`, `emptyState` — suficiente para las 5 pantallas que lo usan.
7. **Header breadcrumb**: Se implementa como un contexto React simple (`BreadcrumbContext`) para que cada page pueda setear su título de forma declarativa, sin hacer el header server-component.

### Alternativas Consideradas

- **Instalar Shadcn/ui**: Descartado — agrega ~20 deps, requiere tweaks de config, y el proyecto ya tiene su propio sistema funcional. El objetivo es *el estilo* de Shadcn, no sus librerías.  
- **Migrar a Radix primitives**: Mismo argumento. Fuera de scope por ahora.
- **Reescribir todo en una sola pasada**: Descartado — demasiado riesgo de regresiones. El plan ejecuta fase por fase, cada una shippeable independientemente.

### Preguntas Abiertas

- ¿Querés modo oscuro? (Por ahora no está en el plan — se puede agregar en fase futura con CSS variables ya definidas.)
- ¿El Header con breadcrumb debe mostrar el nombre de la sección o solo un ícono de ubicación?

---

## Tareas Paso a Paso

---

### Paso 1: Design Tokens — `globals.css`

Agregar variables CSS globales que centralicen la identidad visual. Tailwind v4 soporta `@theme inline` para exponer custom properties como utilidades.

**Acciones:**

Reemplazar el contenido de `app/app/globals.css` con:

```css
@import "tailwindcss";
@import "../styles/print.css";

/* ─────────────────────────────────────────────
   Design Tokens — CValleTienda Design System
───────────────────────────────────────────── */
:root {
  /* Color brand (lime) */
  --brand-50:  #f7fee7;
  --brand-100: #ecfccb;
  --brand-200: #d9f99d;
  --brand-500: #84cc16;
  --brand-600: #65a30d;
  --brand-700: #4d7c0f;
  --brand-800: #3f6212;

  /* Grays */
  --gray-0:   #ffffff;
  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;
  --gray-950: #0A0A0A;

  /* Surface */
  --background: #ffffff;
  --surface:    #f9fafb;
  --foreground: #0A0A0A;

  /* Border */
  --border-subtle: #f3f4f6;
  --border-default: #e5e7eb;
  --border-strong: #d1d5db;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);

  /* Motion */
  --transition-fast:   150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow:   300ms ease;
}

/* Expose tokens as Tailwind utilities */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface:    var(--surface);
  --color-brand-50:   var(--brand-50);
  --color-brand-100:  var(--brand-100);
  --color-brand-500:  var(--brand-500);
  --color-brand-600:  var(--brand-600);
  --color-brand-700:  var(--brand-700);
  --color-brand-800:  var(--brand-800);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

html, body {
  overflow-x: hidden;
  max-width: 100%;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Focus ring global (accesibilidad) */
:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}
```

**Archivos afectados:**
- `app/app/globals.css`

---

### Paso 2: `Button.tsx` — Variantes completas + loading state

Agregar variante `outline`, tamaño `xs`, prop `isLoading` con spinner inline, y fix del focus ring.

**Acciones:**

Reemplazar `app/components/ui/Button.tsx` con:

```tsx
import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-lime-600 hover:bg-lime-700 active:bg-lime-800 text-white border-transparent shadow-xs disabled:bg-lime-400',
  secondary:
    'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 border-gray-200 shadow-xs',
  outline:
    'bg-transparent hover:bg-gray-50 active:bg-gray-100 text-gray-700 border-gray-300',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent shadow-xs disabled:bg-red-400',
  ghost:
    'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-600 border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-sm gap-2',
  md: 'h-9 px-4 text-sm gap-2',
}

export const baseClasses =
  'inline-flex items-center justify-center rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60 focus-visible:ring-offset-1'

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

interface BaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
  isLoading?: boolean
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, isLoading, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  )
})

interface LinkButtonProps extends BaseProps {
  href: string
  prefetch?: boolean
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  prefetch,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </Link>
  )
}
```

**Archivos afectados:**
- `app/components/ui/Button.tsx`

---

### Paso 3: `Input.tsx`, `Select.tsx`, `Textarea.tsx` — Fix focus ring + polish

**Acciones — Input.tsx:**

Cambiar:
- `focus:ring-indigo-500` → `focus:ring-lime-500/60`
- `border-gray-300` → `border-gray-200`  
- `border-gray-300` (error) → `border-red-400`
- Agregar `focus:border-lime-400` para highlight sutil del borde en foco

```tsx
// app/components/ui/Input.tsx
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

const baseClasses =
  'w-full h-9 rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = '', id, ...rest },
  ref
) {
  const borderClass = error ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400' : 'border-gray-200'
  const inputId = id ?? rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`${baseClasses} ${borderClass} ${className}`}
        {...rest}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})
```

**Acciones — Select.tsx:** Mismos cambios de focus ring y border.

```tsx
// app/components/ui/Select.tsx  
import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

const baseClasses =
  'w-full h-9 rounded-lg border bg-white px-3 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed'

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className = '', id, children, ...rest },
  ref
) {
  const borderClass = error ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400' : 'border-gray-200'
  const selectId = id ?? rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`${baseClasses} ${borderClass} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})
```

**Archivos afectados:**
- `app/components/ui/Input.tsx`
- `app/components/ui/Select.tsx`
- `app/components/ui/Textarea.tsx` (mismo patrón)

---

### Paso 4: `Skeleton.tsx` — Nuevo componente

**Acciones — Crear `app/components/ui/Skeleton.tsx`:**

```tsx
import { type HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  const base = 'animate-pulse bg-gray-100 rounded'
  const shape =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded h-[0.875rem]'
      : 'rounded-lg'

  return (
    <div
      className={`${base} ${shape} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden
      {...rest}
    />
  )
}

/* Preset: fila de skeleton para tabla */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" className="w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

/* Preset: card de KPI skeleton */
export function KpiCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-20" />
        <Skeleton variant="circle" width={28} height={28} />
      </div>
      <Skeleton height={28} className="w-32" />
      <Skeleton variant="text" className="w-24" />
    </div>
  )
}
```

**Archivos afectados:**
- `app/components/ui/Skeleton.tsx` ← nuevo

---

### Paso 5: `Badge.tsx` — Nuevo componente de estado

Reemplaza los `<span className="inline-flex rounded-full bg-lime-50 px-2...">` duplicados en ventas, devoluciones, remitos, etc.

**Acciones — Crear `app/components/ui/Badge.tsx`:**

```tsx
type BadgeVariant =
  | 'success'   // completada, activo
  | 'warning'   // pendiente, trial
  | 'danger'    // cancelada, vencido
  | 'info'      // en proceso
  | 'neutral'   // genérico
  | 'brand'     // pro

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50  text-amber-700  border-amber-200',
  danger:  'bg-red-50    text-red-700    border-red-200',
  info:    'bg-blue-50   text-blue-700   border-blue-200',
  neutral: 'bg-gray-100  text-gray-600   border-gray-200',
  brand:   'bg-lime-50   text-lime-700   border-lime-200',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-tight ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

/* Helper para mapear estado de venta a variante */
export function estadoVentaBadge(estado: string) {
  const map: Record<string, BadgeVariant> = {
    completada: 'success',
    cancelada: 'danger',
    pendiente: 'warning',
  }
  return map[estado] ?? 'neutral'
}
```

**Archivos afectados:**
- `app/components/ui/Badge.tsx` ← nuevo

---

### Paso 6: `Card.tsx` — Wrapper de tarjeta estándar

Evita repetir `bg-white border border-gray-100 rounded-xl p-5` en decenas de lugares.

**Acciones — Crear `app/components/ui/Card.tsx`:**

```tsx
import { type HTMLAttributes } from 'react'

type CardVariant = 'default' | 'subtle' | 'highlighted' | 'ghost'

const variantClasses: Record<CardVariant, string> = {
  default:     'bg-white border border-gray-100 shadow-xs',
  subtle:      'bg-gray-50 border border-gray-100',
  highlighted: 'bg-lime-50 border border-lime-200',
  ghost:       'bg-transparent border border-dashed border-gray-200',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const paddingClasses = { sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-xl transition-colors ${variantClasses[variant]} ${paddingClasses[padding]} ${
        hoverable ? 'hover:border-gray-200 hover:shadow-sm cursor-pointer' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 ${className}`} {...rest}>{children}</div>
}

export function CardTitle({ className = '', children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-[15px] font-semibold text-gray-900 ${className}`} {...rest}>{children}</h3>
}

export function CardDescription({ className = '', children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-gray-400 mt-0.5 ${className}`} {...rest}>{children}</p>
}
```

**Archivos afectados:**
- `app/components/ui/Card.tsx` ← nuevo

---

### Paso 7: `EmptyState.tsx` — Redesign

**Acciones — Reemplazar `app/components/ui/EmptyState.tsx`:**

```tsx
import { LinkButton } from './Button'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  cta?: { label: string; href: string }
  action?: ReactNode   // alternativa: botón custom (no link)
}

export function EmptyState({ title, description, icon, cta, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-gray-400 max-w-xs">{description}</p>
      )}
      {(cta || action) && (
        <div className="mt-5">
          {cta && <LinkButton href={cta.href} size="sm">{cta.label}</LinkButton>}
          {action}
        </div>
      )}
    </div>
  )
}
```

**Archivos afectados:**
- `app/components/ui/EmptyState.tsx`

---

### Paso 8: `DataTable.tsx` — Tabla reutilizable

Reemplaza la implementación inline de `<table>` en ventas, productos, stock, clientes.

**Acciones — Crear `app/components/ui/DataTable.tsx`:**

```tsx
import { type ReactNode } from 'react'
import { Skeleton, SkeletonRow } from './Skeleton'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  skeletonRows?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: ReactNode
  emptyCta?: { label: string; href: string }
  getRowHref?: (row: T) => string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 5,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  emptyIcon,
  emptyCta,
  getRowHref,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 ${col.headerClassName ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-2">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    icon={emptyIcon}
                    cta={emptyCta}
                  />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-gray-50 last:border-0 transition-colors ${
                    getRowHref || onRowClick
                      ? 'hover:bg-gray-50 cursor-pointer'
                      : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-gray-700 ${col.className ?? ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Archivos afectados:**
- `app/components/ui/DataTable.tsx` ← nuevo

---

### Paso 9: `Sidebar.tsx` — Polish visual

**Acciones:**

1. Mejorar el botón de logout: convertir en botón con hover state claro (no solo texto)
2. Añadir separador antes del área de usuario
3. Mejorar el hover de items de nav: añadir `group` y transición del ícono
4. Ajustar padding para más aire visual

Modificar en `app/components/layout/Sidebar.tsx`:

**Cambios específicos:**

A. El área de usuario + logout (actualmente muy sutil):
```tsx
// Reemplazar la sección "Usuario + Logout":
<div className="px-3 py-3 border-t border-gray-100">
  <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-1">
    <div className="w-7 h-7 rounded-lg bg-lime-50 flex items-center justify-center text-lime-700 font-bold text-xs flex-shrink-0">
      {perfil.nombre.charAt(0).toUpperCase()}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[12px] font-medium text-gray-900 truncate leading-tight">
        {perfil.nombre}
      </p>
      <p className="text-[10px] text-gray-400 capitalize leading-tight">{perfil.rol}</p>
    </div>
  </div>
  <form action={logoutAction}>
    <button
      type="submit"
      className="w-full flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg text-[12px] text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Cerrar sesión
    </button>
  </form>
</div>
```

B. Nav items — añadir `group` para animar ícono en hover:
```tsx
className={`group flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-lg text-[13px] transition-all border-l-2 ${
  isActive
    ? 'border-lime-500 bg-lime-50 text-lime-800 font-semibold'
    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
}`}
```
Y en el ícono:
```tsx
<span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-lime-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
  {item.icon}
</span>
```

**Archivos afectados:**
- `app/components/layout/Sidebar.tsx`

---

### Paso 10: `Header.tsx` — Breadcrumb contextual

El header actual solo muestra la fecha. Agregar zona para mostrar el título/breadcrumb de la página actual.

**Acciones:**

Añadir un contexto `PageContext` que las páginas del dashboard usen para setear su título. El Header lo consume y lo muestra.

**A — Crear `app/components/layout/PageContext.tsx`:**
```tsx
'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

interface PageContextValue {
  title: string
  setTitle: (t: string) => void
}

const PageContext = createContext<PageContextValue>({ title: '', setTitle: () => {} })

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  return <PageContext.Provider value={{ title, setTitle }}>{children}</PageContext.Provider>
}

export function usePageTitle() {
  return useContext(PageContext)
}
```

**B — Crear `app/components/layout/PageTitle.tsx`:**
```tsx
'use client'
import { useEffect } from 'react'
import { usePageTitle } from './PageContext'

export function PageTitle({ title }: { title: string }) {
  const { setTitle } = usePageTitle()
  useEffect(() => { setTitle(title) }, [title, setTitle])
  return null
}
```

**C — Modificar `Header.tsx`** para mostrar el título del contexto:
```tsx
'use client'
import { usePageTitle } from './PageContext'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { title } = usePageTitle()

  return (
    <header className="bg-white border-b border-gray-100 px-4 lg:px-6 h-12 flex items-center gap-3 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-lime-500/40 focus-visible:outline-none"
        aria-label="Abrir menú"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <line x1="2" y1="4.5" x2="14" y2="4.5" />
          <line x1="2" y1="8"   x2="14" y2="8"   />
          <line x1="2" y1="11.5" x2="14" y2="11.5" />
        </svg>
      </button>

      {title ? (
        <h1 className="text-[14px] font-semibold text-gray-900 truncate">{title}</h1>
      ) : (
        <p className="text-[13px] text-gray-400 capitalize">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      )}
    </header>
  )
}
```

**D — Integrar `PageProvider` en `AppShell.tsx`**, envolviendo el contenido:
```tsx
// Agregar import
import { PageProvider } from './PageContext'
// Envolver children
<PageProvider>
  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
    ...
  </div>
</PageProvider>
```

**Archivos afectados:**
- `app/components/layout/PageContext.tsx` ← nuevo
- `app/components/layout/PageTitle.tsx` ← nuevo
- `app/components/layout/Header.tsx`
- `app/components/layout/AppShell.tsx`

---

### Paso 11: `KpiCard.tsx` — Hover state + focus accesible

**Acciones:**

Cambiar el inner wrapper y los estilos del contenedor para que cuando tenga `href`, el hover sea evidente y el focus sea accesible.

Modificar `app/components/dashboard/KpiCard.tsx`:

```tsx
// Cambiar cardClass y la lógica del inner:
const cardClass = destacar
  ? 'bg-lime-50 border border-lime-200'
  : 'bg-white border border-gray-100 shadow-xs'

const inner = (
  <div className={`${cardClass} rounded-xl p-5 h-full transition-all duration-150 ${
    href ? 'group-hover:border-gray-200 group-hover:shadow-sm' : ''
  }`}>
    ...
  </div>
)

// Y el wrapper:
return href ? (
  <Link
    href={href}
    className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50"
  >
    {inner}
  </Link>
) : (
  <div>{inner}</div>
)
```

**Archivos afectados:**
- `app/components/dashboard/KpiCard.tsx`

---

### Paso 12: Dashboard — Wraps de Suspense con skeletons reales

El dashboard actual tiene varias secciones cargadas con `Suspense fallback={null}`. Reemplazarlos con skeletons visibles.

**Acciones:**

En `app/app/(dashboard)/dashboard/page.tsx`, agregar `import { KpiCardSkeleton } from '@/components/ui/Skeleton'` y cambiar los `fallback={null}` por grillas de `KpiCardSkeleton`:

```tsx
<Suspense
  fallback={
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}
    </div>
  }
>
  {/* fila de KPIs */}
</Suspense>
```

Dado que `dashboard/page.tsx` es un Server Component que carga todo junto con `await Promise.all(...)`, la mejor estrategia es extraer cada sección en sub-Server-Components con sus propias queries y envolverlos en Suspense individuales. **Esto queda como mejora opcional** (fase futura) para no introducir refactors grandes. Lo que sí se hace ahora: asegurar que el `loading.tsx` del segmento muestre un skeleton decente.

**Crear `app/app/(dashboard)/dashboard/loading.tsx`:**
```tsx
import { KpiCardSkeleton } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton height={28} className="w-32 mb-2" />
        <Skeleton variant="text" className="w-44" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Skeleton height={260} className="w-full rounded-xl" />
        </div>
        <Skeleton height={260} className="w-full rounded-xl" />
      </div>
    </div>
  )
}
```

**Crear `app/app/(dashboard)/ventas/loading.tsx`** (mismo patrón para tabla):
```tsx
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function VentasLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton height={28} className="w-24 mb-2" />
        <Skeleton variant="text" className="w-48" />
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {[1,2,3,4,5].map(i => (
                <th key={i} className="px-4 py-2.5">
                  <Skeleton variant="text" className="w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Archivos afectados:**
- `app/app/(dashboard)/dashboard/loading.tsx` ← nuevo
- `app/app/(dashboard)/ventas/loading.tsx` ← nuevo
- `app/app/(dashboard)/productos/loading.tsx` ← nuevo (idéntico a ventas con 6 cols)

---

### Paso 13: `ventas/page.tsx` — Aplicar Badge + DataTable

**Acciones:**

Refactorizar la tabla de ventas para usar el nuevo `DataTable` component y el `Badge` de estado.

```tsx
// En ventas/page.tsx — desktop table section:
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge, estadoVentaBadge } from '@/components/ui/Badge'

type VentaRow = typeof ventas[0]

const columns: Column<VentaRow>[] = [
  {
    key: 'numero',
    header: '#',
    render: (v) => <span className="font-medium text-gray-900">#{v.numero_ticket}</span>,
  },
  {
    key: 'fecha',
    header: 'Fecha',
    render: (v) => <span className="text-gray-500">{formatDateTime(v.created_at)}</span>,
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (v) => <Badge variant={estadoVentaBadge(v.estado)}>{v.estado}</Badge>,
  },
  {
    key: 'total',
    header: 'Total',
    className: 'font-semibold text-gray-900 text-right',
    headerClassName: 'text-right',
    render: (v) => formatARS(v.total),
  },
  // ... más columnas según el tipo de venta
]

// Reemplazar el bloque <table> desktop con:
<div className="hidden sm:block">
  <DataTable
    columns={columns}
    data={ventas}
    emptyTitle="Todavía no hay ventas"
    emptyDescription="Cuando registres una venta desde el POS aparecerá acá."
    emptyIcon="🧾"
    emptyCta={{ label: 'Ir al POS', href: '/pos' }}
    getRowHref={(v) => `/ventas/${v.id}`}
  />
</div>
```

**Archivos afectados:**
- `app/app/(dashboard)/ventas/page.tsx`

---

### Paso 14: Estilo global de páginas — Contenedor estándar

Agregar una clase helper `page-container` para estandarizar el padding de las páginas.

**Acciones:**

En `globals.css`, agregar al final:
```css
/* Contenedor estándar de página del dashboard */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

@media (min-width: 1024px) {
  .page-content {
    padding: 2rem 2.5rem;
  }
}
```

Luego, en el layout del dashboard (`app/(dashboard)/layout.tsx`), envolver `{children}` con `<main className="page-content">`.

**Nota:** Revisar si ya existe un layout wrapper en `app/(dashboard)/layout.tsx` antes de modificar.

**Archivos afectados:**
- `app/app/globals.css`
- `app/app/(dashboard)/layout.tsx` (verificar primero)

---

### Paso 15: Validación y revisión de consistencia

**Acciones:**

1. Buscar en el codebase todos los `focus:ring-indigo-500` restantes y reemplazarlos por `focus:ring-lime-500/40`
2. Buscar todos los `border-gray-300` en inputs y unificar a `border-gray-200`
3. Revisar que los nuevos components se renderizan sin errores TypeScript (`get_errors`)
4. Verificar en browser que el dashboard, ventas y productos cargan correctamente

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/layout.tsx` → envuelve todas las páginas del dashboard
- `app/components/layout/AppShell.tsx` → providers principales
- `app/app/(auth)/layout.tsx` → no afectado por este plan
- Todos los `page.tsx` del dashboard → usan los componentes UI a modificar

### Actualizaciones Necesarias para Consistencia

- Si se agrega `PageProvider` en AppShell, verificar que no rompa SSR (es `'use client'`)
- `Badge` reemplaza patrones inline en: `ventas/page.tsx`, `devoluciones/page.tsx`, `remitos/page.tsx`, `clientes/page.tsx` — estos se pueden migrar progresivamente
- `DataTable` puede reemplazar tablas en: ventas, devoluciones, remitos, stock, clientes — migración progresiva

### Impacto en Flujos de Trabajo Existentes

- `Button` cambió la altura de `h-10` a `h-9` — revisar formularios con botones submit que tengan layout fijo
- `Input` cambió de `h-10` a `h-9` — consistente con Button, pero revisar alineaciones en formularios POS
- No se tocan los estilos de impresión (`print.css`)

---

## Lista de Validación

- [ ] `globals.css` tiene los tokens CSS definidos y no rompe estilos existentes
- [ ] `Button` compila sin errores TypeScript y `isLoading` funciona en un formulario real
- [ ] `Input` y `Select` muestran `focus:ring-lime` en lugar de `focus:ring-indigo`
- [ ] `Skeleton`, `Badge`, `Card`, `DataTable` compilan sin errores TypeScript
- [ ] `EmptyState` se ve correctamente en ventas y productos con 0 resultados
- [ ] `Sidebar` logout button muestra hover rojo; nav items muestran animación de ícono
- [ ] `Header` muestra la fecha cuando no hay título de página contextual
- [ ] `KpiCard` con `href` muestra hover state al pasar el cursor
- [ ] `loading.tsx` del dashboard se muestra durante navegación
- [ ] `DataTable` en ventas muestra `Badge` de estado correctamente
- [ ] No hay errores TypeScript en `get_errors` después de todos los cambios
- [ ] UI es responsive (verificar mobile en 375px)
- [ ] No se rompió el módulo de impresión (`print.css` intacto)

---

## Criterios de Éxito

1. Todos los inputs y selects muestran `focus:ring-lime` — cero `focus:ring-indigo` en el codebase
2. Existe un `loading.tsx` con skeleton para dashboard, ventas y productos
3. La tabla de ventas usa `DataTable` + `Badge` y el empty state es el nuevo diseño
4. `Button` tiene variante `outline` y prop `isLoading` funcional
5. El sidebar muestra hover rojo en logout y animación de escala en íconos

---

## Notas

### Orden de implementación recomendado (por riesgo)

1. **Paso 1** (globals.css) → sin riesgo, solo añade variables
2. **Paso 4** (Skeleton) → nuevo archivo, sin riesgo
3. **Paso 5** (Badge) → nuevo archivo, sin riesgo
4. **Paso 6** (Card) → nuevo archivo, sin riesgo
5. **Paso 8** (DataTable) → nuevo archivo, sin riesgo
6. **Paso 2** (Button) → riesgo bajo, cambia tamaño h-10→h-9
7. **Paso 3** (Input/Select/Textarea) → riesgo bajo, solo focus ring
8. **Paso 7** (EmptyState) → riesgo bajo, mismo API
9. **Paso 9** (Sidebar) → riesgo medio, componente visual crítico
10. **Paso 10** (Header + PageContext) → riesgo medio, nuevo context
11. **Paso 11** (KpiCard) → riesgo bajo, solo estilos hover
12. **Paso 12** (loading.tsx files) → sin riesgo, nuevos archivos
13. **Paso 13** (ventas refactor) → riesgo medio, lógica de tabla
14. **Paso 14** (page-content wrapper) → verificar primero el layout existente
15. **Paso 15** (validación) → siempre al final

### Fases futuras (fuera de scope)

- **Modo oscuro**: Las CSS variables ya están listas. Solo agregar `.dark` overrides.
- **Radix Dialog/Popover**: Para modales de confirmación, dropdowns contextuales
- **Toast notifications**: Ya tiene `sonner` — crear un helper `toast.ts` centralizado
- **Formularios con React Hook Form + Zod**: Para validación consistente en todos los formularios
- **Animaciones Framer Motion**: Ya instalado — agregar `AnimatePresence` en tablas para row transitions
- **Migrar resto de tablas**: devoluciones, remitos, stock, clientes a DataTable
