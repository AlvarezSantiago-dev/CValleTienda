# Plan: Fix generación PDF novedades clientes (8 páginas A4)

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Corregir el PDF generado desde el HTML de novedades — sale roto, descuadrado y con ~17 páginas en lugar de 8. Entregable final: `salidas/cv-mitienda-actualizaciones-junio-2026.pdf`.

---

## Descripción General

### Qué Logra Este Plan

Corrige la **capa de impresión CSS** del HTML de novedades, ajusta el **contenido que desborda** (capturas y páginas densas), limpia artefactos de edición manual, y agrega un **script reproducible** que genera el PDF con nombre fijo `cv-mitienda-actualizaciones-junio-2026.pdf` — sin depender de Ctrl+P con opciones incorrectas.

### Por Qué Importa

El documento es el canal principal para comunicar mejoras a clientes activos. Un PDF de 17 páginas descuadrado destruye credibilidad y no se puede enviar por WhatsApp. La causa es corregible (CSS + automatización), no requiere rediseñar todo el contenido.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | Fuente HTML (8 secciones `.page`) |
| `salidas/capturas/*.png` | Screenshots embebidos (algunos ya activos) |
| `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` | PDF roto generado manualmente |
| `salidas/brochure-cvalle.html` | Referencia que imprime mejor (sin `min-height` anidado) |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.md` | Instrucciones actuales (solo Ctrl+P) |
| `referencia/plantilla-novedades-clientes.html` | Plantilla a sincronizar post-fix |

### Diagnóstico — por qué salen ~17 páginas

| # | Causa | Evidencia en HTML | Efecto |
|---|--------|-------------------|--------|
| **C1** | **`min-height: 297mm` anidado** | `.page`, `.page-inner` y `.cover` los tienen todos | Cada bloque fuerza ~1 hoja A4; el navegador parte en **~2 hojas por sección** → 8×2 ≈ 16 + extras |
| **C2** | **`@page` ausente** | No hay regla `@page { size: A4; margin: 0; }` | Márgenes del browser reducen área útil → reflow y saltos extra |
| **C3** | **`@media print` incompleto** | Solo `body { background }` y `.page { margin: 0 }` | No resetea `html/body`, no corrige alturas, no oculta números de preview |
| **C4** | **Página POS sobrecargada** | 4 imágenes `<img>` en página 6 (`pos-cobro-guiado*.png`) | Desborda A4 aunque C1 se arregle |
| **C5** | **Texto basura visible** | Líneas literales `CAPTURA:` / `CAPTURAS:` fuera de comentarios | Aparece en el PDF impreso |
| **C6** | **Ctrl+P con opciones default** | Headers/footers, márgenes ≠ 0, escala “Ajustar” | Páginas en blanco, URL/fecha en pie, contenido escalado mal |

**Conclusión:** 17 páginas no es “contenido real” — es **doble conteo de altura A4** + overflow de capturas + márgenes del browser.

### Mapa de páginas esperado (8)

| # | Sección HTML | Contenido |
|---|--------------|-----------|
| 1 | `.page.cover` | Portada |
| 2 | Gráficos + Reportes | Puede requerir compactar si screenshot grande |
| 3 | Productos + Lista precios | |
| 4 | Inicio y turnos | 1 screenshot |
| 5 | Cierre de caja | 1 screenshot |
| 6 | POS guiado + atajos | **Máx. 1–2 screenshots** o fila compacta |
| 7 | Correcciones | |
| 8 | Cierre / contacto | |

---

## Cambios Propuestos

### Resumen de Cambios

- Reescribir **CSS de impresión** alineado con `brochure-cvalle.html` + regla `@page` A4 margin 0.
- **Eliminar `min-height: 297mm`** de `.page-inner` y `.cover`; dejar altura controlada solo en `.page` (o `height: 297mm` fija en print con `box-sizing`).
- Ajustar **`.screenshot-img`** en print: `max-height` más bajo; en POS usar **grid 2×2** o **solo 1 captura representativa**.
- Limpiar texto `CAPTURA:` suelto en el HTML.
- Crear script **`scripts/generar-pdf-novedades.mjs`** con Playwright (Chromium headless) → output fijo.
- Actualizar MD con comando script + checklist Ctrl+P como fallback.
- Regenerar y validar **`salidas/cv-mitienda-actualizaciones-junio-2026.pdf`** (exactamente 8 páginas).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `scripts/generar-pdf-novedades.mjs` | Genera PDF A4 desde HTML local con Playwright |
| `scripts/README-pdf-novedades.md` | Uso del script, prerequisitos, troubleshooting (opcional — puede ir en MD principal) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | CSS print fix, capturas POS, limpiar CAPTURA:, posible split página 2 |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.md` | Instrucciones script + opciones Ctrl+P correctas |
| `referencia/plantilla-novedades-clientes.html` | `@page` + print CSS corregido |
| `planes/2026-06-08-actualizar-novedades-clientes-junio.md` | Nota post-fix PDF |

