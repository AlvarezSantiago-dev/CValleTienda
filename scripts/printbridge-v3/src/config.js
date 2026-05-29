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
  ticketPrinter: {
    name: '',
    paperWidthMm: 80,
    autocut: true,
    characterSet: 'PC858_EURO',
    protocol: 'escpos',
  },
  etiquetaPrinter: {
    name: '',
    paperWidthMm: 50,
    paperHeightMm: 25,
    autocut: false,
    characterSet: 'PC858_EURO',
    protocol: 'tspl',
  },
}

function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return JSON.parse(JSON.stringify(DEFAULTS))
  try {
    const raw   = fs.readFileSync(CONFIG_FILE, 'utf8')
    const saved = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...saved,
      ticketPrinter:   { ...DEFAULTS.ticketPrinter,   ...(saved.ticketPrinter   || {}) },
      etiquetaPrinter: { ...DEFAULTS.etiquetaPrinter, ...(saved.etiquetaPrinter || {}) },
    }
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS))
  }
}

function setConfig(partial) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
  const current = getConfig()
  const next = {
    ...current,
    ...partial,
    ticketPrinter: {
      ...current.ticketPrinter,
      ...(partial.ticketPrinter || {}),
    },
    etiquetaPrinter: {
      ...current.etiquetaPrinter,
      ...(partial.etiquetaPrinter || {}),
    },
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8')
  return next
}

module.exports = { getConfig, setConfig }
