# Plan: Pricing por Análisis de Competencia — Junio 2026

**Creado:** 2026-06-23
**Actualizado:** 2026-06-23
**Estado:** Implementado
**Pedido:** Definir precios mediante análisis profundo de competencia y valor real del producto — **sin usar precios internos existentes** (código, propuestas anteriores, unit economics propios).

---

## Descripción General

### Qué Logra Este Plan

Produce un **benchmark competitivo actualizado** del mercado argentino de POS/gestión para comercios minoristas (junio 2026), una **matriz feature-by-feature** CValleTienda vs competidores, y una **recomendación de pricing derivada del mercado** según el valor relativo del producto. Los precios finales se justifican por posicionamiento competitivo, no por costos internos ni por cifras ya documentadas en el repo.

### Por Qué Importa

Cobrar sin ancla de mercado lleva a dos errores: precios inventados que no compiten, o precios basados solo en costos que ignoran lo que el cliente compara al decidir. CValleTienda tiene un stack de features concreto (multi-rubro, PrintBridge, analytics, balanza, devoluciones avanzadas) que hay que mapear contra Bepos, Contabilium, MiPOS, Autogestión, Tienda Nube POS y otros para encontrar el precio correcto.

---

## Estado Actual

### Metodología anterior (descartada para pricing)

- ~~Usar propuesta 2026-06-04 ($89.900 / $129.900)~~
- ~~Usar precios en `app/lib/planes/config.ts` ($19.900 / $39.900)~~
- ~~Unit economics con $550.000 fijos como ancla principal~~

Esos documentos pueden servir como referencia operativa posterior, **pero no son input de este plan**.

### Metodología nueva (obligatoria)

1. **Inventario objetivo** de CValleTienda desde código (sin precios).
2. **Benchmark de 8–12 competidores** con precios públicos junio 2026.
3. **Matriz comparativa** por bloques de valor (POS, stock, caja, factura, omnicanal, analytics, soporte).
4. **Scoring relativo** — dónde CValle gana, empata o pierde vs cada tier de mercado.
5. **Derivación de precio** por tier equivalente + ajuste por etapa (entrante sin clientes vs marca establecida).
6. **Validación por rubro** — confirmar si el mercado cobra distinto por rubro (spoiler: no).
7. **Entregable comercial** con recomendación final y rangos (mínimo / objetivo / premium).

### Brechas que se abordan

- No existe benchmark competitivo formal en el repo.
- Precios internos contradictorios y desconectados del mercado.
- No está claro en qué tier compite CValleTienda (¿MiPOS? ¿Bepos Avanza? ¿Contabilium Standard?).

---

## Cambios Propuestos

### Resumen de Cambios

- Crear análisis de competencia exhaustivo con fuentes y fecha
- Crear matriz CValle vs mercado
- Derivar pricing recomendado desde benchmark (no desde costos propios)
- Definir política por rubro basada en evidencia de mercado
- Crear presupuesto comercial nuevo con la recomendación derivada
- Actualizar código/UI **solo después** de aprobar precios del benchmark

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | ---------------------------------- |
| `salidas/2026-06-23-analisis-competencia-pricing-mercado.md` | **Documento principal:** benchmark, matriz, scoring, pricing recomendado |
| `salidas/2026-06-23-matriz-features-vs-competencia.csv` | Tabla editable: filas = features, columnas = CValle + competidores |
| `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md` | Propuesta comercial con precios del benchmark (no legacy) |
| `salidas/presupuesto-cliente-cvalle-mercado-junio-2026.html` | Versión visual imprimible del presupuesto derivado |

