# Plan: PDF de novedades para clientes (Junio 2026)

**Creado:** 2026-06-18
**Estado:** Implementado
**Pedido:** Generar un PDF sencillo de entender para clientes activos con todo lo implementado recientemente: gráficos, atajos de teclado POS/caja (opcional), mejoras visuales en variantes, ajuste de horario y demás. Excluir mensaje comercial a Denisee.

---

## Descripción General

### Qué Logra Este Plan

Produce un **documento visual listo para imprimir o enviar por WhatsApp/email** (PDF) que resume las mejoras de CV-MiTienda en lenguaje simple para dueños de tienda y cajeros. El entregable será un **HTML optimizado para impresión** en `salidas/` (mismo patrón que `brochure-cvalle.html`), convertible a PDF con Ctrl+P → “Guardar como PDF” sin dependencias nuevas.

### Por Qué Importa

Los clientes activos no leen planes técnicos ni changelogs de código. Un PDF corto (3–5 páginas) reduce consultas de soporte (“¿dónde están los gráficos?”, “¿por qué la hora estaba mal?”) y comunica valor del producto. Santiago puede enviarlo masivamente o entregarlo en visitas comerciales.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `salidas/brochure-cvalle.html` | Brochure comercial A4, lime/black, `@media print`, `page-break` — **plantilla visual de referencia** |
| `salidas/presupuesto-cliente-cvalle-completo.html` | Otro HTML imprimible multi-página |
| `planes/2026-06-03-lista-productos-pdf.md` | Patrón API HTML + print (productos); no aplica directo pero inspira estructura |
| `app/app/api/productos/pdf/route.ts` | PDF vía HTML server-side (no necesario para doc estático de novedades) |
| Planes implementados Jun 2026 | Fuente de verdad del contenido (ver inventario abajo) |

### Inventario de mejoras a documentar (excl. Denisee)

| # | Área | Qué decir al cliente | Fuente |
|---|------|----------------------|--------|
| 1 | **Gráficos** (nuevo menú) | Sección **Gráficos** separada de Reportes; pestañas Finanzas · Ventas · Stock · Operación; KPIs y gráficos del mes; exportar CSV; ver en celular sin que se rompan los números grandes | `planes/2026-06-08-reportes-graficos-avanzados.md`, `2026-06-10-fix-graficos-kpi-responsive.md`, `/graficos` en Sidebar |
| 2 | **Reportes** | Tabla de cierre de mes (P&L); enlace a Gráficos para vista visual | `/reportes` |
| 3 | **POS / Caja — atajos** *(sección opcional)* | F2 / Ctrl+Enter cobrar; ↑↓ buscar; Esc volver al buscador; `?` ayuda; pago rápido con chips; panel de cobro más visible en notebook | `PosAtajosHelp.tsx`, `planes/2026-06-08-pos-notebook-cobro-velocidad-ux.md` |
| 4 | **Variantes de productos** | Tabla más clara al cargar ropa/variantes; barra “cuántas faltan completar”; stock inicial más visible; completar códigos más rápido | `planes/2026-06-10-rediseno-tabla-variantes-3-capas.md` |
| 5 | **Horario de ventas** | Las horas en pantalla ahora coinciden con el ticket (hora Argentina); “ventas de hoy” y reportes usan el día correcto | `planes/2026-06-17-fix-timezone-ventas-produccion.md` |
| 6 | **Tickets y devoluciones** | Mismo número en ticket, vale y pantalla (ej. T-0021); ticket de devolución más completo | `planes/2026-06-08-fix-tickets-cambio-devolucion-numeracion.md` |
| 7 | **Lista de precios** | Pantalla `/precios` funciona: escaneá o buscá y ves el precio grande al instante | `planes/2026-06-08-fix-lista-precios-ux.md` |
| 8 | **Descuentos en POS** *(breve, si aplica deploy)* | Descuentos por porcentaje corregidos en caja | `planes/2026-06-09-fix-descuentos-pos-porcentaje.md` |

**No incluir:** mensaje outreach Denisee (`salidas/2026-06-11-mensaje-denisee-cvalletienda.md`).

### Brechas o Problemas que se Abordan

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | No hay changelog orientado al cliente | Soporte repetitivo; clientes no descubren Gráficos |
| B2 | Brochure es comercial (pricing), no novedades | No sirve como “qué hay de nuevo” |
| B3 | Mejoras técnicas dispersas en 15+ planes | Santiago no tiene un solo doc para enviar |

---

## Cambios Propuestos

### Resumen de Cambios

