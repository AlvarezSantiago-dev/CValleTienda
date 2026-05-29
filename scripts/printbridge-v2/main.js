'use strict'

const { app, Tray, Menu, BrowserWindow, nativeImage, Notification } = require('electron')
const path = require('path')

// Resolver rutas compatibles con modo desarrollo y modo empaquetado
const isDev = !app.isPackaged
const SRC_DIR = isDev
  ? path.join(__dirname, 'src')
  : path.join(__dirname, 'src')

const RAW_PS1_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'raw-print.ps1')
  : path.join(__dirname, 'src', 'raw-print.ps1')

// Pasar la ruta del PS1 al módulo printer antes de cualquier require
process.env.RAW_PRINT_PS1 = RAW_PS1_PATH

const { setConfigDir, getConfig } = require('./src/config')
const { startServer }             = require('./src/server')
const { isPrinterOnline }         = require('./src/printer')

const PORT = 9100

// ─── Íconos de estado (SVG → nativeImage) ─────────────────────────────────────

function makeCircleIcon(hex) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle cx="16" cy="16" r="13" fill="${hex}" stroke="#fff" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" font-size="14" font-family="Arial" fill="#fff" font-weight="bold">P</text>
  </svg>`
  const b64 = Buffer.from(svg).toString('base64')
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${b64}`)
}

const ICON = {
  green:  makeCircleIcon('#22c55e'),
  yellow: makeCircleIcon('#eab308'),
  red:    makeCircleIcon('#ef4444'),
}

// ─── Estado global ─────────────────────────────────────────────────────────────

let tray        = null
let configWin   = null
let autoStartCb = null
let setAutoStartCb = null

// ─── Actualizar ícono y menú del tray ─────────────────────────────────────────

async function updateTray() {
  if (!tray || tray.isDestroyed()) return

  const cfg     = getConfig()
  const online  = await isPrinterOnline(cfg)
  const hasPrinter = Boolean(cfg.printerName)

  let icon, statusLabel
  if (!hasPrinter) {
    icon        = ICON.yellow
    statusLabel = '⚠ Sin impresora configurada'
  } else if (!online) {
    icon        = ICON.yellow
    statusLabel = `⚠ ${cfg.printerName} — offline`
  } else {
    icon        = ICON.green
    statusLabel = `✓ ${cfg.printerName} — ${cfg.paperWidthMm}mm`
  }

  tray.setImage(icon)
  tray.setToolTip(`CValle PrintBridge v2\n${statusLabel}`)

  const autoStart = app.getLoginItemSettings().openAtLogin

  const menu = Menu.buildFromTemplate([
    { label: 'CValle PrintBridge v2', enabled: false },
    { label: statusLabel,              enabled: false },
    { type: 'separator' },
    {
      label: '⚙ Abrir configuración',
      click: openConfigWindow,
    },
    {
      label: '🖨 Imprimir ticket de prueba',
      enabled: hasPrinter && online,
      click: async () => {
        try {
          const res = await fetch(`http://localhost:${PORT}/print/test`, { method: 'POST' })
          const d   = await res.json()
          if (!d.ok) showNotification('Error al imprimir', d.error)
          else showNotification('Ticket de prueba', 'Impresión enviada correctamente')
        } catch {
          showNotification('Error', 'No se pudo conectar al servidor de impresión')
        }
      },
    },
    { type: 'separator' },
    {
      label: `Iniciar con Windows: ${autoStart ? '✓ Activo' : '○ Inactivo'}`,
      click: () => {
        app.setLoginItemSettings({ openAtLogin: !autoStart })
        updateTray()
        const msg = !autoStart ? 'Arrancará automáticamente con Windows' : 'Ya no arrancará automáticamente'
        showNotification('Inicio con Windows', msg)
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

// ─── Ventana de configuración ──────────────────────────────────────────────────

function openConfigWindow() {
  if (configWin && !configWin.isDestroyed()) {
    configWin.focus()
    return
  }

  const iconPath = path.join(__dirname, 'assets', 'icon-app.png')

  configWin = new BrowserWindow({
    width:  520,
    height: 780,
    title:  'CValle PrintBridge — Configuración',
    icon:   iconPath,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    resizable: false,
    show: false,
  })

  configWin.loadURL(`http://localhost:${PORT}`)
  configWin.once('ready-to-show', () => configWin.show())
  configWin.on('closed', () => { configWin = null; updateTray() })
}

// ─── Notificaciones Windows ────────────────────────────────────────────────────

function showNotification(title, body) {
  if (!Notification.isSupported()) return
  new Notification({
    title,
    body,
    silent: true,
  }).show()
}

// ─── Registrar callbacks de autostart para el servidor web ────────────────────

function registerAutoStartHandlers(server) {
  server.setAutoStartHandler(
    () => app.getLoginItemSettings().openAtLogin,
    (val) => {
      app.setLoginItemSettings({ openAtLogin: val })
      updateTray()
    }
  )
}

// ─── Arranque ──────────────────────────────────────────────────────────────────

// Evitar segunda instancia
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    openConfigWindow()
  })
}

app.whenReady().then(async () => {
  // Ocultar de la barra de tareas (solo tray)
  app.setAppUserModelId('CValle PrintBridge')

  // Config en %APPDATA%\CValle PrintBridge\
  setConfigDir(app.getPath('userData'))

  // Arrancar servidor Express y obtener la instancia para registrar callbacks
  const serverModule = require('./src/server')
  serverModule.startServer(PORT)
  registerAutoStartHandlers(serverModule)

  // Crear ícono de bandeja
  tray = new Tray(ICON.yellow)
  tray.setToolTip('CValle PrintBridge v2 — iniciando...')
  tray.on('double-click', openConfigWindow)

  // Poblar menú y actualizar ícono
  await updateTray()

  // Actualizar estado cada 30 segundos
  setInterval(updateTray, 30_000)

  // Notificación de inicio
  const cfg = getConfig()
  if (cfg.printerName) {
    showNotification('CValle PrintBridge activo', `Imprimiendo en ${cfg.printerName}`)
  } else {
    showNotification(
      'CValle PrintBridge activo',
      'Hacé doble clic en el ícono para configurar tu impresora'
    )
  }
})

// Mantener la app viva cuando se cierran las ventanas
app.on('window-all-closed', (e) => e.preventDefault())
