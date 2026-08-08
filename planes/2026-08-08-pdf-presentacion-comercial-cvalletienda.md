# Plan: PDF de presentación comercial CValleTienda

**Creado:** 2026-08-08  
**Estado:** Implementado  
**Pedido:** Crear un PDF atractivo de presentación comercial con instalación $120.000, mensualidad $40.000, capacitación 3×1h + 20 productos, exclusiones de hardware, contacto y dolores que resuelve el sistema.

---

## Descripción General

### Qué Logra Este Plan

Produce un **PDF de presentación comercial listo para enviar o imprimir** (A4 multipágina), visualmente premium y alineado a la marca CValleTienda, que explique por qué un comercio necesita el sistema, qué incluye, cuánto cuesta y cómo contactar. El entregable principal vive en `salidas/` y se genera desde un HTML print-ready (mismo patrón que el brochure existente), no desde un template genérico.

### Por Qué Importa

La prioridad estratégica actual es **conseguir clientes pagos locales**. Los materiales de pricing previos (`brochure-cvalle.html`, presupuestos HTML) tienen precios desactualizados o son densos/poco “atrapantes”. Este PDF cierra la brecha entre producto listo y conversación comercial: un único artefacto que Santiago puede mandar por WhatsApp/mail y que comunica valor + precio + CTA sin ambigüedad.

---

## Estado Actual

### Estructura Existente Relevante

| Recurso | Rol |
| ------- | --- |
| `salidas/brochure-cvalle.html` | Brochure multipágina print-ready (portada + módulos + planes). Precios viejos (ej. “desde $19.900”). Buena base visual (negro + lime). |
| `salidas/presupuesto-cliente-cvalle*.html` | Presupuestos HTML más “documento de cotización” que presentación. |
| `salidas/2026-06-04-propuesta-comercial-cvalletienda-pricing.md` | Copy de propuesta (reemplazado por pricing mercado jun 2026). |
| `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md` | Benchmark: onboarding ~$120k; plan operativo ~$39.9k. |
| `contexto/estrategia.md` | Onboarding $120.000 / Plan Operativo $39.900 (lanzamiento) — alineado al pedido de $40.000. |
| `contexto/info-negocio.md` | Módulos del producto y tagline. |
| `referencia/design-system-v2.md` | Tokens de marca (lime `#65a30d` / accent `#84cc16`, tipografía Geist, superficies cálidas). |
| `salidas/capturas/*.png` | Screenshots reales (POS, caja, gráficos) opcionales para enriquecer el PDF. |
| Skill `canvas-design` | Ideal para arte de 1 página con texto mínimo; **no** alcanza solo para una propuesta comercial con pricing y features detalladas. |

### Brechas o Problemas que se Abordan

