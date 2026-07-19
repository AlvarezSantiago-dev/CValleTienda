# Plan: PrintBridge v3.1.1 — análisis y fix de regresiones

**Creado:** 2026-07-19  
**Estado:** Implementado  
**Pedido:** Análisis completo y fix: v3 andaba bien con ESC/POS 80mm (ticket + etiqueta dual); v3.1.1 en PC cliente no permite configurar; debe preservar el comportamiento previo y solo ampliar soporte a POS-58 con driver distinto.

---

## Descripción General

### Qué Logra Este Plan

Restaurar un PrintBridge **estable para clientes 80mm ESC/POS** (ticket + etiqueta como antes), corregir la **ruta/panel de configuración** que falla en PC de caja con el `.exe` v3.1.1, y encapsular los fixes de **POS-58** como perfil/perfil de papel sin romper 80mm. Publicar un release **v3.1.2** (o v3.2.0 si se restaura TSPL) descargable desde Storage.

### Por Qué Importa

CValleTienda depende de PrintBridge en caja. El parche 3.1.1 resolvió ITER04/58mm en la PC de Santiago, pero introdujo regresiones de packaging, detección web y (potencialmente) etiquetas/TSPL. Cada cliente con 80mm que actualiza puede perder configuración visible o impresión. Hay que separar “soporte 58mm” de “no romper 80mm”.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `scripts/printbridge-v3/` | Fuente PrintBridge v3.1.1 (ignorada por `.gitignore` → `scripts/`) |
| `scripts/printbridge-v3/server.js` | Express en `127.0.0.1:9100`; UI estática + API |
| `scripts/printbridge-v3/public/index.html` | Panel de configuración (**ruta real: `/`**, no `/config`) |
| `scripts/printbridge-v3/src/printer.js` | ESC/POS + `raw-print.ps1`; Font A global; PC437 |
| `scripts/printbridge-v3/src/logo-raster.js` | Raster GS v 0 propio (384/512/576 dots) |
| `scripts/printbridge-v3/src/renderer.js` | Tickets/vale/etiquetas ESC/POS; `safeText` |
| `scripts/printbridge-v3/src/tspl-print.ps1` | **Huérfano** — no empaquetado ni usado |
| `scripts/printbridge-v3/dist/CValle-PrintBridge-v3.1.1.exe` | Release actual en Storage |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Badge + download Supabase; timeout `/status` 2s |
| `%APPDATA%\CVallePrintBridge\config.json` | Config canónica v3 |

**UI de config:** dos secciones (ticket + etiqueta), anchos 58/76/80, autostart, CORS.  
**Endpoints print:** ticket/devolucion/cierre/vale → `ticketPrinter`; etiqueta → `etiquetaPrinter`. Ambos caminos usan hoy **solo ESC/POS**.

### Brechas o Problemas que se Abordan

1. **“La ruta para configurar no funciona” en PC cliente** — causas probables (a validar en orden):
   - Timeout web 2s en `GET /status` (dos PowerShell secuenciales) → badge “no detectado” → **desaparece el link Configurar**.
   - Usuario abre `/config` (JSON) en vez de `http://localhost:9100/`.
   - Proceso viejo (`node server.js` vía Startup/`INSTALAR.bat`) ocupa 9100; el `.exe` nuevo falla o no es el que responde.
   - Autostart apunta a `…-v3.1.0.exe` / `start.bat` con Node, no al exe nuevo.
   - Exe se cierra por `EADDRINUSE` sin mensaje visible (doble clic sin consola).

2. **Bug crítico packaging `.exe`:** `raw-print.ps1` está en assets de `pkg`, pero `sendRaw` lo ejecuta con `powershell -File` sobre ruta `C:\snapshot\…`. PowerShell **no lee** el FS virtual de pkg → impresión desde exe puede fallar aunque la UI abra (en desarrollo con `node server.js` sí funciona).

3. **Regresión etiquetas / doble función:** v3.0 tenía `protocol: escpos|tspl` y `tspl-print.ps1`. v3.1.1 manda etiquetas por ESC/POS. Clientes con TSC/TSPL (o misma impresora dual ticket+etiqueta TSPL) quedan rotos o degradados.

4. **Fixes 58mm aplicados globalmente:** Font A forzada, PC437 default, canvas logo 576 dots en 80mm, `safeText` quita tildes/ñ. Funcionó en ITER04; **no se validó matriz 80mm** previa.

5. **Distribución confusa:** `INSTALAR.bat`/`start.bat` lanzan Node; download de la app es el `.exe`. Dos caminos de instalación = soporte imposible.

