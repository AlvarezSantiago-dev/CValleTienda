'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Directorio de configuración persistente: %APPDATA%\CVallePrintBridge\
const CONFIG_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'CVallePrintBridge'
)
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/** Valores por defecto */
const DEFAULTS = {
  printerName: '',
  paperWidthMm: 80,
  port: 9100,
  allowedOrigins: [
    'https://app.cvalletienda.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  autocut: true,
  characterSet: 'PC858_EURO',
}

/** Asegura que el directorio de config exista */
function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

/** Lee la configuración actual (mezcla defaults + lo que haya guardado) */
function getConfig() {
  ensureDir()
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULTS }
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Actualiza campos parciales y persiste */
function setConfig(partial) {
  ensureDir()
  const current = getConfig()
  const next = { ...current, ...partial }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8')
  return next
}

/** Vuelve a los valores por defecto */
function resetConfig() {
  ensureDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2), 'utf8')
  return { ...DEFAULTS }
}

module.exports = { getConfig, setConfig, resetConfig, CONFIG_DIR }