1. No existe un PDF actualizado con el pack comercial pedido ($120k instalación + $40k/mes + 3 capacitaciones + 20 productos).
2. El brochure vigente mezcla planes Base/Pro y precios obsoletos; no destaca “máquinas aparte” ni el pack de onboarding concreto.
3. Falta un mensaje claro de **dolor → solución → precio → contacto** en un formato enviable.
4. Contacto comercial (teléfono / mail) no está empaquetado en un CTA único de cierre.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear un HTML A4 print-ready de **5–6 páginas** como fuente editable de la presentación.
- Exportar a PDF de alta calidad en `salidas/`.
- Incluir copy comercial: dolores, módulos del sistema, pack de instalación, mensualidad, exclusiones (hardware / máquinas), CTA de contacto.
- Aplicar identidad visual design-system-v2 (lime + negro + tipografía profesional), evitando el look “brochure genérico IA”.
- No modificar app ni pricing en código; solo material comercial en `salidas/`.
- Opcional: nota breve en `contexto/estrategia.md` si se confirma $40.000 como cifra comercial vigente (redondeo de $39.900).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-08-08-presentacion-comercial-cvalletienda.html` | Fuente editable print-ready (A4, `@media print`, page-breaks). Contiene todo el contenido y estilos. |
| `salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf` | PDF final para enviar al cliente (export desde HTML). |
| `salidas/2026-08-08-presentacion-comercial-brief.md` | Brief corto de contenido + checklist de precios/contacto (referencia interna, no para el cliente). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `contexto/estrategia.md` | Solo si el usuario confirma: anotar que la cifra comercial comunicada es **$40.000/mes** (lanzamiento) y onboarding **$120.000** con 3 sesiones + 20 productos. |
| `CLAUDE.md` | No requiere cambio estructural (salida comercial, no comando nuevo). |

### Archivos a Eliminar (si aplica)

Ninguno. Los brochures/presupuestos viejos se dejan como histórico; el PDF nuevo es la referencia vigente.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **HTML print-ready → PDF (no solo canvas-design):** La propuesta necesita texto comercial legible (módulos, precios, dolores). El patrón ya probado es `brochure-cvalle.html`. El skill `canvas-design` se usa solo como inspiración estética (jerarquía tipográfica, ritmo espacial, craft), no como único pipeline.
2. **Una oferta clara (no menú Base/Pro en la portada de precios):** El pedido define un pack único: instalación $120.000 + $40.000/mes. Evita confusión. Remitos/devoluciones/reportes se listan como **incluidos en el sistema**, sin fragmentar en planes salvo nota opcional de “facturación electrónica AFIP vía TusFacturas = costo aparte del proveedor”.
3. **Máquinas / hardware explícitamente excluidos:** Bloque visible (“Impresoras térmicas, scanners, PCs/tablets y balanzas se adquieren aparte”) para evitar malentendidos en la venta.
4. **Onboarding detallado en el precio de instalación:** $120.000 incluye: alta/configuración tienda, **3 sesiones de capacitación de 1 hora**, y **carga de los primeros 20 productos**.
5. **Paleta marca v2:** Negro `#0a0a09` + primary `#65a30d` + accent `#84cc16` + fondos cálidos `#fafaf9`. Tipografía: Geist o Inter/system (web-safe para print); números de precio grandes y tabulares.
6. **CTA de cierre único:** WhatsApp `2996587715` + mail `santiagoalvarezz.dev@gmail.com`. Formato WhatsApp sugerido: `https://wa.me/5492996587715` (código país AR +9).
7. **Tono:** Profesional, concreto, orientado a dueño de comercio (no jerga técnica). Enfasis en control, menos errores, menos planillas, más velocidad en mostrador.
8. **Longitud:** 5–6 páginas A4. Suficiente para atrapar sin convertirse en manual.

### Alternativas Consideradas

| Alternativa | Por qué se descartó |
| ----------- | ------------------- |
| Solo PDF artístico con canvas-design | Texto mínimo; no sirve para cotización comercial detallada. |
| Actualizar `brochure-cvalle.html` in-place | Mezcla precios históricos y planes viejos; mejor artefacto nuevo fechado. |
| PowerPoint/Google Slides | Fuera del flujo del workspace; peor versionado en git. |
| PDF generado con ReportLab/Python puro | Más trabajo tipográfico; HTML+print da mejor control visual rápido reutilizando el brochure. |

### Preguntas Abiertas (si las hay)

1. **¿Oferta única o mencionar Pro/AFIP?** ¿El PDF presenta solo el pack $40k/mes, o se agrega una línea “Facturación electrónica AFIP disponible (abono TusFacturas aparte)”?
2. **¿Nombre comercial en portada?** ¿“CValleTienda” o también “MiTienda” / otro nombre visible al cliente?
3. **¿Cliente genérico o personalizado?** ¿PDF plantilla (“Para tu comercio”) o con espacio “Propuesta para: ________”?
4. **¿Incluir capturas reales** de `salidas/capturas/` en la página de módulos, o iconografía limpia sin screenshots?
5. **¿IVA / monotributo?** ¿Los precios se comunican “finales” o “+ IVA”? (por defecto: montos tal cual los indicó el usuario, sin desglose fiscal, con nota “valores en ARS”).
6. **¿WhatsApp con 549?** Confirmar que el número `2996587715` es el correcto para link `wa.me/5492996587715`.

> Si no hay respuesta antes de `/implementar`, usar defaults: oferta única + nota AFIP aparte; marca CValleTienda; plantilla genérica; iconografía + 1–2 capturas opcionales si caben sin romper layout; precios en ARS sin desglose IVA; link WhatsApp `5492996587715`.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Brief interno de contenido

Crear `salidas/2026-08-08-presentacion-comercial-brief.md` con el copy aprobado y precios fijos para que el HTML no invente cifras.

**Acciones:**

- Fijar precios:
  - Instalación / puesta en marcha: **$120.000** (pago único)
  - Mensualidad: **$40.000** / mes
  - Capacitaciones: **3 sesiones × 1 hora**
  - Carga inicial: **20 primeros productos**
  - Hardware: **no incluido**
