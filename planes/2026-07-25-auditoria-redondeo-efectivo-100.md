# Plan: Auditoría y endurecimiento del redondeo efectivo a $100

**Creado:** 2026-07-25  
**Estado:** Implementado  
**Pedido:** Analizar en profundidad el redondeo de efectivo a $100 en `/pos` antes de subir cambios: historial, si es ganancia, visibilidad, ticket por rubro, opcionalidad, práctica de mercado e información al cliente.

---

## Descripción General

### Qué Logra Este Plan

Documenta el comportamiento real del redondeo a $100 (ya implementado en código), responde las preguntas de producto/contables, y define qué hay que corregir **antes de deploy** para que el dinero sea trazable, configurable por tienda y transparente en el ticket. No asume merge a producción hasta cerrar las preguntas abiertas.

### Por Qué Importa

CValleTienda es multi-rubro y multi-tenant: un redondeo “hardcoded” para todos afecta caja, tickets, confianza del cliente y reportes de ganancia. Adonai (despensa) ya opera con centavos por peso; el redondeo evita monedas, pero hoy el “ajuste” queda semi-invisible. Subir así genera faltantes/sobrantes mal interpretados y preguntas como las de este pedido.

---

## Estado Actual

### Respuestas cortas (hallazgos)

| Pregunta | Respuesta actual |
| -------- | ---------------- |
| ¿En `/pos` el efectivo redondea en $100? | **Sí, parcialmente.** UI sugiere cobro techo a $100; servidor entrega vuelto solo en múltiplos de $100; el resto queda en caja. |
| ¿Hay historial de ese dinero? | **Débil.** Solo texto en `ventas.observaciones`. No hay columna, movimiento ni reporte dedicado. |
| ¿Es ganancia? | **Es ingreso de caja / “ajuste por redondeo”, no ganancia de producto.** No entra en margen (precio−costo). Sí aumenta el efectivo físico vs el total de la venta. |
| ¿Cómo se ve en el sistema? | Chip/hint en POS; nota en observaciones de la venta; ticket solo si hay `observaciones`; **no** en KPIs ni cierre como línea aparte. |
| ¿En el ticket de todos los rubros? | Mismo ticket para todos los rubros. Si hay obs, figura como `Obs: Redondeo efectivo $X…`. No hay línea propia “Ajuste redondeo”. |
| ¿Es opcional? | **A medias.** El cajero puede tipear el monto exacto (sugerencia no bloquea). Si hay exceso, el servidor **siempre** no devuelve el resto &lt; $100. **No** hay toggle por tienda/rubro. |
| ¿Es normal en estos sistemas? | **Sí** (AR sin monedas; Swedish/Australian rounding; POS locales redondean a $1/$10/$100). |
| ¿Se informa al cliente? | Solo si imprime ticket con observaciones. No hay línea clara ni mensaje verbal obligatorio en UI. |
| ¿Está bien que sea opcional? | Para SaaS multi-rubro: **sí debe ser configurable por tienda** (default on o off a decidir). |

### Cómo funciona hoy (flujo)

Ejemplo: total venta `$1.247` · cliente paga `$1.300` efectivo.

1. `pagos_venta.monto = 1300` → trigger `mover_fondos_por_pago_venta` registra **ingreso** $1.300 en cuenta efectivo.
2. `exceso = 53` → `vueltoEntregable(53) = 0` → **no** hay egreso de vuelto.
3. `ajuste = 53` → se appendea a `ventas.observaciones`:  
   `Redondeo efectivo $53.00 (sin vuelto en monedas)`.
4. Efectivo neto en cajón por la venta: **+$1.300** (o si hubiera vuelto $700 sobre exceso $753 → egreso $700, quedan $53).
5. `ventas.total` sigue en **$1.247** → reportes de ventas/margen usan $1.247; la plata extra vive solo en fondos/caja.

Funciones clave: `app/lib/pos/redondeo-efectivo.ts`  
- `sugerirMontoEfectivo` = `ceil` a $100  
- `vueltoEntregable` = `floor` a $100  
- `ajusteRedondeoEfectivo` = resto  

Wired en:

- `app/lib/pos/pago-rapido.ts` (chips pago rápido efectivo)
- `app/components/pos/PagoMultiMetodo.tsx` / `PasoPago.tsx` (UI)
- `app/app/actions/ventas.ts` (~645–676) (servidor: vuelto + nota)

