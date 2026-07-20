# Plan: PrintBridge v3.1.5 — textos finales, UTF-8 y pie de ticket

**Creado:** 2026-07-20  
**Estado:** Implementado  
**Pedido:** Versión final correcta de PrintBridge: corregir textos y UTF-8; quitar “Comprobante para cambio — sin importes”; arreglar “Gracias por su compra” duplicado (y caracteres raros en térmica); simplificar instrucción del vale de cambio.

---

## Descripción General

### Qué Logra Este Plan

Alinea **preview web** y **impresión térmica** (PrintBridge) en copy del ticket de venta y del vale de cambio: un solo mensaje de cierre configurable (`texto_pie`), sin subtítulo redundante en el vale, instrucción corta que no se corta en 58/80 mm, y strings seguros para code pages ESC/POS (sin em dash, sin `¡`/`°` problemáticos en 58 mm). Publica **v3.1.5** con `.exe` en Storage y actualiza la app para descargar esa versión.

### Por Qué Importa

En caja, el ticket es la cara del negocio. Hoy el cajero ve **dos agradecimientos** (config + hardcode) y a veces **basura tipo “letras chinas”** por Unicode + charset (`PC437` en 58 mm, `PC858` en 80 mm). El vale muestra un subtítulo que el usuario ya no quiere y una instrucción en dos líneas que **se trunca** en papel angosto. Este release cierra el ciclo de regresiones de textos sin tocar flujos de venta ni payloads.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/impresion/TicketVentaRenderer.tsx` | Preview/fallback web del ticket — imprime `t.texto_pie` **y** línea fija `¡Gracias por tu compra!` (l.129–133 + l.164–166) |
| `app/components/impresion/ValeCambioRenderer.tsx` | Vale web — subtítulo “Comprobante para cambio — sin importes”; instrucción larga en una línea |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Descarga y `MIN_PRINTBRIDGE_VERSION` = **3.1.4** |
| `app/lib/impresion/usePrint.tsx` | Envía JSON a `localhost:9100` — la térmica usa PrintBridge, no el TSX |
| `scripts/printbridge-v3/` | Fuente PrintBridge (local; carpeta `scripts/` en `.gitignore`) — **v3.1.4** en `package.json` |
| `scripts/printbridge-v3/src/renderer.js` | `renderTicketVenta`: `texto_pie` + `Gracias por tu compra!` fijo (l.166–187); `renderValeCambio`: subtítulo + instrucción en 2 líneas con tildes (l.341–365) |
| `scripts/printbridge-v3/src/printer.js` | `PC437_USA` (58 mm) vs `PC858_EURO` (80 mm); ancho 32/42 cols |
| `referencia/printbridge-v3-actualizacion-sin-reconfig.md` | Guía operador v3.1.4 |
| `referencia/printbridge-v3-vale-cambio-regalo.md` | Documenta vale sin precios (desactualizado en versión/link) |

### Brechas o Problemas que se Abordan

1. **Pie duplicado en ticket de venta** — La tienda suele tener `texto_pie` = “¡Gracias por su compra!” (onboarding/config). El código agrega **otro** agradecimiento distinto (“tu” vs “su”), visible en web y en térmica.
2. **Caracteres extraños (“chinos”) en térmica** — Causas probables combinadas:
   - Bytes UTF-8 de `—`, `°`, `¡`, tildes enviados sin `safeText(..., aggressive)` en perfil 58 mm.
   - Em dash en “Comprobante para cambio **—** sin importes”.
   - `setTextSize(2, 2)` en número de ticket del vale sin garantizar `setTextNormal()` + alineación antes del texto siguiente (algunos firmwares dejan modo/gráfico raro).
3. **Subtítulo del vale no deseado** — “Comprobante para cambio — sin importes” (web + `renderer.js` l.341).
4. **Instrucción del vale cortada** — Dos líneas largas con tildes; en 32–42 columnas se parte mal. Usuario pide: **“Para cambios, presentar este vale de cambio en el mostrador.”** (una línea, sin voseo, ASCII-friendly en térmica).
5. **Desalineación web ↔ térmica** — Cambios solo en TSX no arreglan caja hasta rebuild del `.exe`.

---

## Cambios Propuestos

### Resumen de Cambios

- Quitar footer hardcodeado del ticket; **solo** `texto_pie` si está configurado; si está vacío, **no** imprimir agradecimiento por defecto (el negocio lo define en Configuración → Ticket).
- Vale: solo título **VALE DE CAMBIO** (sin subtítulo); nueva instrucción única acordada.
- PrintBridge: pasar todos los textos fijos del vale y pie por `safeText` con `aggressive = textMode(ancho_mm)`; reemplazar `—` y `N°` en strings de impresión por `-` y `N` donde aplique.
- Tras `setTextSize` en vale, llamar explícitamente `setTextNormal()`, `bold(false)`, `alignCenter()` antes de líneas siguientes.
- Opcional coherencia UI: acortar hint del modal POS (“Sin importes…”) sin el em dash si se desea consistencia (no bloqueante).
- Bump **3.1.5**, `npm run pkg`, subir exe a Supabase Storage, actualizar `PrintBridgeStatus` y referencias.
- Auditoría rápida de comentarios/archivos en `renderer.js` guardados en **UTF-8** (evitar mojibake en comentarios; el código fuente ya se lee bien en editor).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/checklist-printbridge-v315-textos.md` | QA manual: ticket sin pie duplicado, vale sin subtítulo, 58 y 80 mm, caracteres legibles |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/impresion/TicketVentaRenderer.tsx` | Eliminar bloque fijo l.164–166 (`¡Gracias por tu compra!`). Mantener solo `t.texto_pie`. |
| `app/components/impresion/ValeCambioRenderer.tsx` | Quitar div subtítulo l.55–57; reemplazar instrucción l.104 por: `Para cambios, presentar este vale de cambio en el mostrador.` |
| `scripts/printbridge-v3/src/renderer.js` | Ticket: quitar `printer.println('Gracias por tu compra!')` si hay o no hay `texto_pie`. Vale: quitar subtítulo; una línea instrucción; `safeText` + reset post-`setTextSize`; revisar `TICKET DE VENTA N` (sin `°`). |
| `scripts/printbridge-v3/package.json` | Versión **3.1.5**; script `pkg` output `CValle-PrintBridge-v3.1.5.exe` |
| `scripts/printbridge-v3/public/index.html` | Badge versión 3.1.5 si existe en UI |
| `scripts/printbridge-v3/README.md` | Versión y URL Storage |
| `app/components/configuracion/PrintBridgeStatus.tsx` | `MIN_PRINTBRIDGE_VERSION = '3.1.5'`; URL exe; textos “v3.1.5” |
| `referencia/printbridge-v3-actualizacion-sin-reconfig.md` | Versión 3.1.5 + nota de textos/UTF-8 |
| `referencia/printbridge-v3-vale-cambio-regalo.md` | Quitar mención al subtítulo; instrucción nueva; link Storage/latest |
| `app/components/pos/PrintSelectionModal.tsx` | (Opcional) Hint vale: “Sin importes, para regalo o cambio” sin em dash |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Un solo pie en ticket = `texto_pie`**: Evita duplicados y respeta lo que configuró la tienda. No sustituir por string por defecto en código — el default ya vive en onboarding (`¡Gracias por su compra!`).
2. **Instrucción del vale exacta del usuario**: `Para cambios, presentar este vale de cambio en el mostrador.` — una línea en web; en térmica misma frase vía `safeText` (tildes → ASCII solo en 58 mm).
3. **UTF-8 / charset**: No migrar a UTF-8 en impresora (fuera de scope); **transliterar y evitar Unicode decorativo** en strings enviados a ESC/POS, especialmente 58 mm.
4. **Release 3.1.5 (patch)**: Sin cambios de API HTTP ni payload SQL; solo renderer/copy + versión.
5. **Fuente en `scripts/printbridge-v3/`**: Sigue fuera de git por `.gitignore`; el operador debe conservar copia local y subir el exe a Storage (documentado en checklist).

### Alternativas Consideradas

| Alternativa | Por qué no |
|-------------|------------|
| Dejar hardcode y quitar `texto_pie` de DB | Rompe personalización por tienda |
| Footer por defecto solo si `texto_pie` vacío | Sigue duplicando si la tienda ya tiene el mismo texto |
| Instrucción en 2 líneas con word-wrap automático | Más código; el usuario pidió frase simple en una línea |
| Forzar UTF-8 en firmware | Incompatible con parque instalado PC437/PC858 |

### Preguntas Abiertas (si las hay)

1. **¿Fallback si `texto_pie` está vacío?** Propuesta del plan: **silencio** (sin línea extra). Si preferís un default único en código, decilo antes de `/implementar`.
2. **¿Actualizar también `CValle-PrintBridge-latest.exe` en Storage?** Recomendado (misma build que 3.1.5) para autostart por nombre genérico.

---

## Tareas Paso a Paso

### Paso 1: Corregir preview web (ticket y vale)

**Acciones:**

- En `TicketVentaRenderer.tsx`, eliminar el `<div>` final con `¡Gracias por tu compra!`.
- En `ValeCambioRenderer.tsx`, eliminar el subtítulo “Comprobante para cambio — sin importes”.
- Reemplazar el párrafo de instrucción por: `Para cambios, presentar este vale de cambio en el mostrador.`

**Archivos afectados:**

- `app/components/impresion/TicketVentaRenderer.tsx`
- `app/components/impresion/ValeCambioRenderer.tsx`

---

### Paso 2: Corregir `renderTicketVenta` en PrintBridge

**Acciones:**

- Eliminar bloque l.185–188 que imprime siempre `Gracias por tu compra!`.
- Mantener bloque `if (t.texto_pie)` con `safeText(t.texto_pie, ag)` y `ag = textMode(t.ancho_mm)`.
- Verificar que `renderTicketDevolucion` no tenga footer duplicado (hoy solo `texto_pie` — OK).

**Archivos afectados:**

- `scripts/printbridge-v3/src/renderer.js`

---

### Paso 3: Corregir `renderValeCambio` (copy, wrap, charset)

**Acciones:**

- Eliminar `printer.println('Comprobante para cambio — sin importes')`.
- Cambiar encabezado ticket a `TICKET DE VENTA N` (sin carácter `°`) o `Nro` si hace falta más claridad.
- Tras imprimir `numero_ticket` con `setTextSize(2, 2)`:
  - `printer.setTextNormal()`
  - `printer.bold(false)`
  - `printer.alignCenter()` (o `alignLeft` según diseño)
- Reemplazar las dos líneas l.364–365 por **una**:
  - `const instruccion = 'Para cambios, presentar este vale de cambio en el mostrador.'`
  - `printer.println(safeText(instruccion, textMode(t.ancho_mm)))`
- Aplicar `safeText(..., ag)` a `VALIDO HASTA`, `Conservar este comprobante`, nombres de ítems (ya parcialmente cubierto en ticket).
- Revisar `(${dias} dias con ticket)` — ya sin tilde en “días” (bien para PC437).

**Archivos afectados:**

- `scripts/printbridge-v3/src/renderer.js`

---

### Paso 4: Auditoría UTF-8 / caracteres en `renderer.js`

**Acciones:**

- Buscar en `renderer.js`: `—`, `°`, `¡`, `¿`, comillas tipográficas.
- Sustituir en **strings enviados a `printer.println`** por ASCII o `safeText` agresivo en 58 mm.
- Confirmar que el archivo se guarda en UTF-8 (sin BOM) al editar.
- Revisar comentarios con mojibake (“diseño”, “Más”) y corregir si aparecen al abrir en editor.

**Archivos afectados:**

- `scripts/printbridge-v3/src/renderer.js`

---

### Paso 5: Bump versión, build exe y Storage

**Acciones:**

- `package.json`: `"version": "3.1.5"`; output pkg `dist/CValle-PrintBridge-v3.1.5.exe`.
- `cd scripts/printbridge-v3 && npm install && npm run pkg`.
- Probar local: `node server.js` → imprimir ticket y vale de prueba desde panel o curl.
- Subir a Supabase Storage: `printbridge/releases/CValle-PrintBridge-v3.1.5.exe` (y opcional `CValle-PrintBridge-latest.exe`).
- Crear `salidas/checklist-printbridge-v315-textos.md` con casos de prueba.

**Archivos afectados:**

- `scripts/printbridge-v3/package.json`
- `scripts/printbridge-v3/README.md`
- `scripts/printbridge-v3/public/index.html` (si aplica)
- `salidas/checklist-printbridge-v315-textos.md`

---

### Paso 6: Actualizar app y documentación

**Acciones:**

- `PrintBridgeStatus.tsx`: `MIN_PRINTBRIDGE_VERSION`, `PRINTBRIDGE_DOWNLOAD_URL`, strings visibles → 3.1.5.
- `referencia/printbridge-v3-actualizacion-sin-reconfig.md` y `referencia/printbridge-v3-vale-cambio-regalo.md`.
- (Opcional) `PrintSelectionModal.tsx`: hint sin em dash.

**Archivos afectados:**

- `app/components/configuracion/PrintBridgeStatus.tsx`
- `referencia/printbridge-v3-actualizacion-sin-reconfig.md`
- `referencia/printbridge-v3-vale-cambio-regalo.md`
- `app/components/pos/PrintSelectionModal.tsx` (opcional)

---

### Paso 7: Validación en PC de caja

**Acciones:**

- Con exe **3.1.5** y config existente (`%APPDATA%\CVallePrintBridge\config.json`):
  1. Venta de prueba → ticket: **un solo** mensaje de pie (el configurado).
  2. Vale: sin subtítulo; instrucción completa en una línea legible.
  3. Repetir con `paperWidthMm` 58 y 80 si hay hardware disponible.
  4. Badge web muestra v3.1.5; sin aviso “versión antigua”.

**Archivos afectados:**

- Ninguno (prueba manual)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/lib/impresion/usePrint.tsx` | POST `/print/ticket` y `/print/vale` |
| `app/components/pos/POSContainer.tsx` | Impresión post-venta |
| `app/components/ventas/PrintButtonClient.tsx` | Reimpresión ticket/vale |
| `app/components/configuracion/TicketForm.tsx` | Edición `texto_pie` |
| Planes previos `2026-06-08-vale-cambio-regalo-sin-precio.md`, `2026-07-19-printbridge-v311-analisis-fix-regresiones.md` | Contexto histórico |