- Crear `salidas/2026-06-18-novedades-clientes-cvalletienda.html` — documento A4 imprimible, 4–5 páginas
- Crear `salidas/2026-06-18-novedades-clientes-cvalletienda.md` — versión texto/markdown (backup, WhatsApp largo)
- Reutilizar tokens visuales del brochure: `#0A0A0A`, `#65a30d`, Inter, `.page` con `page-break-after`
- Estructura por **beneficio** (“Qué podés hacer ahora”), no por commit técnico
- Sección **Atajos de teclado** en página aparte marcada como “Opcional — para cajeros avanzados”
- Instrucciones al final: “Menú → Gráficos”, “Menú → Reportes”, “POS → tecla ?”
- **No** modificar código de la app (salvo link opcional futuro en Configuración — fuera de scope)
- Generar PDF final en `salidas/2026-06-18-novedades-clientes-cvalletienda.pdf` manualmente o documentar el paso

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | Documento principal imprimible → PDF |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.md` | Mismo contenido en markdown (copiar/pegar, email) |
| `referencia/plantilla-novedades-clientes.html` | Esqueleto reutilizable para futuras actualizaciones (opcional, clon del HTML con placeholders) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| Ninguno obligatorio en `app/` | Doc estático en `salidas/` |
| `contexto/info-negocio.md` | Opcional: una línea “Changelog clientes: `salidas/2026-06-18-novedades-...`” |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **HTML + imprimir a PDF (no librería PDF en Node):** Consistente con brochure y lista productos; cero riesgo en producción; Santiago edita texto fácil.

2. **Audiencia: dueño + cajero:** Tono vos/tu, oraciones cortas, sin “SSR”, “timezone”, “RPC”. Horario → “La hora en pantalla ahora es la misma que en el ticket.”

3. **Atajos como sección opcional:** Página 4 titulada “Atajos de teclado (opcional)” — quien no use teclado puede omitirla al imprimir (`page-break` independiente).

4. **Gráficos como headline:** Es la novedad más visible; va en portada + página 2 con captura de pantalla o ilustración esquemática (placeholder SVG de tabs).

5. **4–5 páginas máximo:** Respetar atención del cliente; detalle profundo solo en markdown si hace falta.

6. **Branding:** “CV-MiTienda” / “CValleTienda” según uso en app (`LandingPage` / login); unificar en portada con logo texto lime.

7. **Fecha de release:** “Actualización — Junio 2026” (no fechas técnicas por feature).

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| PDF generado con Puppeteer en CI | Overkill; requiere deps y build |
| Página `/novedades` dentro de la app | Scope extra; doc estático alcanza para envío masivo |
| Un solo PDF comercial + novedades | Mezcla venta con changelog; confunde |
| Incluir pricing | Brochure ya lo cubre |
| Video Loom | Fuera de scope del pedido |

### Preguntas Abiertas

1. **¿Nombre en portada?** ¿“CV-MiTienda” o “CValleTienda”? (Recomendado: el que ven en login.)
2. **¿Incluir capturas reales?** Plan asume placeholders + instrucción para que Santiago pegue 2–3 screenshots antes de enviar (Gráficos, variantes, POS ayuda `?`).
3. **¿Stock optimizado** (`planes/2026-06-08-optimizar-stock`) está en producción? Si no, omitir o marcar “próximamente”.
4. **¿Contacto de soporte** en pie de página? (WhatsApp / email de Santiago — completar al implementar.)

---

## Tareas Paso a Paso

### Paso 1: Definir outline del documento (contenido final)

Redactar en español rioplatense, una viñeta = un beneficio + “Dónde: Menú → …”.

**Estructura de páginas:**

| Página | Título | Contenido |
|--------|--------|-----------|
| 1 | Portada | Logo, “Novedades Junio 2026”, subtítulo “Mejoras para tu tienda”, fecha |
| 2 | Gráficos y reportes | Qué son, 4 pestañas, KPIs, export CSV, link Reportes ↔ Gráficos |
| 3 | Productos y precios | Variantes más claras; lista de precios `/precios` |
| 4 | POS y caja *(opcional)* | Atajos tabla; pago rápido; tecla `?`; layout notebook |
| 5 | Correcciones importantes | Horario Argentina; tickets T-XXXX unificados; devoluciones |
| 6 | Cierre | “Seguimos mejorando”, contacto soporte, QR o URL del sistema |

**Acciones:**

- Escribir bullets en `salidas/2026-06-18-novedades-clientes-cvalletienda.md` primero (más fácil de revisar).
- Validar contra planes implementados; no inventar features.

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.md`

