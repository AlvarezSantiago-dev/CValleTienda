# Plan: PrintBridge v3 — release `.exe` con logo y vale (sin reconfigurar)

**Creado:** 2026-06-08  
**Estado:** Implementado  
**Pedido:** Parche PrintBridge v3 `.exe` que no rompa nada, no obligue a reconfigurar, y respete las rutas de config ya generadas en las PCs de caja.

---

## Descripción General

### Qué Logra Este Plan

Produce un **`.exe` oficial de PrintBridge v3.1.x`** con los parches que hoy solo existen como guías manuales (logo en tickets y vale de cambio sin precios), empaquetado para **reemplazo directo** en la PC de caja. Al arrancar, el agente **reutiliza o migra automáticamente** la configuración existente (impresora, ancho, puerto, orígenes CORS) sin pedir al cajero volver a elegir impresora.

### Por Qué Importa

Tras el push de CValleTienda, la **preview web** ya muestra logo y vale sin importes, pero la **térmica sigue mal** porque `usePrint.tsx` envía el JSON a `localhost:9100` y PrintBridge dibuja con su `renderer.js` local — no con `ValeCambioRenderer` ni `TicketEncabezado`. Hoy el fix está documentado en `referencia/` pero **no hay `.exe` actualizado** ni código fuente versionado en este repo (`scripts/printbridge-v3/` no existe). Sin este release, cada cliente depende de parches manuales o sigue con v2/v3 desactualizado.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta / pieza | Rol |
|--------------|-----|
| `app/lib/impresion/usePrint.tsx` | POST a `http://localhost:9100/print/{ticket\|vale\|devolucion\|cierre\|etiqueta}`; timeout 15s; fallback a `window.print()` |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Lee `GET /status`; link de descarga apunta a **v2** en GitHub |
| `app/components/impresion/ValeCambioRenderer.tsx` | Vale web correcto (sin Total, ticket destacado) |
| `app/components/impresion/TicketEncabezado.tsx` | Logo web vía `logo_url` + `mostrar_logo` |
| `supabase/migrations/20260620100001_payload_tickets_logo.sql` | Agrega `logo_url` y `mostrar_logo` al payload SQL |
| `referencia/printbridge-v3-logo-tickets.md` | Parche manual logo en `renderer.js` |
| `referencia/printbridge-v3-vale-cambio-regalo.md` | Parche manual vale sin precios |
| `planes/2026-05-28-printbridge-v3-node-puro.md` | Arquitectura v3: Node puro, `pkg`, dual impresora, `%APPDATA%\CVallePrintBridge\` |
| `planes/2026-05-28-printbridge-v2-tray-app.md` | v2 Electron: config en `%APPDATA%\CValle PrintBridge\` (con espacio) |
| `planes/2026-05-27-printbridge-agente-profesional.md` | v1 servicio: config flat en `%APPDATA%\CVallePrintBridge\` |
| `https://github.com/cvalle/printbridge/releases/latest` | Release externo; UI web enlaza v2 |

### Brechas o Problemas que se Abordan

1. **Desalineación web vs térmica** — logo y vale corregidos en frontend, no en PrintBridge de producción.
2. **Sin fuente versionada en CValleTienda** — `scripts/printbridge-v3/` prometido en planes previos pero **no existe**; `logo-raster.js` tampoco.
3. **Riesgo de romper config al actualizar** — v1/v2/v3 usan rutas y esquemas distintos de `config.json`.
4. **Link de descarga obsoleto** — `PrintBridgeStatus` sigue promoviendo v2.
5. **Dependencia Supabase** — logo en térmica requiere migración SQL aplicada en prod (capa separada del `.exe`).

---

## Cambios Propuestos

### Resumen de Cambios