### Estructura Existente Relevante

| Ruta | Rol |
| ---- | --- |
| `app/lib/pos/redondeo-efectivo.ts` | Lógica pura + constante `REDONDEO_EFECTIVO_MULTIPLO = 100` |
| `app/lib/pos/redondeo-efectivo.test.ts` | Tests unitarios |
| `app/app/actions/ventas.ts` | Aplica vuelto floor + escribe observaciones |
| `app/components/pos/PagoMultiMetodo.tsx` | Muestra “Ajuste redondeo… queda en caja” |
| `app/components/pos/PagoRapidoChips.tsx` | Hint al cajero |
| `app/components/impresion/TicketVentaRenderer.tsx` | Imprime `observaciones` genéricas |
| `supabase/.../build_payload_ticket_venta` | Payload incluye `observaciones` |
| `app/types/database.ts` → `ConfiguracionTienda` | **Sin** flag de redondeo |
| Trigger `pagos_venta_mover_fondos` | Ingreso = monto cobrado (incluye lo que después queda como ajuste) |

### Brechas o Problemas que se Abordan

1. **Sin trazabilidad contable:** no se puede sumar “cuánto ganamos/ajustamos por redondeo este mes” sin parsear texto.
2. **Sin config por tienda:** al deploy, aplica a indumentaria, despensa, ferretería, etc. por igual.
3. **Ticket ambiguo:** “Obs: …” no es una línea de total; fácil de pasar por alto o confundir con nota libre del cajero.
4. **Doble naturaleza “opcional”:** UX sugiere pero no fuerza cobro; servidor sí fuerza política de vuelto → riesgo de inconsistencia percibida.
5. **Cierre de caja:** el ajuste ya está dentro de `efectivo_esperado` (porque el ingreso fue el monto cobrado); no aparece como concepto → el dueño no entiende de dónde salieron centavos/sobrantes chicos.
6. **No es ganancia de producto:** si alguien mira solo “ganancia bruta”, subestima el efectivo real del turno.

---

## Cambios Propuestos

### Resumen de Cambios

*(Pendiente de OK en preguntas abiertas; este es el paquete recomendado pre-deploy.)*

- Agregar config por tienda: `redondeo_efectivo_activo` + `redondeo_efectivo_multiplo` (default 100).
- Persistir `redondeo_efectivo_monto` en `ventas` (numeric) además de/en vez de solo texto en observaciones.
- Mostrar en ticket una línea explícita **“Ajuste redondeo”** (no solo Obs).
- Exponer total del turno/día en preview de caja o reporte simple (suma `redondeo_efectivo_monto`).
- Respetar el flag en UI y en `registrarVenta` (si off → vuelto exacto a centavo, sin ceil sugerido).
- Documentar en `contexto/` / ayuda corta: no es margen de producto; sí es plata en caja; informar al cliente.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260725000001_redondeo_efectivo_config_y_columna.sql` | Columnas config + `ventas.redondeo_efectivo_monto`; default seguro |
| `salidas/2026-07-25-redondeo-efectivo-guia-producto.md` | Guía corta para dueños: qué es, cómo se ve, si informar al cliente |
| `app/lib/pos/redondeo-efectivo-config.ts` (si hace falta) | Helper leer config tienda + defaults |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/types/database.ts` | Campos en `ConfiguracionTienda` y `Venta` |
| `app/lib/pos/redondeo-efectivo.ts` | Aceptar múltiplo configurable (no hardcode 100) |
| `app/app/actions/ventas.ts` | Leer config; si off, vuelto = exceso exacto; si on, persistir monto en columna + línea ticket-friendly |
| `app/lib/pos/pago-rapido.ts` + componentes POS | Respetar flag; no sugerir ceil si off |
| `app/components/configuracion/TicketForm.tsx` o form cobros/POS | Toggle “Redondear vuelto efectivo a $100” |
| `app/components/impresion/TicketVentaRenderer.tsx` + `lib/impresion/types.ts` | Campo `ajuste_redondeo` en payload / fila dedicada |
| `supabase` `build_payload_ticket_venta` | Incluir `ajuste_redondeo` desde columna venta |
| `app/components/caja/ResumenTurnoPanel.tsx` (opcional fase 1) | Mini “Ajustes redondeo del turno: $X” |
| `app/lib/pos/redondeo-efectivo.test.ts` | Casos con config off/on y múltiplo |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas (recomendadas; confirmar en preguntas abiertas)

