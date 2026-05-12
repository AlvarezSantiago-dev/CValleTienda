# Plan: Redesign del dashboard layout y sidebar inspirado en el landing

**Creado:** 2026-05-10
**Estado:** Borrador
**Pedido:** Redesign del layout principal del dashboard (sidebar + header) alineado con el estilo del nuevo landing page: paleta lime, fondo blanco, tipografía bold, SVG icons, sin emojis.

---

## Descripción General

El dashboard actual usa emojis como iconos, paleta indigo, fondo `bg-gray-50` y un header muy básico. El objetivo es elevar el sidebar y header al mismo nivel visual del landing: íconos SVG propios con stroke, paleta lime, fondo blanco puro, jerarquía tipográfica clara, estado activo bien definido, y un avatar de usuario más elaborado.

El header se convierte en algo más útil: muestra la fecha + acceso rápido al logout, con posibilidad de expandir en el futuro.

**Lo que NO cambia:** la lógica de autenticación, las rutas, los componentes de página, `RubroProvider`, `AvisoCajaCerrada`.

---

## Estado Actual

| Componente | Problema |
|---|---|
| `Sidebar.tsx` | Emojis como íconos, `bg-indigo-50 text-indigo-700` activo, sin separación visual entre secciones |
| `Header.tsx` | Muy básico — solo fecha y logout |
| `layout.tsx` | `bg-gray-50` de fondo, funciona pero sin estilo |
| `AvisoCajaCerrada.tsx` | Buen estilo amber, no requiere cambios |

---

## Diseño Objetivo

### Sidebar

```
┌──────────────────────┐
│  [■] CValleTienda    │  ← Logo + nombre tienda
│      Moda Centro     │
├──────────────────────┤
│  Ventas              │  ← Sección label (xs, uppercase, gray-400)
│  ▸ Inicio            │  ← Item activo: bg-lime-50 text-lime-800 font-semibold
│  ▸ Vender (POS)      │
│  ▸ Ventas            │
│  ▸ Devoluciones      │
│  ▸ Remitos           │
│                      │
│  Inventario          │
│  ▸ Productos         │
│  ▸ Stock             │
│                      │
│  Gestión             │
│  ▸ Caja              │
│  ▸ Clientes          │
│                      │
│  Sistema             │
│  ▸ Configuración     │
├──────────────────────┤
│  [M] Martina         │  ← Avatar inicial + nombre
│      owner           │  ← rol en gris
│      [Salir →]       │  ← logout inline
└──────────────────────┘
```

### Tokens visuales
- **Fondo sidebar:** `bg-white`
- **Borde sidebar:** `border-r border-gray-100`
- **Item activo:** `bg-lime-50 text-lime-800 font-semibold` + barra izquierda `border-l-2 border-lime-500`
- **Item hover:** `hover:bg-gray-50 hover:text-gray-900`
- **Item inactivo:** `text-gray-500`
- **Section labels:** `text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400`
- **Íconos:** SVG con `stroke="currentColor"` (16x16, strokeWidth 1.7), inherit color del item
- **Avatar:** `w-8 h-8 rounded-xl bg-lime-50 text-lime-700` con inicial
- **Logout:** botón de texto inline `text-[12px] text-gray-400 hover:text-gray-700`

### Header
- Fondo: `bg-white border-b border-gray-100`
- Izquierda: breadcrumb o título de la sección activa (vacío por ahora, futuro)
- Derecha: solo logout textual (el usuario ya está visible en sidebar)
- El header puede simplificarse o incluso eliminarse si el sidebar tiene logout — **decisión: mantenerlo pero hacerlo muy fino** (`py-3`)

---

## Plan de Implementación

### Paso 1 — Crear íconos SVG para el sidebar

Crear un archivo `app/components/layout/SidebarIcons.tsx` con componentes SVG para cada sección:

| Ruta | Ícono SVG |
|---|---|
| `/dashboard` | Casa / Home |
| `/pos` | Caja registradora / Terminal |
| `/ventas` | Lista / Receipt |
| `/remitos` | Camión / Truck |
| `/devoluciones` | Flecha circular / RefreshCcw |
| `/caja` | Billetera / Wallet |
| `/clientes` | Personas / Users |
| `/productos` | Colgador / Tag |
| `/stock` | Caja / Package |
| `/configuracion` | Engranaje / Settings |

Todos usan `stroke="currentColor"`, `fill="none"`, `strokeWidth={1.7}`, `width={16}` `height={16}`.