- Materializar **`scripts/printbridge-v3/`** en CValleTienda (fuente canónica para builds futuros), clonando/sincronizando desde `cvalle/printbridge` si ya existe código allí.
- Implementar **`src/logo-raster.js`** + parches en **`src/renderer.js`** (logo en venta/devolución/vale; vale sin Total ni precios).
- Endurecer **`src/config.js`**: lectura/escritura **siempre** en `%APPDATA%\CVallePrintBridge\config.json`; migración automática desde v2 (`CValle PrintBridge`) y v1 flat (`printerName`) **solo si no hay config v3**; merge parcial al guardar (no reemplazar archivo entero).
- Mantener **`GET /status`** compatible con `PrintBridgeStatus.tsx` (`printerName`, `paperWidthMm`, `version`, `printerOnline`).
- Compilar **`CValle-PrintBridge-v3.1.0.exe`** con `pkg` (Node 18, assets embebidos).
- Publicar release en GitHub `cvalle/printbridge` con notas y checklist de rollout.
- Actualizar mínimamente CValleTienda: link v3, aviso si versión &lt; 3.1.0, doc de actualización sin reconfig.
- Documentar prerequisito: migraciones Supabase de logo aplicadas en el proyecto del cliente.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `scripts/printbridge-v3/package.json` | Dependencias, scripts `start` / `pkg`, versión `3.1.0` |
| `scripts/printbridge-v3/server.js` | HTTP `:9100`, endpoints print/status/config, CORS |
| `scripts/printbridge-v3/start.bat` | Arranque dev; referencia para autostart |
| `scripts/printbridge-v3/src/config.js` | Config v3 + migración legacy + merge al guardar |
| `scripts/printbridge-v3/src/printer.js` | Cliente térmico + resolución de `raw-print.ps1` en dev y en `.exe` |
| `scripts/printbridge-v3/src/renderer.js` | ESC/POS: tickets, devolución, cierre, vale, etiqueta |
| `scripts/printbridge-v3/src/logo-raster.js` | Descarga raster de `logo_url`, respeta `mostrar_logo`, fallo silencioso |
| `scripts/printbridge-v3/src/raw-print.ps1` | Envío RAW a spooler Windows (copiar de v2/repo externo) |
| `scripts/printbridge-v3/src/autostart.js` | Shortcut en Startup folder (sin admin) |
| `scripts/printbridge-v3/public/index.html` | UI config dual impresora |
| `scripts/printbridge-v3/public/style.css` | Estilos UI |
| `scripts/printbridge-v3/README.md` | Build, instalación, troubleshooting |
| `referencia/printbridge-v3-actualizacion-sin-reconfig.md` | Guía operador: reemplazar exe, verificar, sin tocar impresora |
| `salidas/checklist-rollout-printbridge-v3.1.md` | QA en PC de caja antes/d después del swap |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Link y copy v3; banner opcional si `version < 3.1.0` |
| `referencia/printbridge-v3-logo-tickets.md` | Actualizar: ya no parche manual — apuntar al release `.exe` |
| `referencia/printbridge-v3-vale-cambio-regalo.md` | Idem — incluido en v3.1.0 |
| `contexto/proyectos.md` | Nota: PrintBridge v3.1 empaquetado en `scripts/printbridge-v3/` |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Fuente en `scripts/printbridge-v3/` dentro de CValleTienda**: Alinea payloads web (`types.ts`) con renderer ESC/POS en un solo workspace. El release se publica en `cvalle/printbridge` pero el código vive aquí para `/implementar` reproducible.

2. **Ruta canónica de config inmutable**: `%APPDATA%\CVallePrintBridge\config.json` (sin espacio), puerto default `9100`. El `.exe` **nunca** escribe config junto al binario ni en Program Files.

3. **Migración automática one-shot**: Si existe config v3 → usarla tal cual (merge con defaults solo para claves nuevas como `etiquetaPrinter`). Si no existe v3 pero sí `%APPDATA%\CValle PrintBridge\config.json` (v2) o v1 flat en `CVallePrintBridge` → importar a esquema v3 y **persistir en v3**; **no borrar** el archivo legacy (backup implícito).

4. **Compatibilidad API con la web actual**: Sin cambios en `usePrint.tsx`. `/status` expone alias v2:
   ```json
   {
     "ok": true,
     "version": "3.1.0",
     "printerName": "<ticketPrinter.name>",
     "paperWidthMm": 80,
     "printerOnline": true,
     "ticketOnline": true,
     "etiquetaOnline": false
   }
   ```

5. **Logo fail-open**: Si `mostrar_logo` es false, URL vacía, SVG, o fetch falla → ticket imprime sin logo (no error HTTP).

6. **Versión semver `3.1.0`**: Minor bump por features (logo + vale). Clientes en v3.0.x actualizan exe sin migración de config adicional.