### Archivos a Eliminar (si aplica)

| Ruta | Motivo |
|------|--------|
| `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` | Reemplazar por versión corregida (mismo nombre) |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Script Playwright headless (no Puppeteer en app):** Script aislado en `scripts/`, ejecutable con `npx playwright` sin acoplar al build Next.js. Mismo motor que Chrome pero con parámetros fijos (margin 0, printBackground, scale 1).

2. **Fix CSS primero, script segundo:** Aunque el script ayude, el HTML debe imprimir bien también con Ctrl+P — una sola fuente de verdad.

3. **`min-height` solo en contenedor `.page` en pantalla; en print usar `height: 297mm` + `overflow: hidden` o permitir crecimiento sin anidar:** Preferir **una** caja de altura por página, no tres anidadas.

4. **POS: máximo 2 capturas en print** — 4 screenshots del wizard no caben en A4 legible; usar 1 captura del paso 1 + nota “4 pasos” o grid 2×2 con `max-height: 35mm` cada una.

5. **Nombre de salida fijo:** `cv-mitienda-actualizaciones-junio-2026.pdf` en `salidas/` (sin fecha en nombre para reenvío consistente).

6. **Fuentes:** Mantener Inter vía Google Fonts pero agregar fallback `system-ui` y en script esperar `document.fonts.ready` antes de PDF.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Solo documentar “imprimí bien en Chrome” | Ya falló; opciones del usuario varían |
| Puppeteer en `app/package.json` | Peso y deps en producción innecesarias |
| WeasyPrint / wkhtmltopdf | Deps nativas difíciles en Windows |
| Dividir HTML en 8 archivos separados | Mantenimiento pesado |
| Quitar todas las capturas | El usuario ya las agregó; compactar es mejor |

### Preguntas Abiertas

1. **¿Conservar las 4 capturas del POS?** Recomendado: 1 en PDF + las demás solo en versión web/HTML extendida, o grid miniatura.
2. **¿Ocultar `.page-num` en print?** Recomendado sí (son para preview HTML, no para cliente).

---

## Tareas Paso a Paso

### Paso 1: Corregir CSS base y reglas `@page`

**Objetivo:** Una sección `.page` = exactamente una hoja A4 al imprimir.

**Acciones:**

Agregar **fuera** de `@media print`:

```css
@page {
  size: A4 portrait;
  margin: 0;
}
```

Reemplazar bloques problemáticos:

```css
/* ANTES (mal) */
.page { min-height: 297mm; }
.page-inner { min-height: 297mm; display: flex; ... }
.cover { min-height: 297mm; }

/* DESPUÉS (bien) */
.page {
  width: 210mm;
  min-height: 297mm; /* solo preview pantalla */
  ...
}
.page-inner {
  padding: 14mm 16mm 12mm;
  /* SIN min-height */
  display: flex;
  flex-direction: column;
}
.cover {
  /* SIN min-height — hereda altura de .page */
  min-height: 100%;
  ...
}
```

Expandir `@media print`:

```css
@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: 210mm;
  }
  .page {
    width: 210mm;
    height: 297mm;
    min-height: 0;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .page-inner {
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
  }
  .cover {
    height: 297mm;
    min-height: 0;
    box-sizing: border-box;
  }
  .page-num { display: none; } /* opcional */
  .screenshot-img {
    max-height: 55mm; /* print compacto */
  }
}
```

