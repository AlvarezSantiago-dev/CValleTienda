# Plan: Cajero Hablado — agente de voz con router + tool calling

**Creado:** 2026-08-21
**Estado:** Implementado
**Pedido:** Agente conversacional por voz (push-to-talk) que registra ventas multi-ítem con vuelto, carga productos y cambia precios, hablándole al sistema y recibiendo respuesta hablada, con confirmación obligatoria antes de ejecutar.

---

## Descripción General

### Qué Logra Este Plan

Un "cajero hablado": el usuario mantiene **F10** (o el FAB en mobile), dice *"registrame 3 Coca de 3 litros, 359 gramos de paleta y un aceite de girasol de 2,25, me dieron 20 mil"*, y el sistema entiende la frase completa, resuelve los productos contra el catálogo real, arma la venta, **responde en voz** con el total y el vuelto, y recién cobra cuando el usuario confirma. Mismo canal para *"cargá un producto Coca Cola 3 litros, compra 4 mil, venta 15 mil, código tanto"* y *"cambiale el precio de venta a la Coca 3 litros a 14.800"*.

### Por Qué Importa

El wizard de voz actual (`VoiceProvider`) es de reglas: navega y carga producto **paso a paso**, un dato por turno, y no puede procesar una frase natural con varios ítems. El cajero hablado cubre el 80% de la operación diaria del mostrador (vender, cargar, ajustar precio) sin teclado, y es un diferencial comercial fuerte para CValleTienda. Reutiliza las server actions existentes como herramientas: el LLM **no** escribe SQL ni inventa datos; solo elige tools, y el servidor valida todo igual que el POS (stock, caja abierta, redondeo $100, RLS por tenant, roles).

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Relevancia |
|---------|-----------|
| `app/components/voz/VoiceProvider.tsx` + `VoiceFab` / `VoiceHUD` / `VoiceProductoWizard` | Sistema de voz actual (Web Speech API, reglas). Queda como fallback; el FAB se comparte. |
| `app/lib/voz/comandos.ts`, `numeros.ts`, `unidades.ts`, `barras.ts` | Parsers de reglas. `parsearComandoNav` se reutiliza como fallback local sin costo. |
| `app/app/actions/ventas.ts` | `registrarVenta(RegistrarVentaInput)` — items, pagos, cliente, descuento, condición de pago. Valida stock, caja abierta, redondeo. `buscarVariantesAction(query)` y `buscarClientesAction(query)`. |
| `app/app/actions/productos.ts` | `crearProducto(ProductoInput)`, `generarCodigoBarrasUnico()`, `requireTiendaId()` (devuelve `rol`). |
| `app/app/actions/stock.ts` | `ingresarStock` / `ajustarStock` (fase 2, no en v1). |
| `app/lib/pos/redondeo-efectivo.ts` | `sugerirMontoEfectivo`, `vueltoEntregable`, `ajusteRedondeoEfectivo` — cálculo de vuelto con redondeo $100. |
| `app/lib/pos/queries.ts` | `VarianteResultado` (precio, stock, pack, tramos) — shape de candidatos. |
| `app/lib/catalogo/rate-limit.ts` | `rateLimitOk(key, max, ventanaMs)` — se reutiliza para limitar llamadas al agente. |
| `app/components/layout/AppShell.tsx` | Punto de montaje de providers de voz. |
| `app/app/api/productos/imagen/route.ts` | Convención de route handlers con auth Supabase. |
| Tests `*.test.ts` (`node:test` + `assert/strict`) | Patrón de tests unitarios del repo. |

### Brechas o Problemas que se Abordan

- La voz actual **no entiende frases naturales multi-dato** ("3 Coca + paleta + aceite + billete de 20 mil") — solo un dato por paso.
- Web Speech API es poco fiable para números grandes en Chrome (limitación ya documentada en `VoiceProvider`).
- No existe integración con ningún LLM ni STT/TTS en el repo (cero dependencias de IA hoy).
- No hay forma de cambiar un precio por voz ni de registrar una venta por voz.
- El problema central a resolver: **desambiguación** — "cocacola" cuando existen 350 ml, 1,5 L y 3 L. El agente debe preguntar, no adivinar.

