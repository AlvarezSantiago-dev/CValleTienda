# Proyectos

> Lista de proyectos pendientes o en desarrollo para Claude Code. Cada ítem es algo a construir, automatizar o sistematizar dentro del workspace.

---

## En desarrollo

| Proyecto | Descripción | Prioridad |
|----------|-------------|-----------|
| CValleTienda MVP | Sistema SaaS CRM/POS para tiendas de ropa. Stack: Next.js + Supabase + Vercel. Módulos implementados: dashboard, POS, ventas, devoluciones, caja, clientes, productos, stock, configuración, **impresión automática client-side (tickets + etiquetas)**. Arquitectura multi-tenant. | Alta |

---

## Módulos Implementados

- **Dashboard** — métricas y KPIs.
- **POS** — venta con búsqueda/scanner, multi-pago, cliente, descuentos.
- **Ventas** — listado, detalle, reimpresión.
- **Devoluciones** — total/parcial con reintegro.
- **Caja** — apertura/cierre con conciliación por cuenta.
- **Clientes** — CRUD + cuenta corriente.
- **Productos** — productos con variantes (talla/color), códigos EAN-13.
- **Packs por variante** — códigos de unidad/pack, asociación desde Productos/POS y precio pack automático al completar unidades (incluye carnicerías).
- **Stock** — control y ajustes de stock por variante.
- **Configuración** — datos de tienda, métodos de pago, cuentas de fondos, plantillas de etiqueta.
- **Impresión** — automática client-side: ticket post-venta directo desde POS, reimpresión desde Ventas/Devoluciones, botón de etiquetas por variante en Productos (cantidad por defecto = stock), plantilla única configurable con preview en vivo. Sin cola. Auto-print con `chrome --kiosk-printing` en la PC de caja. Agente local **PrintBridge v3.1.2** en `scripts/printbridge-v3/` (perfiles 58/80, TSPL etiquetas, panel en 127.0.0.1; config en `%APPDATA%\CVallePrintBridge\`).

---

## Completados

| Proyecto | Descripción | Resultados |
|----------|-------------|------------|
| — | — | — |

---

## Backlog

| Proyecto | Descripción |
|----------|-------------|
| Módulo de reportes | Dashboard con estadísticas de ventas, productos más vendidos, rendimiento por período |
| App móvil / PWA | Versión optimizada para celular para usar en caja |
| Integración MCP Supabase | Servidor MCP para conectar el workspace con la base de datos del proyecto |
| Landing page de CValleTienda | Página de ventas del producto para captar tiendas interesadas |

---

_Cuando un proyecto se complete, moverlo a la sección "Completados" con su ubicación._
