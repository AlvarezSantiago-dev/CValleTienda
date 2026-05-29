# Plan: PrintBridge v3 — Node.js puro, dos impresoras, prueba independiente

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Reescribir PrintBridge como proceso Node.js puro (sin Electron), con soporte explícito para impresora de tickets y impresora de etiquetas configuradas por separado, con prueba de impresión independiente para cada una.

---

## Descripción General

PrintBridge v3 es un servidor HTTP Express que corre en `localhost:9100` como proceso Node.js simple. No requiere Electron ni empaquetado especial. Se inicia con un doble clic en `start.bat` o puede compilarse como `.exe` standalone con `pkg`.

### Cambios clave respecto a v2

| Aspecto | v2 (Electron) | v3 (Node puro) |
|---|---|---|
| Runtime | Electron 70MB | Node.js instalado + `start.bat`, o `pkg` ~30MB |
| Impresoras | 1 sola (printerName) | **2 separadas**: `ticketPrinter` y `etiquetaPrinter` |
| UI | Browser (ventana Electron) | Browser directo `http://localhost:9100` |
| Test | Solo `/print/test` (tickets) | `/print/test/ticket` y `/print/test/etiqueta` independientes |
| Tray icon | Sí | No (proceso en background, ventana cmd minimizable) |
| Auto-inicio | `app.setLoginItemSettings` | Acceso directo en `Startup` de Windows |

### Arquitectura

```
scripts/printbridge-v3/
  start.bat              ← doble clic para iniciar (o minimizar a fondo)
  server.js              ← proceso Node principal (Express + toda la lógica)
  src/
    config.js            ← config con DOS impresoras
    printer.js           ← createClient, listPrinters, sendRaw, testPrint
    renderer.js          ← IDÉNTICO al v2 (renderTicketVenta, renderEtiqueta, etc.)
    raw-print.ps1        ← IDÉNTICO al v2 (envío RAW vía winspool.drv)
    autostart.js         ← copia/elimina acceso directo en Startup (sin admin)
  public/
    index.html           ← UI renovada con dos secciones de impresora
    style.css            ← estilos (mismo base del v2, adaptado)
  package.json
```

---

## Estado actual del problema

- Driver "Generic / Text Only" no pasa datos ESC/POS al spooler correctamente
- El EPSON APD5 está instalado en `C:\Program Files (x86)\epson\` pero el `.inf` no se registró en Windows
- El v3 necesita que el usuario primero registre el driver APD5 manualmente (instrucciones en la UI)

---

## Tareas Paso a Paso

### T1 — Crear estructura de carpetas y `package.json`

**Archivo:** `scripts/printbridge-v3/package.json`

```json
{
  "name": "cvalle-printbridge",
  "version": "3.0.0",
  "description": "Agente de impresión térmica CValleTienda — Node.js puro",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "pkg": "pkg server.js --targets node18-win-x64 --output dist/CValle-PrintBridge-v3.exe --compress GZip"
  },
  "dependencies": {
    "express": "^4.19.2",
    "node-thermal-printer": "^4.4.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "pkg": "^5.8.1"
  },
  "pkg": {
    "assets": ["src/raw-print.ps1", "public/**/*"],
    "scripts": ["src/**/*.js"]
  }
}
```

---

### T2 — `src/config.js` con dos impresoras

**Cambio clave:** el config ahora tiene `ticketPrinter` y `etiquetaPrinter` como objetos separados.

```javascript
'use strict'

const fs   = require('fs')
const path = require('path')
const os   = require('os')

const CONFIG_DIR  = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'CVallePrintBridge'
)
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS = {
  port: 9100,
  allowedOrigins: [
    'https://app.cvalletienda.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  // Impresora de tickets (80mm ESC/POS)
  ticketPrinter: {
    name: '',
    paperWidthMm: 80,
    autocut: true,
    characterSet: 'PC858_EURO',
  },
  // Impresora de etiquetas (formato configurable)
  etiquetaPrinter: {
    name: '',
    paperWidthMm: 40,
    autocut: false,
    characterSet: 'PC858_EURO',
  },
}

function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return structuredClone(DEFAULTS)
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    const saved = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...saved,
      ticketPrinter:   { ...DEFAULTS.ticketPrinter,   ...(saved.ticketPrinter   || {}) },
      etiquetaPrinter: { ...DEFAULTS.etiquetaPrinter, ...(saved.etiquetaPrinter || {}) },
    }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