1. **El ajuste NO es ganancia de mercadería:** no modificar cálculo de margen/costo. Tratarlo como “ajuste de efectivo / otros ingresos de caja”.
2. **Trazabilidad por columna en `ventas`:** `redondeo_efectivo_monto numeric(14,2) default 0` — consultable y sumable; observaciones pueden seguir como respaldo humano.
3. **Configurable por tienda, no por rubro:** el rubro no define la política; el dueño sí (despensa vs boutique).
4. **No informar al cliente en el ticket** (decisión dueño 2026-07-28): evitar que se lea como recargo por efectivo. Trazabilidad solo interna.
5. **Default `redondeo_efectivo_activo = true`:** conserva el comportamiento ya presente en el POS; cada tienda puede apagarlo en Configuración → Cobros.
6. **No crear movimiento_fondos separado de “ajuste”** en v1: el dinero ya está en el ingreso del pago − vuelto. Un segundo movimiento duplicaría saldo. La columna en venta es la fuente de verdad analítica.

### Alternativas Consideradas

| Alternativa | Por qué no (por ahora) |
| ----------- | ---------------------- |
| Movimiento `tipo=ajuste` por cada venta | Duplicaría efecto en `saldo_actual` si no se resta del ingreso; más frágil con anulación. |
| Solo texto en observaciones | Ya está; insuficiente para reportes y tickets claros. |
| Redondear el `total` de la venta | Distorsiona stock/valor de mercadería e IVA/factura; peor. |
| Forzar cobro ceil sin poder editar | Mala UX; el cajero a veces recibe billete exacto o monto raro. |
| Aplicar solo a rubro despensa | Otros rubros en AR también sufren falta de monedas; mejor toggle. |

### Preguntas Abiertas (bloquear implementación hasta respuesta)

1. **¿Default on u off al deploy?**  
   - A) Off global → cada tienda activa en Configuración.  
   - B) On global → Adonai y todas redondean ya.
2. **¿Múltiplo fijo $100 o configurable ($10 / $100 / $1000)?**  
   - Recomendado v1: fijo 100 + flag on/off; múltiplo después.
3. **¿El ticket debe mostrar siempre la línea de ajuste?** (recomendado: sí si monto &gt; 0)
4. **¿Mostrar “Ajustes redondeo del turno” en cierre de caja en esta misma entrega?** (recomendado: sí, aunque sea una línea)
5. **¿Política verbal al cliente?** ¿Agregamos hint en pantalla de cobro tipo “Informá el ajuste al cliente”? (copy only)
6. **¿Subimos el código actual tal cual mientras tanto?**  
   - Recomendado: **no** a producción multi-tenant hasta toggle + columna; o deploy solo a Adonai si hay feature flag.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación **después del OK** a las preguntas abiertas.

### Paso 0: Cerrar decisiones de producto

**Acciones:**

- Registrar en este plan (sección Notas) las respuestas a preguntas 1–6.
- Si default = off: el código actual de redondeo debe quedar detrás del flag antes de cualquier deploy.

**Archivos afectados:**

- `planes/2026-07-25-auditoria-redondeo-efectivo-100.md`

---

### Paso 1: Migración DB

**Acciones:**

- `alter table configuracion_tienda add column redondeo_efectivo_activo boolean not null default false;`  
  (o `true` según decisión)
- `alter table ventas add column redondeo_efectivo_monto numeric(14,2) not null default 0;`
- Comentarios SQL documentando: “Monto retenido en caja por redondeo de vuelto; no altera total de venta.”
- Actualizar `build_payload_ticket_venta` para incluir `'ajuste_redondeo', v_venta.redondeo_efectivo_monto`.

**Archivos afectados:**

- `supabase/migrations/20260725000001_redondeo_efectivo_config_y_columna.sql`

---

### Paso 2: Tipos + librería

**Acciones:**