6. **Release no auditable:** `scripts/` está en `.gitignore`; `package-lock` puede desfasarse de `3.1.1`.

---

## Cambios Propuestos

### Resumen de Cambios

- Diagnosticar y documentar checklist de PC cliente (proceso en 9100, versión `/status`, abrir `/`).
- Arreglar detección web: timeout más alto + `/status` paralelo + link Configurar siempre visible.
- Extraer `raw-print.ps1` (y TSPL si aplica) del snapshot a `%TEMP%` antes de PowerShell.
- Perfil por ancho: comportamiento 58mm (Font A, reset post-logo, dots 384) **sin forzar** degradaciones en 80mm.
- Restaurar protocolo etiqueta `escpos|tspl` + UI + assets pkg (si se confirma que clientes lo usaban).
- Unificar distribución: exe estable `CValle-PrintBridge.exe` (o `latest`) + autostart al exe; actualizar INSTALAR/start.
- Bump **3.1.2**, rebuild, subir a Storage, actualizar `PrintBridgeStatus` + docs.
- Matriz de prueba 80mm ESC/POS + 58mm POS + etiqueta dual.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `scripts/printbridge-v3/src/extract-asset.js` | Copia assets embebidos (`raw-print.ps1`, `tspl-print.ps1`) a `%TEMP%\CVallePrintBridge\` cuando `process.pkg` |
| `salidas/checklist-printbridge-v312-cliente.md` | Checklist soporte: qué verificar en PC de caja cuando “no configura” |
| `referencia/printbridge-perfiles-papel.md` | Tabla 58 vs 80: font, dots, charset, driver tip |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `scripts/printbridge-v3/src/printer.js` | Extraer PS1; perfiles 58/80; timeouts PowerShell; no forzar PC437 si config tiene PC858 |
| `scripts/printbridge-v3/src/logo-raster.js` | Dots por ancho; no asumir 576 en todos los 80mm; reset post-logo solo si hace falta / perfil 58 |
| `scripts/printbridge-v3/src/renderer.js` | Font B opcional solo donde se valide; `safeText` menos agresivo en 80mm/PC858; restaurar caja |
| `scripts/printbridge-v3/src/config.js` | `protocol` en `etiquetaPrinter`; defaults 80mm = PC858_EURO; merge sin pisar configs existentes |
| `scripts/printbridge-v3/server.js` | `/status` con `Promise.all`; listen error handler; log claro si puerto ocupado |
| `scripts/printbridge-v3/public/index.html` | Selector protocolo etiqueta; hint “abrir http://localhost:9100/”; badge 3.1.2 |
| `scripts/printbridge-v3/src/autostart.js` | Preferir nombre estable del exe; documentar reactivar tras update |
| `scripts/printbridge-v3/package.json` | v3.1.2; assets incluir `tspl-print.ps1`; output exe |
| `scripts/printbridge-v3/INSTALAR.bat` / `start.bat` | Preferir `.exe` si existe; no dejar Node viejo como único path |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Timeout ≥5–8s; link Configurar siempre; MIN 3.1.2; URL Storage |
| `referencia/printbridge-v3-actualizacion-sin-reconfig.md` | Pasos v3.1.2 + troubleshooting config |
| `scripts/printbridge-v3/README.md` | Misma alineación |

### Archivos a Eliminar (si aplica)

Ninguno obligatorio. `tspl-print.ps1` se **reintegra**, no se borra.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Panel de config = `http://127.0.0.1:9100/` (HTML), nunca `/config` (JSON):** Documentar y linkear solo `/`. Opcional: redirect `GET /config` browser → `/` si `Accept: text/html`.
2. **Fixes 58mm como perfil, no globales:** Si `paperWidthMm === 58` → Font A + reset fuerte post-logo + 384 dots. Si 80 → preservar defaults previos (48 cols Font A o lo que usaba v3.0 estable, charset PC858 si ya estaba).
3. **Empaquetado pkg: assets PS1 siempre extraídos a disco real** antes de `powershell -File`.
4. **Restaurar TSPL para etiquetas** si el código/historial lo tenía en v3.0; dual impresora = dos destinos Windows + protocol por destino.
5. **Release 3.1.2** (patch): no cambiar contrato web salvo timeout/status. Si TSPL es cambio grande, marcar en notas; no subir major salvo romper API.
6. **Download estable:** preferir publicar también `CValle-PrintBridge-latest.exe` (sobrescribir) además de versionado, para no romper autostart por nombre.

### Alternativas Consideradas