---

## Cambios Propuestos

### Resumen de Cambios

- **API route del agente** `/api/cajero`: recibe audio (o texto) + historial → transcribe (Whisper) → LLM router con tool calling → responde texto + estado estructurado (propuesta / pregunta / resultado).
- **Tools server-side** que envuelven las server actions existentes: buscar productos, buscar cliente, proponer venta (cálculo server de total/vuelto), registrar venta, crear producto, actualizar precio.
- **Cliente push-to-talk**: mantener F10 (desktop) o mantener FAB (mobile) graba con MediaRecorder; al soltar, envía. Respuesta hablada con `speechSynthesis` (es-AR) + HUD visual.
- **Confirmación obligatoria**: las tools de escritura solo se ejecutan si el turno anterior dejó una propuesta pendiente y el usuario dijo sí (o tocó Confirmar).
- **Sin cambios de DB**: v1 va detrás de la env var `OPENAI_API_KEY` (si no está, todo el feature queda oculto y el wizard viejo sigue igual).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/cajero/tipos.ts` | Tipos compartidos: `TurnoCajero`, `EstadoConversacion`, `PropuestaVenta`, `PropuestaProducto`, `PropuestaPrecio`, `RespuestaCajero`. |
| `app/lib/cajero/prompts.ts` | System prompt del router (rol cajero rioplatense, reglas duras: nunca ejecutar sin confirmación, preguntar ante ambigüedad, respuestas de ≤2 frases aptas para TTS). |
| `app/lib/cajero/tools.ts` | Definición de tools (JSON Schema) + dispatcher que llama a las server actions. Única frontera entre LLM y sistema. |
| `app/lib/cajero/propuesta.ts` | Lógica pura: armar `PropuestaVenta` desde ítems resueltos (total por línea round2, `sugerirMontoEfectivo`, `vueltoEntregable`). Sin I/O — testeable. |
| `app/lib/cajero/propuesta.test.ts` | Tests `node:test`: totales, vuelto con/sin redondeo $100, recibido insuficiente, ítems por peso (kg/gramos). |
| `app/lib/cajero/contexto.ts` | Carga contexto de tienda para el prompt: métodos de pago activos, rubro, redondeo activo, rol del usuario. Una query, se inyecta al system prompt. |
| `app/lib/cajero/openai.ts` | Cliente fino sobre `fetch` a la API de OpenAI: `transcribir(audio)` (whisper) y `chatConTools(mensajes, tools)` (loop de tool calling, máx. 6 iteraciones). Sin dependencia nueva. |
| `app/app/api/cajero/route.ts` | POST handler: auth Supabase + rate limit → transcripción → loop del router → devuelve `RespuestaCajero` (texto a hablar, transcript, propuesta pendiente, resultado de ejecución). |
| `app/app/actions/cajero.ts` | `actualizarPrecioVenta(productoId, nuevoPrecio)`: action mínima y segura (solo `precio_venta`, chequeo de rol owner/admin, revalidate). Evita pasar por `actualizarProducto` completo. |
| `app/components/cajero/CajeroProvider.tsx` | Context client: push-to-talk (keydown/keyup F10, pointer en FAB), MediaRecorder, envío a `/api/cajero`, historial de conversación, reproducción TTS, estados (grabando / pensando / hablando / esperando confirmación). |
| `app/components/cajero/CajeroHUD.tsx` | Overlay con transcript, respuesta del agente y —cuando hay propuesta— resumen (ítems, total, vuelto / producto / precio) con botones **Confirmar** y **Cancelar** (voz o click). Tokens semánticos + primitives `components/ui/`. |
| `app/components/cajero/useTts.ts` | Hook `speechSynthesis` es-AR: hablar, cortar al empezar nueva grabación, no solapar. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/layout/AppShell.tsx` | Montar `CajeroProvider` + `CajeroHUD`. El FAB existente: si el cajero hablado está disponible (flag público), mantener presionado = cajero hablado; tap corto = menú actual (nav / wizard viejo). |
| `app/components/voz/VoiceFab.tsx` | Soportar gesto "mantener presionado" delegando al `CajeroProvider` (sin romper el comportamiento actual). |
| `app/app/(dashboard)/layout.tsx` | Pasar flag `cajeroHabladoActivo` (derivado de env server) al shell. |
| `CLAUDE.md` | Fila nueva en la tabla de recursos: Cajero hablado — ruta API, tools, alcance v1. |
| `contexto/proyectos.md` | Agregar el proyecto a "En desarrollo". |