- Contacto: `2996587715` · `santiagoalvarezz.dev@gmail.com`
- Listar dolores (ver Paso 3) y módulos (ver Paso 4)

**Archivos afectados:**

- `salidas/2026-08-08-presentacion-comercial-brief.md`

---

### Paso 2: Estructura de páginas del PDF

Definir y luego implementar exactamente estas páginas en el HTML:

| # | Página | Objetivo |
| - | ------ | -------- |
| 1 | **Portada** | Marca + promesa fuerte + “Propuesta comercial” + precio ancla “$40.000/mes” como pill (sin saturar). |
| 2 | **Por qué un sistema así** | Dolores del comercio vs. beneficios. Emocional + racional. |
| 3 | **Qué incluye el sistema** | Grid de módulos con bullets cortos (todo lo operativo). |
| 4 | **Inversión** | Pack instalación $120.000 desglosado + mensualidad $40.000 + exclusiones (máquinas). |
| 5 | **Cómo arrancamos + Contacto** | Pasos de onboarding (config → capacitación → 20 productos → primer día) + CTA grande WhatsApp/mail. |
| 6 | *(Opcional)* **Cierre visual** | Frase de cierre + datos de contacto repetidos + Cinco Saltos / Río Negro. Solo si el layout lo pide; si cabe en p.5, omitir. |

**Acciones:**

- Respetar `page-break-after: always` por `.page`
- Formato A4 (`210mm × 297mm`), márgenes ~12–14mm
- `@media print` con `print-color-adjust: exact`

**Archivos afectados:**

- `salidas/2026-08-08-presentacion-comercial-cvalletienda.html`

---

### Paso 3: Copy — dolores y por qué importa

Incluir en página 2 un bloque “Dolores que hoy te cuestan plata / tiempo” y otro “Qué cambia con CValleTienda”.

**Dolores a cubrir (usar este listado, redactado en español claro):**

1. **Caja sin control** — no se sabe cuánto debió haber al cierre; diferencias sin explicación.
2. **Stock “a ojo”** — se vende lo que no hay; sobrestock de lo que no rota.
3. **Planillas y libretas** — errores de tipeo, versiones distintas, nada auditable.
4. **Devoluciones desordenadas** — plata y mercadería que no vuelven al sistema.
5. **Sin datos para decidir** — no hay top productos, margen ni tendencia del mes.
6. **Dependencia de una sola persona** — “el que sabe cómo se hace” no está y se frena todo.
7. **Imagen poco profesional** — tickets/remitos improvisados frente al cliente.

**Mensaje de valor (síntesis para portada / cierre):**

> Controlás ventas, stock y caja en un solo lugar — menos errores, más velocidad en el mostrador, decisiones con números reales.

**Archivos afectados:**

- HTML página 2
- Brief

---

### Paso 4: Copy — qué incluye el sistema

En página 3, grid de módulos (inspirado en brochure, actualizado). Cada card: ícono + nombre + 4–6 bullets máximos.

**Módulos obligatorios a listar:**

1. **POS / Punto de venta** — scanner, multi-pago, descuentos, tickets, cobro guiado / atajos.
2. **Caja / turnos** — apertura, movimientos, cierre, resumen del turno.
3. **Stock e inventario** — variantes, alertas stock bajo, movimientos, ajustes.
4. **Productos y etiquetas** — catálogo, códigos de barras, diseñador de etiquetas.
5. **Clientes (CRM)** — ficha, historial, cuenta corriente / búsqueda en POS.
6. **Ventas e historial** — consulta, detalle, trazabilidad.
7. **Devoluciones** — parcial/total, reingreso de stock.
8. **Remitos** — emisión e impresión A4.
9. **Dashboard y reportes** — KPIs, ganancia bruta, gráficos / reportes de gestión.
10. **Configuración** — datos del negocio, métodos de pago, ticket, equipo/usuarios, multi-rubro.
11. **Impresión** — tickets térmicos y etiquetas vía PrintBridge (software); hardware aparte.
12. *(Nota al pie)* **Facturación electrónica AFIP** — integración disponible; abono del proveedor (TusFacturas) **aparte**, si aplica.

No saturar con features internas de desarrollo; lenguaje de dueño de negocio.

**Archivos afectados:**

- HTML página 3

---

### Paso 5: Copy — inversión y exclusiones