| Alternativa | Por qué no (o por qué sí condicional) |
|-------------|----------------------------------------|
| Volver a v3.1.0 en todos los clientes | Pierde fixes 58mm/logo ya validados |
| Solo documentar “abrir localhost:9100” sin code fix | No resuelve timeout ni raw-print en exe |
| Forzar driver POS-58 en todos | Rompe quienes usan Generic/Text Only o Epson APD en 80mm |
| Abandonar `.exe` y solo Node+INSTALAR | Peor DX para clientes; el download de la app es el exe |

### Preguntas Abiertas (si las hay)

1. **¿En la PC del cliente el `.exe` abre una ventana de consola o “no hace nada”?** (distingue EADDRINUSE / antivirus vs UI rota).
2. **¿Esa caja tenía etiquetas TSPL (TSC/Xprinter label) o solo ESC/POS en la misma térmica 80mm?** Define si TSPL es P0 o P1.
3. **¿La “ruta que no funciona” es el link “Configurar →” de la web, o pegar URL en el navegador?**
4. **¿Hay que versionar `scripts/printbridge-v3` en git** (sacar de ignore o subtree) para releases auditables? Recomendado sí, pero es decisión explícita.

---

## Tareas Paso a Paso

### Paso 1: Reproducir el fallo “configurar” con checklist

Documentar y (si hay acceso remoto) ejecutar en PC cliente:

**Acciones:**

- Abrir Administrador de tareas → buscar `CValle-PrintBridge` / `node` con `server.js`.
- `http://127.0.0.1:9100/status` en navegador → anotar `version`, `printerName`.
- Abrir `http://127.0.0.1:9100/` (con barra final) → ¿carga HTML del panel?
- Abrir `http://127.0.0.1:9100/config` → debe ser JSON; no es el panel.
- Revisar `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CValle PrintBridge.bat` → a qué apunta.
- Revisar `%APPDATA%\CVallePrintBridge\config.json` → `port` debe ser 9100.
- Completar `salidas/checklist-printbridge-v312-cliente.md` con resultados.

**Archivos afectados:**

- `salidas/checklist-printbridge-v312-cliente.md` (crear)

---

### Paso 2: Fix detección web + UX Configurar

**Acciones:**

- En `PrintBridgeStatus.tsx`: subir `AbortSignal.timeout` a **8000** ms; en estado “no detectado” mostrar igual link “Abrir panel http://localhost:9100” + descarga.
- Opcional: fetch a `http://127.0.0.1:9100/` HEAD/GET ligero además de `/status`.
- En `server.js` `/status`: `Promise.all([isPrinterOnline(ticket), isPrinterOnline(etiqueta)])`.
- Añadir timeout a `execFile` de PowerShell (ej. 3s) en `isPrinterOnline` / `listPrinters` para no colgar.

**Archivos afectados:**

- `app/components/configuracion/PrintBridgeStatus.tsx`
- `scripts/printbridge-v3/server.js`
- `scripts/printbridge-v3/src/printer.js`

---

### Paso 3: Fix packaging — extraer scripts PS1 fuera del snapshot

**Acciones:**

- Crear `extract-asset.js`: si `process.pkg`, leer asset con `fs.readFileSync` desde snapshot y escribir a `%TEMP%\CVallePrintBridge\raw-print.ps1` (y tspl).
- `sendRaw` usa siempre la ruta extraída en disco real.
- Incluir `tspl-print.ps1` en `package.json` → `pkg.assets` cuando se restaure TSPL.
- Probar: ejecutar **solo el `.exe`** (sin Node), imprimir test ticket.

**Archivos afectados:**

- `scripts/printbridge-v3/src/extract-asset.js` (nuevo)
- `scripts/printbridge-v3/src/printer.js`
- `scripts/printbridge-v3/package.json`

---

### Paso 4: Perfiles 58mm vs 80mm (no romper ESC/POS 80)

**Acciones:**

- Tabla en código:

| Ancho | width chars | Font | Charset default *nuevas* installs | Logo dots | Reset post-logo |
|-------|-------------|------|-----------------------------------|-----------|-----------------|
| 58 | 32 | A forzada | PC437_USA | 384 | Sí (fuerte) |
| 80 | 48 | A (como v3.0 estable) | PC858_EURO | 512 o 576 configurable / max 512 primero si hay duda | Suave o solo si hubo imagen |
| 76 | 42 | A | PC858 | 512 | Suave |

- **No pisar** `characterSet` ya guardado en config del cliente.
- `safeText`: en 58+PC437 transliterar; en PC858 permitir ñ/tildes vía iconv de la lib.
- Logo: no forzar canvas full-width 576 en 80mm si causa basura; centrar en canvas del ancho real del perfil.