function setConfig(partial) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
  const next = {
    ...getConfig(),
    ...partial,
    ticketPrinter:   { ...getConfig().ticketPrinter,   ...(partial.ticketPrinter   || {}) },
    etiquetaPrinter: { ...getConfig().etiquetaPrinter, ...(partial.etiquetaPrinter || {}) },
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8')
  return next
}

module.exports = { getConfig, setConfig }
```

---

### T3 — `src/printer.js` (igual al v2 + `testPrintEtiqueta`)

Copiar `src/printer.js` del v2 y agregar:

1. `RAW_PRINT_PS1` apunta a `path.join(__dirname, 'raw-print.ps1')` (sin `..` porque en v3 todo está en `src/`)
2. Agregar función `testPrintEtiqueta(config)` independiente de `testPrint`:

```javascript
async function testPrintEtiqueta(config) {
  const printer = createClient(config)
  const now = new Date().toLocaleString('es-AR')

  printer.alignCenter()
  printer.bold(true)
  printer.println('CValle PrintBridge v3')
  printer.bold(false)
  printer.println('--- Prueba ETIQUETA ---')
  printer.println('')
  printer.alignLeft()
  printer.println(`Fecha:     ${now}`)
  printer.println(`Impresora: ${config.name || '(sin nombre)'}`)
  printer.println(`Ancho:     ${config.paperWidthMm}mm`)
  printer.println('Codigo:    7790001234567')
  printer.println('Producto:  Zapatilla Nike')
  printer.println('Talla:     42  Color: Negro')
  printer.bold(true)
  printer.setTextSize(1, 0)
  printer.println('$ 15.000,00')
  printer.bold(false)
  printer.setTextNormal()
  printer.println('')
  if (config.autocut) printer.cut()

  await printer.execute()
}
```

Exportar: `module.exports = { listPrinters, createClient, isPrinterOnline, testPrint, testPrintEtiqueta }`

---

### T4 — `src/renderer.js`

**Copiar idéntico** del v2. Sin cambios. Ya tiene `renderEtiqueta`, `renderTicketVenta`, etc.

---

### T5 — `src/raw-print.ps1`

**Copiar idéntico** del v2. Sin cambios.

---

### T6 — `src/autostart.js` (sin admin, vía Startup folder)

```javascript
'use strict'

const fs   = require('fs')
const path = require('path')
const os   = require('os')

const STARTUP_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
)
const SHORTCUT = path.join(STARTUP_DIR, 'CValle PrintBridge.bat')
const SERVER_BAT = path.resolve(__dirname, '..', 'start.bat')

function isAutoStartEnabled() {
  return fs.existsSync(SHORTCUT)
}

function enableAutoStart() {
  const content = `@echo off\nstart /min "" "${SERVER_BAT}"\n`
  fs.writeFileSync(SHORTCUT, content, 'utf8')
}

function disableAutoStart() {
  if (fs.existsSync(SHORTCUT)) fs.unlinkSync(SHORTCUT)
}

