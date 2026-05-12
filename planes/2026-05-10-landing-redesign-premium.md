# Plan: Redesign Premium de Landing Page — Estilo SaaS 2026

**Creado:** 2026-05-10
**Estado:** Borrador
**Pedido:** Modernizar completamente la landing page para que se vea premium, tech y con estilo de startup SaaS 2026 (Stripe / Linear / Vercel / Raycast / Framer / Apple). Animaciones con framer-motion, fondo blanco puro, foco en conversión.

---

## Descripción General

La landing actual usa Tailwind básico con colores indigo, sin animaciones, sin jerarquía tipográfica refinada y con layout estándar. El objetivo es rehacerla completamente para que transmita **calidad, confianza y modernidad**, con:

- Fondo blanco puro como base dominante
- Tipografía de alto contraste, grandes y audaces
- Paleta minimalista: blanco + negro + un único acento índigo/violeta sofisticado
- Animaciones suaves con **framer-motion** (fade-in al scroll, parallax leve, hover states)
- Glassmorphism sutil en la navbar y cards
- Microinteracciones en botones y features
- Layout espacioso con mucho whitespace
- Conversión clara con CTA primario y secundario bien diferenciados

Los archivos a reemplazar completamente son:
- `app/components/landing/LandingHeader.tsx`
- `app/components/landing/LandingPage.tsx`
- `app/components/landing/LandingFooter.tsx`

Se agregará framer-motion como dependencia y se crearán componentes auxiliares de animación.

---

## Análisis del Estado Actual

### Qué existe
| Archivo | Estado actual | Problema |
|---|---|---|
| `LandingHeader.tsx` | Fixed header, logo + 2 botones | Sin animación, borde visible, branding básico |
| `LandingPage.tsx` | Hero + features 4-col + sección AFIP + multi-rubro + CTA | Sin scroll animations, layout plano, colores pastel |
| `LandingFooter.tsx` | Footer gris oscuro simple | Demasiado denso, estilo anticuado |
| `globals.css` | @import tailwindcss, font Geist | Base OK, se puede extender |
| `package.json` | Sin framer-motion | Necesita instalación |

### Stack
- **Next.js 16.2.4** con App Router y Server Components
- **Tailwind CSS v4** con PostCSS
- **Font Geist** (sans + mono) ya configurada
- **React 19**

---

## Decisiones de Diseño

### Paleta de Colores
```
Fondo base:       #FFFFFF (blanco puro)
Texto primario:   #0A0A0A (casi negro, más profundo que gray-900)
Texto secundario: #6B7280 (gray-500)
Texto terciario:  #9CA3AF (gray-400)
Acento principal: #4F46E5 (indigo-600 — mantener consistencia con el sistema)
Acento hover:     #4338CA (indigo-700)
Acento suave bg:  #EEF2FF (indigo-50)
Borde sutil:      #F3F4F6 (gray-100)
Borde glass:      rgba(255,255,255,0.8)
```

### Tipografía (Geist ya instalada)
```
Hero H1:          font-size: 56-72px, font-weight: 700, letter-spacing: -0.03em, line-height: 1.1
Section H2:       font-size: 40px, font-weight: 700, letter-spacing: -0.02em
Card H3:          font-size: 16px, font-weight: 600
Body:             font-size: 16-18px, font-weight: 400, line-height: 1.6, color: gray-500
Label badge:      font-size: 12px, font-weight: 500, letter-spacing: 0.05em, uppercase
```

### Animaciones (framer-motion)
```
fadeInUp:         opacity 0→1 + y 20→0, duration 0.5s, easing easeOut
staggerChildren: delayChildren 0.1s, staggerChildren 0.08s
hoverScale:       scale 1.02, transition spring stiffness 400
cardHover:        y -4px, shadow increase, transition 0.2s
navbarScroll:     blur aumenta + shadow aparece al hacer scroll
```

### Glassmorphism
- Navbar: `bg-white/80 backdrop-blur-xl border-b border-white/20`
- Feature cards: `bg-white border border-gray-100 hover:border-indigo-200/50` + sutil `shadow-sm hover:shadow-md`
- Pill badge hero: `bg-white border border-gray-200 shadow-sm` (no color sólido)

---

## Estructura de Archivos Final

```
app/components/landing/
├── LandingHeader.tsx        ← Reescribir completo (client component)
├── LandingPage.tsx          ← Reescribir completo (combina secciones)
├── LandingFooter.tsx        ← Reescribir completo
└── ui/
    ├── AnimatedSection.tsx  ← Wrapper reutilizable fadeInUp on scroll
    └── FeatureCard.tsx      ← Card con hover animation
```