- Extender `ConfiguracionTienda` y `Venta` en `database.ts`.
- Parametrizar `redondeo-efectivo.ts` con múltiplo (default 100); si config off, callers no usan ceil/floor.
- Ampliar tests: off → ajuste 0 y vuelto = exceso exacto; on → casos actuales.

**Archivos afectados:**

- `app/types/database.ts`
- `app/lib/pos/redondeo-efectivo.ts`
- `app/lib/pos/redondeo-efectivo.test.ts`

---

### Paso 3: `registrarVenta` respeta config y persiste monto

**Acciones:**

- Cargar `redondeo_efectivo_activo` de la tienda.
- Si **off**: `vuelto = exceso` (comportamiento clásico previo); `redondeo_efectivo_monto = 0`; no appendear nota de redondeo.
- Si **on**: lógica actual (`vueltoEntregable` / `ajusteRedondeoEfectivo`); guardar monto en columna; observaciones opcionales (o dejar de depender de ellas para el ticket).
- Anulación: no requiere movimiento extra (el egreso de anulación ya revierte pagos/vuelto existentes).

**Archivos afectados:**

- `app/app/actions/ventas.ts`

---

### Paso 4: POS UI

**Acciones:**

- Pasar flag a `PagoMultiMetodo` / chips / `PasoPago` (desde page POS o config ya cargada).
- Si off: no ceil en sugerencias; no mostrar “Ajuste redondeo”.
- Si on: mantener hint; opcional copy “Comunicá el ajuste al cliente”.

**Archivos afectados:**

- `app/lib/pos/pago-rapido.ts`
- `app/components/pos/PagoMultiMetodo.tsx`
- `app/components/pos/PagoRapidoChips.tsx`
- `app/components/pos/cobro-guiado/PasoPago.tsx`
- Page/container POS que carga config

---

### Paso 5: Ticket

**Acciones:**

- Tipo payload: `ajuste_redondeo?: number`.
- Renderer: si `> 0`, fila `Ajuste redondeo` entre pagos y pie (o bajo TOTAL con aclaración “quedó en caja”).
- No depender solo de `observaciones`.

**Archivos afectados:**

- `app/lib/impresion/types.ts`
- `app/components/impresion/TicketVentaRenderer.tsx`
- Migración `build_payload_ticket_venta`

---

### Paso 6: Configuración UI

**Acciones:**

- Toggle en pantalla de ticket o cobros/POS: “Redondear vuelto en efectivo (múltiplos de $100)”.
- Texto ayuda: “El resto menor a $100 no se devuelve; queda en caja y figura en el ticket. No modifica el total de la venta ni la ganancia por producto.”

**Archivos afectados:**

- Form de configuración relevante (`TicketForm` o sección cobros)
- Action update config

---

### Paso 7: Visibilidad en caja (mínimo viable)

**Acciones:**

- En preview/cierre: sumar `ventas.redondeo_efectivo_monto` del turno (ventas de la sesión) y mostrar “Ajustes redondeo: $X”.
- No cambiar fórmula de `efectivo_esperado` (ya incluye el efectivo físico).

**Archivos afectados:**

- `app/lib/caja/queries.ts` o RPC preview (si se extiende)
- `app/components/caja/ResumenTurnoPanel.tsx`

---

### Paso 8: Guía producto + validación

**Acciones:**

- Escribir `salidas/2026-07-25-redondeo-efectivo-guia-producto.md` con las respuestas de este plan en lenguaje dueño-de-tienda.
- Checklist manual POS: venta con exceso $53 → ticket + columna + caja.
- Tests unitarios verdes.

**Archivos afectados:**