Página 4 con jerarquía visual fuerte en los montos.

**Bloque A — Puesta en marcha (único)**

- Título: **Instalación y puesta en marcha — $120.000**
- Incluye:
  - Alta y configuración de la tienda en el sistema
  - Parametrización inicial (rubro, métodos de pago, ticket, usuarios)
  - **3 sesiones de capacitación de 1 hora** (dueño / cajero / operación diaria)
  - **Carga de los primeros 20 productos** (nombre, precios, stock inicial; variantes si aplica)
  - Acompañamiento para el primer día de uso

**Bloque B — Suscripción**

- Título: **Abono mensual — $40.000 / mes**
- Incluye: acceso completo al sistema, actualizaciones, soporte operativo estándar, hosting/mantenimiento de la plataforma.

**Bloque C — No incluido (destacado, borde warning o caja clara)**

- Computadoras, notebooks o tablets
- Impresora térmica de tickets
- Scanner de código de barras
- Impresora de etiquetas / balanza
- Abono de facturación electrónica de terceros (si se contrata)
- Carga masiva extra de productos más allá de los 20 iniciales (se cotiza aparte si hace falta)

**Frase de transparencia:**

> Las máquinas e insumos de hardware son independientes del software. Te asesoramos qué comprar según tu mostrador, pero no están incluidos en estos valores.

**Archivos afectados:**

- HTML página 4

---

### Paso 6: Diseño visual del HTML

Construir el HTML con CSS embebido (como `brochure-cvalle.html`), calidad “atrapante”.

**Acciones de diseño:**

- Portada full-bleed oscura (negro marca) con acentos lime; tipografía grande; poco texto.
- Páginas interiores: fondo cálido `#fafaf9`, cards blancas, acento lime en bordes/íconos.
- Precios en tipografía grande (display); labels chicos en uppercase tracking.
- Evitar: purple gradients, cream+terracota genérico, grids de pills saturados, emojis.
- Incluir 2–3 gestos visuales: bloque tipográfico de portada, números de precio como ancla, ritmo de cards/icon rows.
- Footer discreto por página: “CValleTienda · Propuesta comercial · 2026”.
- Accesibilidad de contraste AA en texto sobre fondos.
- Reutilizar estructura/CSS del brochure como base, **reescribiendo** contenido y precios (no copiar planes viejos).

**Opcional visual:** 1 screenshot sutil (ej. POS) en página de módulos, con máscara/borde, sin romper densidad.

**Archivos afectados:**

- `salidas/2026-08-08-presentacion-comercial-cvalletienda.html`

---

### Paso 7: Página de contacto y CTA

**Acciones:**

- WhatsApp: mostrar `299 658-7715` (formato legible) + botón/caja “Escribime por WhatsApp”.
- Mail: `santiagoalvarezz.dev@gmail.com`
- Texto CTA: “¿Querés verlo en vivo o arrancar este mes? Coordinamos una demo corta.”
- Pasos de arranque (numerados 1–4): contacto → configuración → capacitaciones → primeros 20 productos cargados → cobrás con el sistema.

**Archivos afectados:**

- HTML página 5 (y 6 si aplica)

---

### Paso 8: Exportar a PDF

**Acciones:**

1. Abrir el HTML en Chrome/Edge.
2. Imprimir → Destino: **Guardar como PDF**.
3. Configurar: tamaño A4, márgenes ninguno (el HTML ya tiene padding), gráficos de fondo **activado**, escala 100%.
4. Guardar en `salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf`.
5. Alternativa automatizable si hay headless Chrome disponible en el entorno:

```bash
# Ejemplo (ajustar path al chrome local en Windows)
chrome --headless --disable-gpu --print-to-pdf="salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf" "salidas/2026-08-08-presentacion-comercial-cvalletienda.html"
```

6. Verificar visualmente cada página (nada cortado, precios correctos, contacto visible).

**Archivos afectados:**

- `salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf`

---

### Paso 9: Validación y cierre del plan

**Acciones:**

- Checklist de validación (sección siguiente).
- Actualizar este plan a `**Estado:** Implementado` y agregar Notas de Implementación.
- Si se confirmó el pricing comercial $40.000, actualizar una línea en `contexto/estrategia.md`.
- No tocar `CLAUDE.md` salvo que se documente un nuevo flujo permanente de “generar presentaciones” (no es el caso).

**Archivos afectados:**