### Actualizaciones Necesarias para Consistencia

- Referencias que mencionan subtítulo del vale o v3.1.4 en Storage.
- No requiere cambio en `CLAUDE.md` (sin cambio estructural del workspace).
- SQL / payloads: **sin cambios**.

### Impacto en Flujos de Trabajo Existentes

- Cajeros deben **reemplazar el exe** una vez (sin reconfigurar impresora).
- Tiendas que dependían del segundo “Gracias” hardcodeado dejarán de verlo — el mensaje queda solo el de configuración.

---

## Lista de Validación

- [ ] Ticket web (fallback `window.print`): un solo `texto_pie`, sin línea extra “Gracias por tu compra”.
- [ ] Vale web: sin “Comprobante para cambio — sin importes”; instrucción nueva visible completa.
- [ ] Ticket térmico PrintBridge 3.1.5: mismo comportamiento de pie que web.
- [ ] Vale térmico: sin subtítulo; instrucción en una línea; sin caracteres CJK/garabatos en 58 mm.
- [ ] `GET /status` → `version: "3.1.5"`.
- [ ] `PrintBridgeStatus` enlaza exe 3.1.5 y banner outdated si &lt; 3.1.5.
- [ ] Checklist `salidas/checklist-printbridge-v315-textos.md` completado en al menos una PC.

