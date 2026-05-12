# Plan: Módulo de Impresión (Estación + Etiquetas + Cola)

**Creado:** 2026-04-29
**Estado:** Refactorizado v2 — arquitectura cambiada a impresión client-side directa
**Pedido:** Módulo de impresión: agente local + plantillas de ticket y etiqueta + cola.

---

## Refactor v2 (2026-04-29) — IMPRESIÓN AUTOMÁTICA CLIENT-SIDE

El usuario rechazó la arquitectura original ("estación local + cola"): *"No queria un apartado de /etiquetas ni /imprimir para nada en el sistema. Yo queria que al ejecutarse la venta, es decir al tocar en COBRAR en /pos ya la impresora detectada imprima el ticket directamente automatico"*. También: *"ese sistema es muy lento... y poco intuitivo"*.

### Nueva arquitectura

- **Sin cola de impresión.** Tabla `cola_impresion` y triggers eliminados (migración `20260429000004_eliminar_cola_impresion.sql`).
- **Sin tabs `/imprimir` ni `/etiquetas` en sidebar.** Borrados.
- **Impresión automática client-side**:
  - Al cobrar en POS → `obtenerPayloadVenta(ventaId)` → `usePrint` monta `<TicketVentaRenderer>` en un stage oculto y dispara `window.print()`.
  - Botón 🏷️ **Etiquetas** por variante (en `VariantesEditor` dentro de Productos) → modal con cantidad (default = stock actual) → `obtenerPayloadEtiquetasVariante` → impresión client-side de `<HojaEtiquetas>`.
  - Reimprimir desde Ventas / Devoluciones → mismo patrón con `obtenerPayloadVenta` / `obtenerPayloadDevolucion`.
- **Configuración → Etiquetas**: rediseñada como **diseñador de plantilla única** con preview en vivo ampliado ×4 (`DisenadorEtiqueta.tsx`). Sin múltiples plantillas, sin formato/grilla, sin logo.
- **Auto-print sin diálogo del navegador**: la PC de caja debe abrir Chrome con `--kiosk-printing` y la impresora térmica como predeterminada del SO. Documentado abajo.

### Archivos clave (v2)

- [supabase/migrations/20260429000004_eliminar_cola_impresion.sql](supabase/migrations/20260429000004_eliminar_cola_impresion.sql): drop CASCADE de `cola_impresion`, RPCs y triggers.
- [app/lib/impresion/usePrint.tsx](app/lib/impresion/usePrint.tsx): hook client-side. Monta JSX en `.print-stage`, marca `body.printing-active` + `data-print-type`, llama `window.print()` y limpia en `afterprint` (con timeout de 15 s).
- [app/components/productos/BotonImprimirEtiquetas.tsx](app/components/productos/BotonImprimirEtiquetas.tsx): botón + popover por variante.
- [app/components/configuracion/DisenadorEtiqueta.tsx](app/components/configuracion/DisenadorEtiqueta.tsx): editor con preview en vivo.
- [app/app/actions/impresion.ts](app/app/actions/impresion.ts): solo 4 actions: `obtenerPayloadVenta`, `obtenerPayloadDevolucion`, `obtenerPayloadEtiquetasVariante`, `guardarPlantillaEtiqueta`.
- [app/components/pos/POSContainer.tsx](app/components/pos/POSContainer.tsx): tras `registrarVenta` ok, dispara impresión automática.
- [app/components/ventas/PrintButtonClient.tsx](app/components/ventas/PrintButtonClient.tsx): reimprimir client-side.

### Lo que se conservó (sigue en uso)

- SVG EAN-13 ([barcode-svg.ts](app/lib/impresion/barcode-svg.ts), [CodigoBarrasSVG.tsx](app/components/impresion/CodigoBarrasSVG.tsx)).
- Renderers: `TicketVentaRenderer`, `TicketDevolucionRenderer`, `CierreCajaRenderer`, `EtiquetaRenderer`, `HojaEtiquetas`.
- CSS de impresión: [app/styles/print.css](app/styles/print.css) — reglas `@media print` que muestran solo `[data-print-area]` cuando `body.printing-active`.
- SQL builders del payload: `build_payload_ticket_venta(uuid)` y `build_payload_ticket_devolucion(uuid)` (en migración `20260419000012_cola_impresion.sql`, conservados aunque se haya borrado lo demás de esa migración).

### Configuración recomendada de Chrome (caja)

Para que el navegador imprima sin mostrar diálogo:

