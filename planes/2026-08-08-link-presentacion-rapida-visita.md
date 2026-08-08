# Plan: Link de presentación rápida en local (pitch de visita)

**Creado:** 2026-08-08  
**Estado:** Implementado  
**Pedido:** Crear un link/página de presentación rápida (~16 puntos clave), visualmente atractiva, para mostrar en la primera visita al local antes de la demo completa del sistema.

---

## Descripción General

### Qué Logra Este Plan

Entrega una **URL pública compartible** (ej. `https://[dominio]/presentacion`) con una experiencia tipo pitch deck: máximo **16 puntos clave** de lo que hace CValleTienda, optimizada para celular/tablet en el mostrador. Sirve como “teaser” en la primera visita; la cita posterior es donde se muestra el sistema en vivo.

### Por Qué Importa

La prioridad estratégica es **conseguir clientes pagos locales**. Hoy existe PDF comercial largo y landing de marketing, pero falta una pieza **corta, móvil y narrativa** para abrir la puerta en 3–5 minutos sin saturar. Un link evita PDFs desactualizados en el teléfono y proyecta profesionalismo (CloudValle / CValleTienda) en el momento de la visita.

---

## Estado Actual

### Estructura Existente Relevante

| Recurso | Rol |
| ------- | --- |
| `app/app/page.tsx` + `components/landing/LandingPage.tsx` | Landing marketing larga (features, CTA registro). Demasiado densa para visita rápida. |
| `app/app/(public)/*` | Rutas públicas legales con Header+Footer de landing. |
| `salidas/2026-08-08-presentacion-comercial-*.{html,pdf}` | Propuesta comercial completa (precios Básico/Pro, onboarding). Ideal para enviar después, no para pitch in-situ. |
| `app/lib/planes/config.ts` | Fuente de verdad módulos Básico vs Pro + precios ($45k / $65k / onboarding $150k). |
| `contexto/info-negocio.md` | Módulos y tagline del producto. |
| `referencia/design-system-v2.md` + tokens en `globals.css` | Identidad visual (lime/negro, primitives). |
| `salidas/logo-cloudvalle.png` | Marca visual CloudValle para cabecera del pitch. |
| `salidas/capturas/*.png` | Screenshots opcionales (POS, caja, gráficos) si caben sin saturar. |

### Brechas o Problemas que se Abordan