---

## Tareas de Implementación

### Paso 1: Instalar framer-motion
```bash
cd app && npm install framer-motion
```
Validar que no haya conflictos con React 19.

---

### Paso 2: Crear `AnimatedSection.tsx`
Archivo: `app/components/landing/ui/AnimatedSection.tsx`

Client component que usa `useInView` + `motion.div` para animar al entrar en viewport:
```tsx
'use client'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
  delay?: number
}

// fadeInUp variant: opacity 0→1, y 24→0, duration 0.5, delay opcional
// useInView con once: true, margin: "-80px"
```

---

### Paso 3: Crear `FeatureCard.tsx`
Archivo: `app/components/landing/ui/FeatureCard.tsx`

Client component con hover animation via framer-motion:
```tsx
'use client'
import { motion } from 'framer-motion'

interface Props {
  icon: string
  title: string
  description: string
  index: number // para stagger delay
}

// whileHover: { y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }
// initial: { opacity: 0, y: 20 }
// animate: { opacity: 1, y: 0 }
// transition: { delay: index * 0.08 }
```

---

### Paso 4: Reescribir `LandingHeader.tsx`
Archivo: `app/components/landing/LandingHeader.tsx` — **Client Component**

Cambios clave:
- Usar `useScroll` de framer-motion para detectar scroll
- `useMotionValueEvent` para cambiar el estilo de la navbar al bajar
  - Sin scroll: `bg-transparent border-transparent`
  - Con scroll (>20px): `bg-white/80 backdrop-blur-xl border-gray-100/80 shadow-sm`