7. **Rollout = reemplazo de exe, misma carpeta**: Instrucción al operador: cerrar proceso, copiar nuevo exe sobre el anterior (o actualizar shortcut al mismo path), abrir de nuevo. **No** abrir panel para re-guardar impresora salvo que `/status` muestre `printerName` vacío.

### Alternativas Consideradas

- **Seguir con parche manual por cliente**: Rechazado — frágil, no escala, contradice el pedido de `.exe` oficial.
- **Forzar reinstalación limpia**: Rechazado — rompe operación en caja.
- **Cambiar ruta de config al del v2 (`CValle PrintBridge`)**: Rechazado — v3 ya documentó `CVallePrintBridge`; migración one-shot es más segura.
- **Embutir logo en el exe**: Rechazado — logo es por tienda vía Supabase Storage.
- **Puppeteer/HTML print en PrintBridge**: Rechazado — arquitectura v3 es ESC/POS directo.

### Preguntas Abiertas (si las hay)

1. **¿La PC de prod corre v2 (Electron tray) o v3 (node/start.bat)?** Afecta solo autostart (tray vs `CValle PrintBridge.bat`). La migración de **config de impresora** cubre ambos; confirmar al implementar en la primera PC piloto.

2. **¿Publicar el `.exe` solo en GitHub o también copia en `salidas/` del workspace?** Recomendado: GitHub release como canal oficial; opcional checksum en `salidas/` para soporte interno.

3. **¿Forzar actualización desde la web (bloquear impresión si versión &lt; 3.1.0)?** Recomendado MVP: **solo banner** en `PrintBridgeStatus`, no bloqueo — evita parar ventas si el operador demora el swap.

---

## Tareas Paso a Paso

### Paso 1: Obtener baseline de PrintBridge v3

**Descripción:** Tener código base funcional antes de parchear.

**Acciones:**

- Clonar o localizar repo `https://github.com/cvalle/printbridge` (rama/tag v3 si existe).
- Si no hay v3 publicado, reconstruir desde `planes/2026-05-28-printbridge-v3-node-puro.md` (T1–T11): estructura completa en `scripts/printbridge-v3/`.
- Verificar smoke test en Windows: `npm install`, `node server.js`, UI en `http://localhost:9100`, `GET /status` responde JSON.

**Archivos afectados:**

- `scripts/printbridge-v3/**` (nuevo árbol)

---

### Paso 2: Implementar migración de config sin reconfigurar

**Descripción:** Garantizar que el nuevo exe lee la impresora ya elegida.

**Acciones:**

- En `src/config.js`, definir:
  ```javascript
  const CONFIG_DIR  = path.join(process.env.APPDATA, 'CVallePrintBridge')
  const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
  const LEGACY_V2   = path.join(process.env.APPDATA, 'CValle PrintBridge', 'config.json')
  ```
- `loadConfig()`:
  1. Si `CONFIG_FILE` existe → `mergeWithDefaults(JSON.parse(...))`.
  2. Else si `LEGACY_V2` existe → `migrateFromLegacy(v2)` → `saveConfig(migrated)`.
  3. Else si existe v1 flat en `CONFIG_FILE` con `printerName` top-level → migrar a `ticketPrinter`.
  4. Else → `DEFAULT_CONFIG`.
- `migrateFromLegacy(legacy)`:
  - `ticketPrinter.name` ← `legacy.printerName` o `legacy.ticketPrinter?.name`
  - `ticketPrinter.paperWidthMm` ← `legacy.paperWidthMm` ?? 80
  - `ticketPrinter.autocut` ← `legacy.autocut` ?? true
  - `etiquetaPrinter` ← `legacy.etiquetaPrinter` ?? `{ name: '', paperWidthMm: 40, ... }`
  - `port`, `allowedOrigins` ← copiar si existen
- `saveConfig(partial)`: **merge** profundo con config actual; nunca truncar `ticketPrinter` si POST solo envía `etiquetaPrinter`.
- Log en consola (una línea): `Config loaded from v3` / `Migrated from v2 legacy path` — útil en soporte.

**Archivos afectados:**

- `scripts/printbridge-v3/src/config.js`

---

### Paso 3: Implementar `logo-raster.js`

**Descripción:** Módulo async para imprimir logo ESC/POS desde URL pública.