Mover estilos **solo pantalla** a `@media screen`:

```css
@media screen {
  body { background: #e5e7eb; padding: 10mm 0; }
  .page { margin: 0 auto 8mm; box-shadow: ...; min-height: 297mm; }
}
```

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`

---

### Paso 2: Limpiar HTML y compactar capturas

**Acciones:**

1. Eliminar todas las líneas sueltas `CAPTURA:` / `CAPTURAS:` (dejar solo comentarios HTML `<!-- CAPTURA: ... -->`).

2. **Página 6 (POS):** elegir una de:
   - **Opción A (recomendada):** dejar solo `pos-cobro-guiado.png` (paso 1).
   - **Opción B:** grid CSS `.screenshot-grid` 2×2 con `max-height: 32mm` por imagen.

3. **Página 2 (Gráficos):** si `graficos-finanzas.png` es alta, limitar `max-height: 50mm` en print.

4. Revisar `.tip-box { margin-top: auto; }` — en print cambiar a `margin-top: 12px` para evitar flex que empuja contenido fuera de la hoja.

5. Si página 2 sigue desbordando tras CSS fix, **separar Reportes** a su propia `.page` (pasaría a 9 páginas) **solo si necesario** — objetivo preferido mantener 8.

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`

---

### Paso 3: Script Playwright para PDF reproducible

**Archivo:** `scripts/generar-pdf-novedades.mjs`

**Contenido lógico:**

```javascript
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'salidas/2026-06-18-novedades-clientes-cvalletienda.html');
const outPath = path.join(root, 'salidas/cv-mitienda-actualizaciones-junio-2026.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: outPath,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await browser.close();
console.log('PDF generado:', outPath);
```

**Uso documentado:**

```bash
# Desde raíz del repo (primera vez)
npx playwright install chromium

# Generar PDF
node scripts/generar-pdf-novedades.mjs
```

**Notas Windows:** path `file:///` debe usar forward slashes; el script resuelve con `pathToFileURL` de `url` (preferir `pathToFileURL(htmlPath).href` en implementación).

**Archivos afectados:**

- `scripts/generar-pdf-novedades.mjs` (nuevo)

---

### Paso 4: Validación automática de conteo de páginas (opcional pero recomendado)

**Acciones:**

- Tras generar PDF, usar `pdf-parse` o contar con Playwright imprimiendo a buffer y verificando metadata — **alternativa simple:** abrir PDF y confirmar manualmente 8 páginas.
- Script puede loguear warning si tamaño de archivo sugiere problema (>500KB con pocas imágenes OK).

**Criterio:** archivo final = **exactamente 8 páginas** en visor PDF.

---

### Paso 5: Actualizar documentación

**En `salidas/2026-06-18-novedades-clientes-cvalletienda.md`:**

Reemplazar sección “Cómo generar el PDF”:

```markdown
**Generar PDF (recomendado):**
node scripts/generar-pdf-novedades.mjs
→ salidas/cv-mitienda-actualizaciones-junio-2026.pdf

**Fallback manual (Chrome):**
- Ctrl+P → Destino: Guardar como PDF
- Tamaño: A4 · Márgenes: Ninguno · Escala: 100%
- Desactivar “Encabezados y pies de página”
- Activar “Gráficos de fondo”
```

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.md`
- `referencia/plantilla-novedades-clientes.html` (CSS print)
- `planes/2026-06-08-actualizar-novedades-clientes-junio.md` (nota)

---

### Paso 6: Generar PDF final y revisión visual

**Checklist revisión por página:**

| Pág | Verificar |
|-----|-----------|
| 1 | Portada negra full-bleed, sin banda blanca abajo |
| 2 | Tabs + screenshot no cortados |
| 3 | Variantes + lista precios legibles |
| 4 | Inicio screenshot + tip box |
| 5 | Tabla cierre + screenshot |
| 6 | Wizard steps + max 1–2 imgs + tabla atajos |
| 7 | 3 cards correcciones |
| 8 | Contacto centrado |

**Acciones:**

1. Ejecutar script
2. Abrir `cv-mitienda-actualizaciones-junio-2026.pdf` — contar páginas
3. Abrir en celular — texto ≥ 11pt legible
4. Comparar con HTML en Chrome print preview — deben coincidir en conteo

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `salidas/capturas/*.png` | Rutas relativas en `<img src="capturas/...">` |
| `planes/2026-06-18-pdf-novedades-clientes-junio.md` | Plan original Ctrl+P |
| `planes/2026-06-08-actualizar-novedades-clientes-junio.md` | v2 contenido |

### Actualizaciones Necesarias para Consistencia

- Plantilla novedades debe incluir `@page` y patrón sin `min-height` anidado.
- CLAUDE.md: opcional mencionar `scripts/generar-pdf-novedades.mjs` — solo si se documenta en estructura workspace.

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Envío WhatsApp clientes | PDF usable con nombre fijo |
| Edición futura novedades | Regenerar con un comando |
| App Next.js | Ninguno (script fuera de `app/`) |

---

## Lista de Validación

- [x] HTML tiene `@page { size: A4; margin: 0; }`
- [x] `.page-inner` y `.cover` **sin** `min-height: 297mm`
- [x] Sin texto `CAPTURA:` visible en HTML
- [x] Página POS usa grid 2×2 compacto (no 4 imágenes apiladas)
- [x] Script `generar-pdf-novedades.mjs` genera PDF sin error
- [x] `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` tiene **8 páginas**
- [x] Colores lime/black visibles (`printBackground: true`)
- [x] MD actualizado con comando y fallback Ctrl+P
- [x] Plantilla referencia sincronizada

---

## Criterios de Éxito

1. El PDF `cv-mitienda-actualizaciones-junio-2026.pdf` tiene **exactamente 8 páginas** en cualquier visor.
2. Cada página corresponde a una sección del HTML sin cortes absurdos ni bloques duplicados.
3. Santiago puede regenerar el PDF con **un comando** después de editar HTML o capturas.
4. Ctrl+P con opciones documentadas produce el **mismo conteo** de páginas que el script (±0).

---

## Notas

### Opciones Ctrl+P correctas (fallback)

| Opción | Valor |
|--------|-------|
| Destino | Guardar como PDF |
| Páginas | Todas |
| Diseño | Vertical |
| Papel | A4 |
| Márgenes | **Ninguno** |
| Escala | **100%** (no “Ajustar al ancho”) |
| Encabezados y pies | **Desactivado** |
| Gráficos de fondo | **Activado** |

### Diagrama del bug C1

```
┌─ .page ───────────── min-height 297mm ─────────────┐
│  ┌─ .page-inner ─── min-height 297mm + padding ───┐ │
│  │         contenido real ~180mm                  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↓ navegador calcula > 297mm efectivos
         ↓ page-break-after en .page + overflow
    HOJA 1 (mitad vacía) + HOJA 2 (resto)  ≈ 2 por sección
```

### Ejecutar implementación

```
/implementar planes/2026-06-08-fix-pdf-novedades-generacion.md
```

### Dependencia única nueva

- Playwright Chromium vía `npx` (no commit de `node_modules` del browser; `npx playwright install chromium` local).

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

- CSS print corregido: `@page A4`, sin `min-height` anidado, altura fija 297mm por `.page` en print.
- Limpieza de texto `CAPTURA:`; POS con grid 2×2 de screenshots compactos.
- Script `scripts/generar-pdf-novedades.mjs` usando Edge/Chrome del sistema (sin descargar Chromium).
- PDF regenerado: `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` — **8 páginas**, ~1.3 MB.

### Desviaciones del Plan

- `npx playwright install chromium` falló por timeout de red; el script usa `channel: 'msedge'` / `'chrome'` instalados en Windows.
- Primera vez requiere `npm install playwright` en la raíz (paquete npm, no browser bundle).
- Tip-box del modo clásico en página POS removido para evitar overflow (contenido ya en bullets).

### Problemas Encontrados

- Descarga de Chromium de Playwright timeout en entorno sandbox — resuelto con canal msedge.
