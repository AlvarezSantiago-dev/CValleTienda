# Plan: Fix logotipos en tickets de venta y devolución

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Fix agregado de logotipos en los tickets, para verlos impresos y en las ventas/devoluciones.

---

## Descripción General

### Qué Logra Este Plan

Conecta el logo del negocio (subido en Configuración → Negocio) con los tickets de venta y devolución: el logo aparecerá en la vista previa de `/ventas/[id]` y `/devoluciones/[id]`, en la impresión automática del POS al cobrar, y al reimprimir desde esas pantallas. Respeta el toggle **"Mostrar logo en el ticket"** de Configuración → Ticket.

### Por Qué Importa

La UI ya promete esta funcionalidad (`TicketForm` tiene el checkbox `mostrar_logo` y `LogoUpload` permite subir el logo), pero el pipeline de impresión nunca lo usa. Los remitos y emails de cierre sí muestran logo; los tickets — el comprobante que el cliente recibe en mano — no. Eso genera confusión y hace que la personalización de marca no funcione en el flujo más visible del POS.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `tiendas.logo_url` | URL pública del logo en Supabase Storage (`logos/{tienda_id}/logo.{ext}`) |
| `configuracion_tienda.mostrar_logo` | Boolean (default `true`) — toggle en Configuración → Ticket |
| `app/app/api/logo/route.ts` | POST/DELETE para subir/eliminar logo → actualiza `tiendas.logo_url` |
| `app/components/configuracion/LogoUpload.tsx` | UI de subida (texto dice solo "remitos") |
| `app/components/configuracion/TicketForm.tsx` | Checkbox "Mostrar logo en el ticket" |
| `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql` | `build_payload_ticket_venta` y `_devolucion` — **no incluyen logo** |
| `app/lib/impresion/types.ts` | `TiendaPayload` — **sin `logo_url` ni `mostrar_logo`** |
| `app/components/impresion/TicketVentaRenderer.tsx` | Renderer venta — solo texto en cabecera |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Renderer devolución — solo texto en cabecera |
| `app/components/impresion/ValeCambioRenderer.tsx` | Vale de cambio — mismo payload venta, sin logo |
| `app/app/(dashboard)/ventas/[id]/page.tsx` | Vista previa con `TicketVentaRenderer` |
| `app/app/(dashboard)/devoluciones/[id]/page.tsx` | Vista previa con `TicketDevolucionRenderer` |
| `app/components/pos/POSContainer.tsx` | Impresión automática post-cobro con `TicketVentaRenderer` |
| `app/components/ventas/PrintButtonClient.tsx` | Reimpresión venta/devolución |
| `app/components/remitos/RemitoImprimible*.tsx` | **Referencia funcional** — ya renderizan `logoUrl` con `<Image unoptimized>` |
| `app/next.config.ts` | `remotePatterns` para `*.supabase.co/storage/...` — OK para Next Image |

### Brechas o Problemas que se Abordan

1. **Payload SQL incompleto:** `build_payload_ticket_venta` y `build_payload_ticket_devolucion` arman el objeto `tienda` con nombre, CUIT, textos, etc., pero **omitieron** `logo_url` (de `tiendas`) y `mostrar_logo` (de `configuracion_tienda`).

2. **Renderers sin logo:** `TicketVentaRenderer` y `TicketDevolucionRenderer` no tienen bloque de imagen en la cabecera.

3. **Expectativa rota en configuración:** El checkbox "Mostrar logo en el ticket" guarda en DB pero no tiene efecto visible.

4. **Copy desactualizado:** `LogoUpload` dice "Se mostrará en los remitos impresos" — no menciona tickets.

