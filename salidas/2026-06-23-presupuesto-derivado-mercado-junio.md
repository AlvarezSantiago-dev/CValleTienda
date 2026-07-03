# Propuesta Comercial CValleTienda — Derivada del Mercado (Junio 2026)

**Fecha:** 23 de junio de 2026  
**Validez:** 15 días corridos  
**Metodología:** Precios derivados de benchmark competitivo (ver `salidas/2026-06-23-analisis-competencia-pricing-mercado.md`). No usa propuestas internas anteriores.

---

## 1. Para quién es CValleTienda

Sistema **POS + gestión operativa** para comercios minoristas con local físico: ropa, despensa, ferretería, librería y otros rubros. Pensado para **1 sucursal**, con soporte e implementación local (Cinco Saltos / Río Negro).

**No es:** ERP contable completo, plataforma e-commerce ni sincronización nativa Mercado Libre / Tienda Nube (como Bepos).

**Sí es:** Operación de mostrador profunda — scanner, caja, stock por variantes, reportes de ganancia, gráficos, PrintBridge para tickets/etiquetas, adaptación por rubro.

---

## 2. Precios vigentes (lanzamiento)

| Concepto | Precio ARS | Notas |
|----------|------------|-------|
| **Plan Operativo** (Básico) | **$39.900 / mes** | POS, caja, stock, dashboard, reportes, gráficos, lista de precios. Hasta 300 productos. |
| **Plan Completo** (Pro) | **$59.900 / mes** | Todo lo anterior + remitos, devoluciones, CRM completo, CSV, diseñador etiquetas, integración factura. |
| **Onboarding standard** | **$120.000** (único) | Alta, configuración, PrintBridge, capacitación cajero/admin, arranque. |
| **Onboarding plus** | **$200.000** (único) | Catálogo >500 SKU o capacitación extendida. |
| **Trial** | 14 días Pro | Sin cargo; ya en el producto. |

**Precio estable** (post primeros ~12 clientes): Básico $44.900 · Pro $69.900 · Onboarding $150.000.

**Todos los rubros pagan igual.** Ropa, despensa, ferretería, etc. — mismo plan, mismo precio. Cambia el mensaje de venta, no la cuota.

---

## 3. Por qué estos precios (ancla de mercado)

| Referente | Precio mensual | Relación con CValle |
|-----------|----------------|---------------------|
| MiPOS | $14.999 | Más barato; menos profundidad (sin multi-rubro, PrintBridge, P&L). |
| Autogestión Autocaja | $35.000 | Similar operación; CValle suma analytics y multi-rubro → Básico $39.900. |
| Bepos Avanza | $49.000 | Incluye ARCA + omnicanal; CValle Pro $59.900 sin ARCA pero más profundo en mostrador. |
| Bepos Consolida | $79.000 | Tier superior; CValle estable a $69.900 compite en operación sin ML/TN. |

CValle **no compite** en “todo incluido con factura” contra Bepos a $49k. Compite en **gestión del local físico + soporte cercano**.

---

## 4. Qué incluye cada plan

### Plan Operativo (Básico) — $39.900/mes

- POS con scanner, multi-pago, descuentos, cobro guiado opcional
- Caja: apertura/cierre, turnos, vista previa, detalle de sesión
- Stock por variantes (según rubro: talla/color, kg, etc.)
- Dashboard, reportes P&L mensual, gráficos (4 tabs) + export CSV
- Lista de precios en mostrador
- Clientes básicos (sin ficha Pro)
- Impresión tickets y etiquetas plantilla fija + PrintBridge v3.1
- Hasta **300 productos** activos
- Soporte operativo estándar

**No incluye:** remitos, devoluciones módulo, CRM completo, import CSV, diseñador etiquetas, facturación electrónica API.

### Plan Completo (Pro) — $59.900/mes

Todo lo del Operativo, más:

- Productos **ilimitados**
- Remitos A4 (si el rubro lo usa)
- Devoluciones totales/parciales, saldo a favor, cambio de variante
- CRM: historial, cuenta corriente, ficha detalle
- Importación masiva CSV
- Diseñador de etiquetas con preview
- **Integración técnica** con TusFacturasAPP (factura desde POS)
- Soporte con prioridad

---

## 5. Facturación electrónica — costo aparte (importante)

La integración con AFIP/ARCA se hace vía **TusFacturasAPP**. El comercio contrata su plan directamente con el proveedor.