- Transición suave de 0.3s
- Logo: texto "CValleTienda" en negro con punto indigo o gradiente sutil
- Botón "Empezar gratis": rounded-full, fondo negro (#0A0A0A), texto blanco, hover scale(1.02)
- Botón "Ingresar": texto gris, hover text negro, sin fondo

Estructura del header:
```
[Logo] ................ [Ingresar] [Empezar gratis ▸]
```

---

### Paso 5: Reescribir `LandingPage.tsx` — Secciones

**Sección 1: HERO** (`pt-36 pb-28`)

Layout: centrado, máx 860px
- **Badge pill** (top): sin color sólido → `border border-gray-200 bg-white shadow-sm text-gray-600 text-xs uppercase tracking-wider` + punto verde pulsante "● AFIP incluido"
- **H1** (grande y audaz): 
  ```
  El sistema que tu
  negocio necesita.
  ```
  - Font 64px desktop / 40px mobile, font-weight 700, letter-spacing -0.03em, color #0A0A0A
  - Sin negritas de color en el título para mantener limpieza
- **Subtítulo**: 18px, gray-500, max-w-xl, line-height 1.6
  ```
  POS · Stock · Caja · CRM · Factura electrónica AFIP
  Todo en un sistema. Sin complicaciones.
  ```
- **CTAs**:
  - Primario: `Empezar gratis →` — fondo #0A0A0A, blanco, rounded-full, h-12, px-8, hover scale(1.02)
  - Secundario: `Ver demo` — border gray-200, bg-white, rounded-full, hover bg-gray-50
- **Prueba social** (bajo CTAs): `Sin tarjeta de crédito · Primer mes gratis · Configuración en 5 minutos`
- **Gradiente bg**: radial-gradient muy sutil centrado detrás del texto (indigo/violet extremadamente tenue, ~5% opacity)

Animación: `motion.div` fadeInUp staggerado: badge → h1 → subtítulo → CTAs (cada uno 0.1s después)

---

**Sección 2: FEATURES** (`py-28`)

- Título sección: H2 pequeño uppercase label gris ("FUNCIONALIDADES"), luego H2 grande
- Grid: 2 columnas en tablet, 4 columnas en desktop para los 8 features
- Cada `FeatureCard`:
  - Sin emoji grande → usar **icono SVG monoline** (5 iconos inline como componente, o usar caracteres unicode clean)
  - Fondo blanco, borde gray-100, padding 24px
  - Hover: border-indigo-200, shadow-md, y -4px (motion)
  - Iconos: pequeños (20px), color indigo-600, en un cuadrado gris-50 de 36px
  - Título: 15px semibold negro
  - Descripción: 13px gray-500 line-height 1.5
- Animación: `AnimatedSection` con stagger en el grid

Lista final de features (mantener las 8 existentes, mejorar redacción):
```
Punto de Venta | Stock | Caja | Facturación AFIP | Clientes | Dashboard | Devoluciones | Remitos
```

---

**Sección 3: AFIP HIGHLIGHT** (`py-20`)

Cambio total de estilo: ya no fondo indigo sólido.
→ **Estilo:** fondo `#FAFAFA`, borde `border border-gray-100`, rounded-3xl, padding generoso, centrado
→ Layout horizontal: izquierda = texto, derecha = lista de checkmarks
- H2: "Factura electrónica lista el primer día"
- Descripción: breve, 2 líneas máx
- Checkmarks: 4 items con `✓` en verde, texto gris oscuro
- Sin colores de fondo fuertes → mantiene limpieza visual

Animación: `AnimatedSection` fadeInUp

---

**Sección 4: RUBROS** (`py-20`)

- Layout: centrado, lista horizontal de pills
- Pills: border gray-200, bg-white, rounded-full, texto gray-600, hover border-indigo-300 hover:text-indigo-600
- Título: simple, gris claro, no tan prominente
- Animación: stagger fadeIn de cada pill

---

**Sección 5: SOCIAL PROOF / STATS** (nueva)

Agregar entre AFIP y rubros:
```
┌─────────────┬─────────────┬─────────────┐
│  +100       │  99.9%      │  < 5 min    │
│  Ventas/día │  Uptime     │  Setup      │
└─────────────┴─────────────┴─────────────┘
```
- Números grandes negros, labels grises pequeños
- Separadores verticales border-gray-100
- Animación: countUp sutil (opcional, si framer-motion lo soporta fácil con `motion.span`)

---

**Sección 6: CTA FINAL** (`py-28`)

- Fondo: gradiente sutil indigo radial, muy tenue (como el hero, espejado)
- H2: "Empezá hoy. Es gratis el primer mes."
- 1 solo CTA primario centrado: "Crear cuenta gratis →"
- Debajo: "¿Preguntas? Escribinos →" (link WhatsApp)
- No incluir precios en la landing, mantener foco en conversión

---

### Paso 6: Reescribir `LandingFooter.tsx`

Nuevo diseño: fondo blanco, borde top gray-100 — ya no fondo oscuro.
Razón: el fondo negro del footer actual choca con el estilo light/clean deseado.

Layout:
```
[Logo + tagline]        [Nav links]        [Legal]
CValleTienda            Ingresar
Sistema POS para        Crear cuenta
comercios argentinos    Términos
```

- 3 columnas en desktop, stacked en mobile
- Texto gray-400/500 pequeño
- Copyright en fila inferior, border-top

---

### Paso 7: Validación y errores

Después de implementar:
1. `get_errors` en todos los archivos nuevos
2. Verificar que no haya errores de TypeScript
3. Confirmar que las animaciones no rompan SSR (todos los componentes animados deben ser `'use client'`)
4. Verificar que `LandingPage.tsx` pueda ser importado desde `app/page.tsx` (que es Server Component)

---

## Orden de Ejecución

1. `npm install framer-motion` en `app/`
2. Crear `app/components/landing/ui/AnimatedSection.tsx`
3. Crear `app/components/landing/ui/FeatureCard.tsx`
4. Reescribir `LandingHeader.tsx`
5. Reescribir `LandingPage.tsx`
6. Reescribir `LandingFooter.tsx`
7. `get_errors` → corregir errores
8. Verificar que `app/page.tsx` siga funcionando

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| framer-motion + React 19 incompatibilidad | Instalar `framer-motion@latest` que soporta React 19. Si falla, usar `framer-motion@11` |
| `useScroll` en header rompe SSR | Header marcado como `'use client'` — OK |
| Animaciones bloquean LCP | Usar `initial={false}` cuando corresponda, animaciones solo para elementos below-the-fold |
| Tailwind v4 y clases personalizadas | Usar solo utilidades estándar de Tailwind, no custom plugins |

---

## Notas Adicionales

- **No usar dark mode** en la landing — siempre blanco puro
- **No modificar** `app/app/globals.css` ni `app/app/layout.tsx`
- **Mantener** los mismos textos de copywriting del diseño actual, solo mejorar diseño
- **WhatsApp URL**: usar `https://wa.me/5492984000000` placeholder (igual que hoy)
- El componente `LandingPage` se exporta como named export: `export function LandingPage()`
- Los componentes `ui/AnimatedSection` y `ui/FeatureCard` como named exports también