1. Configurar la impresora térmica como **predeterminada de Windows**.
2. Crear acceso directo de Chrome con la flag `--kiosk-printing`:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
   ```
3. Abrir el sistema desde ese acceso directo.

Con eso, `window.print()` envía directo a la impresora predeterminada sin diálogo.

---

## Notas de Implementación (2026-04-29)

- Implementado en 3 bloques con checkpoints. Sin errores de TypeScript (`tsc --noEmit` ok).
- **Bloque 1**: migración SQL `20260429000003_impresion_dispositivos_y_fixes.sql` (índice cola pendientes globales, fix payload de devolución para incluir `vendedor` y `cliente`, RPCs `cancelar_job_impresion`, `reencolar_ticket_venta`, `reencolar_ticket_devolucion`, alta de `cola_impresion` a `supabase_realtime`). Tipos `app/lib/impresion/types.ts`. Renderer EAN-13 SVG puro `app/lib/impresion/barcode-svg.ts` + componente. 4 renderers de payload (TicketVenta, TicketDevolucion, CierreCaja, Etiqueta), `HojaEtiquetas` (formato continuo, 1 etiqueta por página) y `JobRenderer` despachador. `app/styles/print.css` con `@page margin: 0` y reglas que ocultan todo excepto `.print-stage` cuando `body.printing-active`.
- **Bloque 2**: queries server `app/lib/impresion/queries.ts`, `payload-etiqueta.ts`, helper localStorage `dispositivo.ts`. Server actions `app/app/actions/impresion.ts` (control de cola, reimpresión via RPC, encolar etiquetas, CRUD de plantillas). Página estación `/imprimir` con suscripción Realtime a `cola_impresion`, procesamiento secuencial usando `window.print()` + `afterprint` + timeout 15s. Vista de cola `/imprimir/cola` con historial y acciones reintentar/cancelar.
- **Bloque 3**: tab "Etiquetas" en Configuración con CRUD completo y vista previa en vivo. Página `/etiquetas` con búsqueda de variantes (sin filtro de stock), selección con cantidades, selector de plantilla y envío a la cola. POSContainer ya no muestra `TicketModal`: solo confirma la venta con un toast — la impresión la hace la estación automáticamente vía trigger DB. `PrintButtonClient` ahora reencola via RPC con prop `tipo` + `id`. Sidebar agrega "Etiquetas" y "Imprimir".
- **Decisiones MVP** (vs el plan original): solo formato continuo de etiquetas (1 por página); diálogo nativo del navegador (sin modo kiosk); sin logo en etiquetas/tickets en el primer corte. Todo el resto del plan se implementó tal como estaba.

---

---

## Descripción General

### Qué Logra Este Plan

Cierra el ciclo de impresión end-to-end del sistema: un consumidor de la cola (`cola_impresion`) que escucha en tiempo real y dispara la impresión real de tickets de venta, devolución, cierre de caja y etiquetas de producto. Incluye el flujo completo de generación de etiquetas (selección de variantes, cantidades, plantillas configurables, código de barras EAN-13 renderizado) y la administración de la cola (reintentos, errores, historial).

### Por Qué Importa

Sin esta pieza el MVP no se puede usar en una caja real. Hoy `cola_impresion` se llena con jobs pero nadie los consume; los componentes de ticket existentes (`TicketModal`, `TicketImprimible`) solo se renderizan en pantalla y dependen de un `window.print()` manual. El módulo de etiquetas — pilar comercial diferencial de CValleTienda — no existe en UI, solo a nivel de tabla `configuracion_etiqueta` y generador EAN-13. Sin etiquetas y sin impresión automática, ninguna tienda real puede operar con el sistema. Este plan habilita el despliegue piloto y desbloquea la prioridad estratégica Q2: conseguir 2-3 tiendas pagas.

---

## Estado Actual

### Estructura Existente Relevante

**Base de datos (ya implementada):**

- [supabase/migrations/20260419000012_cola_impresion.sql](supabase/migrations/20260419000012_cola_impresion.sql): tabla `cola_impresion` con `tipo`, `payload jsonb`, `estado`, `dispositivo_id`, índices por estado/dispositivo. RLS multi-tenant aplicada.
- Funciones `build_payload_ticket_venta`, `build_payload_ticket_devolucion` y trigger inline para `cierre_caja` que producen snapshots inmutables completos (incluyen tienda, líneas, pagos, cliente, cierre detallado).
- Triggers `ventas_encolar_ticket`, `devoluciones_encolar_ticket`, `cierres_caja_encolar_ticket` ya disparan inserts.
- Tabla `configuracion_etiqueta` con campos: `formato`, `ancho_mm`, `alto_mm`, `mostrar_nombre/precio/talla/color/codigo/barcode/logo`, `tamano_fuente_*`, `etiquetas_por_fila/col`, `es_predeterminado`. **Sin uso en código todavía.**
- Enum `TipoColaImpresion` incluye `'etiqueta_producto'`, pero no hay trigger ni payload-builder para etiquetas (se generan on-demand desde la app).

**Frontend (parcial):**

- [app/components/ventas/TicketImprimible.tsx](app/components/ventas/TicketImprimible.tsx): render HTML del ticket de venta para 58/80mm con `@media print`. Recibe `TicketDatos` armado en cliente.
- [app/components/pos/TicketModal.tsx](app/components/pos/TicketModal.tsx): modal post-venta con botón manual "Imprimir" → `window.print()`.
- [app/components/ventas/PrintButtonClient.tsx](app/components/ventas/PrintButtonClient.tsx): botón equivalente para `/ventas/[id]`.
- [app/lib/barcode.ts](app/lib/barcode.ts): `generateEAN13()` y `validateEAN13()`. Solo computa el string; **no renderiza la imagen del código**.
- [app/components/productos/BarcodeButton.tsx](app/components/productos/BarcodeButton.tsx): botón para asignar código a una variante.

**Lo que NO existe:**

- Consumidor de `cola_impresion` (nadie lee la tabla, los jobs se acumulan).
- Renderizado visual del código de barras EAN-13 (SVG o canvas).
- Pantalla de generación/impresión de etiquetas.
- CRUD de plantillas de etiqueta.
- Administración de la cola (ver pendientes, reintentar fallos).
- Identificación de dispositivo / impresora destino.
- Estilos de impresión específicos para etiquetas (formato hoja A4 con grilla, o continuo 40×30mm).

### Brechas o Problemas que se Abordan

1. **Tickets impresos solo manualmente.** El operador tiene que apretar "Imprimir" tras cada venta. Lento y propenso a olvidos.
2. **Sin agente que consuma la cola.** Los triggers acumulan filas que nadie procesa.
3. **Etiquetas inexistentes en producto.** El diferencial "generar etiquetas" del pitch está vacío.
4. **EAN-13 sin imagen.** Solo se guarda el número; no hay forma de imprimirlo en una etiqueta escaneable.
5. **Sin gestión de errores de impresión.** Si la impresora se desconecta, no hay reintento ni alerta.
6. **Sin separación dispositivo/impresora.** Una tienda con 2 cajas no puede dirigir tickets a la térmica de cada caja.

---

## Cambios Propuestos

### Resumen de Cambios

- **Estación de impresión web (`/imprimir`)**: pantalla dedicada, montada en la PC de caja como pestaña fija. Se suscribe a `cola_impresion` vía Supabase Realtime. Cuando llega un job pendiente para su `dispositivo_id`, lo renderiza fuera de pantalla y dispara `window.print()` automáticamente. Marca el job como `completado` o `error`.
- **Identificación de dispositivos**: cada navegador-caja se registra con un ID local (localStorage) + nombre. Se elige al abrir `/imprimir`. Filtra los jobs.
- **Renderer unificado**: componente que recibe el `payload jsonb` del job y dispatcha al render correcto (`TicketVenta`, `TicketDevolucion`, `CierreCaja`, `Etiqueta`).
- **Render EAN-13 SVG en cliente**: componente puro `<CodigoBarrasSVG />` sin dependencias externas, calcula barras según patrones EAN-13 estándar.
- **Módulo de etiquetas (`/etiquetas`)**: selector de variantes (con búsqueda), input de cantidad por variante, preview de etiquetas, botón "Encolar impresión" → inserta job tipo `etiqueta_producto` con payload de la plantilla activa.
- **CRUD plantillas de etiqueta** dentro de `/configuracion/etiquetas`: alta/edición/borrado, marcar predeterminada, preview en vivo.
- **Server actions de impresión**: `encolarEtiquetas(items, plantillaId)`, `marcarJobCompletado(jobId)`, `marcarJobError(jobId, msg)`, `reintentarJob(jobId)`, `cancelarJob(jobId)`.
- **Vista de cola (`/imprimir/cola`)** o tab dentro de `/imprimir`: lista jobs pendientes/error, permite reintentar, ver payload, cancelar.
- **Migración SQL aditiva**: bug-fix de payload (incluir vendedor en devoluciones), índice extra para `dispositivo_id is null`, función `cancelar_job_impresion`.
- **Imprimir automáticamente en lugar de modal manual**: en POS, al confirmar venta, en lugar de mostrar `TicketModal` con botón "Imprimir", la venta encola el ticket vía trigger (ya pasa) y el operador ve confirmación breve. La estación de impresión se ocupa.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| --- | --- |
| `supabase/migrations/20260429000003_impresion_dispositivos_y_fixes.sql` | Migración aditiva: índice `cola_dispositivo_null_idx`, función `cancelar_job_impresion`, fix de payload de devolución (incluir `usuario_nombre`). |
| `app/lib/impresion/types.ts` | Tipos TS de los payloads (`PayloadTicketVenta`, `PayloadTicketDevolucion`, `PayloadCierreCaja`, `PayloadEtiquetaProducto`, `JobImpresion`). |
| `app/lib/impresion/queries.ts` | Server-side: `listarJobsPendientes()`, `listarJobsRecientes()`, `obtenerPlantillaPredeterminada()`, `listarPlantillas()`. |
| `app/lib/impresion/barcode-svg.ts` | Función pura `ean13ToSvgPaths(code)` que devuelve `{bars: number[], digits: string}` para renderizar el barcode. |
| `app/lib/impresion/dispositivo.ts` | Helper cliente: `getDispositivoLocal()`, `setDispositivoLocal()`, `clearDispositivoLocal()` sobre `localStorage`. |
| `app/app/actions/impresion.ts` | Server actions: `encolarEtiquetas`, `marcarJobCompletado`, `marcarJobError`, `reintentarJob`, `cancelarJob`, `crearPlantillaEtiqueta`, `actualizarPlantillaEtiqueta`, `eliminarPlantillaEtiqueta`, `marcarPlantillaPredeterminada`. |
| `app/components/impresion/CodigoBarrasSVG.tsx` | Componente cliente puro que renderiza un EAN-13 como SVG. |
| `app/components/impresion/TicketVentaRenderer.tsx` | Renderiza el payload de `ticket_venta`. Reutiliza/extiende `TicketImprimible`. |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Render del ticket de devolución. |
| `app/components/impresion/CierreCajaRenderer.tsx` | Render del comprobante de cierre. |
| `app/components/impresion/EtiquetaRenderer.tsx` | Render de una etiqueta individual según plantilla (nombre/precio/talla/color/código/barcode). |
| `app/components/impresion/HojaEtiquetas.tsx` | Renderiza N etiquetas en grilla según `etiquetas_por_fila/col` para hoja A4, o stream de etiquetas individuales para impresora continua. |
| `app/components/impresion/JobRenderer.tsx` | Switch que recibe `JobImpresion` y renderiza el componente correcto. |
| `app/app/(dashboard)/imprimir/page.tsx` | Server component: protege ruta, renderiza `EstacionImpresion`. |
| `app/app/(dashboard)/imprimir/EstacionImpresion.tsx` | Cliente: registra dispositivo, suscribe a Realtime, procesa jobs uno por uno, dispara `window.print()`, marca completado/error. UI con estado actual, último job, indicador de conexión. |
| `app/app/(dashboard)/imprimir/cola/page.tsx` | Lista de jobs pendientes/error con acciones. |
| `app/app/(dashboard)/etiquetas/page.tsx` | Server component: lista plantillas + selector. Renderiza `GeneradorEtiquetas`. |
| `app/app/(dashboard)/etiquetas/GeneradorEtiquetas.tsx` | Cliente: selector de variantes (autocompletar por nombre/barcode), tabla de items con cantidad, selector de plantilla, preview live, botón "Encolar". |
| `app/app/(dashboard)/configuracion/etiquetas/page.tsx` | Listado de plantillas con CRUD. |
| `app/components/configuracion/PlantillaEtiquetaForm.tsx` | Form de alta/edición de plantilla con preview en vivo. |
| `app/components/configuracion/AccionesPlantillaEtiqueta.tsx` | Botones "Editar / Predeterminar / Eliminar". |
| `app/styles/print.css` | Reglas `@media print` para tickets (58/80mm) y etiquetas (varios tamaños). Importado en `globals.css`. |
| `app/lib/impresion/payload-etiqueta.ts` | Helper server: `buildPayloadEtiquetas(items, plantilla)` arma snapshot completo (productos+plantilla) listo para encolar. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| --- | --- |
| `app/components/pos/POSContainer.tsx` | Reemplazar uso de `TicketModal` post-venta por toast/confirmación breve "Venta #N enviada a impresión". Mantener fallback opcional para reimprimir. |
| `app/components/pos/TicketModal.tsx` | Marcar deprecated o eliminar (mantener `TicketImprimible` como fuente del render). Si se conserva, agregar prop `compact` para sólo confirmación. |
| `app/components/layout/Sidebar.tsx` (o equivalente del dashboard) | Agregar entradas "Etiquetas" e "Imprimir". |
| `app/app/(dashboard)/configuracion/page.tsx` | Agregar link/sección "Plantillas de etiqueta". |
| `app/components/ventas/PrintButtonClient.tsx` | Cambiar a "Reimprimir" → server action `reimprimirVenta(ventaId)` que inserta nuevo job en `cola_impresion`. |
| `app/components/ventas/TicketImprimible.tsx` | Aceptar tipo común `PayloadTicketVenta` (snapshot) además del actual `TicketDatos`. Refactor mínimo para que sea puro a partir del payload. |
| `app/app/globals.css` | `@import './print.css'` o equivalente. |
| `app/lib/barcode.ts` | (sin cambios funcionales; sólo si se necesita re-export desde `lib/impresion`). |
| `app/types/database.ts` | Agregar tipos `PayloadTicketVenta`, `PayloadTicketDevolucion`, `PayloadCierreCaja`, `PayloadEtiquetaProducto`, `PayloadEtiquetaItem`. |
| `app/app/(dashboard)/layout.tsx` | (verificar) que la ruta `/imprimir` siga estando dentro del layout autenticado. |
| `CLAUDE.md` | Documentar el nuevo módulo en la estructura del workspace si corresponde. |
| `contexto/proyectos.md` | Mover "Módulo de impresión" a En desarrollo / luego a Completados. |

### Archivos a Eliminar

Ninguno en el MVP. `TicketModal.tsx` se conserva como fallback de reimpresión opcional.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Estación de impresión web, no agente nativo (en este MVP).** El "agente local" se materializa como una pestaña dedicada del navegador (`/imprimir`) corriendo en la PC de caja, suscrita a Supabase Realtime. La impresora térmica se configura como predeterminada del sistema operativo, y Chrome/Edge se inicia con `--kiosk-printing` para suprimir el diálogo. **Justificación:** cero dependencias nativas, despliegue idéntico al resto del sistema, multi-OS, no requiere instalador. Si después una tienda lo necesita, se reemplaza por un agente Electron sin tocar el resto del sistema (la API de la cola queda igual).

2. **Render del barcode como SVG puro, sin librería.** EAN-13 tiene patrones bien definidos (90 LOC). Evitamos sumar `jsbarcode` (~50KB) o `bwip-js`. **Justificación:** menor bundle, control total sobre estilos `@media print`, una sola fuente de verdad junto al validador `lib/barcode.ts`.

3. **Payloads inmutables (snapshot completo) ya armados por la DB.** No hago JOINs en el momento de imprimir. El frontend renderiza estrictamente lo que viene en `payload`. **Justificación:** ya está implementado en SQL, garantiza que reimprimir un ticket viejo muestre datos históricos exactos aunque la tienda haya cambiado de razón social, métodos de pago, etc.

4. **Etiquetas se encolan desde la app, no por trigger.** A diferencia de tickets (que se disparan automáticamente al cerrar venta), las etiquetas son explícitamente solicitadas por el operador desde `/etiquetas`. **Justificación:** no toda variante creada se imprime; el operador elige cuándo y cuántas.

5. **Procesamiento secuencial en la estación.** La estación procesa un job por vez: marca `imprimiendo` → renderiza → `window.print()` → espera evento `afterprint` → marca `completado` → siguiente. **Justificación:** evita imprimir varios tickets superpuestos; el `afterprint` event garantiza orden.

6. **`dispositivo_id` opcional / "cualquiera".** Si la tienda tiene una sola caja, el job no se filtra por dispositivo (`dispositivo_id IS NULL`). Si hay 2+ cajas, el operador asocia su sesión a un dispositivo y los jobs nuevos heredan ese ID. Para el MVP, todos los jobs se generan con `dispositivo_id = null` y la estación toma cualquiera; el filtro queda como capacidad futura.

7. **Reimpresión = nuevo job, no edición del existente.** "Reimprimir venta #N" inserta una nueva fila en `cola_impresion` con `referencia_id` apuntando a la misma venta. **Justificación:** auditable, simple, no rompe la inmutabilidad del log.

8. **CRUD de plantillas vive bajo `/configuracion/etiquetas`.** Coherente con el resto de configuración (`/configuracion/cuentas-fondos`, `/configuracion/metodos-pago`).

9. **`afterprint` + timeout de seguridad.** Si el evento no dispara en X segundos (impresora colgada, usuario canceló), el job se marca `error` y la estación pasa al siguiente.

### Alternativas Consideradas

- **Agente Electron/Node nativo con ESC/POS directo (rechazado para MVP).** Más rápido, sin diálogo, pero requiere instalación, drivers por OS, distribución de actualizaciones. Queda para Fase 2 cuando haya >5 tiendas y feedback claro de necesidad.
- **`qz-tray` (rechazado).** Requiere licencia comercial y un demonio Java en la PC.
- **Imprimir desde server con Puppeteer + ESC/POS API (rechazado).** Server no tiene visibilidad de la impresora física en la tienda; tendría que reflejar en algún cliente igualmente.
- **Polling cada N segundos (rechazado).** Realtime de Supabase es inmediato y ya pagado por el plan; sin razón para polling.
- **Encolar ticket desde el cliente al confirmar venta (rechazado).** Ya lo hace el trigger SQL, hacerlo en cliente duplicaría el job o lo perdería ante caída de red.

### Preguntas Abiertas

1. ¿La PC de caja en la tienda piloto va a tener Chrome/Edge en modo kiosko, o navegador normal con diálogo? *(Asunción: navegador normal, con impresora térmica predeterminada del sistema. Documentar guía rápida de cómo activar `--kiosk-printing` opcionalmente).*
2. ¿Tamaño físico de etiqueta del piloto: hoja A4 con grilla 3×8 (24 etiquetas) o impresora continua de etiquetas tipo Brother QL/Zebra? *(Asunción: soportar ambos. La plantilla con `etiquetas_por_fila > 1` o `> 1` fila ⇒ A4. Si ambos = 1 ⇒ continua, una etiqueta por página).*
3. ¿Usar logo de la tienda en tickets/etiquetas? *(Asunción: campo `mostrar_logo` ya existe en `configuracion_etiqueta` y `configuracion_tienda`; necesitamos columna `logo_url` o `logo_storage_path`. **Decisión MVP**: dejar `mostrar_logo: false` por defecto y la columna `logo_url` se agrega en una iteración posterior).*

---

## Tareas Paso a Paso

### Paso 1: Migración SQL aditiva

Agregar índice y fix menor sin romper el esquema existente.

**Acciones:**

- Crear `supabase/migrations/20260429000003_impresion_dispositivos_y_fixes.sql` con:
  - `create index if not exists cola_pendientes_global_idx on public.cola_impresion (created_at desc) where estado = 'pendiente' and dispositivo_id is null;`
  - Función `public.cancelar_job_impresion(p_job_id uuid)` que setea `estado = 'error'`, `error_mensaje = 'cancelado por usuario'`, valida pertenencia a la tienda activa.
  - Función `public.reencolar_ticket_venta(p_venta_id uuid)` que llama a `build_payload_ticket_venta` e inserta nueva fila (para reimprimir).
  - Función `public.reencolar_ticket_devolucion(p_devolucion_id uuid)` análoga.
  - Fix en `build_payload_ticket_devolucion`: agregar campos `'usuario'` (vendedor) y `'cliente'` al jsonb retornado para que el ticket de devolución pueda mostrarlos (hoy se omiten).
- Aplicar la migración localmente con Supabase CLI; regenerar `supabase/all_migrations.sql` si está sincronizado a mano.

**Archivos afectados:**

- `supabase/migrations/20260429000003_impresion_dispositivos_y_fixes.sql`
- `supabase/all_migrations.sql` (regenerar)

---

### Paso 2: Tipos compartidos del payload

Definir contratos TS que reflejen el snapshot que produce la DB.

**Acciones:**

- Crear `app/lib/impresion/types.ts` con interfaces:
  - `TiendaPayload` (nombre, razón social, CUIT, condición IVA, dirección, teléfono, encabezado, pie, ancho_mm, símbolo_moneda).
  - `LineaTicket` (nombre_producto, talla, color, código_barras, cantidad, precio_unitario, descuento_linea, total_linea).
  - `PagoTicket` (nombre_metodo, monto, comision_porcentaje, dias_acreditacion, referencia).
  - `ClienteTicket` (nombre, dni, telefono).
  - `PayloadTicketVenta` (tienda, numero_ticket, fecha, vendedor, subtotal, descuento, total, estado, observaciones, lineas, pagos, cliente).
  - `PayloadTicketDevolucion` (tienda, numero_devolucion, venta_referencia, fecha, motivo, tipo, total_devuelto, lineas, pagos, vendedor, cliente).
  - `PayloadCierreCaja` (tienda, fecha_apertura, fecha_cierre, usuario, totales, monto_apertura_efectivo, efectivo_esperado/declarado/diferencia, detalle_por_cuenta[], observaciones).
  - `PayloadEtiquetaItem` (variante_id, nombre_producto, talla, color, codigo_barras, precio, cantidad).
  - `PayloadEtiquetaProducto` (plantilla: ConfiguracionEtiqueta inline + items: PayloadEtiquetaItem[]).
  - `JobImpresion` (id, tipo, payload tipado por tipo, dispositivo_id, estado, intentos, error_mensaje, created_at).
- Re-exportar en `app/types/database.ts` o importar desde ahí.

**Archivos afectados:**

- `app/lib/impresion/types.ts` (nuevo)
- `app/types/database.ts` (re-exports)

---

### Paso 3: Render EAN-13 SVG

Componente puro para imprimir el código.

**Acciones:**

- Crear `app/lib/impresion/barcode-svg.ts`:
  - Constantes con patrones EAN-13 (`L_PATTERNS`, `G_PATTERNS`, `R_PATTERNS`, `FIRST_DIGIT_PARITY`).
  - Función `ean13Modules(code: string): number[]` que convierte el código a array de barras (0/1) incluyendo guardas (101 + 5×7 + 01010 + 5×7 + 101 = 95 módulos).
  - Validar checksum con `validateEAN13` antes de renderizar.
- Crear `app/components/impresion/CodigoBarrasSVG.tsx`:
  - Props: `code: string`, `width?: number` (mm, default 38), `height?: number` (mm, default 18), `showText?: boolean` (default true), `moduleWidth?: number`.
  - Renderiza `<svg>` con N `<rect>` negras para módulos `=1`. Texto del código debajo en monospace.
  - Si código inválido, renderizar fallback `[código inválido]` y devolver.

**Archivos afectados:**

- `app/lib/impresion/barcode-svg.ts` (nuevo)
- `app/components/impresion/CodigoBarrasSVG.tsx` (nuevo)

---

### Paso 4: Renderers de cada tipo de job

Componentes pure-render que toman payload y devuelven HTML imprimible.

**Acciones:**

- Crear `app/components/impresion/TicketVentaRenderer.tsx`. Reutilizar mucho de `TicketImprimible` actual; aceptar `PayloadTicketVenta`. Aplicar `data-print-area="ticket-venta"` al wrapper.
- Crear `app/components/impresion/TicketDevolucionRenderer.tsx` con header "DEVOLUCIÓN", número, venta referencia, motivo, líneas, pagos, total devuelto.
- Crear `app/components/impresion/CierreCajaRenderer.tsx` con resumen del cierre + tabla detalle por cuenta.
- Crear `app/components/impresion/EtiquetaRenderer.tsx`:
  - Recibe `item: PayloadEtiquetaItem` + `plantilla: ConfiguracionEtiqueta`.
  - Aplica estilos inline con `width: ancho_mm + 'mm'`, `height: alto_mm + 'mm'`, font-sizes según plantilla.
  - Muestra condicionalmente nombre/precio/talla/color/código texto/`<CodigoBarrasSVG>` según flags.
- Crear `app/components/impresion/HojaEtiquetas.tsx`:
  - Recibe `items: PayloadEtiquetaItem[]` (ya expandidos por cantidad), `plantilla`.
  - Si `etiquetas_por_fila * etiquetas_por_col > 1`: renderiza grilla A4 con CSS Grid; aplica salto de página cada N etiquetas (page-break-after).
  - Si `1×1`: renderiza una etiqueta por "página" (cada `<EtiquetaRenderer>` envuelto en `<div style="page-break-after:always">`).
- Crear `app/components/impresion/JobRenderer.tsx`:
  - `function JobRenderer({ job }: { job: JobImpresion })` con switch sobre `job.tipo`.

**Archivos afectados:**

- `app/components/impresion/TicketVentaRenderer.tsx` (nuevo)
- `app/components/impresion/TicketDevolucionRenderer.tsx` (nuevo)
- `app/components/impresion/CierreCajaRenderer.tsx` (nuevo)
- `app/components/impresion/EtiquetaRenderer.tsx` (nuevo)
- `app/components/impresion/HojaEtiquetas.tsx` (nuevo)
- `app/components/impresion/JobRenderer.tsx` (nuevo)

---

### Paso 5: Estilos de impresión

Asegurar que el `window.print()` produzca el output correcto.

**Acciones:**

- Crear `app/styles/print.css`:
  - `@page { margin: 0 }` global para tickets.
  - Reglas para `[data-print-area]`: ocultar todo lo demás cuando `body.printing-active` esté activo.
  - Sub-reglas:
    - `[data-print-area="ticket-venta"], [data-print-area="ticket-devolucion"], [data-print-area="cierre-caja"]`: `@page { size: 80mm auto }` o `58mm` según el ancho_mm del payload (controlar via inline style en wrapper).
    - `[data-print-area="etiqueta"]`: `@page { size: <ancho>mm <alto>mm; margin: 0 }`.
- Importar en `app/app/globals.css` con `@import "../styles/print.css";`.
- Agregar utility class `.no-print { display: none !important }` con `@media print`.

**Archivos afectados:**

- `app/styles/print.css` (nuevo)
- `app/app/globals.css` (modificar)

---

### Paso 6: Server actions de impresión

API server-side completa.

**Acciones:**

- Crear `app/app/actions/impresion.ts`:
  - `'use server'`.
  - `marcarJobImprimiendo(jobId: string)` → update estado a `imprimiendo`, increment `intentos`. Solo si estado actual es `pendiente`.
  - `marcarJobCompletado(jobId: string)` → update estado a `completado`.
  - `marcarJobError(jobId: string, mensaje: string)` → update estado a `error`, `error_mensaje`, increment `intentos`.
  - `reintentarJob(jobId: string)` → update estado a `pendiente`, `error_mensaje = null`.
  - `cancelarJob(jobId: string)` → llama RPC `cancelar_job_impresion`.
  - `reimprimirVenta(ventaId: string)` → llama RPC `reencolar_ticket_venta`.
  - `reimprimirDevolucion(devolucionId: string)` → llama RPC `reencolar_ticket_devolucion`.
  - `encolarEtiquetas(items: { variante_id: string, cantidad: number }[], plantillaId: string | null)`:
    1. Resolver `plantillaId` (si null, traer predeterminada).
    2. Cargar variantes con join a productos para snapshot.
    3. Construir `PayloadEtiquetaProducto` con plantilla inline + items con datos completos.
    4. Insertar en `cola_impresion` con `tipo = 'etiqueta_producto'`, `referencia_id = null`, `payload`.
    5. Devolver `{ ok, jobId }`.
  - `crearPlantillaEtiqueta`, `actualizarPlantillaEtiqueta`, `eliminarPlantillaEtiqueta`, `marcarPlantillaPredeterminada` (transaccional: deschequea las demás de la misma tienda).
- Validar todos los inputs con zod-like manual (no se usa zod en el repo; mantener consistencia con el resto de actions).
- Usar el cliente Supabase server (RLS aplica).

**Archivos afectados:**

- `app/app/actions/impresion.ts` (nuevo)
- `app/lib/impresion/queries.ts` (nuevo)
- `app/lib/impresion/payload-etiqueta.ts` (nuevo)

---

### Paso 7: Helper de dispositivo local

Identificación cliente del navegador-caja.

**Acciones:**

- Crear `app/lib/impresion/dispositivo.ts`:
  - `getDispositivoLocal(): { id: string, nombre: string } | null` → lee de `localStorage.cvt_dispositivo`.
  - `setDispositivoLocal(d)` → escribe.
  - `clearDispositivoLocal()` → remueve.
  - `generarIdDispositivo(): string` → `crypto.randomUUID()`.
- Tipos en `lib/impresion/types.ts`: `DispositivoLocal`.

**Archivos afectados:**

- `app/lib/impresion/dispositivo.ts` (nuevo)

---

### Paso 8: Estación de impresión `/imprimir`

El consumidor de la cola.

**Acciones:**

- Crear `app/app/(dashboard)/imprimir/page.tsx` (server component): valida sesión, renderiza `<EstacionImpresion />`.
- Crear `app/app/(dashboard)/imprimir/EstacionImpresion.tsx`:
  - `'use client'`.
  - Estado: `dispositivo`, `conectado`, `procesando: boolean`, `colaLocal: JobImpresion[]`, `jobActual: JobImpresion | null`, `historial: JobImpresion[]`, `ultimoError: string | null`.
  - `useEffect` mount:
    - Cargar `dispositivo` de localStorage; si no existe, abrir modal "Identificar este dispositivo" pidiendo nombre (ej. "Caja 1") → genera UUID + guarda.
    - Crear cliente Supabase browser (`createClient()`).
    - Suscribirse a canal `cola_impresion:tienda_<id>` con filtro `estado=eq.pendiente`. Eventos: `INSERT` añade a `colaLocal`.
    - Hacer fetch inicial de pendientes (los que ya estaban en la cola al abrir).
  - Loop de procesamiento: cuando `colaLocal.length > 0 && !procesando`:
    1. `setProcesando(true)`, `setJobActual(colaLocal[0])`.
    2. `await marcarJobImprimiendo(job.id)` (server action).
    3. Render fuera de pantalla con `<JobRenderer job={job} />` dentro de un `<div data-print-area>` posicionado fuera del viewport pero presente en DOM.
    4. `document.body.classList.add('printing-active')` + `document.body.dataset.printType = job.tipo`.
    5. Definir handler `onAfterPrint = async () => { await marcarJobCompletado(job.id); cleanup; siguiente }`.
    6. `window.addEventListener('afterprint', onAfterPrint, { once: true })`.
    7. `window.print()`.
    8. Timeout de 15s: si no hay `afterprint`, asume error → `marcarJobError(id, 'timeout esperando impresora')`.
  - UI:
    - Header con nombre del dispositivo + botón "Cambiar dispositivo".
    - Indicador "Conectado a Realtime" (verde/rojo).
    - Banner "Procesando: Ticket #...".
    - Lista de últimos 20 jobs con estado.
    - Botón "Pausar" (no procesa nuevos jobs hasta retomar).
    - Link "Ver cola completa".
  - Manejar reconexión: si Realtime se desconecta, refetch al reconectar.

**Archivos afectados:**

- `app/app/(dashboard)/imprimir/page.tsx` (nuevo)
- `app/app/(dashboard)/imprimir/EstacionImpresion.tsx` (nuevo)

---

### Paso 9: Vista de cola `/imprimir/cola`

Administración manual.

**Acciones:**

- Crear `app/app/(dashboard)/imprimir/cola/page.tsx`:
  - Server: cargar jobs por estado (pendientes, error, últimos completados de hoy).
  - Tabla con columnas: tipo · referencia · estado · intentos · creado · acciones.
  - Acciones: "Reintentar" (solo error/cancelado), "Cancelar" (solo pendiente), "Ver payload" (modal con JSON).

**Archivos afectados:**

- `app/app/(dashboard)/imprimir/cola/page.tsx` (nuevo)
- `app/components/impresion/AccionesJob.tsx` (nuevo)

---

### Paso 10: CRUD de plantillas de etiqueta

`/configuracion/etiquetas`.

**Acciones:**

- Crear `app/app/(dashboard)/configuracion/etiquetas/page.tsx`: server, lista plantillas + botón "Nueva".
- Crear `app/components/configuracion/PlantillaEtiquetaForm.tsx`:
  - Form con todos los campos de `configuracion_etiqueta`.
  - Preview en vivo (cliente) usando `<EtiquetaRenderer>` con item dummy.
  - Botón "Guardar" / "Cancelar".
- Crear `app/components/configuracion/AccionesPlantillaEtiqueta.tsx`: dropdown editar/predeterminar/eliminar.
- Crear `app/app/(dashboard)/configuracion/etiquetas/nueva/page.tsx` y `[id]/page.tsx` (alta/edición).
- Modificar `app/app/(dashboard)/configuracion/page.tsx` para incluir tarjeta/link "Plantillas de etiqueta".
- Si no existe seed/plantilla por defecto, agregar en server action `crearPlantillaEtiqueta` la lógica para que la primera plantilla creada quede como predeterminada automáticamente.

**Archivos afectados:**

- `app/app/(dashboard)/configuracion/etiquetas/page.tsx` (nuevo)
- `app/app/(dashboard)/configuracion/etiquetas/nueva/page.tsx` (nuevo)
- `app/app/(dashboard)/configuracion/etiquetas/[id]/page.tsx` (nuevo)
- `app/components/configuracion/PlantillaEtiquetaForm.tsx` (nuevo)
- `app/components/configuracion/AccionesPlantillaEtiqueta.tsx` (nuevo)
- `app/app/(dashboard)/configuracion/page.tsx` (modificar)

---

### Paso 11: Generador de etiquetas `/etiquetas`

Pantalla principal del módulo.

**Acciones:**

- Crear `app/app/(dashboard)/etiquetas/page.tsx`: server, carga plantillas y renderiza `<GeneradorEtiquetas />`.
- Crear `app/app/(dashboard)/etiquetas/GeneradorEtiquetas.tsx`:
  - Cliente.
  - Selector de plantilla (dropdown, default = predeterminada).
  - Buscador de variantes (autocompletar por nombre o código de barras, similar a POS).
  - Tabla de items seleccionados: `nombre + talla + color · código · cantidad (input number) · subtotal etiquetas · eliminar`.
  - Botón "Cargar todas las variantes recibidas en el último ingreso de stock" (atajo, opcional v1.5).
  - Preview live: 1 etiqueta por item con `<EtiquetaRenderer>`.
  - Total etiquetas a imprimir, total hojas estimadas.
  - Botón "Encolar impresión" → server action → toast "Encoladas N etiquetas. Revisar en /imprimir".
- Si no hay estación abierta, mostrar nota: "Asegurate de tener `/imprimir` abierto en la PC con la impresora".

**Archivos afectados:**

- `app/app/(dashboard)/etiquetas/page.tsx` (nuevo)
- `app/app/(dashboard)/etiquetas/GeneradorEtiquetas.tsx` (nuevo)

---

### Paso 12: Cambios en POS y vista de venta

Pasar de imprimir-manual a imprimir-automático.

**Acciones:**

- Modificar `app/components/pos/POSContainer.tsx`:
  - Tras venta confirmada, en lugar de `setTicket(...)` que abre `TicketModal` con botón "Imprimir", mostrar toast "Venta #N enviada a impresión" + botón opcional "Reimprimir" (que llama `reimprimirVenta`).
  - Mantener toggle de configuración futura `auto_imprimir = true` (no se expone aún).
- Modificar `app/components/ventas/PrintButtonClient.tsx`:
  - Cambiar texto a "Reimprimir ticket".
  - `onClick` → server action `reimprimirVenta(ventaId)`.
  - Toast "Ticket re-encolado".
- Modificar (o ya está vía trigger) `/devoluciones`: agregar botón "Reimprimir comprobante" en el detalle.

**Archivos afectados:**

- `app/components/pos/POSContainer.tsx`
- `app/components/pos/TicketModal.tsx` (opcional cleanup)
- `app/components/ventas/PrintButtonClient.tsx`
- `app/app/(dashboard)/devoluciones/[id]/page.tsx` (verificar/agregar botón)

---

### Paso 13: Navegación

Agregar entradas al sidebar.

**Acciones:**

- Modificar el componente de sidebar/nav del dashboard (buscar en `app/components/layout/`):
  - Agregar item "Etiquetas" → `/etiquetas`.
  - Agregar item "Imprimir" → `/imprimir` con badge si hay jobs pendientes (opcional v1.5).
  - Bajo "Configuración", entrada "Plantillas de etiqueta".

**Archivos afectados:**

- `app/components/layout/Sidebar.tsx` (o equivalente)

---

### Paso 14: Validación end-to-end

Probar todo el flujo en local.

**Acciones:**

- Levantar Supabase local + app: `npm run dev`.
- Seed mínimo: 1 tienda, 1 producto con 2 variantes (asignar EAN-13 con `BarcodeButton`), 1 plantilla de etiqueta predeterminada (40×30mm, 1×1, mostrar todo).
- Abrir `/imprimir` en una pestaña, identificar dispositivo "Caja Test".
- Abrir `/pos` en otra pestaña; abrir caja; hacer una venta.
- Verificar:
  - Trigger inserta job en `cola_impresion` (consultar tabla en Supabase Studio).
  - Realtime entrega INSERT a `/imprimir`.
  - Estación marca `imprimiendo` → renderiza ticket → dispara `window.print()`.
  - Tras `afterprint` (cancelar diálogo), job queda `completado`.
- Hacer una devolución parcial: validar mismo flujo.
- Cerrar caja: validar resumen impreso.
- Ir a `/etiquetas`, agregar 3 unidades de cada variante, encolar; validar render en `/imprimir`.
- Probar `/imprimir/cola`: ver historial, reintentar un job marcado en error manual (sql `update cola_impresion set estado='error' where ...`).
- Probar reimpresión desde `/ventas/[id]`.
- Verificar `@media print`: hacer "Imprimir como PDF" y revisar el archivo resultante (margenes, ancho, barcode escaneable).

**Archivos afectados:** ninguno (validación).

---

### Paso 15: Documentación

Cerrar el círculo.

**Acciones:**

- Actualizar [CLAUDE.md](CLAUDE.md) si hay cambio estructural relevante (probablemente sólo mencionar el módulo `/imprimir`).
- Mover entrada "Módulo de impresión" en [contexto/proyectos.md](contexto/proyectos.md) a "Completados" cuando se valide.
- Actualizar [contexto/datos-actuales.md](contexto/datos-actuales.md) sección "Estado Actual" agregando: "Módulo de impresión cerrado: estación web `/imprimir` consume `cola_impresion` vía Realtime, plantillas de etiqueta CRUD y generación de etiquetas con EAN-13 SVG."
- Marcar el plan como Estado: Implementado, agregar sección "Notas de Implementación" con desviaciones reales.
- En el plan, listar guía rápida operativa: "Cómo configurar la PC de caja: impresora térmica como predeterminada, abrir `/imprimir` y dejar la pestaña fija; opcional: lanzar Chrome con `--kiosk-printing` para suprimir diálogo".

**Archivos afectados:**

- `CLAUDE.md`
- `contexto/proyectos.md`
- `contexto/datos-actuales.md`
- `planes/2026-04-29-modulo-impresion.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/pos/POSContainer.tsx` (deja de abrir modal de impresión).
- `app/components/ventas/PrintButtonClient.tsx` (cambia a "Reimprimir").
- `app/components/ventas/TicketImprimible.tsx` (sigue siendo fuente del render, refactor leve).
- Cualquier vista de detalle de venta/devolución/cierre que ofrezca impresión.

### Actualizaciones Necesarias para Consistencia

- `app/types/database.ts`: nuevos tipos exportados.
- Sidebar / navegación principal del dashboard.
- README de [supabase/](supabase) si describe `cola_impresion`: actualizar mención al consumidor.

### Impacto en Flujos de Trabajo Existentes

- **POS**: el flujo se simplifica (no más modal post-venta). El operador apenas ve confirmación y la impresión sale sola.
- **Devoluciones / Cierre de caja**: idem, todo automático vía cola.
- **Configuración**: nueva sección "Plantillas de etiqueta".
- **Productos**: sin cambios. (En iteración futura, agregar atajo "Imprimir etiqueta de esta variante" desde el editor de variantes).

---

## Lista de Validación

- [ ] Migración `20260429000003_impresion_dispositivos_y_fixes.sql` aplica sin error en local.
- [ ] Función `cancelar_job_impresion` respeta tienda activa (RLS).
- [ ] `<CodigoBarrasSVG>` renderiza un EAN-13 escaneable (probar con app de scanner del celular).
- [ ] `/imprimir` se suscribe a Realtime y recibe INSERTs de `cola_impresion` en <2s.
- [ ] Estación procesa jobs uno por uno (no superpuestos).
- [ ] Tras `afterprint`, el job se marca `completado` automáticamente.
- [ ] Si se cancela el diálogo, eventualmente se marca `error` con mensaje claro.
- [ ] `/imprimir/cola` permite reintentar, cancelar y ver payload.
- [ ] CRUD de plantillas funciona; al menos una queda `es_predeterminado=true` por tienda.
- [ ] `/etiquetas` permite armar lote, encola un job `etiqueta_producto`, se imprime con grilla correcta.
- [ ] Reimpresión de venta inserta nuevo job y se imprime.
- [ ] POS ya no muestra modal con botón "Imprimir"; muestra confirmación.
- [ ] Tipos TS de payload coinciden con el JSON producido por `build_payload_*`.
- [ ] CLAUDE.md y `contexto/` actualizados.
- [ ] Multi-tenant: una tienda B no recibe jobs de tienda A en su `/imprimir` (RLS).

---

## Criterios de Éxito

1. Una venta cerrada en `/pos` se imprime automáticamente en la térmica de la PC con `/imprimir` abierto, sin intervención del operador.
2. Las devoluciones y cierres de caja también se imprimen automáticamente.
3. Desde `/etiquetas` se puede generar un lote de N etiquetas con código de barras escaneable y enviarlo a impresión.
4. Las plantillas de etiqueta son configurables (tamaño, qué mostrar) y la app respeta la elección al renderizar.
5. La cola es transparente: errores visibles, reintentables, sin jobs fantasma.
6. Cero dependencias nativas instaladas en la PC de caja: sólo navegador.
7. La tienda piloto puede operar un día completo sin tocar el botón "Imprimir".

---

## Estimación de Alcance

- **Tareas:** 15.
- **Archivos nuevos:** ~22.
- **Archivos modificados:** ~8.
- **Migración SQL:** 1 (aditiva).
- **Complejidad alta:** Estación de impresión (Paso 8) — concentra Realtime, render fuera de pantalla, lifecycle de `window.print()` + `afterprint`, manejo de timeouts y reconexión.
- **Complejidad media:** Render EAN-13 SVG, generador de etiquetas (Paso 11), CRUD de plantillas (Paso 10).
- **Complejidad baja:** Migración SQL aditiva, tipos, server actions, ajustes en POS/vistas existentes.

---

## Notas

- Si la tienda piloto no tiene impresora térmica el día 1, todo igualmente funciona con la impresora predeterminada del sistema (el operador elige tamaño en el diálogo). El módulo no bloquea el lanzamiento.
- En Fase 2 (cuando haya feedback de >3 tiendas), evaluar agente Electron con ESC/POS directo para eliminar el diálogo de impresión y soportar gaveta/cortador. Esa Fase 2 reusa la misma cola y los mismos payloads — no es trabajo desperdiciado.
- Considerar a futuro: notificación sonora cuando un job entra en error, badge en sidebar con conteo de pendientes, generador automático de etiquetas al recibir un ingreso de stock (atajo en `/stock/ingresos/[id]`).
- Posible mejora UX: que la estación abra el diálogo de impresión sólo la primera vez y luego use silent printing por configuración del navegador. Documentar esto al instalar.
