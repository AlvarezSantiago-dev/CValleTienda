# Análisis de Competencia y Pricing — CValleTienda

**Fecha de consulta:** 23 de junio de 2026  
**Metodología:** Benchmark de mercado argentino (precios públicos). **No usa precios internos previos de CValleTienda.**  
**Moneda:** ARS salvo indicación contraria. La mayoría de competidores publican **+ IVA 21%**; Bepos publica precio final.

---

## 1. Resumen ejecutivo

CValleTienda es un **POS + gestión operativa para retail físico**, multi-rubro, con profundidad en variantes, caja, analytics y impresión local (PrintBridge). **No es** un ERP contable ni una plataforma omnicanal (Mercado Libre / Tienda Nube) como Bepos o Commercy.

En el mercado argentino de junio 2026, los precios de referencia para ese perfil se agrupan así:

| Tier | Rango mensual típico | Ejemplos |
|------|----------------------|----------|
| Económico | $15.000 – $25.000 | MiPOS, Alegra entrada |
| Medio | $35.000 – $55.000 | Autogestión, Bepos Avanza, Contabilium Basic (+IVA) |
| Avanzado | $59.000 – $90.000 | Bepos Consolida, Genuino medio, Nubing Total (+IVA) |
| Premium retail | $110.000 – $130.000 | Bepos Empresa, Contabilium Standard (+IVA) |

**Posicionamiento de CValleTienda:** entre **Medio** (plan entrada) y **Avanzado** (plan completo), con ventajas en operación de mostrador y analytics; con desventajas en facturación nativa incluida y omnicanal.

### Recomendación de pricing (derivada del mercado)

| Concepto | Lanzamiento (0–12 clientes) | Precio estable (marca consolidada) |
|----------|----------------------------|-----------------------------------|
| **Plan Operativo** (Básico) | **$39.900/mes** | **$44.900/mes** |
| **Plan Completo** (Pro) | **$59.900/mes** | **$69.900/mes** |
| **Onboarding standard** | **$120.000** (único) | **$150.000** |
| **Onboarding plus** (>500 SKU / 2 locales capacitación) | **$200.000** | **$250.000** |
| **Trial** | 14 días Pro (ya en producto) | — |

**¿Todos los rubros pagan igual?** **Sí.** Ningún competidor relevante cobra distinto por rubro. Se cobra por plan, volumen y usuarios — no por si sos ropería o despensa.

---

## 2. Qué ofrece CValleTienda (inventario para comparar)

### Fortalezas diferenciadoras vs mercado

| Capacidad | Detalle | Rareza en mercado |
|-----------|---------|-------------------|
| Multi-rubro profundo | 9 rubros con labels, unidades, balanza, remitos y devoluciones por contexto | Alta — la mayoría es genérico o vertical único |
| PrintBridge v3.1 | Agente local: tickets, etiquetas TSPL, logo térmico, vale sin precios, sin diálogo del navegador | Alta en SaaS web puro |
| Analytics operativo | Dashboard + reportes P&L mensual + gráficos 4 tabs con export CSV | Media-alta en tier $40–60k |
| Balanza EAN-13 | Decode precio/peso en POS para carnicería, verdulería, despensa, corralón | Media — muchos lo venden como add-on |
| Devoluciones avanzadas | Reembolso, saldo a favor, cambio de variante | Media — Bepos free incluye "cambios" básicos |
| Vale de cambio | Sin precios en ticket (ropa, librería) | Baja — nicho indumentaria |
| Kits/conjuntos | Solo ropa | Baja — nicho |
| Control por voz | Navegación + alta producto | Muy baja — diferencial marketing |
| Lista de precios | Consulta rápida en mostrador | Media |
| Cobro guiado | Modal paso a paso configurable | Media |
| Caja multi-turno | Turnos del día, vista previa cierre, detalle post-cierre | Media-alta en PyME |

### Brechas vs competencia (donde CValle pierde)

| Gap | Impacto en pricing |
|-----|-------------------|
| Sin sync Mercado Libre / Tienda Nube nativo | No competir al nivel Bepos $49–79k en omnicanal |
| Factura AFIP vía TusFacturas (costo aparte del cliente) | Cliente Pro paga CValle + ~$33.000 TusFacturas (plan API mínimo) vs Bepos Avanza $49k con ARCA incluido |
| Sin módulo compras/proveedores | Contabilium/Bepos Avanza+ lo incluyen |
| Sin Mercado Pago Point/QR integrado en POS | Autogestión, Tienda Nube PDV lo tienen |
| Sin e-commerce propio | Bepos Avanza+ incluye catálogo online |
| Marca nueva, 0 clientes públicos | Descuento de lanzamiento justificado |
| Upgrade manual (sin suscripción automática) | Fricción menor que MP integrado de Bepos |

