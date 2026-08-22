# Plan: UX/UI completa del catálogo público (navegación, carrito, checkout, responsive)

**Creado:** 2026-08-22
**Estado:** Implementado
**Pedido:** Perfeccionar UX/UI de todo el catálogo (grilla, ficha, carrito, checkout) en todos los dispositivos y arreglar la navegación: hoy al agregar un ítem te saca al carrito y no podés seguir cargando.

---

## Descripción General

### Qué Logra Este Plan

El visitante arma el pedido **sin salir del catálogo**: agrega, ve el badge y una barra “Ver pedido”, y sigue mirando productos. Carrito, checkout y ficha se ven y se tocan bien en celular, tablet y desktop (targets 44px, safe-area, inputs ≥16px). Hay un camino claro: catálogo → ficha → (seguir) → pedido → datos → WhatsApp.

### Por Qué Importa

El catálogo es el canal B2B/B2C de la distribuidora (WhatsApp, sin registro). Si cada “Agregar” te expulsa al carrito, el pedido queda corto y el local pierde líneas. Una vitrina fluida en el celular del cliente es la diferencia entre un fardo y una carga completa.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivos | Qué hay |
| ---- | -------- | ------- |
| Layout | `app/app/(catalogo)/layout.tsx` | Solo `min-h-screen`. Sin Toaster, sin safe-area, sin shell. |
| Páginas | `app/app/(catalogo)/c/[slug]/{page,p/[productoId],carrito,checkout,pedido-enviado}` | Cada una **repite** `CatalogoHeader` + `<main>`. |
| Header | `CatalogoHeader.tsx` + `CatalogoCartBadge.tsx` | Logo + nombre + ícono bolsa. Sin “atrás”, sin total. |
| Grilla | `CatalogoGrilla.tsx` | 2 cols mobile / 3 sm+. Cards 4:5. Sin búsqueda. |
| Ficha | `CatalogoFicha.tsx` | Packs/unidad, tramos, dto. **`router.push(/carrito)` al agregar** (línea ~82). |
| Carrito | `CatalogoCarrito.tsx` | Qty = `<input type="number">`. Sin “Seguir comprando” si hay ítems. CTA “Continuar” no sticky. |
| Checkout | `CatalogoCheckout.tsx` | Formulario nombre/WA/entrega. **No lista ítems**. Sin sticky submit. |
| Enviado | `CatalogoPedidoEnviado.tsx` | Texto + WhatsApp. |
| Tokens | `globals.css`, `components/ui/` | Design system v2. `Drawer` ya tiene `side="bottom"`. Sonner en dashboard, **no** en catálogo. |

Flujo hoy: Grilla → Ficha → **Agregar = navegar a /carrito** → atrás (historial) o logo → otra ficha → otra vez al carrito.

### Brechas o Problemas que se Abordan

1. **Navegación rota para “seguir pidiendo”**: el push al carrito es el bug que describís.
2. En el carrito no hay CTA fuerte de “Seguir comprando” (solo el logo del header).
3. Qty numérica en mobile: teclado, zoom iOS si font <16px, fácil errar.
4. Checkout ciego: no ves qué pediste ni podés volver al carrito con un botón.
5. Sin barra inferior en mobile: para ver el pedido hay que ir al ícono de 40px arriba a la derecha.
6. Header duplicado; ficha sin “Volver al catálogo”.
7. Sin `env(safe-area-inset-*)`: el home indicator de iPhone tapa CTAs.
8. Grilla sin filtro: catálogo de distribuidora con muchos SKUs se hace eterno.
9. `text-[11px]` en captions viola la regla del DS (cuerpo mínimo `text-sm`; captions `text-xs`).

---

## Cambios Propuestos

### Resumen de Cambios