**Acciones:**

- Crear `scripts/printbridge-v3/src/logo-raster.js` exportando `async function printTicketLogo(printer, tienda)`.
- Lógica:
  - Salir si `!tienda?.mostrar_logo || !tienda?.logo_url`.
  - Rechazar URLs `.svg` (log warning, return).
  - `fetch(logo_url)` con timeout 5s; máx ~512KB.
  - Rasterizar con `sharp` (dependencia en `package.json`; incluir binarios win32 en build `pkg` via `sharp` postinstall).
  - Redimensionar ancho máx ~384px (58mm) o ~576px (80mm) según `tienda.ancho_mm`.
  - Convertir a monocromo y llamar API de imagen del driver térmico (`printer.printImage` o equivalente del stack v3).
  - `catch` → log y continuar (no throw).
- Agregar `sharp` a dependencies; documentar en README que el build `pkg` debe probarse en Windows real (sharp + pkg es el punto más frágil).

**Archivos afectados:**

- `scripts/printbridge-v3/src/logo-raster.js`
- `scripts/printbridge-v3/package.json`

---

### Paso 4: Parchear `renderer.js` — logo + vale sin precios

**Descripción:** Alinear térmica con frontend y referencias existentes.

**Acciones:**

- Al inicio: `const { printTicketLogo } = require('./logo-raster')`.
- Hacer `async` las funciones que llamen logo: `renderTicketVenta`, `renderTicketDevolucion`, `renderValeCambio`.
- Tras activar Font B / ancho, **antes** del nombre de tienda:
  ```javascript
  await printTicketLogo(printer, payload.tienda)
  ```
- **`renderValeCambio`** (seguir `referencia/printbridge-v3-vale-cambio-regalo.md`):
  - Eliminar bloque `Total:` y cualquier `precio_unitario` / `total_linea`.
  - Encabezado "VALE DE CAMBIO" + subtítulo "Comprobante para cambio — sin importes".
  - Bloque centrado: `TICKET DE VENTA N°`, `payload.numero_ticket` grande, fecha.
  - Líneas: solo `cantidad × nombre` (+ variante si viene en payload).
  - Instrucción operativa antes de validez.
  - Mantener bloque `VÁLIDO HASTA` con `dias_cambio` + `payload.fecha`.
- **`renderTicketVenta` / `renderTicketDevolucion`**: sin regresión de precios/totales; solo agregar logo.
- Exportar funciones; verificar `server.js` ya usa `await handlePrint(...)` con renderers async.

**Archivos afectados:**

- `scripts/printbridge-v3/src/renderer.js`
- `scripts/printbridge-v3/server.js` (solo si falta await en handlePrint)

---

### Paso 5: Compatibilidad `/status` y rutas en `.exe` (`pkg`)

**Descripción:** Respetar contrato web y paths embebidos.

**Acciones:**

- En `server.js`, handler `GET /status`:
  ```javascript
  const c = cfg()
  res.json({
    ok: true,
    version: require('./package.json').version,
    printerName: c.ticketPrinter?.name ?? '',
    paperWidthMm: c.ticketPrinter?.paperWidthMm ?? 80,
    printerOnline: await isPrinterOnline(c.ticketPrinter?.name),
    ticketOnline: ...,
    etiquetaOnline: ...,
  })
  ```
- `package.json` → sección `pkg`:
  ```json
  {
    "assets": [
      "src/raw-print.ps1",
      "public/**/*",
      "node_modules/sharp/**/*"
    ],
    "targets": ["node18-win-x64"],
    "outputPath": "dist"
  }
  ```
- En `printer.js`, resolver PS1:
  ```javascript
  const ps1 = path.join(__dirname, 'raw-print.ps1')
  // pkg: __dirname apunta al snapshot; raw-print.ps1 debe estar en assets
  ```
- Script npm: `"pkg": "pkg . --targets node18-win-x64 --output dist/CValle-PrintBridge-v3.1.0.exe"`.
- Probar exe en máquina con config v2 legacy: al primer arranque debe aparecer misma impresora en `/status` sin abrir UI.

**Archivos afectados:**

- `scripts/printbridge-v3/server.js`
- `scripts/printbridge-v3/src/printer.js`
- `scripts/printbridge-v3/package.json`

---