module.exports = { isAutoStartEnabled, enableAutoStart, disableAutoStart }
```

---

### T7 — `server.js` (proceso principal)

Nuevo entry point que unifica todo. Puntos clave:

**Endpoints nuevos vs v2:**

| Endpoint | v2 | v3 |
|---|---|---|
| `GET /status` | 1 impresora | **2 impresoras**: `ticketOnline`, `etiquetaOnline` |
| `GET /config` | 1 objeto flat | **2 objetos**: `ticketPrinter`, `etiquetaPrinter` |
| `POST /config` | 1 set de campos | Acepta `ticketPrinter` y/o `etiquetaPrinter` como objetos |
| `POST /print/test` | Ticket de prueba | ← mantener como alias |
| `POST /print/test/ticket` | ❌ | **NUEVO**: prueba impresora de tickets |
| `POST /print/test/etiqueta` | ❌ | **NUEVO**: prueba impresora de etiquetas |
| `POST /print/ticket` | ticketPrinter | igual |
| `POST /print/etiqueta` | ticketPrinter (bug!) | **FIX**: usa `etiquetaPrinter` |
| `GET /autostart` | Electron API | `autostart.js` (Startup folder) |
| `POST /autostart` | Electron API | `autostart.js` (Startup folder) |

**Lógica de `handlePrint`:** recibe `printerConfig` (objeto con `name`, `paperWidthMm`, `autocut`, `characterSet`) en lugar de leer todo del config global.

```javascript
async function handlePrint(renderFn, printerConfig, payload, res) {
  const jobId = uuidv4()

  if (!printerConfig.name) {
    return res.status(400).json({
      ok: false, jobId,
      error: 'Impresora no configurada. Abrí http://localhost:9100',
    })
  }

  log(`Job ${jobId} — ${printerConfig.name}`)
  try {
    const printer = createClient(printerConfig)
    await renderFn(printer, payload)
    if (printerConfig.autocut) {
      try { printer.cut() } catch {}
    }
    await printer.execute()
    log(`Job ${jobId} — OK`)
    res.json({ ok: true, jobId })
  } catch (err) {
    log(`Job ${jobId} — ERROR: ${err.message}`)
    res.status(500).json({ ok: false, jobId, error: err.message })
  }
}

// Tickets → ticketPrinter
server.post('/print/ticket',     (req, res) => handlePrint(renderTicketVenta,      cfg().ticketPrinter,   req.body, res))
server.post('/print/devolucion', (req, res) => handlePrint(renderTicketDevolucion, cfg().ticketPrinter,   req.body, res))
server.post('/print/cierre',     (req, res) => handlePrint(renderCierreCaja,       cfg().ticketPrinter,   req.body, res))
server.post('/print/vale',       (req, res) => handlePrint(renderValeCambio,       cfg().ticketPrinter,   req.body, res))

