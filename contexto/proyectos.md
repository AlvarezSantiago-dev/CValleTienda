# Proyectos

> Lista de proyectos pendientes o en desarrollo para Claude Code. Cada ítem es algo a construir, automatizar o sistematizar dentro del workspace.

---

## En desarrollo

| Proyecto | Descripción | Prioridad |
|----------|-------------|-----------|
| CValleTienda MVP | Sistema SaaS CRM/POS multi-rubro. Stack: Next.js + Supabase + Vercel. Módulos: dashboard, POS, ventas, devoluciones, caja, clientes, productos, stock, configuración, impresión client-side, **pedido CC + remito auto (distribuidora)**. Design System v2 activo. | Alta |
| Cajero hablado | Agente de voz push-to-talk (F10 / FAB): venta multi-ítem con vuelto, alta de producto y cambio de precio. Claude Haiku o GPT-4o-mini + Web Speech. Plan: `planes/2026-08-21-cajero-hablado.md`. Requiere `ANTHROPIC_API_KEY` u `OPENAI_API_KEY`. | Alta |

---

## Módulos Implementados

- **Dashboard** — métricas y KPIs.
- **POS** — venta con búsqueda/scanner, multi-pago, cliente, descuentos. Cobro clásico: panel (cliente/descuento/notas) + modal de montos (`CobroPagoModal`). Modo guiado: wizard 4 pasos. En rubro `distribuidora`: Pedido (Contado / A cuenta), recargo %, remito automático y ledger `saldo_cc`. Tramos de cantidad (dto. % desde N u.) en POS y catálogo.
- **Ventas** — listado, detalle, reimpresión.
- **Devoluciones** — total/parcial con reintegro.
- **Caja** — apertura/cierre con conciliación por cuenta. Cajero (`vendedor`) puede registrar ingresos/egresos manuales del turno; editar/eliminar solo owner/admin.
- **Clientes** — CRUD + cuenta corriente. Recibo térmico de cobro CC (`/recibos-cc/[id]`).
- **Productos** — productos con variantes (talla/color), códigos EAN-13, **foto de tapa + fotos por color** (Supabase Storage). Tramos de descuento por cantidad.
- **Catálogo público** — link `/c/{slug}`, productos marcados a mano, pedidos por WhatsApp, inbox `/pedidos` (editable), conversión a venta/remito (Contado o A cuenta, un remito).
- **Packs por variante** — códigos de unidad/pack, asociación desde Productos/POS y precio pack automático al completar unidades (incluye carnicerías).
- **Stock** — control y ajustes de stock por variante. En **despensa/carnicería**: `stock_actual = -1` = ilimitado (no se descuenta al vender).
- **Configuración** — datos de tienda, métodos de pago, cuentas de fondos, plantillas de etiqueta.
- **Impresión** — automática client-side: ticket post-venta directo desde POS, reimpresión desde Ventas/Devoluciones, botón de etiquetas por variante en Productos (cantidad por defecto = stock), plantilla única configurable con preview en vivo. Sin cola. Auto-print con `chrome --kiosk-printing` en la PC de caja. Agente local **PrintBridge v3.1.2** en `scripts/printbridge-v3/` (perfiles 58/80, TSPL etiquetas, panel en 127.0.0.1; config en `%APPDATA%\CVallePrintBridge\`).

---

## Completados

| Proyecto | Descripción | Resultados |
|----------|-------------|------------|
| Rediseño UI/UX v2 (Fable) | Rediseño visual/estructural completo (Fases 0–10). Plan: `planes/2026-07-28-rediseno-uiux-completo-fable.md`. Spec: `referencia/design-system-v2.md`. Showcase: `/design`. | Tokens + primitives + shell + módulos + auth/setup; barrido `lime-*`/`indigo-*`; docs CLAUDE actualizados. |
| Catálogo público + pedidos WhatsApp | Vitrina `/c/[slug]`, opt-in por producto, inbox y conversión a venta/remito. Plan: `planes/2026-08-19-catalogo-publico-pedidos-whatsapp.md`. | Link compartible, WA del tenant, stock al confirmar envío. |
| Landing polish + legales | Pulido tokens landing + páginas `/terminos`, `/privacidad`, `/aviso-legal`. Plan: `planes/2026-07-28-landing-legales-polish.md`. Config: `app/lib/legal/site.ts`. | Footer legal, checkbox en registro, copy orientativo AR. |
| Fix responsive mobile/tablet | Navegación drawer + shell + overlays. Plan: `planes/2026-08-11-fix-responsive-mobile-tablet.md`. | z-index drawer > overlay; scroll lock/Escape; dismiss Modal/Drawer; tabs scroll; FAB no tapa menú. |

---

## Backlog

| Proyecto | Descripción |
|----------|-------------|
| Módulo de reportes | Dashboard con estadísticas de ventas, productos más vendidos, rendimiento por período |
| App móvil / PWA | Versión optimizada para celular para usar en caja |

---

_Cuando un proyecto se complete, moverlo a la sección "Completados" con su ubicación._
