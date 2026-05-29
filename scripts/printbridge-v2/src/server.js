'use strict'

const express = require('express')
const path    = require('path')
const { v4: uuidv4 } = require('uuid')

const { getConfig, setConfig } = require('./config')
const { listPrinters, createClient, isPrinterOnline, testPrint } = require('./printer')
const {
  renderTicketVenta,
  renderTicketDevolucion,
  renderCierreCaja,
  renderEtiqueta,
  renderValeCambio,
} = require('./renderer')

const VERSION = '2.0.0'
const server  = express()

// ─── Callbacks de autostart (registrados desde main.js de Electron) ──────────
let _getAutoStart  = () => false
let _setAutoStart  = () => {}

function setAutoStartHandler(getter, setter) {
  _getAutoStart = getter
  _setAutoStart = setter
}

// ─── CORS dinámico ─────────────────────────────────────────────────────────────
server.use((req, res, next) => {
  const cfg            = getConfig()
  const allowedOrigins = cfg.allowedOrigins || []
  const origin         = req.headers.origin

  const isLocalhost = !origin
    || origin.startsWith('http://localhost')
    || origin.startsWith('http://127.0.0.1')
  const isAllowed = isLocalhost || allowedOrigins.includes(origin)

  if (isAllowed && origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

server.use(express.json({ limit: '2mb' }))

// ─── UI de configuración (archivos estáticos) ──────────────────────────────────
server.use(express.static(path.join(__dirname, '..', 'public')))

// ─── Endpoints de estado ───────────────────────────────────────────────────────

server.get('/status', async (req, res) => {
  const cfg    = getConfig()
  const online = await isPrinterOnline(cfg)
  res.json({
    ok:            true,
    version:       VERSION,
    printerName:   cfg.printerName,
    paperWidthMm:  cfg.paperWidthMm,
    autocut:       cfg.autocut,
    printerOnline: online,
  })
})

server.get('/printers', async (req, res) => {
  try {
    const list = await listPrinters()
    res.json({ ok: true, printers: list })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

server.get('/config', (req, res) => {
  const cfg = getConfig()
  res.json({
    ok:             true,
    printerName:    cfg.printerName,
    paperWidthMm:   cfg.paperWidthMm,
    autocut:        cfg.autocut,
    allowedOrigins: cfg.allowedOrigins,
    port:           cfg.port,
  })
})

server.post('/config', (req, res) => {
  try {
    const { printerName, paperWidthMm, autocut, allowedOrigins } = req.body
    const updates = {}
    if (printerName !== undefined) updates.printerName = String(printerName)
    if (paperWidthMm !== undefined && [58, 76, 80].includes(Number(paperWidthMm))) {
      updates.paperWidthMm = Number(paperWidthMm)
    }
    if (autocut  !== undefined) updates.autocut  = Boolean(autocut)
    if (Array.isArray(allowedOrigins)) updates.allowedOrigins = allowedOrigins
    const next = setConfig(updates)
    log('Configuración actualizada', updates)
    res.json({ ok: true, config: next })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Inicio con Windows ────────────────────────────────────────────────────────

server.get('/autostart', (req, res) => {
  res.json({ ok: true, enabled: _getAutoStart() })
})

server.post('/autostart', (req, res) => {
  try {
    const { enabled } = req.body
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'enabled debe ser boolean' })
    }
    _setAutoStart(enabled)
    res.json({ ok: true, enabled })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Endpoints de impresión ────────────────────────────────────────────────────

async function handlePrint(renderFn, payload, res) {
  const jobId = uuidv4()
  const cfg   = getConfig()

  if (!cfg.printerName) {
    return res.status(400).json({
      ok: false,
      jobId,
      error: 'No hay impresora configurada. Abrí http://localhost:9100 para configurarla.',
    })
  }

  log(`Job ${jobId} — inicio`)
  try {
    const anchoMm = payload?.tienda?.ancho_mm ?? cfg.paperWidthMm
    const printer = createClient({ ...cfg, paperWidthMm: anchoMm })
    await renderFn(printer, payload)
    if (cfg.autocut) {
      try { printer.cut() } catch { /* algunos modelos no soportan cut */ }
    }
    const buffer = printer.getBuffer()
    log(`Job ${jobId} — buffer size: ${buffer ? buffer.length : 0} bytes`)
    await printer.execute()
    log(`Job ${jobId} — OK`)
    res.json({ ok: true, jobId })
  } catch (err) {
    log(`Job ${jobId} — ERROR: ${err.message}`)
    res.status(500).json({ ok: false, jobId, error: err.message })
  }
}

server.post('/print/ticket',    (req, res) => handlePrint(renderTicketVenta,       req.body, res))
server.post('/print/devolucion',(req, res) => handlePrint(renderTicketDevolucion,  req.body, res))
server.post('/print/cierre',    (req, res) => handlePrint(renderCierreCaja,        req.body, res))
server.post('/print/etiqueta',  (req, res) => handlePrint(renderEtiqueta,          req.body, res))
server.post('/print/vale',      (req, res) => handlePrint(renderValeCambio,        req.body, res))

server.post('/print/test', async (req, res) => {
  const cfg = getConfig()
  if (!cfg.printerName) {
    return res.status(400).json({ ok: false, error: 'No hay impresora configurada.' })
  }
  try {
    await testPrint(cfg)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Logger ─────────────────────────────────────────────────────────────────────

function log(msg, data) {
  const ts    = new Date().toLocaleString('es-AR')
  const extra = data ? ' ' + JSON.stringify(data) : ''
  console.log(`[${ts}] ${msg}${extra}`)
}

// ─── Arranque — llamado desde main.js de Electron ─────────────────────────────

function startServer(port = 9100) {
  server.listen(port, '127.0.0.1', () => {
    log(`CValle PrintBridge v${VERSION} escuchando en http://localhost:${port}`)
    const cfg = getConfig()
    if (!cfg.printerName) {
      log('AVISO: Sin impresora configurada. Abrí http://localhost:' + port)
    } else {
      log(`Impresora: ${cfg.printerName} (${cfg.paperWidthMm}mm)`)
    }
  })
}

module.exports = { startServer, setAutoStartHandler }
