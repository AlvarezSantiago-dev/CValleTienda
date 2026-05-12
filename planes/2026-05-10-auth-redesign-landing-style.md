# Plan: Rediseño de páginas de autenticación al estilo del nuevo landing

**Creado:** 2026-05-10
**Estado:** Borrador
**Pedido:** Rediseñar login, registro y confirmar-email inspirados en el diseño del nuevo landing page (paleta lime/verde manzana, fondo blanco, estilo SaaS premium 2026 con framer-motion).

---

## Descripción General

Las páginas de autenticación actuales tienen un diseño muy básico: fondo gris-50, card con borde simple y paleta indigo que ya no coincide con el nuevo landing. El objetivo es darles coherencia visual total con el landing rediseñado: paleta lime, fondo blanco con orbes de gradiente, tipografía bold con tracking negativo, animaciones framer-motion y CTAs con botones negros rounded-full.

Se adopta un **layout split** (panel izquierdo de marca + panel derecho con formulario) visible en pantallas `lg:` y superior. En mobile se muestra solo el formulario, limpio y centrado.

---

## Estado Actual

### Archivos afectados
| Archivo | Estado actual |
|---|---|
| `app/app/(auth)/layout.tsx` | Layout básico, fondo `bg-gray-50`, card `max-w-md` centrado |
| `app/app/(auth)/login/page.tsx` | Form simple, `focus:ring-indigo-500`, botón `bg-indigo-600` |
| `app/app/(auth)/registro/page.tsx` | Form con más campos, mismo estilo indigo |
| `app/app/(auth)/confirmar-email/page.tsx` | Card centrado con emoji 📬, indigo en email |

### Problemas
- Paleta indigo no coincide con el landing (ahora lime)
- Layout genérico, sin identidad de marca
- Sin animaciones
- Fondo gris plano
- Botones con estilo diferente al landing (indigo vs negro)
- Sin social proof ni valor comunicado durante el registro

---

## Diseño Objetivo

### Layout Split (lg+)
```
┌─────────────────────┬──────────────────────┐
│   Panel de marca    │    Panel formulario   │
│   (fondo blanco     │    (blanco, centrado) │
│    con orbes)       │                       │
│                     │                       │
│  Logo               │  Título               │
│  Tagline            │  Subtítulo            │
│  • Punto de venta   │  [Inputs]             │
│  • Stock real       │  [Botón negro]        │
│  • Factura AFIP     │  Link alternativo     │
│                     │                       │
└─────────────────────┴──────────────────────┘
```