| Plan TusFacturas API (ref. jun 2026) | Capacidad | Precio ref. |
|--------------------------------------|-----------|-------------|
| API26 1K4C | 1.000 comprobantes/requests por mes | **$33.000** final (IVA incl.) |
| API26 3K7C | 3.000 comprobantes/requests por mes | **$80.000** final (ref.) |

CValleTienda **no revende** TusFacturas: conecta el POS si el cliente tiene credenciales Pro.

**Por qué no está incluido en el abono:** Bepos y MiPOS absorben el costo de ARCA en planes de miles de clientes. CValle usa intermediario por cliente para no asumir mantenimiento fiscal ni certificados ARCA.

### Escenarios de costo total mensual

| Perfil | CValle | TusFacturas | Total aprox. |
|--------|--------|-------------|--------------|
| Ropa, ticket no fiscal | Pro $59.900 | — | **$59.900** |
| Despensa, sin factura API | Operativo $39.900 | — | **$39.900** |
| Comercio que factura todo en POS | Pro $59.900 | $33.000 | **$92.900** |

Comparación: Bepos Avanza con ARCA incluida = **$49.000/mes** total. Para quien factura mucho, Bepos gana en precio; CValle gana si prioriza operación local, balanza, PrintBridge y reportes de ganancia.

---

## 6. Rubros objetivo — Junio 2026

Mismo precio para todos.

| Prioridad | Rubro | Pitch en una línea |
|-----------|-------|-------------------|
| **Alta** | Ropa | Talles, colores, cambios y vale sin precios — sin planillas. |
| **Alta** | Despensa / kiosco | Scanner, balanza y stock en tiempo real. |
| **Media** | Ferretería | Remitos, packs y variantes por medida. |
| **Media** | Librería | Variantes + vale de cambio. |
| **Piloto** | Carnicería, verdulería, corralón, farmacia | Validar balanza y flujo antes de campaña masiva. |

---

## 7. Comparativa rápida vs competencia

| Criterio | CValle Pro | Bepos Avanza | MiPOS |
|----------|------------|--------------|-------|
| Precio sistema | $59.900 | $49.000 | $14.999 |
| Factura AFIP | +$33k TusFacturas | Incluida | Incluida |
| Multi-rubro profundo | Sí (9 rubros) | No | No |
| PrintBridge (impresión local) | Sí | No | No |
| Reportes P&L + gráficos | Sí | Parcial (IA) | Básico |
| ML / Tienda Nube | No | Sí | No |
| Soporte local zona | Sí | Nacional | WhatsApp |

---

## 8. Resumen económico recomendado

### Opción A — Operativo sin factura (entrada)

| Concepto | Monto |
|----------|-------|
| Onboarding | $120.000 |
| Mes 1 (Operativo) | $39.900 |
| **Total mes 1** | **$159.900** |
| Desde mes 2 | **$39.900 / mes** |

### Opción B — Pro sin factura (recomendado ropa / ferretería)

| Concepto | Monto |
|----------|-------|
| Onboarding | $120.000 |
| Mes 1 (Pro) | $59.900 |
| **Total mes 1** | **$179.900** |
| Desde mes 2 | **$59.900 / mes** |

### Opción C — Pro con factura electrónica

| Concepto | Monto |
|----------|-------|
| Onboarding | $120.000 |
| Mes 1 (Pro + TusFacturas ref.) | $59.900 + $33.000 |
| **Total mes 1** | **$212.900** |
| Desde mes 2 | **~$92.900 / mes** |

---

## 9. Qué no está incluido

- Hardware: PC, impresora térmica, scanner, red.
- Abono TusFacturas (contrato del comercio con el proveedor).
- Desarrollos a medida, integraciones extra, migraciones masivas complejas.
- Multi-sucursal (esquema actual: 1 tienda por tenant).

---

## 10. Condiciones comerciales

- Precios en pesos argentinos; cotización de lanzamiento vigente junio 2026.
- Ajuste mensual posible según inflación/costos (comunicación previa).
- Promoción primeros clientes (a definir): 15% off 6 meses **o** onboarding bonificado — no ambos.
- Documento HTML imprimible: `salidas/presupuesto-cliente-cvalle-mercado-junio-2026.html`

---

## Referencias

- Análisis completo: `salidas/2026-06-23-analisis-competencia-pricing-mercado.md`
- Matriz CSV: `salidas/2026-06-23-matriz-features-vs-competencia.csv`
- Propuestas anteriores (histórico): `salidas/2026-06-04-propuesta-comercial-cvalletienda-pricing.md` — **reemplazada por este documento**