### Archivos a Eliminar (si aplica)

Ninguno. El sistema de voz por reglas queda intacto como fallback sin API key.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Router + tools sobre server actions existentes**: el LLM nunca toca la DB; `registrarVenta` / `crearProducto` re-validan todo (stock, caja, plan, RLS). El agente puede equivocarse eligiendo tools y el sistema sigue siendo seguro.
2. **Push-to-talk, no micrófono siempre abierto**: en caja hay ruido, clientes y scanner. Mantener F10 / FAB acota qué se transcribe y elimina activaciones falsas. El botón del auricular Bluetooth queda para fase 2 (Media Session API).
3. **STT server-side (Whisper), no Web Speech**: los números grandes y nombres de producto son el corazón del caso de uso, y Web Speech ya demostró no ser confiable para eso en este repo. El audio viaja al route handler y se transcribe con `whisper-1` (es).
4. **TTS del navegador (`speechSynthesis`) en v1**: costo cero y latencia cero. La voz neural (OpenAI TTS) es un swap posterior dentro de `useTts` si la calidad no alcanza.
5. **Aritmética en el servidor, nunca en el LLM**: la tool `proponer_venta` recibe ítems resueltos + monto recibido y calcula total/vuelto con `lib/pos/redondeo-efectivo` en código. El modelo solo relata el resultado.
6. **Confirmación de dos turnos con guard server-side**: `registrar_venta` / `crear_producto` / `actualizar_precio` exigen que el estado de conversación tenga `propuestaPendiente` generada en un turno anterior. El system prompt lo pide y el dispatcher lo **impone** (si no hay propuesta pendiente, la tool devuelve error al modelo).
7. **Desambiguación como comportamiento de primera clase**: `buscar_productos` devuelve hasta 8 candidatos compactos (nombre, talla/color/presentación, precio, stock). Si hay más de un match razonable, el prompt obliga a preguntar ("¿Coca 3 L o 1,5 L?") en vez de elegir. Con 0 matches: decirlo y sugerir cargar el producto.
8. **Sin dependencia npm nueva**: cliente OpenAI con `fetch` nativo en `lib/cajero/openai.ts` (transcripción multipart + chat completions con tool calling). El repo se mantiene liviano; si el loop crece, migrar al SDK oficial es local a ese archivo.
9. **Modelo económico**: `gpt-4o-mini` para el router (frases cortas, tools bien tipadas). Costo estimado por utterance: ~USD 0,01 (Whisper ~0,006/min + tokens). Configurable por env `CAJERO_MODELO`.
10. **Alcance v1 = 3 intents + navegación**: venta contado multi-ítem con vuelto, alta de producto simple (1 variante, código dictado o autogenerado), cambio de precio de venta. Navegación cae al parser local gratis (`parsearComandoNav`). Todo lo demás (CC, devoluciones, caja, stock) responde "eso por ahora hacelo desde la pantalla".

### Alternativas Consideradas

- **Audio bidireccional en tiempo real (OpenAI Realtime / Gemini Live)**: más "ChatGPT Voice", pero más caro por minuto, más difícil de atar a tools y arriesgado en un local ruidoso. Se puede montar después sobre las mismas tools.
- **Ampliar el wizard de reglas actual**: sin costo de API pero incapaz de procesar una frase con 3 ítems + pago; ya alcanzó su techo.
- **Mega-agente con todas las actions como tools (~80)**: confunde al modelo, encarece cada turno y multiplica la superficie de riesgo. Rechazado; se escala por dominios en fases.
- **Vercel AI SDK**: DX buena, pero suma dependencias para un solo endpoint; con `fetch` alcanza para v1.