- `salidas/2026-07-25-redondeo-efectivo-guia-producto.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- Todo el flujo de cobro POS (clásico + guiado)
- `registrarVenta` / anulación / triggers de fondos
- Impresión ticket venta
- Cierre de caja (`efectivo_esperado` indirectamente)
- Adonai y cualquier tienda con precios/pesos con centavos

### Actualizaciones Necesarias para Consistencia

- `contexto/datos-actuales.md` o guía en `salidas/` tras decidir defaults
- No requiere cambio de `CLAUDE.md` salvo que se documente un nuevo módulo de config relevante a skills

### Impacto en Flujos de Trabajo Existentes

- **Cajeros:** hint de cobro y vuelto cambian según flag.
- **Dueños:** pueden activar/desactivar; ven ajuste en ticket y (si Paso 7) en cierre.
- **Factura AFIP:** sin cambio al total de venta (correcto).
- **Ventas históricas:** `redondeo_efectivo_monto = 0`; observaciones viejas quedan como texto si ya se usó el feature en staging.

---

## Lista de Validación

- [x] Preguntas abiertas 1–6 respondidas y anotadas en Notas
- [ ] Migración aplicada en entorno de prueba / prod (manual en Supabase)
- [x] Con flag **off**: cobro exacto, vuelto con centavos (código + tests)
- [x] Con flag **on**: ajuste en columna; **sin** línea ticket / sin obs
- [x] `ventas.total` no cambia por el ajuste
- [x] Margen/ganancia producto no incluye el ajuste
- [x] Toggle visible en Configuración → Cobros
- [x] Mismo comportamiento en cobro clásico y guiado
- [x] Tests `redondeo-efectivo.test.ts` OK
- [x] Guía en `salidas/` escrita
- [ ] Deploy a prod tras aplicar migración

---

## Criterios de Éxito

1. Se puede explicar en una frase al dueño: *“No es ganancia del producto; es plata que no devolviste en monedas; está en la caja; no sale en el ticket.”*
2. Se puede consultar SQL: `select sum(redondeo_efectivo_monto) from ventas where …`
3. Cada tienda puede apagar el redondeo sin redeploy.
4. El ticket **no** muestra el ajuste al cliente; el dueño lo ve en caja.

---

## Notas

### Práctica de mercado (contexto)

En Argentina, con inflación y desaparición de monedas/billetes chicos, es habitual:

- Redondear cobro/vuelto a $10 / $100.
- Dejar el resto “para el cambio / caramelos” o absorberlo.
- Aclararlo en ticket reduce fricción (“ajuste por redondeo”).

En POS internacionales: *cash rounding* (Suecia, Canadá, Australia, NZ) es estándar cuando se retiran monedas. Suele ser **por ley o política del comercio**, visible en el comprobante, y **no** se mezcla con el precio de lista del ítem.

### Contabilidad simple para el dueño

| Concepto | ¿Incluye el redondeo? |
| -------- | --------------------- |
| Total venta / ticket TOTAL | No |
| Ganancia bruta (venta − costo) | No |
| Efectivo en cajón / saldo cuenta efectivo | Sí (implícito) |
| “Otros ingresos / ajustes redondeo” (nuevo) | Sí (explícito con la columna) |

### Relación con el faltante Adonai del 21/7 (−$1.271,60)

Ese faltante **no** se explica por este feature (fiado Omar $1.000 + resto). El redondeo, al contrario, tiende a generar **sobrantes chicos** en caja vs total de ventas, no faltantes. El cierre con centavos (`efectivo_esperado` con `,60`) es otro tema (suma exacta del turno); se puede atacar después con “esperado de arqueo” piso a $100.

### Respuestas del usuario (cerradas 2026-07-28)

- Default on/off: **on** (`true`)
- Múltiplo fijo vs configurable: **fijo $100**
- Línea en ticket: **no** (no se muestra al cliente; no se escribe en observaciones)
- Línea en cierre: **sí** (“Ajustes redondeo (interno)”)
- Hint verbal en UI: **solo cajero** (sin “informá al cliente”)
- ¿Deploy código actual mientras tanto?: N/A — se implementó el paquete completo

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

Toggle por tienda, columna `ventas.redondeo_efectivo_monto`, POS/servidor respetan el flag, resumen de caja muestra el total del turno. Sin línea ni obs en ticket.

### Desviaciones del Plan

- **Paso 5 (ticket):** omitido a propósito — el dueño no quiere mostrar el ajuste al cliente.
- No se actualizó `build_payload_ticket_venta` ni `TicketVentaRenderer`.
- No se appendean observaciones de redondeo (evita que salgan en `Obs:` del ticket).
- Migración sin cambios al payload de impresión.

### Problemas Encontrados

Ninguno. Tests unitarios de redondeo (7) y resumen-turno (7) OK.

### Pendiente operativo

- Aplicar migración `supabase/migrations/20260725000001_redondeo_efectivo_config_y_columna.sql` en Supabase antes de usar en prod.