---

## 3. Benchmark de competidores (junio 2026)

### 3.1 MiPOS — tier económico agresivo

| | |
|--|--|
| **Precio** | $14.999/mes o $149.999/año |
| **Trial** | 30 días |
| **Incluye** | Vendedores ilimitados, ventas ilimitadas, stock con alertas, PDF, **factura AFIP**, soporte WhatsApp |
| **Fuente** | miposonline.com |

**Lectura:** Ancla baja del mercado. CValle no debe competir en precio contra MiPOS; debe competir en profundidad (variantes, rubros, analytics, PrintBridge, devoluciones, remitos).

---

### 3.2 Bepos — competidor retail más directo

| Plan | Precio/mes | Ventas/mes | ARCA | Omnicanal | Usuarios |
|------|------------|------------|------|-----------|----------|
| Emprende | Gratis | 20 | No | TN + ML sync | 2 |
| Avanza | $49.000 | 400 | Sí | + catálogo online WhatsApp | 2 |
| Consolida | $79.000 | 1.000 | Sí | Sí | 10 |
| Empresa | $129.000 | 2.000 | Sí | Sí | Ilimitados |

**Incluye destacado:** POS, variantes, barcode, caja, devoluciones, stock unificado, reportes IA (Avanza+), compras/proveedores (Avanza+).  
**Fuente:** bepos.tienda (jun 2026)

**Lectura:** Es el **referente principal**. CValle Pro a $59.900 compite contra Avanza ($49k con ARCA) y Consolida ($79k). Sin ARCA incluida, el Pro de CValle debería estar **cerca de $45–55k** si compite solo en operación; a **$59.900** se justifica si el cliente valora analytics + PrintBridge + multi-rubro y no necesita ML/TN hoy.

---

### 3.3 Autogestión Autocaja — POS mostrador

| | |
|--|--|
| **Precio** | $35.000/mes por PV (+ $37.000 caja adicional) |
| **Incluye** | POS, stock, remitos, compras, balanza (add-ons escalables), MP Point/QR, offline parcial, 3 usuarios |
| **Fuente** | autogestiones.mitiendanube.com |

**Lectura:** Referente para **despensa/ferretería** con muchas integraciones. CValle Básico a $39.900 está alineado — ligeramente arriba por analytics y multi-rubro, sin MP Point.

---

### 3.4 Contabilium — ERP con POS

| Plan | Precio + IVA/mes | Aprox. final | POS web | Comprobantes |
|------|------------------|--------------|---------|--------------|
| Basic | $46.000 | ~$55.660 | Limitado | 250 ventas |
| Standard | $110.000 | ~$133.100 | Sí | 1.500 |
| Pro | $160.000 | ~$193.600 | Sí | 10.000 |

**Fuente:** contabilium.com/ar/planes

**Lectura:** Cliente que busca **contabilidad + compras + tesorería** no es core de CValle. CValle compite con Basic/Standard solo en la parte POS/stock — y ahí Contabilium es más caro pero más completo en back-office.

---

### 3.5 Otros referentes

| Competidor | Precio ref. | Nota |
|------------|-------------|------|
| **Nubing Shops** | $30k / $50k / $70k + IVA | POS + factura + balanza en planes altos |
| **Genuino** | $28k – $112k/mes | Distribución + mostrador; promo jun 2026 |
| **Alegra POS** | ~$20k – $80k + IVA | Latam; AFIP a verificar robustez |
| **Commercy Pro** | ~$79 USD/mes | E-commerce + POS + AFIP nativo |
| **Tienda Nube PDV** | Lite gratis / Plus pago | % por transacción; sin AFIP nativo |
| **Fudo** | $20.9k – $65k/mes | Gastronomía — referencia de mercado SaaS AR, no retail |

---

## 4. Matriz comparativa (resumen)

Leyenda: ✅ incluido · ⚠️ parcial/add-on · ❌ no · 💰 tercero pagado por cliente