### Preguntas Abiertas

1. **Gating comercial**: ¿el cajero hablado es feature Pro (`lib/planes/config.ts`) o beneficio general durante el piloto? Propuesta: piloto abierto detrás de env, decidir plan al cerrar la fase.
2. **Cambio de precio por rol**: propuesto solo owner/admin (el cajero vendedor no cambia precios). Confirmar.
3. **Tecla push-to-talk**: F10 propuesta; verificar que no choque con atajos del POS (`PosAtajosHelp`).

---

## Tareas Paso a Paso

### Paso 1: Tipos y lógica pura de propuesta

Crear `lib/cajero/tipos.ts` y `lib/cajero/propuesta.ts`.

**Acciones:**

- Definir `PropuestaVenta { items: Array<{ variante_id, etiqueta, cantidad, precio_unitario, subtotal }>, total, recibido?, vuelto?, ajusteRedondeo?, cliente_id?, metodo_pago_id }`, `PropuestaProducto` (subset de `ProductoInput`), `PropuestaPrecio { producto_id, etiqueta, precio_actual, precio_nuevo }`, `EstadoConversacion { mensajes, propuestaPendiente? }`, `RespuestaCajero { hablar, transcript, estado, resultado? }`.
- `armarPropuestaVenta(itemsResueltos, recibido, opciones)` calcula subtotales round2 (misma regla que `lib/pos/totales-carrito.ts`), total, y vuelto con `vueltoEntregable` / `ajusteRedondeoEfectivo` según config de redondeo. Si `recibido < total`, marcar `faltante`.
- Escribir `lib/cajero/propuesta.test.ts` (`node:test`): venta simple, multi-ítem, por peso (0,359 kg), vuelto con redondeo activo/inactivo, recibido insuficiente.

**Archivos afectados:** `app/lib/cajero/tipos.ts`, `app/lib/cajero/propuesta.ts`, `app/lib/cajero/propuesta.test.ts`

---

### Paso 2: Action mínima de precio

Crear `app/actions/cajero.ts` con `actualizarPrecioVenta`.

**Acciones:**

- `actualizarPrecioVenta(productoId: string, nuevoPrecio: number): Promise<ActionResult<{ anterior: number }>>`.
- Validar precio > 0, `requireTiendaId()`, **rechazar si `rol` no es owner/admin**, update solo `precio_venta` en `productos` filtrado por `tienda_id`, `revalidatePath('/productos')` y `/pos`.

**Archivos afectados:** `app/app/actions/cajero.ts`

---

### Paso 3: Contexto de tienda y cliente OpenAI

**Acciones:**

- `lib/cajero/contexto.ts`: una función server que devuelve `{ metodosPago: [{id, nombre, tipoCuenta}], rubro, redondeoActivo, rol }` (queries a `metodos_pago` activos y `configuracion_tienda`). Se inyecta serializado al system prompt para que el modelo conozca los métodos válidos sin tool extra.
- `lib/cajero/openai.ts`: `transcribirAudio(blob): Promise<string>` (POST multipart a `/v1/audio/transcriptions`, `model=whisper-1`, `language=es`) y `chatConTools(mensajes, tools, ejecutarTool)`: loop de chat completions con `tool_calls`, máx. 6 iteraciones, timeout 30 s, modelo desde `CAJERO_MODELO` (default `gpt-4o-mini`). Errores tipados y sin filtrar la API key.

**Archivos afectados:** `app/lib/cajero/contexto.ts`, `app/lib/cajero/openai.ts`

---

### Paso 4: Tools y dispatcher

Crear `lib/cajero/tools.ts`.

**Acciones:**

