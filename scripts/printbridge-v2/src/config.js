'use strict'

const fs   = require('fs')
const path = require('path')
const os   = require('os')

/** En desarrollo usa %APPDATA%\CVallePrintBridge; en Electron main.js llama setConfigDir()
 *  para usar app.getPath('userData') → %APPDATA%\CValle PrintBridge\ */
let configDir = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'CVallePrintBridge'
)

/** Permite que main.js sobreescriba el directorio antes de iniciar el servidor */
function setConfigDir(dir) {
  configDir = dir
}

function getConfigPath() {
  return path.join(configDir, 'config.json')
}

/** Valores por defecto */
const DEFAULTS = {
  printerName:    '',
  paperWidthMm:   80,
  port:           9100,
  allowedOrigins: [
    'https://app.cvalletienda.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  autocut:       true,
  characterSet:  'PC858_EURO',
}

function ensureDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

function getConfig() {
  ensureDir()
  const file = getConfigPath()
  if (!fs.existsSync(file)) return { ...DEFAULTS }
  try {
    const raw = fs.readFileSync(file, 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function setConfig(partial) {
  ensureDir()
  const next = { ...getConfig(), ...partial }
  fs.writeFileSync(getConfigPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

function resetConfig() {
  ensureDir()
  fs.writeFileSync(getConfigPath(), JSON.stringify(DEFAULTS, null, 2), 'utf8')
  return { ...DEFAULTS }
}

module.exports = { getConfig, setConfig, resetConfig, setConfigDir }