### Paso 2 — Redesign de `Sidebar.tsx`

**Estructura de `navItems`:** Agregar sección (group) a cada item:

```ts
const navGroups = [
  {
    label: 'Ventas',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: <IconHome /> },
      { href: '/pos', label: 'Vender (POS)', icon: <IconPOS /> },
      { href: '/ventas', label: 'Ventas', icon: <IconVentas /> },
      { href: '/devoluciones', label: 'Devoluciones', icon: <IconReturn /> },
      { href: '/remitos', label: 'Remitos', icon: <IconTruck /> },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { href: '/productos', label: 'Productos', icon: <IconProductos /> },
      { href: '/stock', label: 'Stock', icon: <IconStock /> },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/caja', label: 'Caja', icon: <IconCaja /> },
      { href: '/clientes', label: 'Clientes', icon: <IconClientes /> },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracion', label: 'Configuración', icon: <IconConfig /> },
    ],
  },
]
```

**Renderizado de ítem activo:**
```tsx
className={`flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg text-[13px] transition-colors border-l-2 ${
  isActive
    ? 'border-lime-500 bg-lime-50 text-lime-800 font-semibold'
    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
}`}
```

**Header del sidebar (logo + tienda):**
- Logo: cuadrado `[#0A0A0A]` con letra "C" (igual que el landing y auth)
- Nombre tienda: `text-[14px] font-semibold text-[#0A0A0A] truncate`
- Tagline `"CValleTienda"`: `text-[10px] text-gray-400`

**Footer del sidebar (usuario + logout):**
- Avatar: `w-8 h-8 rounded-xl bg-lime-50 text-lime-700 font-bold text-[13px]`
- Nombre + rol a la derecha
- Botón logout: formulario `<form action={logoutAction}>` con botón de texto `"Salir →"`

**Nota:** mover el `logoutAction` del `Header.tsx` al `Sidebar.tsx`. El header ya no necesita el logout.

### Paso 3 — Redesign de `Header.tsx`

Simplificar el header:
- Fondo: `bg-white border-b border-gray-100`
- Solo muestra la fecha (más limpia)
- Sin logout (está en el sidebar)
- Altura reducida: `py-3 px-6`
- Texto fecha: `text-[13px] text-gray-400`

Alternativa: eliminar el header por completo y poner la fecha como subtext en el sidebar — **dejar el header pero simplificado**.

### Paso 4 — Actualizar `layout.tsx`

Solo cambiar `bg-gray-50` por `bg-white` en el div raíz.

```tsx
<div className="min-h-screen bg-white flex">
```

---

## Archivos a Crear / Modificar

| Acción | Archivo |
|---|---|
| **CREAR** | `app/components/layout/SidebarIcons.tsx` |
| **MODIFICAR** | `app/components/layout/Sidebar.tsx` |
| **MODIFICAR** | `app/components/layout/Header.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/layout.tsx` |

---

## Archivos que NO se tocan

- `AvisoCajaCerrada.tsx` — estilo amber funciona bien
- `RubroProvider.tsx` — lógica pura, sin estilos
- Todas las páginas del dashboard (`/dashboard/*`, `/pos`, `/ventas`, etc.)

---

## Dependencias y Precondiciones

- `logoutAction` ya existe en `@/app/actions/auth` ✅
- No se necesita framer-motion en el sidebar (el layout no es un Client Component)
- `Sidebar.tsx` ya es `'use client'` (usa `usePathname`) ✅

---

## Criterios de Éxito

- [ ] Sin emojis en el sidebar — todos íconos SVG
- [ ] Paleta lime en estado activo (bg-lime-50, text-lime-800, border-lime-500)
- [ ] Grupos de navegación con labels (Ventas / Inventario / Gestión / Sistema)
- [ ] Logo coherente con el landing (cuadrado negro + "C")
- [ ] Avatar de usuario con inicial en lime
- [ ] Logout en el footer del sidebar (no en el header)
- [ ] Header simplificado: solo fecha, `border-gray-100`
- [ ] Fondo del layout: `bg-white` (no `bg-gray-50`)
- [ ] Sin errores TypeScript

---

## Orden de Ejecución

1. Crear `SidebarIcons.tsx`
2. Modificar `Sidebar.tsx`
3. Modificar `Header.tsx`
4. Modificar `layout.tsx`
5. Correr `get_errors` en todos los archivos modificados