- Definir 6 tools con JSON Schema estricto:
  - `buscar_productos(query)` → `buscarVariantesAction`, mapear a candidatos compactos (máx. 8): `{ variante_id, etiqueta ("Coca Cola 3L"), precio, stock_efectivo, unidad }`.
  - `buscar_cliente(query)` → `buscarClientesAction` (máx. 5 candidatos).
  - `proponer_venta(items[{variante_id, cantidad}], recibido?, cliente_id?)` → resuelve precios reales de las variantes, llama `armarPropuestaVenta`, guarda `propuestaPendiente` en el estado del turno y devuelve el resumen numérico al modelo.
  - `registrar_venta()` → **solo si hay `propuestaPendiente` de tipo venta**; arma `RegistrarVentaInput` (pago efectivo por defecto con el método de tipo efectivo del contexto, `monto = recibido` o total) y llama `registrarVenta`. Limpia la propuesta.
  - `proponer_producto(nombre, precio_venta, precio_compra?, codigo_barras?, descripcion?)` → normaliza a `ProductoInput` de 1 variante (código dictado o `generarCodigoBarrasUnico()`), guarda propuesta.
  - `crear_producto()` / `proponer_precio(producto_id, nuevo_precio)` + `actualizar_precio()` → mismo patrón proponer→ejecutar; `actualizar_precio` llama `actualizarPrecioVenta`.
- Dispatcher `ejecutarTool(nombre, args, sesion)`: valida el guard de confirmación **en código** (si una tool de ejecución llega sin propuesta pendiente, devuelve `{ error: 'Primero proponé y esperá confirmación del usuario' }` al modelo).

**Archivos afectados:** `app/lib/cajero/tools.ts`

---

### Paso 5: System prompt

Crear `lib/cajero/prompts.ts`.

**Acciones:**

- Rol: cajero argentino, respuestas ≤ 2 frases, números en formato hablado ("catorce mil ochocientos").
- Reglas duras: (1) nunca llamar tools de ejecución sin que el usuario haya confirmado la propuesta en un turno posterior; (2) ante 2+ candidatos plausibles, preguntar cuál; (3) ante 0 candidatos, avisar y ofrecer cargarlo; (4) datos no mencionados = defaults (sin cliente, sin descuento, efectivo); (5) pedidos fuera de alcance (devoluciones, caja, CC, configuración) → indicar la pantalla correspondiente; (6) no inventar precios ni stock: todo sale de tools.
- Inyección del contexto de tienda (métodos de pago, rubro, redondeo, rol) y de la fecha.
- Incluir 3 few-shots compactos: venta multi-ítem con vuelto, desambiguación de Coca, cambio de precio.

**Archivos afectados:** `app/lib/cajero/prompts.ts`

---

### Paso 6: API route `/api/cajero`

**Acciones:**

- POST multipart (`audio` webm/opus, `estado` JSON con historial acotado a los últimos 12 mensajes + propuesta pendiente) o JSON con `texto` (para probar sin micrófono).
- Auth: `createClient()` de `lib/supabase/server` + perfil (patrón de `requireCtx`). Sin sesión → 401.
- Rate limit: `rateLimitOk(`cajero:${tiendaId}`, 30, 60_000)`.
- Si falta `OPENAI_API_KEY` → 503 con mensaje claro.
- Pipeline: transcribir → si `parsearComandoNav(transcript)` matchea y no hay conversación en curso → responder navegación sin LLM (gratis) → si no, `chatConTools`.
- Respuesta: `RespuestaCajero { transcript, hablar, estado (historial actualizado + propuestaPendiente), resultado? ({ tipo: 'venta', ventaId, numeroTicket } | { tipo: 'producto', id } | { tipo: 'precio' }) }`.
- Límites: audio máx. 25 s / 2 MB; truncar transcript a 500 chars.

**Archivos afectados:** `app/app/api/cajero/route.ts`

---

### Paso 7: Cliente — CajeroProvider + useTts

**Acciones:**

- `useTts.ts`: `hablar(texto)` con `speechSynthesis`, voz `es-AR`/`es-419` si existe, `cancel()` al iniciar nueva grabación.
- `CajeroProvider.tsx`: estados `inactivo | grabando | procesando | hablando | esperando_confirmacion | error`. Listeners globales F10 (keydown empieza a grabar si no repeat, keyup corta y envía; `preventDefault`). MediaRecorder audio/webm. Mantiene `EstadoConversacion`; expira la conversación tras 60 s sin actividad. Al recibir respuesta: actualizar HUD, `hablar(respuesta.hablar)`; si `resultado.tipo === 'venta'`, toast con nº de ticket. `confirmar()` / `cancelar()` mandan turno de texto ("sí" / "cancelar") — la confirmación por voz es simplemente el próximo utterance.
- Ocultar todo si el flag `cajeroHabladoActivo` es falso o no hay `mediaDevices`.