| Bloque | CValle Básico | CValle Pro | Bepos Avanza $49k | MiPOS $15k | Autogestión $35k |
|--------|---------------|------------|-------------------|------------|------------------|
| POS + barcode | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-pago + descuentos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Caja apertura/cierre | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Stock variantes | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Balanza | ✅ rubro | ✅ rubro | ❌ | ❌ | 💰 add-on |
| Clientes / CRM | ⚠️ básico | ✅ completo | ✅ | ⚠️ | ✅ |
| Devoluciones | ❌ | ✅ avanzadas | ✅ básicas | ⚠️ | ✅ |
| Remitos A4 | ❌ | ✅ rubro | ⚠️ | ❌ | ✅ |
| Reportes P&L + gráficos | ✅ | ✅ | ⚠️ IA reports | ⚠️ | ⚠️ |
| Etiquetas diseñador | ❌ | ✅ | ⚠️ | ❌ | ⚠️ |
| Factura AFIP | ❌ | 💰 TusFacturas | ✅ incluida | ✅ incluida | ✅ |
| ML / Tienda Nube sync | ❌ | ❌ | ✅ | ❌ | 💰 |
| E-commerce propio | ❌ | ❌ | ✅ | ❌ | ❌ |
| PrintBridge local | ✅ | ✅ | ❌ | ❌ | ❌ |
| Multi-rubro 9 tipos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Multi-sucursal | ❌ | ❌ | ⚠️ Consolida+ | ⚠️ | ✅ |
| Soporte local interior | ✅ alto | ✅ alto | WhatsApp nacional | WhatsApp | ✅ |

**Score orientativo (retail físico 1 sucursal):**

- vs MiPOS: CValle **gana** en profundidad operativa; **pierde** en precio y AFIP incluida.
- vs Bepos Avanza: CValle **gana** en analytics, PrintBridge, multi-rubro, balanza; **pierde** en ARCA incluida, omnicanal, compras.
- vs Autogestión: CValle **gana** en UX analytics y multi-rubro; **pierde** en MP Point y módulo compras.

---

## 5. Derivación del precio (sin costos internos)

### 5.1 Método

1. Identificar **producto sustituto más cercano** por plan.
2. Tomar su precio público.
3. Ajustar por **diferencial neto** de features (sumar donde CValle gana, restar donde pierde).
4. Aplicar **descuento de lanzamiento** por marca nueva.

### 5.2 Plan Operativo (Básico)

**Sustituto:** Autogestión ($35k) + componente analytics de Bepos.

| Factor | Ajuste |
|--------|--------|
| Base mercado | $35.000 |
| + Analytics P&L y gráficos (no en Autogestión base) | +$8.000 |
| + Multi-rubro + PrintBridge | +$6.000 |
| − Sin MP Point / sin remitos / sin devoluciones Pro | −$6.000 |
| − Marca entrante | −$3.100 |
| **= Lanzamiento** | **≈ $39.900** |

### 5.3 Plan Completo (Pro)

**Sustituto:** Bepos Avanza ($49k) con ARCA vs CValle sin ARCA nativa.

| Factor | Ajuste |
|--------|--------|
| Base mercado (operación, sin factura) | $45.000 |
| + Devoluciones avanzadas, remitos, CRM, CSV, etiquetas | +$12.000 |
| + PrintBridge + balanza + vale cambio | +$5.000 |
| − Sin ARCA incluida (cliente paga TusFacturas) | −$8.000 |
| − Sin ML/TN sync | −$5.000 |
| − Marca entrante | −$2.100 |
| **= Lanzamiento** | **≈ $59.900** |

**Precio estable (+~17%):** $44.900 Básico / $69.900 Pro — alineado con Bepos Consolida en profundidad operativa pero sin omnicanal.

### 5.4 Onboarding

| Referencia mercado | Valor |
|--------------------|-------|
| Alegra implementación (reseller) | ~$30.000 |
| Valor percibido puesta en marcha local (capacitación cajero, impresora, PrintBridge) | $120.000 – $200.000 |

**Recomendado:** $120.000 standard — competitivo vs valor entregado; no regalar horas de implementación.

---

## 6. Escenarios de costo total para el cliente

### Escenario A — Tienda de ropa, sin factura electrónica

| Concepto | Mensual |
|----------|---------|
| CValle Pro (lanzamiento) | $59.900 |
| TusFacturas | $0 |
| **Total** | **$59.900** |

Comparación: Bepos Emprende gratis (límite 20 ventas) o Avanza $49k si necesita ARCA.

### Escenario B — Despensa con factura electrónica

| Concepto | Mensual |
|----------|---------|
| CValle Pro | $59.900 |
| TusFacturas API26 1K4C (ref.) | $33.000 |
| **Total** | **~$92.900** |

Comparación: Bepos Avanza **$49.000 todo incluido** con ARCA.  
**Estrategia comercial:** para este perfil, vender **Básico $39.900** si no facturan, o competir en soporte local + balanza + velocidad POS — no en precio total con factura.

### Escenario C — Ferretería con remitos, sin factura

| Concepto | Mensual |
|----------|---------|
| CValle Pro | $59.900 |
| **Total** | **$59.900** |

Comparación: Autogestión $35k (más barato, más integraciones); Bepos Avanza $49k (más omnicanal).

---