5. **PrintBridge (opcional):** Planes previos referencian `scripts/printbridge/src/renderer.js`, pero esa carpeta **no está en el repo**. Si el cliente usa PrintBridge externo, habrá que actualizarlo por separado (ver Preguntas Abiertas).

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva migración SQL que agrega `logo_url` y `mostrar_logo` al objeto `tienda` en ambos builders de payload.
- Actualizar `TiendaPayload` en TypeScript.
- Crear componente compartido `TicketEncabezado` (logo + datos fiscales) reutilizado en venta, devolución y vale.
- Actualizar copy de `LogoUpload` para incluir tickets.
- Validar impresión en pantalla (preview) y `window.print()`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260608100002_payload_tickets_logo.sql` | Agregar `logo_url` y `mostrar_logo` a builders SQL |
| `app/components/impresion/TicketEncabezado.tsx` | Cabecera compartida: logo condicional + razón social + datos fiscales |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/impresion/types.ts` | Agregar `logo_url?: string \| null` y `mostrar_logo?: boolean` a `TiendaPayload` |
| `app/components/impresion/TicketVentaRenderer.tsx` | Reemplazar bloque de cabecera manual por `<TicketEncabezado />` |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Idem |
| `app/components/impresion/ValeCambioRenderer.tsx` | Agregar logo en cabecera del vale (mismo criterio) |
| `app/components/configuracion/LogoUpload.tsx` | Actualizar texto de ayuda: remitos **y tickets** |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Logo en el payload SQL, no en query extra del renderer:** El ticket es un snapshot autocontenido (`build_payload_ticket_*`). Incluir `logo_url` y `mostrar_logo` en el JSON mantiene coherencia con remitos (que reciben `logoUrl` como prop) y evita N+1 en preview/impresión.

2. **Condición de render:** Mostrar logo solo si `mostrar_logo === true` **y** `logo_url` no es null/vacío. Si el toggle está activo pero no hay logo subido, no mostrar placeholder — el ticket queda como hoy (solo texto).

3. **`<img>` nativo en tickets, no Next `<Image>`:** Los tickets usan `fontFamily: monospace` y se imprimen vía portal/`window.print()`. El QR de factura ya usa `<img>` nativo. Para impresión térmica, `<img src={logo_url}>` con `display: block; margin: 0 auto` es más confiable que el optimizer de Next.

4. **Tamaño adaptativo al ancho del ticket:**
   - 58 mm → logo max ~40 px alto
   - 76/80 mm → logo max ~52 px alto
   - `object-fit: contain`, centrado, `margin-bottom: 4px`

5. **Posición:** Logo **arriba** de la razón social, centrado — igual que remitos y tickets térmicos estándar.

6. **Alcance MVP:** Venta, devolución y vale de cambio. **Fuera de scope:** cierre de caja (no tiene toggle ni pedido explícito).

7. **Reimpresiones históricas:** El payload se genera al momento de imprimir (RPC en vivo), no se congela al crear la venta. Si el usuario cambia el logo, las reimpresiones muestran el logo actual — comportamiento deseado.

### Alternativas Consideradas

- **Pasar `logoUrl` como prop separada al renderer (como remitos):** Rechazado — rompe el patrón snapshot del módulo de impresión y obliga a cambiar POS, PrintButtonClient y páginas de detalle.

- **Usar Next `<Image unoptimized>`:** Funciona en preview pero puede fallar en print si el browser no espera la carga. `<img>` + URL pública de Supabase es más predecible en `window.print()`.

- **Logo rasterizado en PrintBridge ESC/POS:** Necesario para impresión directa vía agente, pero el código de PrintBridge no está en este repo. Documentado como follow-up.

- **Iniciales como fallback cuando no hay logo:** Rechazado — el ticket ya muestra razón social en texto; agregar círculo con inicial duplicaría info y no es estándar en térmicas.

### Preguntas Abiertas (si las hay)

1. **¿Usan PrintBridge en producción?** Si sí, hay que actualizar `renderer.js` del agente para descargar la imagen y emitir comando ESC/POS raster. Eso es un segundo PR/repo aparte.

2. **¿Incluir logo en ticket de cierre de caja?** No pedido explícitamente; se puede agregar en un follow-up reutilizando `TicketEncabezado`.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración SQL — logo en payload

**Descripción:** Extender ambas funciones `build_payload_ticket_venta` y `build_payload_ticket_devolucion` para incluir logo en el objeto `tienda`.

**Acciones:**

- Crear `supabase/migrations/20260608100002_payload_tickets_logo.sql`.
- En el `jsonb_build_object` de `'tienda'`, agregar:
  ```sql
  'logo_url',     v_tienda.logo_url,
  'mostrar_logo', v_tienda.mostrar_logo
  ```
- Verificar que el `SELECT ... INTO v_tienda` ya trae `t.*` (incluye `logo_url` de `tiendas`) y campos de `ct.*` (incluye `mostrar_logo` de `configuracion_tienda`). No hace falta cambiar el JOIN.
- Aplicar migración en Supabase (local/producción según flujo del equipo).

**Archivos afectados:**

- `supabase/migrations/20260608100002_payload_tickets_logo.sql` (nuevo)

---