**Archivos afectados:** `app/components/cajero/CajeroProvider.tsx`, `app/components/cajero/useTts.ts`

---

### Paso 8: Cliente — CajeroHUD + integración AppShell

**Acciones:**

- `CajeroHUD.tsx`: panel `fixed` inferior (misma zona que `VoiceHUD`, sin superponerse) con: indicador de estado (grabando pulsante / pensando / hablando), transcript del usuario, respuesta del agente, y bloque de propuesta cuando `esperando_confirmacion`: tabla mini de ítems con subtotales, total, recibido, vuelto (o producto/precio según tipo) + botones `Confirmar` / `Cancelar` de `components/ui/Button`. Tokens semánticos, sin hex.
- `AppShell.tsx`: montar `CajeroProvider` + HUD; pasar flag desde `(dashboard)/layout.tsx` (`!!process.env.OPENAI_API_KEY`, expuesto como prop server→client, no como env pública).
- `VoiceFab.tsx`: long-press (≥ 350 ms) = push-to-talk del cajero (pointerdown/pointerup); tap corto = comportamiento actual. Hint visual "Mantené F10 para hablar" en el HUD inicial.

**Archivos afectados:** `app/components/cajero/CajeroHUD.tsx`, `app/components/layout/AppShell.tsx`, `app/components/voz/VoiceFab.tsx`, `app/app/(dashboard)/layout.tsx`

---

### Paso 9: Documentación

**Acciones:**

- `CLAUDE.md`: fila en la tabla de recursos de la app: Cajero hablado — `/api/cajero`, `lib/cajero/`, alcance v1 (venta/alta/precio), requiere `OPENAI_API_KEY`.
- `contexto/proyectos.md`: agregar a "En desarrollo".
- Nota en el plan (al implementar): agregar `OPENAI_API_KEY` y `CAJERO_MODELO` en Vercel y `.env.local` (no commitear).

**Archivos afectados:** `CLAUDE.md`, `contexto/proyectos.md`

---

### Paso 10: Validación

**Acciones:**