### Tokens de diseño (alineados con landing)
- **Color primario:** `lime-600` (#65A30D), `lime-700`, `lime-50`
- **Botón CTA:** `bg-[#0A0A0A]` rounded-full, idéntico al landing
- **Focus rings:** `focus:ring-lime-500`
- **Links:** `text-lime-700 hover:text-lime-800`
- **Gradiente texto:** `from-lime-700 via-lime-500 to-lime-600 bg-clip-text text-transparent`
- **Orbes de fondo:** `rgba(101,163,13,...)` (lime) + `rgba(245,158,11,...)` (amber)
- **Tipografía H1:** `text-[28px] font-bold tracking-[-0.025em]`
- **Inputs:** borde `border-gray-200`, focus `ring-2 ring-lime-400 border-transparent`
- **Fondo página:** `bg-white`
- **Animaciones:** `framer-motion` fadeInUp igual que en `AnimatedSection`

---

## Plan de Implementación

### Paso 1 — Redesign de `layout.tsx`

**Objetivo:** Transformar el layout en un split de 2 columnas.

**Cambios:**
- Convertir a Client Component (`'use client'`) si se necesita framer-motion, o dejarlo Server y usar un componente client separado para el panel animado.
- Estructura: `min-h-screen bg-white flex`
  - **Columna izquierda** (`hidden lg:flex w-1/2`): panel de marca con:
    - Orbes de gradiente lime + amber (inline styles, igual que hero del landing)
    - Logo: cuadrado negro `[#0A0A0A]` + "CValleTienda" bold
    - Tagline con gradiente: `"El sistema que tu negocio necesita."`
    - 3 bullets con iconos SVG: POS, Stock, Factura AFIP
    - Footer del panel: `"Primer mes gratis · Sin tarjeta"`
  - **Columna derecha** (`w-full lg:w-1/2`): `flex items-center justify-center p-8`
    - Renderiza `{children}`
    - Link "← Volver al inicio" fijo en top-left del panel (solo en mobile)
- Fuera del card: ya no habrá `max-w-md` wrapper en layout, cada page controla su ancho

**Componente `AuthBrandPanel` (nuevo, Client Component):**
- Crearlo en `app/components/landing/ui/AuthBrandPanel.tsx`
- Contiene todo el contenido visual del panel izquierdo
- Usa framer-motion para animar entrada de los items

---

### Paso 2 — Redesign de `login/page.tsx`

**Objetivo:** Formulario premium alineado con el landing.

**Cambios visuales:**
- Eliminar el wrapper `bg-white rounded-xl shadow-sm border` (el fondo ya lo pone el layout)
- Máximo ancho del form: `max-w-sm w-full`
- Encabezado:
  ```
  Bienvenido de nuevo
  Ingresá a tu tienda ← subtítulo gris
  ```
- Inputs:
  - Sin label visible en el estado por defecto → usar `placeholder` + label accesible arriba
  - Border `border-gray-200`, focus `ring-2 ring-lime-400/60 border-lime-400`
  - `rounded-xl px-4 py-3 text-[15px]`
- Botón submit: `bg-[#0A0A0A] rounded-full h-12 w-full text-white font-semibold hover:bg-gray-800 hover:scale-[1.01]`
- Link "¿No tenés cuenta?": `text-lime-700 font-medium`
- Link "← Volver al inicio": `text-xs text-gray-400` debajo del form
- Error banner: `bg-red-50 border-red-200` — sin cambios funcionales
- Animación: envolver el form en un `motion.div` con fadeInUp (delay 0.1)

---

### Paso 3 — Redesign de `registro/page.tsx`

**Objetivo:** Formulario de registro con el mismo sistema de diseño.

**Cambios visuales:**
- Misma eliminación del wrapper card
- Encabezado:
  ```
  Crear tu cuenta
  Empezá hoy, primer mes gratis ← subtítulo con acento
  ```
- Mismos estilos de inputs que login
- Orden de campos (sin cambios funcionales):
  1. Nombre de la tienda
  2. Rubro (componente `RubroSelector`)
  3. Tu nombre
  4. Email
  5. Contraseña
- `RubroSelector`: revisar si tiene estilos hardcodeados en indigo → actualizar a lime
- Botón: mismo estilo negro rounded-full
- Link "¿Ya tenés cuenta?": lime-700
- Animación: fadeInUp igual que login

---

### Paso 4 — Redesign de `confirmar-email/page.tsx`

**Objetivo:** Pantalla de confirmación coherente con el resto.

**Cambios visuales:**
- Reemplazar emoji 📬 por un SVG propio (sobre con check, en lime-50)
- Card: sin border visible, solo el contenido centrado
- Email del usuario: `text-lime-700 font-semibold` (en lugar de indigo)
- Botón "Volver al inicio": estilo `border border-gray-200 rounded-full` — sin fondo negro (es acción secundaria)
- Agregar badge: `"✓ Link enviado"` tipo pill con `bg-lime-50 text-lime-700`

---

### Paso 5 — Actualizar `RubroSelector` si usa indigo

**Archivo:** `app/components/ui/RubroSelector.tsx`

- Buscar clases `indigo` y reemplazar por `lime`
- Solo si existen — verificar primero

---

## Archivos a Crear / Modificar

| Acción | Archivo |
|---|---|
| **CREAR** | `app/components/landing/ui/AuthBrandPanel.tsx` |
| **MODIFICAR** | `app/app/(auth)/layout.tsx` |
| **MODIFICAR** | `app/app/(auth)/login/page.tsx` |
| **MODIFICAR** | `app/app/(auth)/registro/page.tsx` |
| **MODIFICAR** | `app/app/(auth)/confirmar-email/page.tsx` |
| **VERIFICAR/MODIFICAR** | `app/components/ui/RubroSelector.tsx` |

---

## Dependencias y Precondiciones

- `framer-motion` ya instalado ✅
- Paleta `lime` ya en uso en el landing ✅
- `AnimatedSection` y patrón de animación ya establecidos ✅
- Server Actions (`loginAction`, `registroAction`) **no se modifican** — solo UI

---

## Restricciones

- No modificar la lógica de Server Actions
- No cambiar el flujo de navegación post-login/registro
- `layout.tsx` puede quedarse como Server Component si el panel de marca es un Client Component separado
- El `RubroSelector` mantiene su funcionalidad, solo cambia de paleta si usa indigo

---

## Criterios de Éxito

- [ ] Las páginas de auth usan fondo blanco puro
- [ ] Paleta lime-600/lime-700 consistente con el landing
- [ ] Botones de submit son negros rounded-full
- [ ] Inputs con focus ring lime
- [ ] Panel izquierdo visible en `lg:` con branding y 3 value props
- [ ] Mobile: solo formulario, limpio y centrado
- [ ] Animaciones framer-motion en entrada del formulario
- [ ] Sin errores TypeScript
- [ ] `confirmar-email` alineado visualmente con el resto

---

## Orden de Ejecución

1. Crear `AuthBrandPanel.tsx`
2. Modificar `layout.tsx`
3. Modificar `login/page.tsx`
4. Modificar `registro/page.tsx`
5. Modificar `confirmar-email/page.tsx`
6. Verificar y actualizar `RubroSelector.tsx`
7. Correr `get_errors` en todos los archivos modificados