// Etiquetas → etiquetaPrinter
server.post('/print/etiqueta',   (req, res) => handlePrint(renderEtiqueta,         cfg().etiquetaPrinter, req.body, res))
```

---

### T8 — `public/index.html` renovada

La UI tiene dos secciones principales en lugar de una:

**Sección 1 — Impresora de Tickets**
- Selector de impresora (`select` con lista de Windows)
- Ancho: 58mm / 76mm / 80mm
- Checkbox autocut
- Botón "💾 Guardar"
- Estado: dot verde/rojo + nombre
- Botón "🖨 Probar ticket" → `POST /print/test/ticket`

**Sección 2 — Impresora de Etiquetas**
- Selector de impresora (misma lista)
- Ancho: 30mm / 40mm / 50mm / 58mm / 80mm
- Checkbox autocut
- Botón "💾 Guardar"
- Estado: dot verde/rojo + nombre
- Botón "🏷 Probar etiqueta" → `POST /print/test/etiqueta`

**Sección 3 — Inicio con Windows** (mismo que v2)

**Sección 4 — Orígenes permitidos** (mismo que v2)

**Sección 5 — Instrucciones de driver** (NUEVA)
- Explica que si no imprime, necesitan el driver Epson APD5
- Link a la descarga
- Instrucciones paso a paso para cambiar el driver en Windows

---

### T9 — `start.bat`

```bat
@echo off
title CValle PrintBridge v3
echo Iniciando CValle PrintBridge v3...
echo Abre http://localhost:9100 en el navegador para configurar.
echo Deja esta ventana abierta (o minimizala).
echo.
node server.js
pause
```

---

### T10 — Fix en `usePrint.tsx` (app Next.js)

El `tryPrintBridge` actualmente usa timeout de 10000ms. Con el v3 respondiendo sincrónicamente (espera al PS1), esto puede parecer colgado. La solución ya está (respuesta síncrona en `server.js`), pero hay que asegurarse que el timeout sea suficiente.

**Verificar en** `app/lib/impresion/usePrint.tsx`:
- `signal: AbortSignal.timeout(10000)` → OK para tickets simples
- Para cierre de caja (más datos) puede necesitar más. Subir a `15000`.

---

### T11 — `npm install` y smoke test

```bash
cd scripts/printbridge-v3
npm install
node -e "const s = require('./src/config'); console.log(s.getConfig())"
node -e "const p = require('./src/printer'); p.listPrinters().then(console.log)"
node server.js
# Abrir http://localhost:9100 y verificar UI
```

---

### T12 — (Opcional) Compilar `.exe` standalone con `pkg`

```bash
npm install -g pkg
npm run pkg
# Genera dist/CValle-PrintBridge-v3.exe (~25-35MB)
```

El `.exe` incluye Node.js embebido, `raw-print.ps1` y los archivos `public/`. El cliente solo necesita hacer doble clic.

---

## Orden de Ejecución

1. Crear `scripts/printbridge-v3/` con todos los archivos
2. `npm install`
3. Smoke test de módulos
4. `node server.js` y verificar UI en browser
5. Configurar impresora de tickets → "Probar ticket" → debe imprimir
6. Configurar impresora de etiquetas → "Probar etiqueta" → debe imprimir
7. (Opcional) Compilar `.exe` con pkg

---

## Notas de Implementación

### Driver — prerequisito del cliente
El PrintBridge v3 funciona correctamente **solo si la impresora en Windows tiene un driver que pasa datos RAW**. Con "Generic / Text Only" los bytes ESC/POS llegan al spooler pero son ignorados.

**Solución para el cliente actual:**
1. Abrir el instalador de Epson APD5 que ya está en `C:\Program Files (x86)\epson\EPSON Advanced Printer Driver 5\`
2. Buscar `setup.exe` o `install.exe` dentro y ejecutarlo de nuevo
3. En el asistente de APD5, cuando pregunta si agregar impresora nueva → elegir **Agregar** → Puerto USB → TM-T20
4. Esa nueva impresora (con driver EPSON TM-T20) es la que se configura en PrintBridge v3

O alternativamente: instalar el driver vía `pnputil` desde PowerShell admin:
```powershell
pnputil /add-driver "C:\Program Files (x86)\epson\EPSON Advanced Printer Driver 5\TM-T20\Driver\EPAPDWS.inf" /install
```

### Compatibilidad de payload
Los endpoints del v3 son 100% compatibles con el v2 — la app Next.js no necesita cambios en `usePrint.tsx` salvo el timeout (T10).

### `structuredClone` en Node 17+
`structuredClone` está disponible en Node >= 17. Si el cliente tiene Node 16, reemplazar con `JSON.parse(JSON.stringify(...))`.

---

## Archivos a Crear/Modificar

| Archivo | Acción |
|---|---|
| `scripts/printbridge-v3/package.json` | Crear |
| `scripts/printbridge-v3/server.js` | Crear |
| `scripts/printbridge-v3/start.bat` | Crear |
| `scripts/printbridge-v3/src/config.js` | Crear (2 impresoras) |
| `scripts/printbridge-v3/src/printer.js` | Crear (+ testPrintEtiqueta) |
| `scripts/printbridge-v3/src/renderer.js` | Copiar de v2 |
| `scripts/printbridge-v3/src/raw-print.ps1` | Copiar de v2 |
| `scripts/printbridge-v3/src/autostart.js` | Crear |
| `scripts/printbridge-v3/public/index.html` | Crear (UI renovada) |
| `scripts/printbridge-v3/public/style.css` | Copiar de v2 (mínimos ajustes) |
| `app/lib/impresion/usePrint.tsx` | Modificar timeout 10000→15000 |