- `npx tsc --noEmit` sin errores.
- `node --test lib/cajero/propuesta.test.ts` (o el glob de tests del repo) en verde.
- Prueba manual por texto (POST JSON a `/api/cajero`) de los 3 flujos + desambiguación + fuera de alcance.
- Prueba manual por voz en Chrome desktop: F10, frase multi-ítem, confirmación hablada, ticket generado; verificar que la venta aparece en `/ventas` y descuenta stock.
- Verificar que sin `OPENAI_API_KEY` la app no muestra nada nuevo y el wizard viejo sigue funcionando.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `AppShell.tsx` monta el sistema de voz actual; es el único punto de integración UI.
- `registrarVenta` es también consumido por `POSContainer` y `actions/catalogo.ts` (conversión de pedidos) — **no se modifica**, solo se consume.
- `PosAtajosHelp.tsx` documenta atajos del POS — revisar colisión de F10.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` y `contexto/proyectos.md` (Paso 9).
- Si en fase 2 se agrega gating por plan: `lib/planes/config.ts` (nueva `Feature`).

### Impacto en Flujos de Trabajo Existentes

- Ninguna ruta ni action existente cambia de contrato. El wizard de voz por reglas convive. Sin migraciones de DB. El costo de API solo se incurre al usar el feature.

---

## Lista de Validación

- [ ] `npx tsc --noEmit` sin errores nuevos
- [ ] Tests de `lib/cajero/propuesta.test.ts` en verde
- [ ] Venta multi-ítem por voz: propone total y vuelto correctos (redondeo $100) y solo cobra tras "sí"
- [ ] Desambiguación: "cocacola" con 3 presentaciones → pregunta y no cobra
- [ ] Alta de producto por voz crea producto visible en `/productos` con código de barras válido
- [ ] Cambio de precio: funciona como owner, rechazado como vendedor
- [ ] Producto inexistente → avisa y ofrece cargarlo, sin inventar
- [ ] Pedido fuera de alcance → deriva a la pantalla, no intenta ejecutar
- [ ] Sin `OPENAI_API_KEY`: cero UI nueva, wizard viejo intacto
- [ ] Rate limit responde 429 al exceder 30 req/min por tienda
- [ ] CLAUDE.md y contexto/proyectos.md actualizados

---

## Criterios de Éxito

1. La frase del pedido original ("3 Coca, 359 g de paleta, 1 aceite 2,25 L, billete de 20 mil") produce una venta correcta con vuelto correcto, hablada de punta a punta, en ≤ 4 turnos.
2. Ninguna operación de escritura ocurre sin propuesta previa + confirmación explícita del usuario.
3. El costo por interacción se mantiene ≤ USD 0,02 y la latencia percibida por turno ≤ 3 s en condiciones normales.

---

## Notas

- **Fase 2 (fuera de este plan):** botón del auricular Bluetooth vía Media Session API; TTS neural (OpenAI) en `useTts`; tools de stock (`ingresarStock`/`ajustarStock`) y venta a cuenta corriente para distribuidora; gating por plan Pro; métricas de uso por tenant.
- **Seguridad:** la API key vive solo en el server; el route valida sesión Supabase y tenant en cada request; las tools heredan RLS y validaciones de las actions. El estado de conversación que viaja al cliente no contiene datos sensibles (solo ids y etiquetas ya visibles para ese usuario).
- **Riesgo principal:** calidad de transcripción de nombres de producto locales. Mitigación: `buscar_productos` con matching flexible del lado del server (ya lo hace `buscarVariantes`) + la desambiguación conversacional absorbe los errores de STT.

---

## Notas de Implementación

**Implementado:** 2026-08-21

### Resumen

Se implementó el pipeline completo: `lib/cajero/` (tipos, propuesta pura + 10 tests, contexto de tienda, cliente OpenAI por fetch, tools con guard de confirmación en código, system prompt), route `/api/cajero` (auth + rate limit + STT + router + navegación local sin LLM), action `actualizarPrecioVenta` (solo owner/admin), y el cliente (`CajeroProvider` con push-to-talk F10 y MediaRecorder, `useTts` con speechSynthesis es-AR, `CajeroHUD` con propuesta y botones Confirmar/Cancelar). Integrado en `AppShell`, long-press del `VoiceFab` y flag `cajeroHabladoActivo` desde el layout. Docs actualizadas (CLAUDE.md, contexto/proyectos.md).

### Desviaciones del Plan

- Los tests corren con `npx tsx --test` (no `node --test` pelado): los `*.test.ts` existentes del repo usan imports sin extensión, que Node con strip-types no resuelve. Mismo mecanismo para todos.
- `buscar_productos` excluye variantes-pack en v1 (el manejo de `pack_size` en la venta queda para fase 2).
- Se guarda un pool de `candidatos` en el estado de conversación: `proponer_venta`/`proponer_precio` solo aceptan ids ya devueltos por `buscar_productos` (fuerza el flujo buscar → proponer y evita que el modelo invente ids).
- Preguntas abiertas resueltas con los defaults propuestos: piloto abierto detrás de `OPENAI_API_KEY`, precio solo owner/admin, F10 confirmada libre (el POS usa F2/Enter/Esc/?).

### Problemas Encontrados

- Error de tsc preexistente (del trabajo en curso de tramos): `mapVarianteRaw` en `actions/ventas.ts` no seteaba `tramos`. Se corrigió con `tramos: []`.
- Pendiente de prueba manual (requiere `OPENAI_API_KEY` en `.env.local` / Vercel): flujo de voz end-to-end en Chrome, calidad de transcripción de nombres locales, y validación de los 3 intents contra datos reales.