- `planes/2026-08-08-pdf-presentacion-comercial-cvalletienda.md`
- `contexto/estrategia.md` (opcional)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `salidas/brochure-cvalle.html` — precedente visual/copy de módulos
- `contexto/estrategia.md` — pricing de lanzamiento
- `contexto/info-negocio.md` — descripción de módulos
- `referencia/design-system-v2.md` — tokens de color

### Actualizaciones Necesarias para Consistencia

- No actualizar el brochure viejo en este plan (evitar doble mantenimiento). Si más adelante se unifica, crear plan aparte.
- El PDF nuevo pasa a ser **la pieza comercial vigente** para outreach local.

### Impacto en Flujos de Trabajo Existentes

- No afecta la app ni migraciones.
- Mejora el flujo de venta: `/implementar` este plan → PDF listo → envío por WhatsApp/mail.
- Skills a usar en implementación: `senior-frontend` (HTML/CSS print) + principios visuales de `canvas-design` / `ui-design-system` (tokens, craft). No hace falta `pdf-processing-pro` salvo que se quiera post-procesar PDFs existentes.

---

## Lista de Validación

Cómo verificar que la implementación está completa y correcta:

- [x] Existe `salidas/2026-08-08-presentacion-comercial-cvalletienda.html`
- [x] Existe `salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf`
- [x] Existe brief interno con precios fijos
- [x] Portada comunica marca + promesa + ancla de precio
- [x] Página de dolores/beneficios presente y legible
- [x] Módulos del sistema detallados (POS, caja, stock, clientes, remitos, devoluciones, dashboard/reportes, etiquetas, config, impresión)
- [x] Instalación muestra **$120.000** con 3×1h + 20 productos
- [x] Mensualidad muestra **$40.000**
- [x] Hardware/máquinas claramente **aparte / no incluido**
- [x] Contacto: `2996587715` y `santiagoalvarezz.dev@gmail.com`
- [x] PDF A4 sin desbordes, fondos impresos, tipografía nítida
- [x] No reintroduce precios viejos del brochure ($19.900 / planes confusos en la página de inversión)
- [x] Plan marcado como Implementado al cerrar

---

## Criterios de Éxito

La implementación está completa cuando:

1. El PDF se puede abrir y enviar a un cliente sin edición adicional.
2. Un dueño de comercio entiende en &lt;2 minutos: qué es, qué resuelve, qué paga una vez, qué paga por mes, qué no incluye, y cómo contactar.
3. Los montos y el pack de onboarding coinciden exactamente con el pedido ($120.000 / $40.000 / 3×1h / 20 productos / máquinas aparte).
4. El aspecto visual está a la altura de marca (lime/negro, limpio, premium) y no parece un template genérico.

---

## Notas

- El precio $40.000 está alineado al Plan Operativo de lanzamiento ($39.900) en `contexto/estrategia.md`; comunicarlo redondeado es aceptable comercialmente si se confirma.
- Si el cliente pide carga de más de 20 productos, cotizar bloque extra (el brochure viejo usaba bloques de 100; no fijar precio de bloque en este PDF salvo que se pida).
- Posible follow-up: versión 1 página “flyer” + versión completa; o PDF personalizado por cliente (`Propuesta para [Nombre]`).
- Al implementar, leer skill `senior-frontend` y aplicar craft tipográfico; no inventar módulos que el producto no tenga.

---

## Notas de Implementación

**Implementado:** 2026-08-08

### Resumen

Se generó la presentación comercial completa en HTML print-ready (5 páginas A4) y se exportó a PDF con Chrome headless. Defaults del plan aplicados: oferta única, nota AFIP aparte, marca CValleTienda, precios ARS sin desglose IVA, WhatsApp `5492996587715`. Se actualizó `contexto/estrategia.md` con la cifra comercial comunicada ($40.000/mes + pack onboarding).

### Desviaciones del Plan

- Página 6 (cierre visual opcional) omitida: el CTA + pasos caben en la página 5.
- Sin capturas de pantalla en módulos: se usó iconografía limpia para no romper densidad en A4.
- Tipografía Inter (Google Fonts) en lugar de Geist (mismo espíritu sans premium; Geist no está en CDN fácil para HTML standalone).

### Problemas Encontrados

- El check inmediato post-Chrome falló por timing (`Test-Path` antes de flush); el PDF sí se escribió (~210 KB). Verificado después con `dir`.
`)