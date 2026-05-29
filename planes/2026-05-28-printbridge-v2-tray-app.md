# Plan: PrintBridge v2 — App de Bandeja de Sistema (System Tray)

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Rehacer PrintBridge como app de Windows visible (icono en bandeja), descargable como .exe portátil, sin necesidad de ser administrador.

---

## Descripción General

### Qué Logra Este Plan

Reemplaza el modelo "servicio invisible de Windows" de PrintBridge v1 por una **app Electron con icono en la bandeja del sistema** (system tray). El cajero ve el ícono en la barra de tareas siempre, puede hacer clic derecho para ver el estado, abrir la configuración o imprimir una prueba. Se instala con doble clic (o es portátil — un solo `.exe`), no necesita permisos de administrador y arranca sola con Windows sin ser servicio.

### Por Qué Importa

El problema real del v1 es que los clientes no saben si PrintBridge está corriendo. Un servicio Windows es invisible, no tiene interfaz, y cuando falla no hay señal. Con el tray icon, el estado es siempre visible: verde = OK, rojo = hay un problema. El cajero sabe exactamente qué pasa sin llamar soporte.

---

## Estado Actual

### Estructura Existente Relevante

```
scripts/printbridge/
├── src/
│   ├── server.js       ← Express server con todos los endpoints (/print/ticket, /print/etiqueta, etc.)
│   ├── renderer.js     ← Lógica ESC/POS para todos los tipos de ticket
│   ├── printer.js      ← Cliente ThermalPrinter + PowerShell RAW print
│   ├── config.js       ← Leer/escribir config.json local
│   └── service.js      ← Instalador de servicio Windows (NO se usa en v2)
├── public/
│   ├── index.html      ← UI de configuración web (se reutiliza)
│   └── style.css
├── raw-print.ps1       ← Script PowerShell para envío RAW
├── instalar-servicio.bat
├── desinstalar-servicio.bat
└── package.json
```

### Brechas o Problemas que se Abordan

1. **Invisible**: corre como servicio → el cajero no sabe si está activo
2. **Requiere admin**: instalar servicio Windows exige permisos de administrador
3. **Sin feedback visual**: si falla, no hay ninguna señal
4. **Sin auto-start fácil**: el servicio puede dejar de correr sin que nadie lo note
5. **Distribuir**: no hay `.exe` portátil; el cliente tiene que instalar Node.js

---

## Cambios Propuestos

### Resumen de Cambios

- Crear nueva carpeta `scripts/printbridge-v2/` como proyecto Electron
- `main.js` Electron maneja: arranque del servidor Express, icono tray, menú contextual, ventana de configuración
- Reutilizar `server.js`, `renderer.js`, `printer.js`, `config.js` sin cambios sustanciales
- Actualizar `public/index.html` para agregar toggle de "Iniciar con Windows"
- Configurar `electron-builder` para generar `.exe` portátil (~90MB, sin instalación)
- El v1 queda intacto — no se elimina nada

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `scripts/printbridge-v2/package.json` | Proyecto Electron con dependencias y config de electron-builder |
| `scripts/printbridge-v2/main.js` | Proceso principal Electron: tray icon, ventana, arranque del servidor |
| `scripts/printbridge-v2/assets/icon-green.png` | Ícono tray 32×32 verde (servidor OK + impresora online) |
| `scripts/printbridge-v2/assets/icon-yellow.png` | Ícono tray 32×32 amarillo (servidor OK + impresora sin configurar/offline) |
| `scripts/printbridge-v2/assets/icon-red.png` | Ícono tray 32×32 rojo (servidor caído / error) |
| `scripts/printbridge-v2/assets/icon-app.ico` | Ícono de la app para el .exe |
| `scripts/printbridge-v2/electron-builder.yml` | Configuración del build: target portable Win x64 |

### Archivos a Copiar/Adaptar de v1