### Paso 2: Tipos TypeScript

**Descripción:** Sincronizar tipos con el payload SQL.

**Acciones:**

- En `app/lib/impresion/types.ts`, agregar a `TiendaPayload`:
  ```typescript
  logo_url?: string | null
  mostrar_logo?: boolean
  ```

**Archivos afectados:**

- `app/lib/impresion/types.ts`

---

### Paso 3: Componente `TicketEncabezado`

**Descripción:** Cabecera reutilizable para todos los tickets térmicos.

**Acciones:**

- Crear `app/components/impresion/TicketEncabezado.tsx`.
- Props: `tienda: TiendaPayload`.
- Lógica:
  ```typescript
  const showLogo = tienda.mostrar_logo !== false && Boolean(tienda.logo_url?.trim())
  const maxHeight = (tienda.ancho_mm ?? 80) <= 58 ? 40 : 52
  ```
- Render:
  - Si `showLogo`: `<img src={tienda.logo_url!} alt="" width={maxHeight} height={maxHeight} style={{ display: 'block', margin: '0 auto 4px', objectFit: 'contain', maxWidth: '90%' }} />`
  - Razón social / nombre (uppercase, bold) — igual que hoy
  - CUIT, condición IVA, dirección, teléfono, `texto_encabezado` — según props opcionales del componente (`mostrarTelefono`, `mostrarEncabezado` default true)
- Usar `alt=""` (decorativo; la razón social está en texto debajo).

**Archivos afectados:**

- `app/components/impresion/TicketEncabezado.tsx` (nuevo)

---

### Paso 4: Integrar en renderers

**Descripción:** Reemplazar cabeceras duplicadas por el componente compartido.

**Acciones:**

- `TicketVentaRenderer.tsx`: importar `TicketEncabezado`, reemplazar el `<div style={{ textAlign: 'center' ...}}>` de líneas 40-51 por `<TicketEncabezado tienda={t} />`.
- `TicketDevolucionRenderer.tsx`: reemplazar cabecera (líneas 29-38) por `<TicketEncabezado tienda={t} mostrarEncabezado={false} />` (devolución no usa `texto_encabezado` hoy).
- `ValeCambioRenderer.tsx`: agregar `<TicketEncabezado tienda={t} mostrarEncabezado={false} />` antes del bloque "VALE DE CAMBIO" — coherencia visual con ticket de venta.

**Archivos afectados:**

- `app/components/impresion/TicketVentaRenderer.tsx`
- `app/components/impresion/TicketDevolucionRenderer.tsx`
- `app/components/impresion/ValeCambioRenderer.tsx`

---

### Paso 5: Actualizar copy de configuración

**Descripción:** Alinear expectativas del usuario con el comportamiento real.

**Acciones:**

- En `LogoUpload.tsx`, cambiar el párrafo de ayuda de:
  > "Se mostrará en los remitos impresos."
  a:
  > "Se mostrará en tickets de venta/devolución (si está activado en Ticket) y en remitos impresos."

**Archivos afectados:**

- `app/components/configuracion/LogoUpload.tsx`

---

### Paso 6: Validación manual e impresión

**Descripción:** Verificar preview e impresión en todos los flujos.

**Acciones:**

1. **Setup:** Subir logo PNG en Configuración → Negocio. Verificar toggle "Mostrar logo en el ticket" activo en Configuración → Ticket.
2. **Venta nueva:** Cobrar en POS → ticket impreso/preview debe mostrar logo centrado arriba.
3. **Detalle venta:** `/ventas/[id]` → sección "Vista previa del ticket" muestra logo.
4. **Reimpresión:** Botón Imprimir en detalle venta → logo en print preview.
5. **Devolución:** Crear devolución → `/devoluciones/[id]` preview con logo → reimprimir OK.
6. **Toggle off:** Desactivar "Mostrar logo" → guardar → reimprimir ticket → **sin** imagen (solo texto).
7. **Sin logo:** Eliminar logo, toggle on → ticket sin imagen (sin error).
8. **Anchos:** Probar con `ancho_ticket_mm` 58 y 80 — logo no debe desbordar.
9. **Build:** `npm run build` sin errores TypeScript.

**Archivos afectados:**

