# Plan: Gestión de Devolución para Rol Cajero

**Creado:** 2026-06-06
**Estado:** Implementado
**Pedido:** Flujo de gestión de devoluciones pensado para el cajero, con acceso rápido desde ventas, selección segura de líneas, devoluciones parciales/total, devolución de fondos y ticket imprimible.

**Resultado:** El flujo ya está implementado en la app: `/ventas/[id]` muestra botón `Devolver`, `/devoluciones/nueva` carga la venta con saldos disponibles y `DevolucionForm` registra la devolución con validaciones.

---

## Descripción General

### Qué logra este plan

Habilita al cajero a procesar devoluciones directamente desde la venta o desde el módulo de devoluciones en el dashboard, con un flujo claro, validaciones contra exceso de devolución y conteo automático de stock.

### Por qué importa

- El cajero es el usuario que más interactúa con devoluciones en el punto de venta.
- Un flujo confuso o incompleto genera errores de stock, movimientos de caja mal registrados y devoluciones sin comprobante.
- Las devoluciones deben ser rápidas, nítidas y seguras, sin obligar al cajero a salir del contexto de la venta.

---

## Estado Actual

### Base existente que aprovecha

- Ya hay un módulo de devoluciones en las especificaciones previas (`2026-04-29-modulo-devoluciones.md`).
- La base de datos ya dispone de la estructura para `devoluciones`, `detalles_devolucion`, `pagos_devolucion`, triggers y numeración atómica.
- La página de venta individual `/ventas/[id]` existe y puede integrar la acción de devolución.

### Lo que falta para el cajero

- Un acceso directo desde la venta que el cajero comprende inmediatamente.
- Un formulario de devolución con foco en selección de líneas, cantidades máximas disponibles y método de pago.
- Validaciones visibles que evitan devolver más de lo que quedó disponible.
- Ticket imprimible al cierre de la devolución.
- Revalidación de rutas clave: `/ventas/[id]`, `/devoluciones`, `/stock`, `/caja`, `/clientes/[id]`.

---

## Cambios Propuestos

### Objetivo del flujo de cajero

1. El cajero abre `/ventas/[id]`.
2. Si la venta está completada y hay ítems con saldo disponible para devolver, aparece un botón `Devolver`.
3. El botón lleva a `/devoluciones/nueva?venta_id={id}`.
4. El formulario carga la venta y muestra solo las líneas con cantidad disponible para devolución.
5. El cajero selecciona cantidades, ingresa motivo obligatorio, elige métodos de devolución y confirma.
6. El sistema valida en servidor que la devolución no supere lo disponible y que los pagos sumen el total a devolver.
7. Se genera el ticket de devolución imprimible y se actualizan stock, caja y métricas automáticamente.

### Componentes y páginas clave

- `app/components/devoluciones/DevolucionForm.tsx`
  - Muestra venta, líneas pendientes de devolución, cantidades máximas y total de devolución.
  - Incluye motivo obligatorio y selector de métodos de pago.
  - Botón `Devolver` con estado de transición y mensajes de error.

- `app/components/devoluciones/TablaDevoluciones.tsx`
  - Lista de devoluciones asociadas a la venta o al módulo de devoluciones.

- `app/components/devoluciones/TicketDevolucion.tsx`
  - Comprobante imprimible con total devuelto, detalles de devolución, método de pago y número.

- `app/app/(dashboard)/devoluciones/nueva/page.tsx`
  - Página de alta que lee `venta_id` de `searchParams` y renderiza `DevolucionForm`.

- `app/app/(dashboard)/ventas/[id]/page.tsx`
  - Botón `Devolver` cuando corresponde.
  - Sección de devoluciones históricas de esa venta.

- `app/lib/devoluciones/queries.ts`
  - `obtenerVentaParaDevolucion(ventaId)` o similar para obtener venta + cantidades disponibles.
  - `listarDevoluciones`, `obtenerDevolucionCompleta`, `obtenerDevolucionesPorVenta`.

- `app/app/actions/devoluciones.ts`
  - `registrarDevolucion(input)` con validaciones server-side.

### Validaciones necesarias

- No permitir cantidades devueltas mayores al saldo disponible.
- No permitir crear devolución sin motivo.
- No permitir que `sum(pagos_devolucion.monto)` sea distinto al total devuelto.
- Si hay devolución de efectivo, exigir que exista una sesión de caja abierta.
- Revalidar todas las rutas afectadas.

### Experiencia del cajero

- Flujo con teclado y mouse: foco en el primer input, selección rápida de cantidades.
- Mostrar claramente la cantidad máxima disponible en cada línea.
- Ofrecer un botón `Devolver todo` para devoluciones totales cuando corresponde.
- Mostrar un resumen final: `Total a devolver`, `Métodos de pago`, `Stock reingresado`.

---

## Criterios de aceptación

- [ ] En `/ventas/[id]` aparece `Devolver` solo si quedan ítems con saldo disponible.
- [ ] `/devoluciones/nueva?venta_id=...` carga la venta y muestra las líneas devolvibles.
- [ ] El cajero no puede devolver más cantidad de la disponible.
- [ ] El motivo es obligatorio.
- [ ] El total devuelto se paga con métodos válidos y el servidor valida el monto exacto.
- [ ] Se imprime ticket de devolución desde la vista del detalle.
- [ ] Stock, caja y métricas de cliente se actualizan automáticamente vía triggers.
- [ ] El flujo es rápido y comprensible para un cajero sin capacitación técnica.

---

## Riesgos y decisiones

- Esta implementación no cambia `ventas.estado`. Una venta `completada` con devolución total sigue siendo `completada` y la devolución netea el monto.
- No se aborda aquí la anulación completa de venta; eso es un flujo separado.
- Se prioriza la seguridad del cajero frente a la velocidad: mejor un campo adicional que un cálculo ambiguo.