---

## Criterios de Éxito

1. Ningún ticket de venta muestra dos agradecimientos cuando `texto_pie` ya contiene un mensaje de gracias.
2. Vale de cambio sin subtítulo “sin importes” y con la instrucción acordada, legible en 58 y 80 mm.
3. Release **CValle-PrintBridge-v3.1.5.exe** publicado y referenciado desde la app; operación sin reconfigurar impresora.

---

## Notas

- La causa raíz del “doble gracias” está **confirmada en código** (`TicketVentaRenderer.tsx` + `renderer.js` l.166–187).
- “Letras chinas” en térmicas suele ser **misinterpretación de UTF-8** (em dash, símbolos) — el plan ataca strings y `safeText`, no el driver Windows.
- `scripts/printbridge-v3/` no está versionado en git; documentar en checklist que el build se hace desde la copia local del desarrollador y el artefacto vive en Storage.

---

## Notas de Implementación

**Implementado:** 2026-07-20

### Resumen

Se aplicaron los cambios de textos finales en web y PrintBridge: ticket sin pie duplicado, vale sin subtítulo "sin importes", instrucción corta unificada, y sanitización/ASCII-safe adicional en `renderer.js` para evitar caracteres extraños en térmicas. Se actualizó versión a 3.1.5, se compiló `CValle-PrintBridge-v3.1.5.exe`, se actualizaron links/copies de descarga y se creó checklist QA específico.

### Desviaciones del Plan

- `TicketVentaRenderer.tsx` y `ValeCambioRenderer.tsx` ya tenían parte de los cambios aplicados antes de esta ejecución; se validaron y se completaron ajustes faltantes en otros archivos.
- En `PrintSelectionModal.tsx` se aplicó el ajuste opcional de copy sin em dash para consistencia.

### Problemas Encontrados

- Había un proceso previo ocupando puerto `9100`, por eso una verificación inicial de `/status` devolvía versión vieja. Se validó correctamente arrancando en puerto `9110` (`version: 3.1.5`).
- No se pudo ejecutar desde este entorno la subida a Supabase Storage ni la validación física en impresoras 58/80 mm; quedan como paso operativo final en PC de caja.