**Archivos afectados:**

- `scripts/printbridge-v3/src/printer.js`
- `scripts/printbridge-v3/src/logo-raster.js`
- `scripts/printbridge-v3/src/renderer.js`
- `scripts/printbridge-v3/src/config.js`
- `referencia/printbridge-perfiles-papel.md`

---

### Paso 5: Restaurar etiquetas duales + protocolo TSPL (si aplica)

**Acciones:**

- Confirmar con pregunta abierta #2. Si sí TSPL:
  - Reintroducir `etiquetaPrinter.protocol` (`escpos` \| `tspl`) y `paperHeightMm`.
  - UI: select Protocolo en sección etiquetas.
  - `/print/etiqueta` y `testPrintEtiqueta` branchan a TSPL o ESC/POS.
  - Empaquetar `tspl-print.ps1`.
- Si solo ESC/POS dual (misma u otra impresora Windows): documentar que “doble función” = dos nombres en config; no requiere TSPL.
- Misma impresora en ticket y etiqueta (nombre duplicado) debe seguir permitido.

**Archivos afectados:**

- `scripts/printbridge-v3/server.js`
- `scripts/printbridge-v3/src/printer.js` / renderer etiqueta
- `scripts/printbridge-v3/public/index.html`
- `scripts/printbridge-v3/src/config.js`

---

### Paso 6: Listen errors, autostart e instalador alineados al `.exe`

**Acciones:**

- `app.listen` → `on('error')`: log + `MessageBox`/pause si `EADDRINUSE` (“ya hay PrintBridge en el puerto”).
- Autostart: al habilitar, escribir BAT al `process.execPath` actual; en docs: tras update, desactivar/activar o usar `latest.exe` de nombre fijo.
- `start.bat`: si existe `dist\CValle-PrintBridge-*.exe` o exe junto al bat, lanzar exe; else `node server.js`.
- `INSTALAR.bat`: copiar exe a `C:\CValle\printbridge-v3\CValle-PrintBridge.exe` (nombre estable) + Startup a ese path; no depender solo de Node.

**Archivos afectados:**

- `scripts/printbridge-v3/server.js`
- `scripts/printbridge-v3/src/autostart.js`
- `scripts/printbridge-v3/start.bat`
- `scripts/printbridge-v3/INSTALAR.bat`

---

### Paso 7: Release 3.1.2 + Storage + web

**Acciones:**

- Bump `package.json` / badge UI / `MIN_PRINTBRIDGE_VERSION` → `3.1.2`.
- `npm run pkg` → `dist/CValle-PrintBridge-v3.1.2.exe`.
- Subir a Supabase `printbridge/releases/` (versionado + opcional `…-latest.exe`).
- Actualizar URL en `PrintBridgeStatus.tsx`.
- Actualizar `referencia/printbridge-v3-actualizacion-sin-reconfig.md` y README.
- Deploy app.

**Archivos afectados:**

- `scripts/printbridge-v3/package.json`, `public/index.html`, `start.bat`
- `app/components/configuracion/PrintBridgeStatus.tsx`
- `referencia/printbridge-v3-actualizacion-sin-reconfig.md`
- `scripts/printbridge-v3/README.md`

---

### Paso 8: Matriz de validación física

**Acciones:**

Probar en:

| Escenario | Esperado |
|-----------|----------|
| Exe solo, sin Node, abrir `/` | Panel HTML carga |
| `/status` &lt; 2s y &lt; 8s | Badge verde + Configurar |
| Ticket 80mm ESC/POS sin logo | Texto completo, tildes si PC858 |
| Ticket 80mm con logo | Logo OK + texto debajo |
| Ticket 58mm POS-58 / Generic | Logo + texto (perfil 58) |
| Etiqueta ESC/POS | Sale en `etiquetaPrinter` |
| Etiqueta TSPL (si restaurado) | Sale TSPL |
| Misma impresora ticket+etiqueta | Ambos tests OK |
| Puerto ocupado por proceso viejo | Mensaje claro, no silencio |
| Update exe + autostart | Arranca 3.1.2 |

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/impresion/usePrint.tsx` — POST `localhost:9100/print/*`
- `app/components/configuracion/TicketForm.tsx` / `DatosTiendaForm.tsx` — embed `PrintBridgeStatus`
- `referencia/printbridge-v3-*.md`, `salidas/checklist-rollout-printbridge-v3.1.md`
- Planes históricos: `planes/2026-05-28-printbridge-v3-node-puro.md`, `2026-06-08-printbridge-v3-exe-parche-sin-reconfig.md`

### Actualizaciones Necesarias para Consistencia

- `contexto/proyectos.md` — línea PrintBridge → v3.1.2 + nota perfiles 58/80.
- README troubleshooting: quitar “nunca Generic/Text Only” como regla absoluta; depende del modelo (58 a menudo necesita POS-58 o Generic RAW).

### Impacto en Flujos de Trabajo Existentes

- Clientes 80mm: update exe sin reconfig si merge de config es correcto.
- Clientes 58mm: mantienen perfil 58.
- Soporte: checklist nueva reduce tiempo de diagnóstico “no configura”.

---

## Lista de Validación

- [ ] Checklist cliente documentada y usada al menos en 1 PC real
- [ ] `/` sirve HTML desde el `.exe` empaquetado
- [ ] Badge web muestra Configurar aunque `/status` tarde hasta ~5s
- [ ] Test print desde `.exe` sin Node instalado (raw-print extraído)
- [ ] Ticket 80mm no regresa a “texto en blanco” / logo basura
- [ ] Ticket 58mm sigue OK (logo + texto)
- [ ] Etiqueta usa `etiquetaPrinter`; TSPL restaurado o decisión explícita de no hacerlo
- [ ] `EADDRINUSE` muestra error usable
- [ ] v3.1.2 en Storage + link web + deploy
- [ ] Docs actualización sin reconfig alineadas

---

## Criterios de Éxito

1. En PC de cliente, tras instalar v3.1.2, `http://localhost:9100/` abre el panel y se pueden guardar ticket/etiqueta.
2. Impresoras ESC/POS 80mm que funcionaban en v3 pre-3.1.1 vuelven a imprimir tickets (y etiquetas ESC/POS) sin reescribir drivers.
3. POS-58mm siguen cubiertas por el perfil 58 sin imponer Font B / raster 80 a todos.
4. Un solo artefacto `.exe` es la vía oficial de distribución (Storage); Node queda solo para desarrollo.

---

## Notas

- La sesión que generó 3.1.1 validó ITER04 en la máquina de Santiago con `node server.js`; el fallo en cliente apunta fuerte a **exe + status timeout + proceso viejo**, no solo a “driver 58”.
- `scripts/` en `.gitignore`: los cambios de PrintBridge no aparecen en `git status` del repo app. Considerar excepción `!scripts/printbridge-v3/**` en un paso futuro.
- No mezclar en este plan el rediseño visual del ticket web; solo paridad térmica y operabilidad del agente.
- Driver: 80mm Epson APD / Generic Text Only según lo que ya imprimía RAW; 58mm POS-58 o Generic — documentar, no forzar un único driver global.

---

## Orden de prioridad sugerido para `/implementar`

1. Paso 3 (raw-print extract) + Paso 2 (status/timeout) — desbloquean config e impresión exe  
2. Paso 6 (listen/autostart) — desbloquean “exe no arranca”  
3. Paso 4 (perfiles 58/80) — no romper 80mm  
4. Paso 5 (TSPL) — tras confirmar pregunta abierta  
5. Paso 7–8 — release y QA  

---

## Notas de Implementación

**Implementado:** 2026-07-19

### Resumen

- Causa principal del “escucha pero no abre”: bind solo a `127.0.0.1` + navegador con `localhost` (IPv6). Ahora listen sin host fijo; logs muestran ambas URLs.
- Extract de `raw-print.ps1` / `tspl-print.ps1` a TEMP para el `.exe` (pkg).
- Perfiles 58 vs 80 (charset, logo dots, reset post-logo).
- TSPL restaurado para etiquetas + UI protocolo/alto.
- Web: timeout 8s, link Configurar siempre, fetch a `127.0.0.1`.
- Release compilado: `dist/CValle-PrintBridge-v3.1.2.exe` (~42 MB).
- `.gitignore`: excepción para `scripts/printbridge-v3` (sin node_modules/dist).

### Desviaciones del Plan

- No se subió el exe a Supabase Storage (requiere acción manual del usuario).
- Deploy de la web app pendiente (Vercel).
- Validación física 80mm/58mm en PC cliente pendiente (checklist entregada).

### Problemas Encontrados

- Confirmado por respuestas del usuario: exe sí escuchaba; navegador “no arrancó” → alineado con IPv6/localhost.
- TSPL se restauró de forma pragmática (layout simple); no se reimplementó el algoritmo completo del plan 2026-05-29 de coordenadas dinámicas.