1. No hay una URL corta pensada para **mostrar en el local** (vertical, swipeable, 3–5 min).
2. La landing vende registro online; el PDF vende cotización — falta el **medio**: “esto es lo que podés hacer” antes de la demo.
3. Riesgo de improvisar con WhatsApp/fotos sueltas; sin guion visual consistente.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear ruta pública `/presentacion` en la app Next.js, **sin auth**.
- Layout inmersivo propio (sin LandingHeader/Footer densos): full-viewport slides.
- Contenido fijo: **16 puntos** + portada + cierre CTA.
- Visual premium (design system v2 + motion ligero), mobile-first, usable en landscape tablet.
- CTA final: WhatsApp para agendar cita de demo + contacto mail.
- Precios Básico/Pro en 1 slide de cierre (soft sell).
- No reemplaza el PDF comercial; lo complementa.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/app/(pitch)/presentacion/page.tsx` | Entry de la ruta `/presentacion` (metadata, noindex). |
| `app/app/(pitch)/layout.tsx` | Layout mínimo full-bleed sin header/footer de landing. |
| `app/components/pitch/PitchDeck.tsx` | Client component: slides, swipe/teclado/botones, dots. |
| `app/components/pitch/pitch-content.ts` | Array de ≤16 puntos (título, cuerpo, ícono, badge plan). |
| `app/components/pitch/PitchSlide.tsx` | Presentational de una slide. |
| `app/public/logo-cloudvalle.png` | Logo estático para la portada. |
| `salidas/2026-08-08-pitch-visita-brief.md` | Brief interno: guion de visita + 16 puntos + URL. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `contexto/estrategia.md` | Anotar pieza: link `/presentacion` para primera visita. |
| Middleware auth (si aplica) | Whitelist `/presentacion` si hoy redirige a login. |
| `CLAUDE.md` | Opcional: una línea del flujo comercial. |

### Archivos a Eliminar (si aplica)

Ninguno. No enlazar en el nav público de la landing (el link se comparte por WhatsApp).

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Formato: deck full-screen (slides), no landing scrolleable.** En el local se muestra de a una idea; swipe o flechas.
2. **Cupo:** 1 portada + **16 puntos** + 1 cierre CTA (precios + contacto).
3. **Ruta:** `/presentacion` — corta y fácil de pegar. `robots: noindex`.
4. **Pública, sin login.** Sin datos de tenant.
5. **Mobile-first + tablet.** Tipografía grande, contraste alto, targets ≥44px.
6. **Marca:** CValleTienda + logo CloudValle; tokens v2. Sin looks genéricos IA.
7. **Precios en cierre:** Básico $45.000 / Pro $65.000 / instalación $150.000 vía `PRECIOS` de config. Hardware aparte en tip.
8. **Badge Pro** en módulos exclusivos (remitos, devoluciones, CRM completo, AFIP, diseñador, CSV).
9. **CTA WhatsApp** `wa.me/5492996587715` con texto prearmado para agendar demo.
10. **Grupo `(pitch)`** separado de `(public)` para no heredar Header/Footer legales.

### Alternativas Consideradas

| Alternativa | Por qué se descartó |
| ----------- | ------------------- |
| Solo PDF corto | No es link vivo; peor en celular. |
| Reusar LandingPage | Scroll/marketing; no controla el ritmo. |
| HTML estático en `salidas/` | Fuera del dominio de producción. |
| Screenshots en las 16 slides | Saturation en móvil; v1 con íconos + tipografía. |

### Preguntas Abiertas (si las hay)

1. **¿Dominio de producción exacto** para documentar la URL absoluta?
2. **¿Incluir precios en el pitch** o solo capacidades? → Default: **sí, 1 slide al final**.
3. **¿Logo CloudValle** en todas las slides o solo portada/cierre? → Default: portada + cierre.
4. **¿Alias `/visita`?** → Default: solo `/presentacion`.

> Si no hay respuesta antes de `/implementar`, usar defaults.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Brief interno + lista definitiva de 16 puntos

Crear `salidas/2026-08-08-pitch-visita-brief.md` con el guion de visita (3–5 min) y los 16 puntos.

**Los 16 puntos (copy a usar):**

| # | Título | Una línea | Plan |
| - | ------ | --------- | ---- |
| 1 | POS con scanner | Cobrás en segundos con código de barras | Ambos |
| 2 | Multi-pago | Efectivo, débito, QR y cuenta corriente en la misma venta | Ambos |
| 3 | Tickets con tu marca | Logo, datos del local e impresión térmica automática | Ambos |
| 4 | Caja y turnos | Apertura, movimientos y cierre que cierran con el efectivo | Ambos |
| 5 | Stock por variantes | Talle, color u otros atributos según tu rubro | Ambos |
| 6 | Alertas de stock bajo | Sabés qué reponer antes de quedarte sin mercadería | Ambos |
| 7 | Etiquetas y códigos | Generás e imprimís etiquetas para góndola/mostrador | Básico plantilla / Pro diseñador |
| 8 | Clientes | Buscá al cliente en el POS; historial y CC en Pro | Ambos / Pro+ |
| 9 | Dashboard del día | Ventas, ganancia bruta y lo que más se mueve | Ambos |
| 10 | Reportes y gráficos | Visión del mes para decidir con números | Ambos |
| 11 | Devoluciones | Parcial o total, con stock que vuelve solo | Pro |
| 12 | Remitos A4 | Entregas y envíos con documento profesional | Pro |
| 13 | Factura AFIP | Emisión desde el POS (TusFacturas aparte) | Pro |
| 14 | Multi-rubro | Ropa, despensa, ferretería y más — mismo sistema | Ambos |
| 15 | PrintBridge | Impresión local sin diálogos raros del navegador | Ambos |
| 16 | Arranque acompañado | Instalación, 3 capacitaciones y 20 productos cargados | Comercial |

**Guion sugerido:** Portada (10s) → 1–10 operación (2–3 min) → 11–13 Pro (45s) → 14–15 diferencial (30s) → 16 + precios + CTA (45s).

**Archivos afectados:**

- `salidas/2026-08-08-pitch-visita-brief.md`

---

### Paso 2: Layout de ruta `(pitch)`

**Acciones:**

- Crear `app/app/(pitch)/layout.tsx`: `min-h-dvh`, sin Header/Footer.
- Crear `app/app/(pitch)/presentacion/page.tsx` con metadata `noindex` y `<PitchDeck />`.
- Revisar middleware: `/presentacion` debe ser pública.

**Archivos afectados:**

- `app/app/(pitch)/layout.tsx`
- `app/app/(pitch)/presentacion/page.tsx`
- middleware (solo si hace falta)

---

### Paso 3: Contenido tipado `pitch-content.ts`

**Acciones:**

- Exportar portada + 16 puntos + cierre.
- Cada punto: `{ id, number, title, body, plan: 'ambos' | 'pro' | 'comercial', iconKey }`.
- Cierre importa `PRECIOS` y `PRECIO_ONBOARDING` desde `@/lib/planes/config`.
- Contacto: WhatsApp `2996587715`, mail `santiagoalvarezz.dev@gmail.com`.

**Archivos afectados:**

- `app/components/pitch/pitch-content.ts`

---

### Paso 4: UI `PitchSlide` + `PitchDeck`

**Acciones:**

- `PitchSlide`: full viewport; número grande; título; body 1–2 líneas; badge Pro; atmósfera sutil con tokens brand.
- `PitchDeck` (client): índice, flechas, dots, teclado ←/→, swipe táctil, progress bar.
- Motion corto con Framer Motion (ya en landing); 2–3 gestos, sin ruido.
- Accesibilidad: roles carousel, labels, contraste AA.
- Copiar `salidas/logo-cloudvalle.png` → `app/public/logo-cloudvalle.png`.

**Archivos afectados:**

- `app/components/pitch/PitchSlide.tsx`
- `app/components/pitch/PitchDeck.tsx`
- `app/public/logo-cloudvalle.png`

---

### Paso 5: Slide de cierre (precios + CTA)

**Contenido:**

- Básico **$45.000**/mes · Pro **$65.000**/mes
- Instalación **$150.000** (3×1h + 20 productos)
- Máquinas aparte (una línea)
- Botón WhatsApp primario + mail
- Copy: “En la próxima cita te muestro el sistema funcionando en tu rubro.”

**Archivos afectados:**

- Cierre en `pitch-content.ts` / `PitchDeck.tsx`

---

### Paso 6: Validar y documentar

**Acciones:**

- Probar `/presentacion` sin sesión en ~390px y tablet.
- Confirmar precios = config; `noindex`; CTA WhatsApp.
- Actualizar `contexto/estrategia.md`.
- Marcar este plan como Implementado + Notas de Implementación.

**Archivos afectados:**

- `contexto/estrategia.md`
- `planes/2026-08-08-link-presentacion-rapida-visita.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/planes/config.ts` — precios y features Pro
- `salidas/2026-08-08-presentacion-comercial-*` — cotización post-visita
- Landing — convive, no depende

### Actualizaciones Necesarias para Consistencia

- Si cambian `PRECIOS` / onboarding, el cierre del pitch se actualiza vía import.
- PDF y pitch deben contar la misma historia Básico vs Pro.

### Impacto en Flujos de Trabajo Existentes

- Flujo nuevo: visita → `/presentacion` → agendar demo → enviar PDF.
- No afecta dashboard, POS ni migraciones.
- Skills: `senior-frontend` + design-system-v2 / `ui-ux-pro-max`.

---

## Lista de Validación

Cómo verificar que la implementación está completa y correcta:

- [x] Existe URL pública `/presentacion` sin login
- [x] Layout full-bleed sin header/footer de landing
- [x] ≤16 puntos de producto/valor numerados
- [x] Portada + cierre CTA presentes
- [x] Navegación: flechas, dots, teclado y swipe
- [x] Badges Pro donde corresponde
- [x] Precios alineados a `PRECIOS` / `PRECIO_ONBOARDING`
- [x] CTA WhatsApp con mensaje prearmado + mail
- [x] Logo CloudValle en portada
- [x] `robots: noindex`
- [x] Brief interno en `salidas/`
- [x] `contexto/estrategia.md` menciona la pieza
- [x] Plan marcado Implementado

---

## Criterios de Éxito

La implementación está completa cuando:

1. Se puede abrir el link en el celular en el local y recorrer el pitch en ≤5 minutos.
2. Un dueño entiende qué hace el sistema y cómo agendar la demo, sin ver el panel real.
3. Los 16 puntos y precios coinciden con el producto y la grilla comercial vigente.
4. La pieza se siente premium (marca lime/negro, tipografía clara, motion contenido).

---

## Notas

- No mezclar con `/design` (showcase interno).
- v2 posible: `?slide=7`, capturas por rubro, alias `/visita`.
- Evitar video autoplay en v1.
- Documentar path `/presentacion`; completar URL absoluta al conocer el dominio de prod.

---

## Notas de Implementación

**Implementado:** 2026-08-08

### Resumen

Ruta pública `/presentacion` con deck full-viewport (portada + 16 puntos + cierre). Middleware whitelist. Precios desde `lib/planes/config`. CTA WhatsApp prearmado. Brief y estrategia actualizados. `tsc --noEmit` OK.

### Desviaciones del Plan

- CLAUDE.md no tocado (flujo comercial ya documentado en estrategia + brief).
- Dots de 18 slides con `flex-wrap` (pueden verse densos en móviles muy chicos; progress bar compensa).

### Problemas Encontrados

Ninguno bloqueante.