- **Al agregar: quedarse en la ficha.** Toast “Agregado” + badge. No `router.push` al carrito.
- **Barra sticky inferior** (mobile/tablet) cuando hay ítems: “Ver pedido · N · $total”.
- **Carrito de página** como revisión: steppers +/−, “Seguir comprando”, CTA sticky “Continuar”.
- **Checkout**: resumen de líneas + total + “Volver al pedido” + submit sticky.
- **Shell compartido** (`CatalogoShell`): header + main con padding-bottom para la barra + safe-area.
- **Ficha**: link “Catálogo” atrás; botones Agregar (primario) y “Ver pedido” (secundario, si hay qty).
- **Grilla**: buscador client-side por nombre; cards un poco más compactas en mobile; precio + packs visibles.
- Toaster de Sonner en el layout del catálogo.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/components/catalogo-publico/CatalogoShell.tsx` | Header + `<main>` + `CatalogoBarraPedido`. Recibe `tienda`, `slug`, `children`. |
| `app/components/catalogo-publico/CatalogoBarraPedido.tsx` | Client. Sticky bottom si `qty > 0`. Link a `/carrito`. Safe-area. |
| `app/components/catalogo-publico/CatalogoQtyStepper.tsx` | Botones − / + y número (min 44px). Reuso en carrito. |
| `app/components/catalogo-publico/CatalogoBuscador.tsx` | Input de filtro sobre la grilla (client). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `CatalogoFicha.tsx` | Quitar `router.push`. Toast. Quedarse. Link atrás. “Ver pedido” secundario. |
| `CatalogoCarrito.tsx` | Stepper; “Seguir comprando” → `/c/{slug}`; footer sticky Continuar + total. |
| `CatalogoCheckout.tsx` | Lista compacta de ítems; link al carrito; submit sticky; recosteo visible. |
| `CatalogoHeader.tsx` | Target 44px en bolsa; opcional back (`showBack`) en ficha/carrito/checkout. |
| `CatalogoGrilla.tsx` | Integra buscador; empty state si el filtro no pega; captions `text-xs`. |
| `CatalogoPedidoEnviado.tsx` | Aire, botones DS, safe-area. |
| Páginas `c/[slug]/*` | Usar `CatalogoShell` en vez de Header+main sueltos. |
| `app/app/(catalogo)/layout.tsx` | `<Toaster />` + `pb-[env(safe-area-inset-bottom)]` en el wrapper. |
| `referencia/catalogo-publico.md` | Flujo: agregar no saca de la ficha; barra Ver pedido. |
| `CLAUDE.md` | Una línea: catálogo stay-on-add + barra sticky. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Stay-on-add, no drawer de carrito en v1.** El drawer (`side="bottom"`) es tentador, pero el pedido del piloto es “seguir agregando”. Quedarse + toast + barra + página `/carrito` para revisar es menos superficie y cubre el pain. El ícono de bolsa sigue yendo a `/carrito`.
2. **Un solo carrito de página**, no un mini-carrito distinto. `CatalogoCarrito` se reusa; la barra solo navega.
3. **No hay pago online** (sigue igual). Checkout = datos + WhatsApp.
4. **Buscador solo client-side** sobre la lista ya cargada. Sin API nueva.
5. **Tokens y primitives** (`Button`, `Input`, `Drawer` no hace falta). Nada de `gray-*` / hex de marca.
6. **Safe-area** en header (notch) y barras inferiores.
7. **Inputs qty ≥16px** en mobile (stepper evita el teclado).

### Alternativas Consideradas

- **Seguir mandando al carrito** + botón Seguir: no resuelve el “tengo que volver atrás” en cada ítem.
- **Drawer al agregar**: interrumpe igual (aunque menos). Queda como mejora futura.
- **Agregar desde la grilla (sin ficha)**: peligroso con packs/variantes. La ficha se queda para elegir unidad/pack.

### Preguntas Abiertas (si las hay)

1. ¿Confirmás **quedarse en la ficha** al agregar (recomendado)? Si preferís un cajón inferior con el pedido, decilo antes de `/implementar`.

Si no hay respuesta, `/implementar` usa stay-on-add + toast + barra sticky.

---

## Tareas Paso a Paso

### Paso 1: Shell + Toaster + safe-area

**Acciones:**

- `CatalogoShell`: sticky header (ya lo es) + `main` con `px-4 py-6 max-w-5xl` (o `max-w-lg` vía prop `narrow` para carrito/checkout/enviado) + `pb-24` si hay barra.
- Layout catálogo: montar `<Toaster position="top-center" />` (Sonner ya está en el proyecto).
- Header: `min-h-14` → touch 44px en el link del carrito; `pt-[env(safe-area-inset-top)]` en el header.

**Archivos afectados:**

- `CatalogoShell.tsx` (nuevo)
- `layout.tsx` del grupo `(catalogo)`
- `CatalogoHeader.tsx`
- las 5 páginas `c/[slug]/*`

### Paso 2: Navegación al agregar (el fix principal)

**Acciones:**

- En `CatalogoFicha.agregar`: **borrar** `router.push(...)`.
- `toast.success('Agregado al pedido')` (Sonner).
- Link texto “← Catálogo” arriba de la ficha (`href=/c/{slug}`).
- Si el carrito tiene ítems, botón secundario “Ver pedido” al lado/abajo de Agregar (no reemplaza Agregar).
- Quitar `useRouter` si queda sin uso.

**Archivos afectados:**

- `CatalogoFicha.tsx`

### Paso 3: Barra sticky “Ver pedido”

**Acciones:**

- Client component que lee el carrito (mismo evento `cvalle-cat-cart` que el badge).
- Visible si `qty > 0` y **no** está en `/carrito`, `/checkout` ni `/pedido-enviado` (detectar con `usePathname`).
- Contenido: “Ver pedido” + `{n} {n===1?'ítem':'ítems'}` + `formatARS(total)`.
- Link a `/c/{slug}/carrito`.
- `fixed bottom-0 inset-x-0 z-20`, `pb-[max(0.75rem,env(safe-area-inset-bottom))]`, `bg-surface/95 backdrop-blur`, borde top, `max-w-5xl mx-auto`.
- En desktop también se ve (útil); altura no tapa el footer de la grilla gracias al `pb-24` del shell.

**Archivos afectados:**

- `CatalogoBarraPedido.tsx`
- `CatalogoShell.tsx`

### Paso 4: Carrito usable en el celular

**Acciones:**

- Reemplazar el input number por `CatalogoQtyStepper` (min 1, max `MAX_QTY_LINEA`). Recostea tramos al cambiar.
- Foto 64–72px, nombre 2 líneas, pack/dto `text-xs`.
- Botón “Seguir comprando” (`LinkButton` secondary) → `/c/{slug}` **siempre** que haya ítems.
- Bloque sticky inferior: total + “Continuar” full width (checkout).
- Vacío: copy + “Ver catálogo” (ya existe).

**Archivos afectados:**

- `CatalogoQtyStepper.tsx`
- `CatalogoCarrito.tsx`

### Paso 5: Checkout con resumen

**Acciones:**

- Encima del form: lista compacta (nombre, qty, subtotal) + total. Link “Editar pedido” → `/carrito`.
- Submit sticky en mobile (mismo patrón que el carrito).
- `Input` ya tiene labels; asegurar `text-base` en mobile si el primitive no lo hace (evitar zoom iOS en teléfono).
- No tocar la API POST ni el honeypot `website`.

**Archivos afectados:**

- `CatalogoCheckout.tsx`

### Paso 6: Grilla + buscador + ficha polish

**Acciones:**

- `CatalogoBuscador`: filtra `nombre` (y opcionalmente “pack”) en cliente. Debounce 150ms. Placeholder “Buscar producto…”.
- Grilla: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`; gap un poco más chico en 360px; título `line-clamp-2`; “Desde $X” si hay packs (precio min entre unidad y packs).
- Empty filtro: “No hay productos con ‘…’. Limpiar búsqueda.”
- Ficha: imagen `aspect-square` en mobile / `4/5` desde `sm` (menos scroll antes de los botones). CTA Agregar `w-full` y sticky **dentro de la columna** en mobile (debajo de qty) — no fixed, para no pelear con la barra Ver pedido. Si ambas aparecen, la barra Ver pedido queda abajo y Agregar va justo encima del fold; si no entra, el usuario scrollea 1 gesto. Preferir: Agregar no sticky si hay barra; la barra ya lleva a revisar.

**Archivos afectados:**

- `CatalogoBuscador.tsx`, `CatalogoGrilla.tsx`, `CatalogoFicha.tsx`

### Paso 7: Pedido enviado + docs

**Acciones:**

- Página enviada: padding generoso, botones `w-full` max-w-sm, “Volver al catálogo” como `LinkButton`.
- Actualizar `referencia/catalogo-publico.md` (flujo de armado).
- `CLAUDE.md`: catálogo stay-on-add + barra + buscador.

**Archivos afectados:**

- `CatalogoPedidoEnviado.tsx`, `referencia/catalogo-publico.md`, `CLAUDE.md`

### Paso 8: Validación responsive

**Acciones:**

- Recorrer a 360, 390, 768, 1280: grilla, ficha (unidad+pack), agregar 2 productos sin ir al carrito, barra, carrito stepper, checkout, enviado.
- Verificar que el home indicator no tape “Continuar” / “Enviar”.
- Verificar toast + badge al agregar.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `lib/catalogo/carrito.ts` — no cambia el contrato; solo más lecturas.
- POST `/api/catalogo/[slug]/pedido` — no se toca (salvo que el checkout mande lo mismo).
- Design system: `Button`, `Input`, `LinkButton`, toast Sonner.

### Actualizaciones Necesarias para Consistencia

- Spec `referencia/catalogo-publico.md`.
- `CLAUDE.md` fila Catálogo público.

### Impacto en Flujos de Trabajo Existentes

- El inbox `/pedidos` y la conversión a venta **no cambian**.
- El cliente deja de “perderse” en el carrito a mitad de carga.

---

## Lista de Validación

- [x] Agregar Coca unidad y Pack x8 **sin salir** de la ficha; badge y toast se actualizan.
- [x] Barra “Ver pedido” aparece en grilla y ficha; **no** en carrito/checkout/enviado.
- [x] “Seguir comprando” vuelve a `/c/{slug}` y el carrito sigue intacto.
- [x] Stepper +/− recostea tramos (dto visible).
- [x] Checkout muestra las líneas y deja editar el pedido.
- [x] Buscador filtra; vaciar muestra de nuevo la grilla.
- [x] 360px: nada tapado por notch/home indicator; tap targets ≥44px en CTAs.
- [x] Tokens semánticos; sin `gray-*` / hex de marca.
- [x] `CLAUDE.md` + `referencia/catalogo-publico.md` al día.

---

## Criterios de Éxito

1. Un cliente puede cargar 5 productos distintos sin pulsar “atrás”.
2. En el celular se entiende siempre dónde está el pedido (badge + barra + página).
3. Checkout no es un salto a ciegas: se ve el resumen y se puede volver.

---

## Notas

- No rediseñar tickets/remitos.
- No agregar pago Mercado Pago en este plan.
- Drawer de carrito queda como follow-up si el stay-on-add no alcanza.
- Toaster: el dashboard ya usa Sonner; en catálogo montar uno propio en el layout del grupo para no depender del shell del CRM.

---

## Notas de Implementación

**Implementado:** 2026-08-22

### Resumen

Stay-on-add (toast Sonner, sin `router.push`), shell compartido, barra sticky «Ver pedido», stepper +/− en ficha y carrito, checkout con resumen + Editar pedido, buscador client-side, safe-area y CTAs sticky. `tsc --noEmit` OK.

### Desviaciones del Plan

- Ficha también usa `CatalogoQtyStepper` (el plan lo pedía solo en carrito; evita el input number en mobile).
- Checkout vacío muestra empty state (no el form) para no enviar un pedido sin ítems.
- `contexto/proyectos.md` actualizado además de CLAUDE + spec.

### Problemas Encontrados

Ninguno. Pregunta abierta (stay-on-add vs drawer) resuelta con el default del plan.