---

### Paso 2: Crear HTML imprimible (clonar estilo brochure)

**Base:** Copiar estructura CSS de `salidas/brochure-cvalle.html` (variables `--black`, `--lime`, `.page`, `@media print`).

**Contenido HTML mínimo por sección:**

```html
<!-- Página 2 ejemplo -->
<section class="page">
  <div class="page-inner">
    <span class="eyebrow">Nuevo</span>
    <h2>Gráficos de tu negocio</h2>
    <p class="lead">Ahora tenés una sección solo para ver cómo va el mes en un vistazo.</p>
    <ul class="check-list">
      <li><strong>Dónde:</strong> Menú lateral → <em>Gráficos</em></li>
      <li>Finanzas, Ventas, Stock y Operación en pestañas</li>
      <li>Números grandes se leen bien en celular y compu</li>
      <li>Podés exportar datos a Excel (CSV)</li>
    </ul>
    <div class="tip-box">
      <strong>Tip:</strong> En <em>Reportes</em> sigue la tabla de cierre de mes; en <em>Gráficos</em> ves las tendencias.
    </div>
  </div>
</section>
```

**Componentes CSS a incluir:**

- `.check-list` — viñetas con ✓ lime
- `.kbd` — teclas F2, Ctrl+Enter (como `PosAtajosHelp`)
- `.tip-box` — fondo `--lime-l`
- `.optional-badge` — “Opcional” en gris para página atajos
- `.screenshot-placeholder` — rectángulo gris “Captura: Gráficos → Finanzas” (reemplazable)

**Acciones:**

- Crear archivo completo (~200–350 líneas HTML+CSS).
- Probar en Chrome: Imprimir → A4 → Guardar PDF.
- Verificar que no se corten títulos entre páginas (`page-break-inside: avoid` en `.tip-box`, `h2`).

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`

---

### Paso 3: Sección atajos de teclado (opcional)

Tabla copiada de `app/components/pos/PosAtajosHelp.tsx`:

| Tecla | Acción (texto cliente) |
|-------|------------------------|
| F2 | Cobrar rápido |
| Ctrl + Enter | Igual que F2 |
| Enter | Confirmar monto / cerrar impresión |
| ↑ ↓ | Elegir producto en la búsqueda |
| Esc | Volver al buscador |
| ? | Ver esta ayuda en el POS |

Nota al pie: *“Solo en el POS, cuando no estás escribiendo en un campo.”*

**Acciones:**

- Página con badge “Opcional — para quien usa teclado en caja”.
- No mezclar con módulo `/caja` (sesiones/cierre) — atajos son del **POS** (ventas con caja abierta).

**Archivos afectados:**

- HTML + MD

---

### Paso 4: Sección horario (lenguaje simple)

**Texto propuesto:**

> **Horario de ventas corregido**  
> Las ventas ahora muestran la misma hora que el ticket impreso (hora de Argentina).  
> “Ventas de hoy” y los reportes del día cierran a medianoche local, no con desfase.

**No mencionar:** Vercel, UTC, migración de base de datos.

**Archivos afectados:**

- HTML + MD

---

### Paso 5: Sección variantes de productos

**Texto propuesto:**

> **Carga de productos con variantes (talle, color, etc.)**  
> - Barra arriba que te dice cuántas variantes faltan completar (código o stock).  
> - Stock inicial más visible al dar de alta mercadería.  
> - Botón para completar códigos de barras en lote.  
> **Dónde:** Productos → Nuevo / Editar → tabla de variantes.

**Archivos afectados:**

- HTML + MD

---

### Paso 6: Plantilla reutilizable (opcional)

Crear `referencia/plantilla-novedades-clientes.html` con:

- `{{TITULO}}`, `{{MES}}`, `{{SECCIONES}}` como comentarios HTML
- Misma hoja de estilos

Para la próxima actualización (ej. Julio 2026) duplicar y cambiar contenido.

**Archivos afectados:**

- `referencia/plantilla-novedades-clientes.html` (opcional)

---

### Paso 7: Generar PDF y validar

**Acciones:**

1. Abrir `salidas/2026-06-18-novedades-clientes-cvalletienda.html` en Chrome/Edge
2. Ctrl+P → Destino: Guardar como PDF
3. Opciones: márgenes predeterminados, **gráficos de fondo activados** (para lime)
4. Guardar como `salidas/2026-06-18-novedades-clientes-cvalletienda.pdf`
5. Releer PDF en celular — texto legible ≥ 11pt cuerpo, 18pt títulos
6. Enviar borrador a 1 cliente piloto antes de difusión masiva

**Checklist de contenido:**

- [ ] Gráficos mencionados con ruta de menú
- [ ] Reportes vs Gráficos explicado
- [ ] Atajos en sección opcional
- [ ] Variantes explicado sin jerga
- [ ] Horario explicado sin jerga técnica
- [ ] Tickets T-XXXX mencionado
- [ ] Sin referencia a Denisee
- [ ] Contacto soporte en última página

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.pdf` (generado manualmente)