- Ninguno (solo QA)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/actions/impresion.ts` — llama RPCs; no requiere cambio si el payload SQL trae los campos nuevos.
- `app/app/actions/facturacion.ts` — usa `build_payload_ticket_venta`; hereda logo automáticamente (no afecta emisión AFIP).
- `app/components/impresion/JobRenderer.tsx` — despacha `TicketVentaRenderer`; hereda cambio.
- `app/lib/impresion/usePrint.tsx` — sin cambios; el logo viaja dentro del JSX renderizado.

### Actualizaciones Necesarias para Consistencia

- `LogoUpload.tsx` copy (Paso 5).
- Si existe copia de `build_payload_*` en `supabase/all_migrations.sql`, regenerar o documentar que la fuente de verdad son las migraciones incrementales.

### Impacto en Flujos de Trabajo Existentes

- **POS cobro:** Impresión automática incluirá logo sin cambios en `POSContainer`.
- **Ventas/Devoluciones detalle:** Preview se actualiza sola al cambiar renderers.
- **Configuración:** Checkbox existente pasa a funcionar — no hay cambio de UI adicional.
- **PrintBridge:** Sin cambio en este repo; impresión ESC/POS seguirá sin logo hasta actualizar agente externo.

---

## Lista de Validación

- [x] Migración `20260620100001_payload_tickets_logo.sql` creada (aplicar en Supabase)
- [x] RPC `build_payload_ticket_venta` retorna `tienda.logo_url` y `tienda.mostrar_logo` (tras migración)
- [x] RPC `build_payload_ticket_devolucion` retorna los mismos campos (tras migración)
- [x] Vista previa en `/ventas/[id]` muestra logo cuando corresponde (via renderers)
- [x] Vista previa en `/devoluciones/[id]` muestra logo cuando corresponde (via renderers)
- [ ] Impresión desde POS muestra logo (requiere migración + logo subido; PrintBridge requiere parche manual)
- [ ] Reimpresión desde botón Imprimir muestra logo (mismo criterio)
- [x] Toggle `mostrar_logo = false` oculta el logo (lógica en `TicketEncabezado`)
- [x] Ticket sin logo subido no rompe ni muestra imagen rota
- [x] `npm run build` pasa sin errores
- [x] Copy de `LogoUpload` actualizado

---

## Criterios de Éxito

La implementación está completa cuando:

1. Un negocio con logo subido y "Mostrar logo en el ticket" activo ve el logo centrado en la cabecera del ticket de venta y devolución — en preview de pantalla y en impresión (`window.print()`).
2. Desactivar el toggle o eliminar el logo hace que el ticket vuelva al formato solo-texto, sin errores.
3. No se requieren cambios en las páginas de ventas/devoluciones/POS más allá de los renderers y la migración SQL.

---

## Notas

- **Formato recomendado para térmicas:** PNG o JPG con fondo blanco/transparente, cuadrado o horizontal, ≤512 px. SVG puede no imprimir bien en algunas térmicas vía browser print.
- **Storage:** El bucket `logos` debe ser público (ya lo es si `getPublicUrl` funciona hoy en remitos/PDF).
- **PrintBridge follow-up:** Si el equipo usa el agente local, el renderer ESC/POS necesitará descargar `logo_url`, convertir a bitmap monocromático y emitir `GS v 0`. Referencia: planes `2026-05-28-printbridge-v3-node-puro.md` y `2026-05-28-reestructuracion-tickets-no-fiscal.md`.
- **Cierre de caja:** `CierreCajaRenderer` no incluido en MVP; reutilizar `TicketEncabezado` si se pide después (requiere agregar campos al payload de cierre).

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se agregó `logo_url` y `mostrar_logo` al payload SQL de tickets, se creó `TicketEncabezado` compartido e integró en venta/devolución/vale. Se actualizó copy de `LogoUpload`. Para PrintBridge v3 en producción se entregó `scripts/printbridge-v3/src/logo-raster.js` y guía en `referencia/printbridge-v3-logo-tickets.md` (parche manual de `renderer.js` porque el agente no vive en este repo).

### Desviaciones del Plan

- Migración nombrada `20260620100001_payload_tickets_logo.sql` (timestamp posterior a migraciones ya existentes del 2026-06-08).
- Se agregó explícitamente `ct.mostrar_logo` al SELECT SQL (el plan asumía `ct.*` pero las funciones solo listaban columnas puntuales).
- PrintBridge: módulo helper + doc de integración en lugar de editar `renderer.js` inexistente en el workspace.

### Problemas Encontrados

- Ninguno en build TypeScript. Migración SQL pendiente de aplicar en Supabase por el operador.