### Paso 6: Build, release GitHub y documentación operativa

**Descripción:** Entregar artefacto instalable y guía de swap.

**Acciones:**

- `npm run pkg` → `dist/CValle-PrintBridge-v3.1.0.exe`.
- Crear release `v3.1.0` en `cvalle/printbridge` con:
  - Asset: exe
  - Notas: logo tickets, vale sin precios, migración config automática, prerequisito migración Supabase logo
- Escribir `referencia/printbridge-v3-actualizacion-sin-reconfig.md`:
  1. Cerrar PrintBridge (tray o ventana consola).
  2. Reemplazar exe en **la misma carpeta** (o actualizar acceso directo al nuevo path).
  3. Ejecutar nuevo exe / `start.bat`.
  4. Abrir Configuración → Ticket en la web → verificar badge `v3.1.0` y misma impresora.
  5. Imprimir venta + vale de prueba.
  6. Si logo no sale: verificar migración `20260620100001` en Supabase y logo subido en Configuración.
- Escribir `salidas/checklist-rollout-printbridge-v3.1.md` con casos: v2→v3.1, v3.0→v3.1, config ya en v3 path.

**Archivos afectados:**

- `referencia/printbridge-v3-actualizacion-sin-reconfig.md`
- `salidas/checklist-rollout-printbridge-v3.1.md`
- Release externo GitHub

---

### Paso 7: Ajustes mínimos en CValleTienda (web)

**Descripción:** UI coherente con v3.1; sin cambiar flujo de impresión.

**Acciones:**

- `PrintBridgeStatus.tsx`:
  - Cambiar copy/link de v2 a **CValle PrintBridge v3**.
  - URL descarga: `https://github.com/cvalle/printbridge/releases/latest` (asegurar que latest apunte a v3.1.0 tras release).
  - Opcional: constante `MIN_PRINTBRIDGE_VERSION = '3.1.0'`; si `status.version` semver &lt; min, mostrar aviso ámbar "Actualizá PrintBridge para logo y vale sin precios".
- Actualizar `referencia/printbridge-v3-*.md` para indicar que v3.1.0 incluye los parches (manual solo para hotfix).
- `contexto/proyectos.md`: una línea en Impresión sobre agente local v3.1.

**Archivos afectados:**

- `app/components/configuracion/PrintBridgeStatus.tsx`
- `referencia/printbridge-v3-logo-tickets.md`
- `referencia/printbridge-v3-vale-cambio-regalo.md`
- `contexto/proyectos.md`

---

### Paso 8: Validación end-to-end en PC de caja

**Descripción:** Confirmar criterios de éxito antes de rollout a todas las tiendas.

**Acciones:**

1. **Precondición Supabase:** migración `20260620100001_payload_tickets_logo.sql` aplicada; logo configurado; `mostrar_logo = true`.
2. Con PrintBridge **viejo** corriendo: reproducir bug (vale con Total, sin logo térmico).
3. Swap exe → **sin** abrir `localhost:9100` para reconfigurar.
4. `GET http://localhost:9100/status` → `version: 3.1.0`, `printerName` igual que antes.
5. POS: venta con vale → térmica **sin** Total; ticket N° destacado; logo si URL OK.
6. Reimpresión vale desde `/ventas` → mismo layout térmico.
7. Ticket venta y devolución → logo + precios (regresión OK).
8. Etiquetas → impresora etiqueta si estaba configurada (no perder `etiquetaPrinter` en merge).
9. Apagar PrintBridge → web cae a `window.print()` sin error bloqueante.

**Archivos afectados:** ninguno (QA manual; registrar resultados en checklist)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Dependencia |
|---------|-------------|
| `app/lib/impresion/usePrint.tsx` | Endpoints y timeout |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Shape de `/status` |
| `app/components/configuracion/TicketForm.tsx` | Copy PrintBridge |
| `app/components/pos/*`, `ventas/*` | Envían payload vía `usePrint` |
| `supabase/migrations/20260620100001_*.sql` | `logo_url`, `mostrar_logo` en payload |
| Planes previos printbridge v1/v2/v3 | Arquitectura y decisiones |

### Actualizaciones Necesarias para Consistencia