---

### Paso 8: Mensaje de envío sugerido (WhatsApp)

Incluir al final del `.md`:

```
Hola! 👋 Te paso un resumen en PDF de las mejoras nuevas de CV-MiTienda (gráficos, horarios, variantes, etc.). 
Cualquier duda me escribís. [adjuntar PDF]
```

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.md` (apéndice)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `salidas/brochure-cvalle.html` | Estilos y estructura A4 |
| `planes/2026-06-*` | Fuente factual del contenido |
| `app/components/pos/PosAtajosHelp.tsx` | Lista exacta de atajos |
| `app/components/layout/Sidebar.tsx` | Labels menú Reportes / Gráficos |

### Actualizaciones Necesarias para Consistencia

- Opcional: link en email de bienvenida o footer de cierre de caja — **fuera de scope**
- No actualizar CLAUDE.md salvo que se agregue convención “novedades en salidas/”

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Soporte / onboarding clientes | Nuevo asset para enviar post-deploy |
| Ventas comerciales | Complementa brochure (no lo reemplaza) |
| Código producto | Ninguno |

---

## Lista de Validación

- [ ] Existe `salidas/2026-06-18-novedades-clientes-cvalletienda.html`
- [ ] Existe `salidas/2026-06-18-novedades-clientes-cvalletienda.md` con mismo contenido
- [ ] PDF generado y legible en móvil
- [ ] Todas las mejoras implementadas Jun 2026 relevantes están cubiertas
- [ ] Sección atajos marcada como opcional
- [ ] Sin contenido Denisee / outreach comercial
- [ ] Tono apto para cajero y dueño sin conocimiento técnico
- [ ] Colores lime/black consistentes con producto

---

## Criterios de Éxito

1. Un cliente puede **entender en 5 minutos** qué hay de nuevo y dónde encontrarlo en el menú.
2. Santiago puede **enviar el PDF hoy** sin editar código (solo abrir HTML → imprimir).
3. El documento **no contradice** el comportamiento real de la app en producción.
4. Futuras novedades pueden **replicar la plantilla** en &lt; 1 hora.

---

## Notas

### Contenido sugerido portada (borrador)

**Título:** Novedades CV-MiTienda — Junio 2026  
**Subtítulo:** Gráficos, mejoras en caja, productos y horarios  
**Bullets portada (3):**
- 📊 Nuevo módulo **Gráficos** para ver tu mes en un vistazo
- ⌨️ Atajos de teclado en el POS (opcional)
- 🕐 Horario de ventas alineado con tu ticket

### Exclusión explícita

No incluir `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` ni propuesta comercial/pricing del brochure.

### Ejecutar implementación

```
/implementar planes/2026-06-18-pdf-novedades-clientes-junio.md
```

---

## Notas de Implementación

**Implementado:** 2026-06-18

### Resumen

- Creado `salidas/2026-06-18-novedades-clientes-cvalletienda.html` (6 páginas A4, lime/black, imprimible).
- Creado `salidas/2026-06-18-novedades-clientes-cvalletienda.md` con mismo contenido + mensaje WhatsApp + checklist.
- Creado `referencia/plantilla-novedades-clientes.html` para futuras actualizaciones.
- Contacto del brochure: WhatsApp +54 299 658-7715, email santiagoalvarezc5@gmail.com.
- PDF binario: generar manualmente (Ctrl+P desde el HTML); no incluido en repo.

### Desviaciones del Plan

- Stock optimizado omitido (plan en borrador, no implementado en prod).
- Capturas reales no incluidas — placeholders editables en HTML.
- Branding unificado en **CV-MiTienda** (como en la app).

### Problemas Encontrados

Ninguno.

---

### Actualización v2 (2026-06-08)

Ver plan `planes/2026-06-08-actualizar-novedades-clientes-junio.md` — añade cierre caja, Inicio/turnos, cobro guiado y guía de capturas en `salidas/capturas/`.