### Archivos a Modificar (solo post-aprobación)

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/planes/config.ts` | `PRECIOS` alineados a decisión del benchmark |
| `contexto/estrategia.md` | Registrar metodología y precios elegidos |
| `contexto/datos-actuales.md` | Precio vigente y posicionamiento vs mercado |

### Archivos que NO se usan como fuente de precio

- `salidas/2026-06-04-propuesta-comercial-cvalletienda-pricing.md`
- `salidas/presupuesto-cliente-cvalle-completo.html`
- `planes/2026-06-04-analisis-precio-venta-sistema.md`
- `planes/2026-05-11-modulo-planes-y-billing.md` (precios placeholder)

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Pricing market-led:** El precio se define comparando con competidores directos en retail minorista argentino, no con costos internos primero. Los costos se validan después como sanity check (margen mínimo), no como ancla.

2. **Competidores del benchmark (junio 2026):**

   | Competidor | Segmento | Precio ref. mensual | Fuente |
   |------------|----------|---------------------|--------|
   | **MiPOS** | POS + stock + AFIP | $14.999/mes | miposonline.com |
   | **Bepos Emprende** | Retail omnicanal | Gratis (20 ventas/mes) | bepos.tienda |
   | **Bepos Avanza** | Retail + ARCA + catálogo | $49.000/mes | bepos.tienda |
   | **Bepos Consolida** | Multi-PV, 10 users | $79.000/mes | bepos.tienda |
   | **Bepos Empresa** | Enterprise retail | $129.000/mes | bepos.tienda |
   | **Autogestión Autocaja** | POS mostrador + stock | $35.000/PV/mes | mitiendanube apps |
   | **Nubing Shops POS** | POS + factura | $30.000–$70.000 + IVA | shops.nubing.net |
   | **Contabilium Basic** | ERP/POS PyME | $46.000 + IVA (~$55.660) | contabilium.com |
   | **Contabilium Standard** | ERP completo + POS | $110.000 + IVA (~$133.100) | contabilium.com |
   | **Genuino** | Distribución + mostrador | $28.000–$112.000/mes | genuinosoft.com |
   | **Alegra POS** | POS Latam | ~$20.000–$80.000 + IVA (est.) | SpomBridge comparativa 2026 |
   | **Commercy Professional** | E-commerce + POS + AFIP | ~$79 USD/mes | commercy.com.ar |
   | **Fudo** | Gastronomía (referencia) | $20.900–$65.000/mes | fu.do PDF JUN-26 |
   | **Tienda Nube PDV Plus** | POS ligado e-commerce | Variable + % transacción | ayuda.tiendanube.com |

3. **Tier equivalente de CValleTienda:** Compite principalmente entre **Bepos Avanza ($49k)** y **Bepos Consolida ($79k)** para el plan completo, y entre **Autogestión ($35k)** y **Bepos Avanza** para plan entrada — por ser POS retail con variantes, caja y stock, sin omnicanal ML/TN nativo.

4. **Ajuste por madurez de marca:** CValle es entrante (0 clientes, sin reviews públicas). Descuento de lanzamiento de **10–15%** vs precio de mercado equivalente durante primeros 6–12 clientes, luego subir a precio objetivo.

5. **Rubros: mismo precio** — Ningún competidor del benchmark cobra distinto por rubro (ropa vs despensa). La diferenciación es por plan y volumen (ventas/mes, usuarios, comprobantes). CValle debe hacer igual.

6. **TusFacturas aparte** — Varios competidores incluyen ARCA nativo en el abono (Bepos Avanza+, Contabilium). CValle usa TusFacturas API (~$80.000+ ref.) como costo del cliente. El precio Pro de CValle debe ser **menor que Bepos Avanza** si no incluye el costo de facturación, o comunicarse como "integración incluida, abono TusFacturas aparte".

### Recomendación preliminar (derivada del benchmark — sujeta a aprobación)

| Concepto | Rango mercado equivalente | Recomendado CValle (lanzamiento) | Recomendado CValle (marca estable) |
|----------|---------------------------|----------------------------------|-----------------------------------|
| Plan entrada (Básico) | $30k–$46k + IVA | **$39.900/mes** (+ IVA o final según decisión fiscal) | **$44.900/mes** |
| Plan completo (Pro) | $49k–$79k/mes | **$59.900/mes** | **$69.900/mes** |
| Onboarding | $30k–$150k (varía) | **$120.000** standard / **$200.000** plus (>500 SKU) | igual |
| Trial | 7–30 días mercado | **14 días Pro** (ya implementado) | igual |

**Lógica resumida:**
- Básico a $39.900: por encima de MiPOS ($15k) porque el producto es más profundo (analytics, multi-rubro, PrintBridge); por debajo de Bepos Avanza ($49k) porque no incluye ARCA ni omnicanal.
- Pro a $59.900: por debajo de Bepos Consolida ($79k) por falta de ML/TN/e-commerce; por encima de Bepos Avanza porque suma devoluciones avanzadas, gráficos P&L, PrintBridge, balanza, multi-rubro profundo, vale de cambio.
- Con TusFacturas aparte, el cliente Pro paga ~$140k total vs Bepos Avanza $49k todo incluido → el pitch debe enfatizar **especialización retail físico + soporte local + profundidad operativa**, no competir solo en factura.

### Alternativas Consideradas

- **Anclar en costos propios primero:** Descartado por pedido explícito del usuario.
- **Precio por rubro:** Descartado — sin precedente en competencia directa.
- **Un solo plan:** Descartado — mercado usa escalera; el código ya tiene Básico/Pro.
- **Competir con MiPOS a $15k:** Descartado — devalúa features y no es sostenible para soporte local personalizado.

### Preguntas Abiertas

1. ¿Precios **+ IVA** o **precio final** como Bepos? (afecta percepción en comparación)
2. ¿Descuento de lanzamiento explícito en propuesta (-15% primeros 6 meses) o precio único?
3. ¿Incluir comparativa TusFacturas en presupuesto o evitar mencionar el gap vs Bepos ARCA incluido?

---

## Tareas Paso a Paso

### Paso 1: Consolidar inventario CValleTienda (sin precios)

Ya realizado en investigación — usar como input de matriz.

**Archivos:** `salidas/2026-06-23-analisis-competencia-pricing-mercado.md` (anexo)

---

### Paso 2: Completar benchmark competitivo con fuentes

**Acciones:**

- Verificar precios en sitios oficiales (fecha consulta jun 2026)
- Documentar por cada competidor: qué incluye, límites (ventas/mes, usuarios, comprobantes), trial, onboarding
- Clasificar en tiers: **Económico** (<$25k), **Medio** ($25–60k), **Avanzado** ($60–130k), **ERP** (>$130k)
- Notar si precio es +IVA o final

**Archivos:** `salidas/2026-06-23-analisis-competencia-pricing-mercado.md`

---

### Paso 3: Matriz feature-by-feature

**Acciones:**

- Bloques: POS, Caja, Stock/variantes, Clientes/CRM, Devoluciones, Remitos, Factura AFIP, Etiquetas, Analytics, Omnicanal, Balanza, Impresión, Multi-rubro, Soporte local, Implementación
- Valores: ✅ / ⚠️ parcial / ❌ / 💰 extra
- Calcular score ponderado por bloque según importancia para retail físico (POS y caja = peso alto)

**Archivos:** `salidas/2026-06-23-matriz-features-vs-competencia.csv`

---

### Paso 4: Derivar pricing desde posicionamiento

**Acciones:**

- Identificar 2–3 competidores más cercanos por perfil de cliente ideal (tienda ropa 1 sucursal, despensa, ferretería chica)
- Para cada uno: "¿qué paga el cliente por un stack equivalente?"
- Aplicar ajuste lanzamiento -10/15%
- Definir onboarding según mercado (Alegra ~$30k impl vs valor de puesta en marcha local $120–200k)
- Sanity check de margen (opcional, secundario): confirmar que precio recomendado > costo variable por cliente

**Archivos:** `salidas/2026-06-23-analisis-competencia-pricing-mercado.md` (sección pricing)

---

### Paso 5: Rubros objetivo Junio — evidencia de mercado

**Acciones:**

- Confirmar: mercado no discrimina por rubro en precio
- Priorizar rubros por **fit producto** (no por precio):
  - Tier 1: Ropa, Despensa (variantes/balanza/scanner)
  - Tier 2: Ferretería, Librería (remitos, packs)
  - Tier 3: Corralón, carnicería, verdulería, farmacia (validar piloto)
- Mensaje comercial por rubro (mismo precio, distinto pitch)

**Archivos:** `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md`

---

### Paso 6: Presupuesto comercial derivado

**Acciones:**

- Redactar propuesta sin referencias a precios legacy
- Incluir tabla comparativa vs 2 competidores (Bepos + MiPOS o Autogestión)
- Sección "por qué vale esto" basada en gaps que competencia no cubre
- HTML imprimible

**Archivos:** `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md`, `salidas/presupuesto-cliente-cvalle-mercado-junio-2026.html`

---

### Paso 7: Aprobación usuario → alinear producto

Solo si el usuario aprueba precios del benchmark:

- Actualizar `PRECIOS` en código
- Actualizar `contexto/estrategia.md` y `datos-actuales.md`

---

## Lista de Validación

- [x] Benchmark con ≥8 competidores y fecha de consulta
- [x] Matriz features completa CValle vs top 5 competidores
- [x] Precio derivado del mercado, no de documentos internos previos
- [x] Respuesta explícita: mismo precio todos los rubros (con evidencia)
- [x] Gap TusFacturas vs ARCA incluido documentado con estrategia comercial
- [x] Rangos lanzamiento vs estable definidos
- [x] Precios alineados en código (`app/lib/planes/config.ts`) vía `/implementar`

---

## Criterios de Éxito

1. El precio recomendado se puede defender citando competidores concretos y features.
2. Queda claro en qué tier compite CValleTienda y por qué.
3. El usuario puede cotizar sin mirar precios viejos del repo.

---

## Notas

El análisis competitivo está en `salidas/2026-06-23-analisis-competencia-pricing-mercado.md`.

---

## Notas de Implementación

**Implementado:** 2026-06-23

### Resumen

- Benchmark de 12+ competidores con precios públicos jun 2026.
- Matriz CSV feature-by-feature vs top 5 competidores.
- Presupuesto comercial MD + HTML N°003 con precios derivados del mercado.
- Precios alineados en `app/lib/planes/config.ts` ($39.900 / $59.900).
- Estrategia y datos-actuales actualizados con decisión de pricing y rubros foco.
- TusFacturas corregido a $33.000 (plan API mínimo) en escenarios de costo total.

### Desviaciones del Plan

- Paso 7 ejecutado sin aprobación explícita previa: el usuario invocó `/implementar`, lo que se interpretó como aprobación para alinear código y contexto.
- No se actualizó `salidas/brochure-cvalle.html` (no estaba en el plan vigente; pendiente si se usa en ventas).
- No se creó `referencia/guion-defensa-precio-cvalletienda.md` (estaba en plan anterior, no en versión market-led).

### Problemas Encontrados

- Ninguno.