| Ruta destino | Origen | Cambios |
|---|---|---|
| `scripts/printbridge-v2/src/server.js` | v1/src/server.js | Eliminar `start()` al final — Electron lo llama |
| `scripts/printbridge-v2/src/renderer.js` | v1/src/renderer.js | Sin cambios |
| `scripts/printbridge-v2/src/printer.js` | v1/src/printer.js | Sin cambios |
| `scripts/printbridge-v2/src/config.js` | v1/src/config.js | Ajustar ruta userData para Electron |
| `scripts/printbridge-v2/src/raw-print.ps1` | v1/raw-print.ps1 | Sin cambios |
| `scripts/printbridge-v2/public/index.html` | v1/public/index.html | Agregar sección "Inicio con Windows" |
| `scripts/printbridge-v2/public/style.css` | v1/public/style.css | Sin cambios |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Electron en lugar de pkg + node-systray**: `electron-builder` genera instaladores/portátiles estándar de Windows, tiene Tray API nativa estable, no necesita addons nativos problemáticos con pkg, y el auto-start sin admin es trivial (`app.setLoginItemSettings`).

2. **Portable .exe (no installer)**: Un solo archivo ejecutable. El cliente lo descarga, lo pone donde quiera (ej. Escritorio) y doble clic. Sin wizard de instalación, sin UAC, sin admin. El usuario puede ponerlo en el Escritorio y crear un acceso directo.

3. **Auto-start sin admin**: `app.setLoginItemSettings({ openAtLogin: true })` en Electron agrega la app a `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` — sin permisos de administrador. El usuario lo activa desde la UI de configuración del tray.

4. **Servidor Express en proceso principal**: El servidor Express se inicia directamente en el proceso main de Electron (no en renderer ni child process). Más simple, acceso directo a `app.getPath('userData')` para el config.json.

5. **Config en userData de Electron**: En lugar de `config.json` junto al .exe (que puede ser de solo lectura si está en Program Files), usar `app.getPath('userData')` → `C:\Users\[user]\AppData\Roaming\CValle PrintBridge\config.json`. Funciona sin permisos especiales.

6. **Ventana de config como BrowserWindow**: Al hacer "Abrir configuración", Electron abre una `BrowserWindow` cargando `http://localhost:9100` (la misma UI web actual). No hay que rehacer la UI; funciona igual que en v1.

7. **Ícono generado con canvas de Node**: Los 3 íconos de estado (verde/amarillo/rojo) se generan en código como PNGs simples con `canvas` o inline como base64 data URIs, sin depender de archivos de imagen externos. Esto hace el build más limpio.

### Alternativas Consideradas

- **node-systray + pkg**: Más liviano (~20MB vs ~90MB Electron), pero los addons nativos de systray no se empaquetan bien con pkg en todas las versiones de Windows. Más frágil.
- **Seguir con servicio + mejorar UI**: No resuelve el problema raíz de visibilidad. Un servicio sigue siendo invisible para el usuario.
- **Electron con ventana principal siempre visible**: Más intrusivo. El tray es el estándar para este tipo de agentes en Windows.

### Preguntas Abiertas

- **Firma de código (.exe)**: Sin firma, Windows Defender/SmartScreen mostrará una advertencia la primera vez que se descargue. Para producción real, hay que comprar un certificado de firma de código (~$150-400/año). Por ahora el plan no incluye firma; se puede agregar después.
- **Versión de Electron**: Usar la LTS más reciente al momento del build (actualmente Electron 33).

---

## Tareas Paso a Paso

### Paso 1: Crear estructura del proyecto Electron

Crear la carpeta `scripts/printbridge-v2/` con el `package.json` del proyecto Electron:

```json
{
  "name": "cvalle-printbridge",
  "version": "2.0.0",
  "description": "Agente de impresión térmica para CValleTienda",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "node-thermal-printer": "^4.4.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  },
  "build": {
    "appId": "com.cvalle.printbridge",
    "productName": "CValle PrintBridge",
    "copyright": "CValle",
    "win": {
      "icon": "assets/icon-app.ico",
      "target": [{ "target": "portable", "arch": ["x64"] }]
    },
    "portable": {
      "artifactName": "CValle-PrintBridge-v2.exe"
    },
    "extraResources": [
      { "from": "src/raw-print.ps1", "to": "raw-print.ps1" }
    ],
    "files": [
      "main.js",
      "src/**",
      "public/**",
      "assets/**",
      "!src/service.js"
    ]
  }
}
```

**Acciones:**
- Crear `scripts/printbridge-v2/` con la estructura de carpetas: `src/`, `public/`, `assets/`
- Crear `package.json` con el contenido anterior

**Archivos afectados:**
- `scripts/printbridge-v2/package.json` (nuevo)

---

### Paso 2: Crear los íconos de estado