- Migraciones Supabase de logo (y opcionalmente devolución entrega) aplicadas en **cada** proyecto Supabase de cliente antes de esperar logo en térmica.
- Release `latest` en GitHub alineado con v3 (no dejar v2 como latest tras publicar v3.1.0).
- Referencias manuales en `referencia/` actualizadas post-release.

### Impacto en Flujos de Trabajo Existentes

- **Cajero:** ningún cambio operativo si el swap de exe es transparente.
- **Soporte / deploy:** nuevo paso en checklist de release CValleTienda: "publicar PrintBridge v3.1.x + aplicar migraciones SQL".
- **`/implementar`:** este plan toca repo externo (GitHub printbridge) además de `scripts/printbridge-v3/` local.

---

## Lista de Validación

- [x] `scripts/printbridge-v3/` existe y `node server.js` arranca en `:9100`
- [x] Config v3 existente no se sobrescribe al actualizar exe (merge parcial en `saveConfig`)
- [x] Migración v2 implementada en `loadConfig` (no probada con archivo legacy real en esta sesión)
- [x] `GET /status` devuelve campos esperados por `PrintBridgeStatus.tsx`
- [x] Vale térmico: renderer sin Total ni precios; ticket N° destacado (código)
- [x] Logo: `logo-raster.js` integrado en venta/devolución/vale (código)
- [ ] `npm run pkg` genera exe funcional en Windows (pendiente ejecutar build completo)
- [ ] Release GitHub v3.1.0 publicado (manual)
- [x] `PrintBridgeStatus` enlaza v3 y muestra versión / banner outdated
- [x] Checklist en `salidas/` creado
- [ ] Migración SQL logo aplicada en Supabase prod del cliente piloto (operador)

---

## Criterios de Éxito

1. Reemplazar el `.exe` en la PC de caja **no requiere** re-seleccionar impresora ni editar `config.json` manualmente; `/status` muestra la misma impresora que antes del swap.
2. Vale impreso por PrintBridge coincide con la intención de `ValeCambioRenderer` (sin importes, ticket de venta destacado).
3. Tickets de venta y devolución muestran logo en térmica cuando Supabase envía `logo_url` y `mostrar_logo=true`.
4. Si PrintBridge no está instalado o falla, la web sigue imprimiendo vía fallback sin regresión.
5. Versión `3.1.0` visible en UI de configuración y en badge de Configuración → Ticket.

---

## Notas

- **Tres capas de deploy** (recordatorio): Vercel ≠ Supabase migrations ≠ PrintBridge exe. Este plan cubre solo la tercera; el operador debe confirmar capa SQL para logo.
- **`sharp` + `pkg`**: validar en hardware real; si falla empaquetado, alternativa fallback es `jimp` (más lento, más simple con pkg) — documentar en README si se cambia.
- **Autostart v2 vs v3**: cliente con v2 puede tener "iniciar con Windows" vía Electron; tras pasar a v3 exe, re-habilitar autostart desde `localhost:9100` si el operador lo usaba (no migrar tray automáticamente).
- **Hotfix sin release**: las guías en `referencia/` siguen válidas para parchear `renderer.js` en emergencia hasta publicar exe.
- **Seguridad**: mantener `allowedOrigins` del config migrado; no abrir CORS a `*` en el release.

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se materializó `scripts/printbridge-v3/` completo (v3.1.0): config con migración v2/v1, `logo-raster.js`, `renderer.js` con vale sin precios, `server.js`, UI dual impresora, README y build `pkg`. Se actualizó `PrintBridgeStatus.tsx` (link v3.1.0, banner versión mínima), referencias, checklist de rollout y `contexto/proyectos.md`. Smoke test: `npm install`, `/status` responde `3.1.0` con campos compatibles web.

### Desviaciones del Plan

- **`sharp` → `jimp`**: mejor compatibilidad con `pkg` (pure JS).
- **Release GitHub v3.1.0**: no publicado desde este entorno (repo `cvalle/printbridge` no accesible / sin `gh`). El operador debe ejecutar `npm run pkg` y subir el exe manualmente.
- **QA PC caja end-to-end**: pendiente en tienda prod (impresión física).

### Problemas Encontrados

- `saveConfig` llamaba `loadConfig` y podía re-disparar migración; corregido leyendo archivo directamente al guardar.
- PowerShell no acepta `&&`; comandos con `Set-Location; ...`.