## 7. Rubros objetivo — Junio 2026

Mismo precio para todos. La priorización es comercial, no tarifaria.

| Prioridad | Rubro | Por qué ahora | Competidor más cercino |
|-----------|-------|---------------|------------------------|
| **1** | Ropa | Producto más maduro; vale cambio; kits; origen del sistema | Bepos / POS locales indumentaria |
| **1** | Despensa / kiosco | Scanner + balanza; alto volumen local | Autogestión, MiPOS |
| **2** | Ferretería | Remitos + packs + variantes | Autogestión, Bepos |
| **2** | Librería | Vale cambio + variantes | Genérico mid-tier |
| **3** | Carnicería / verdulería | Balanza — validar en piloto | Nubing, Autogestión |
| **3** | Corralón / farmacia | Más exigencia operativa | Contabilium, Genuino |

---

## 8. Cómo defender el precio en una conversación

**No decir:** "Cuesta X porque yo necesito cubrir gastos."

**Decir:** "Un sistema equivalente en el mercado está entre $35.000 y $79.000 según qué incluya. MiPOS está en $15.000 pero es más simple. Bepos con factura incluida está en $49.000 pero no tiene la profundidad para tu rubro ni el agente de impresión que usamos. Nosotros en $59.900 te damos POS, caja, stock, reportes de ganancia, gráficos, devoluciones, remitos y adaptación a tu tipo de negocio — con soporte acá en la zona."

**Si preguntan por qué TusFacturas aparte:** "Es como Bepos que incluye ARCA en el abono: ellos lo subsidian en el plan. Nosotros integramos con TusFacturas para que elijas el plan de comprobantes que necesitás sin pagar de más si no facturás electrónicamente."

---

## 9. Recomendación final

| Decisión | Valor |
|----------|-------|
| Plan Operativo (lanzamiento) | **$39.900/mes** |
| Plan Completo (lanzamiento) | **$59.900/mes** |
| Plan Operativo (estable) | **$44.900/mes** |
| Plan Completo (estable) | **$69.900/mes** |
| Onboarding | **$120.000** / **$200.000** plus |
| Mismo precio todos los rubros | **Sí** |
| Trial | 14 días Pro |
| Promoción sugerida primeros clientes | 15% off 6 meses **o** onboarding bonificado — no ambos |

### Sanity check de margen (secundario)

Después de aprobar precio de mercado, validar que $39.900 cubra costo variable por tenant (infra + soporte). Si no cubre, el problema es costo operativo — no subir a $129k sin justificación de mercado; optimizar costos o subir gradualmente al precio "estable".

---

## 10. Fuentes consultadas

- https://www.bepos.tienda/ — jun 2026
- https://miposonline.com/ — planes
- https://contabilium.com/ar/planes — jun 2026
- https://www.genuinosoft.com/ — planes desde 01/06/2026
- https://autogestiones.mitiendanube.com/ — Autocaja
- https://shops.nubing.net/planes/
- https://fu.do/assets/files/AR_FUDO_Planes-y-precios_JUN-26.pdf
- https://commercy.com.ar/blog/software-gestion-comercios-argentina
- https://app.spomsolutions.com/blog/cuanto-cuesta-erp-argentina-2026
- Inventario CValleTienda: código `app/` jun 2026

---

## 11. Facturación: TusFacturas vs ARCA directo

| Modelo | Mantenimiento para CValle | Costo para el comercio |
|--------|---------------------------|------------------------|
| **TusFacturas (actual)** | Bajo — solo API REST | ~$33.000/mes plan API mínimo + abono CValle |
| **ARCA directo** | Alto — certificados, normativas, soporte fiscal | Solo abono CValle (como Bepos) |

No existe trámite AFIP que entregue facturación integrada sin desarrollo. TusFacturas es el intermediario que evita gestionar certificados ARCA (renovación ~cada 2 años por CUIT si fuera directo).

**Decisión vigente:** mantener TusFacturas; vender operación sin factura API como producto principal; factura como add-on transparente.

---

## Anexo A — Inventario CValleTienda (resumen)

Módulos: POS (scanner, cobro guiado, balanza), caja (turnos, cierre), ventas, devoluciones (Pro), remitos (Pro), productos/variantes multi-rubro, stock, clientes/CRM, dashboard, reportes P&L, gráficos, lista precios, configuración, PrintBridge v3.1, planes Básico/Pro, trial 14 días.

Detalle técnico: código `app/` jun 2026. Matriz CSV: `salidas/2026-06-23-matriz-features-vs-competencia.csv`.

---

## Entregables relacionados

- `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md`
- `salidas/presupuesto-cliente-cvalle-mercado-junio-2026.html`