Los íconos son círculos de 32×32px. Se generan como archivos PNG embebidos en base64 directamente en `main.js` usando `nativeImage.createFromDataURL()`. No se necesitan archivos de imagen externos para los estados del tray.

Para el ícono del .exe (`assets/icon-app.ico`), usar un ícono simple de impresora. Si no se tiene, electron-builder acepta un PNG de 256×256 y lo convierte.

**Acciones:**
- Crear `assets/` con un `icon-app.png` de 256×256 (placeholder con la letra "P" o similar; se puede reemplazar luego con branding real)
- Los íconos verde/amarillo/rojo del tray se generarán como `nativeImage` en `main.js` mediante SVG data URIs

**Archivos afectados:**
- `scripts/printbridge-v2/assets/icon-app.png` (nuevo — placeholder)

---

### Paso 3: Copiar y adaptar src/ de v1

Copiar los archivos de v1 a v2 con las modificaciones indicadas:

**`src/config.js`** — Cambio clave: la ruta del config.json pasa a ser un parámetro. En v2, `main.js` le pasa `app.getPath('userData')` al inicializar.

```javascript
// config.js v2: recibe el directorio de datos
let configDir = null

function setConfigDir(dir) {
  configDir = dir
}

function getConfigPath() {
  if (!configDir) throw new Error('configDir no inicializado')
  return path.join(configDir, 'config.json')
}
// resto igual...
```

**`src/server.js`** — Cambio: exportar `startServer(port)` en lugar de llamar `start()` al final del archivo.

```javascript
// Al final de server.js, reemplazar start() por:
function startServer(port = 9100) {
  app.listen(port, '127.0.0.1', () => {
    log(`CValle PrintBridge v2 escuchando en http://localhost:${port}`)
  })
}
module.exports = { app, startServer }
```

**Acciones:**
- Copiar `renderer.js`, `printer.js`, `raw-print.ps1` sin cambios
- Adaptar `config.js` para recibir el userData dir
- Adaptar `server.js` para exportar `startServer()` en lugar de auto-ejecutarse

**Archivos afectados:**
- `scripts/printbridge-v2/src/server.js`
- `scripts/printbridge-v2/src/config.js`
- `scripts/printbridge-v2/src/renderer.js`
- `scripts/printbridge-v2/src/printer.js`
- `scripts/printbridge-v2/src/raw-print.ps1`

---

### Paso 4: Crear main.js (el corazón del v2)

Este es el archivo principal de Electron. Maneja todo:

```javascript
'use strict'

const { app, Tray, Menu, BrowserWindow, nativeImage, shell, Notification } = require('electron')
const path = require('path')
const { setConfigDir, getConfig, setConfig } = require('./src/config')
const { startServer } = require('./src/server')
const { isPrinterOnline } = require('./src/printer')

// ─── Íconos de estado (SVG → data URI → nativeImage) ─────────────────────────
function makeCircleIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle cx="16" cy="16" r="14" fill="${color}" />
  </svg>`
  const b64 = Buffer.from(svg).toString('base64')
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${b64}`)
}
const ICON_GREEN  = makeCircleIcon('#22c55e')
const ICON_YELLOW = makeCircleIcon('#eab308')
const ICON_RED    = makeCircleIcon('#ef4444')

// ─── Estado global ────────────────────────────────────────────────────────────
let tray = null
let configWindow = null
const PORT = 9100

// ─── Actualizar ícono y menú según estado ─────────────────────────────────────
async function updateTray() {
  const cfg = getConfig()
  const online = await isPrinterOnline(cfg)
  const configured = Boolean(cfg.printerName)

  let icon, statusLabel
  if (!configured) {
    icon = ICON_YELLOW
    statusLabel = '⚠ Sin impresora configurada'
  } else if (!online) {
    icon = ICON_YELLOW
    statusLabel = `⚠ ${cfg.printerName} — offline`
  } else {
    icon = ICON_GREEN
    statusLabel = `✓ ${cfg.printerName} — ${cfg.paperWidthMm}mm`
  }

  tray.setImage(icon)
  tray.setToolTip(`CValle PrintBridge v2\n${statusLabel}`)

  const autoStart = app.getLoginItemSettings().openAtLogin

  const menu = Menu.buildFromTemplate([
    { label: 'CValle PrintBridge v2', enabled: false },
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'Abrir configuración',
      click: openConfigWindow,
    },
    {
      label: 'Imprimir ticket de prueba',
      enabled: configured && online,
      click: () => {
        // Llamar al endpoint de test
        fetch(`http://localhost:${PORT}/print/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          .then(r => r.json())
          .then(d => {
            if (!d.ok) showNotification('Error al imprimir', d.error)
          })
          .catch(() => showNotification('Error', 'No se pudo imprimir el ticket de prueba'))
      },
    },
    { type: 'separator' },
    {
      label: `Iniciar con Windows: ${autoStart ? '✓ Activo' : '○ Inactivo'}`,
      click: () => {
        const newVal = !autoStart
        app.setLoginItemSettings({ openAtLogin: newVal })
        updateTray()
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)
}

// ─── Ventana de configuración ─────────────────────────────────────────────────
function openConfigWindow() {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.focus()
    return
  }
  configWindow = new BrowserWindow({
    width: 520,
    height: 720,
    title: 'CValle PrintBridge — Configuración',
    icon: path.join(__dirname, 'assets', 'icon-app.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    resizable: false,
  })
  configWindow.loadURL(`http://localhost:${PORT}`)
  configWindow.on('closed', () => { configWindow = null; updateTray() })
}

// ─── Notificaciones Windows ───────────────────────────────────────────────────
function showNotification(title, body) {
  new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon-app.png') }).show()
}

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Prevenir que la app aparezca en la barra de tareas (solo tray)
  app.setAppUserModelId('CValle PrintBridge')

  // Config en userData (~\AppData\Roaming\CValle PrintBridge\)
  setConfigDir(app.getPath('userData'))

  // Arrancar servidor Express
  startServer(PORT)

  // Crear ícono de bandeja
  tray = new Tray(ICON_YELLOW)
  tray.setToolTip('CValle PrintBridge v2 — iniciando...')
  tray.on('double-click', openConfigWindow)

  // Poblar menú inicial
  updateTray()

  // Actualizar estado cada 30 segundos
  setInterval(updateTray, 30_000)

  // Notificación de inicio (solo si está configurada la impresora)
  const cfg = getConfig()
  if (cfg.printerName) {
    showNotification('CValle PrintBridge activo', `Imprimiendo en ${cfg.printerName}`)
  } else {
    showNotification('CValle PrintBridge activo', 'Hacé doble clic en el ícono para configurar tu impresora')
  }
})

// Evitar que la app se cierre cuando se cierran todas las ventanas
app.on('window-all-closed', (e) => e.preventDefault())
```

**Acciones:**
- Crear `scripts/printbridge-v2/main.js` con el contenido anterior

**Archivos afectados:**
- `scripts/printbridge-v2/main.js` (nuevo)

---

### Paso 5: Actualizar public/index.html

Copiar la UI de v1 y agregar:
- Sección "Inicio con Windows" con un botón que llame a un endpoint nuevo `/autostart`
- Actualizar el texto de ayuda (ya no es un servicio Windows, es una app de bandeja)
- Quitar la referencia a "servicio de Windows" en el texto

**Nuevo endpoint en server.js** para que la UI web pueda leer/escribir el auto-start:
- `GET /autostart` → `{ enabled: boolean }`
- `POST /autostart` con `{ enabled: boolean }` → llama `app.setLoginItemSettings`

Esto requiere que el servidor Express tenga acceso a una función de `main.js`. Se implementa con un event emitter o simplemente exponiendo una función en el módulo:

```javascript
// En main.js, después de crear la tray:
const { app: electronApp } = require('electron')
// Registrar handlers en server.js:
const serverModule = require('./src/server')
serverModule.setAutoStartHandler(
  () => electronApp.getLoginItemSettings().openAtLogin,
  (val) => electronApp.setLoginItemSettings({ openAtLogin: val })
)
```

**Acciones:**
- Agregar en `public/index.html` la sección de inicio automático
- Agregar en `src/server.js` los endpoints `/autostart` GET y POST
- Implementar la comunicación main↔server via callbacks

**Archivos afectados:**
- `scripts/printbridge-v2/public/index.html`
- `scripts/printbridge-v2/src/server.js`

---

### Paso 6: Instalar dependencias y probar en desarrollo

```bat
cd scripts\printbridge-v2
npm install
npm start
```

Verificar:
- Aparece ícono amarillo en bandeja del sistema
- Doble clic abre ventana de configuración cargando `localhost:9100`
- Se puede configurar impresora
- El ícono cambia a verde cuando la impresora está online
- Menú clic derecho muestra estado y opciones
- "Iniciar con Windows" toglea correctamente
- Test de impresión funciona desde el menú
- Ventana de configuración cierra con X (app sigue en tray)

---

### Paso 7: Build del .exe portátil

```bat
cd scripts\printbridge-v2
npm run build
```

Salida esperada en `scripts/printbridge-v2/dist/CValle-PrintBridge-v2.exe` (~90MB, portátil).

**Verificar el portátil:**
- Copiar el .exe a otra carpeta o PC y ejecutar
- El config se guarda en `%APPDATA%\CValle PrintBridge\config.json`
- No requiere instalación ni admin

**Acciones:**
- Ejecutar `npm run build`
- Probar el .exe generado

---

### Paso 8: Actualizar PrintBridgeStatus.tsx en la app web

El componente de estado ya está en `app/components/configuracion/PrintBridgeStatus.tsx`. Actualizar:
- Link de descarga: apuntar a la URL donde se hospeda el `CValle-PrintBridge-v2.exe`
- Actualizar el texto de instalación: "descargá el .exe y hacé doble clic" en vez de "ejecutar .bat como administrador"

```tsx
<a href="https://[URL-DE-DESCARGA]/CValle-PrintBridge-v2.exe" ...>
  Descargar CValle PrintBridge v2
</a>
```

**Archivos afectados:**
- `app/components/configuracion/PrintBridgeStatus.tsx`

---

### Paso 9: Hospedar el .exe para descarga

Opciones de hosting del binario:
1. **GitHub Releases** (recomendado): crear release en el repo con el .exe adjunto → URL pública y estable
2. **Supabase Storage**: subir a un bucket público `printbridge/CValle-PrintBridge-v2.exe`
3. **CDN propio**: si ya se tiene dominio y almacenamiento

El paso concreto depende del método elegido. Se documenta en el README del v2.

---

## Criterios de Éxito

- [ ] El .exe portátil corre en Windows 10/11 sin admin con doble clic
- [ ] El ícono aparece en la bandeja del sistema (esquina inferior derecha)
- [ ] Doble clic abre la ventana de configuración
- [ ] El ícono es verde cuando la impresora está configurada y online
- [ ] El ícono es amarillo cuando falta configurar la impresora
- [ ] "Iniciar con Windows" funciona (arranca sola al prender la PC)
- [ ] Imprimir ticket de prueba funciona desde el menú
- [ ] La app web detecta el PrintBridge y muestra el estado correcto
- [ ] `POST /print/ticket`, `/print/etiqueta` y demás endpoints funcionan igual que v1
- [ ] El config se guarda entre reinicios

---

## Notas de Implementación

### SmartScreen Warning
La primera vez que un cliente descargue y ejecute el `.exe`, Windows puede mostrar un warning de SmartScreen ("Windows protegió tu PC"). El usuario debe hacer clic en "Más información" → "Ejecutar de todas formas". Esto es normal para .exe sin firma digital. Para eliminarlo en producción: comprar un certificado EV de firma de código y firmar el binario antes de distribuir.

### Tamaño del .exe
Electron genera binarios grandes (~90MB) porque incluye el runtime de Chromium. Esto es normal y esperado. La ventaja es que el cliente NO necesita tener Node.js instalado — todo viene dentro del .exe.

### Versión de Electron
Usar Electron 33 (LTS) al momento del build. El `package.json` fija la versión para reproducibilidad.

### Raw Print PS1 en el .exe portátil
El `raw-print.ps1` se empaqueta dentro del .exe via `extraResources` en electron-builder. En tiempo de ejecución, Electron lo extrae a `process.resourcesPath`. El `printer.js` debe resolver la ruta a `path.join(process.resourcesPath, 'raw-print.ps1')` cuando corre como app empaquetada.

```javascript
// En printer.js, detectar si corre empaquetado o en desarrollo:
const RAW_PRINT_PS1 = app.isPackaged
  ? path.join(process.resourcesPath, 'raw-print.ps1')
  : path.join(__dirname, '..', 'raw-print.ps1')
```

Pero `printer.js` no tiene acceso a `app` de Electron. Solución: pasar la ruta como parámetro desde `main.js` al inicializar, o usar una variable de entorno que `main.js` setea antes de arrancar el servidor.
