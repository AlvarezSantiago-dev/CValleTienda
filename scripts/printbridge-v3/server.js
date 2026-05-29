'use strict'

const express = require('express')
const path    = require('path')
const { v4: uuidv4 } = require('uuid')

const { getConfig, setConfig }                          = require('./src/config')
const { listPrinters, createClient, isPrinterOnline,
        testPrint, testPrintEtiqueta,
        sendRawFileToPrinter }                          = require('./src/printer')
const { isAutoStartEnabled, enableAutoStart,
        disableAutoStart }                              = require('./src/autostart')
const {
  renderTicketVenta,
  renderTicketDevolucion,
  renderCierreCaja,
  renderEtiqueta,
  renderEtiquetaTspl,
  renderValeCambio,
} = require('./src/renderer')

const VERSION = '3.0.0'
const app     = express()

// ─── CORS dinámico ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
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

app.use(express.json({ limit: '2mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// ─── Helper: log ───────────────────────────────────────────────────────────────
function log(msg, data) {
  const ts    = new Date().toLocaleString('es-AR')
  const extra = data ? ' ' + JSON.stringify(data) : ''
  console.log(`[${ts}] ${msg}${extra}`)
}

// ─── /status ───────────────────────────────────────────────────────────────────
app.get('/status', async (req, res) => {
  const cfg = getConfig()
  const [ticketOnline, etiquetaOnline] = await Promise.all([
    isPrinterOnline(cfg.ticketPrinter.name),
    isPrinterOnline(cfg.etiquetaPrinter.name),
  ])
  res.json({
    ok:              true,
    version:         VERSION,
    ticketPrinter:   { ...cfg.ticketPrinter,   online: ticketOnline },
    etiquetaPrinter: { ...cfg.etiquetaPrinter, online: etiquetaOnline },
  })
})

// ─── /printers ─────────────────────────────────────────────────────────────────
app.get('/printers', async (req, res) => {
  try {
    const list = await listPrinters()
    res.json({ ok: true, printers: list })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── /config GET ───────────────────────────────────────────────────────────────
app.get('/config', (req, res) => {
  const cfg = getConfig()
  res.json({
    ok:              true,
    port:            cfg.port,
    allowedOrigins:  cfg.allowedOrigins,
    ticketPrinter:   cfg.ticketPrinter,
    etiquetaPrinter: cfg.etiquetaPrinter,
  })
})

// ─── /config POST ──────────────────────────────────────────────────────────────
app.post('/config', (req, res) => {
  try {
    const { ticketPrinter, etiquetaPrinter, allowedOrigins } = req.body
    const updates = {}

    if (ticketPrinter) {
      const tp = {}
      if (ticketPrinter.name        !== undefined) tp.name        = String(ticketPrinter.name)
      if (ticketPrinter.paperWidthMm !== undefined
          && [58, 76, 80].includes(Number(ticketPrinter.paperWidthMm))) {
        tp.paperWidthMm = Number(ticketPrinter.paperWidthMm)
      }
      if (ticketPrinter.autocut    !== undefined) tp.autocut    = Boolean(ticketPrinter.autocut)
      if (ticketPrinter.characterSet !== undefined) tp.characterSet = String(ticketPrinter.characterSet)
      updates.ticketPrinter = tp
    }

    if (etiquetaPrinter) {
      const ep = {}
      if (etiquetaPrinter.name        !== undefined) ep.name        = String(etiquetaPrinter.name)
      if (etiquetaPrinter.paperWidthMm !== undefined
          && [30, 40, 50, 58, 80].includes(Number(etiquetaPrinter.paperWidthMm))) {
        ep.paperWidthMm = Number(etiquetaPrinter.paperWidthMm)
      }
      if (etiquetaPrinter.autocut    !== undefined) ep.autocut    = Boolean(etiquetaPrinter.autocut)
      if (etiquetaPrinter.characterSet !== undefined) ep.characterSet = String(etiquetaPrinter.characterSet)
      updates.etiquetaPrinter = ep
    }

    if (Array.isArray(allowedOrigins)) updates.allowedOrigins = allowedOrigins

    const next = setConfig(updates)
    log('Config actualizada', updates)
    res.json({ ok: true, config: next })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── /autostart ────────────────────────────────────────────────────────────────
app.get('/autostart', (req, res) => {
  res.json({ ok: true, enabled: isAutoStartEnabled() })
})

app.post('/autostart', (req, res) => {
  try {
    const { enabled } = req.body
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'enabled debe ser boolean' })
    }
    if (enabled) enableAutoStart()
    else disableAutoStart()
    res.json({ ok: true, enabled })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Impresión ─────────────────────────────────────────────────────────────────
async function handlePrint(renderFn, printerConfig, payload, res) {
  const jobId = uuidv4()

  if (!printerConfig.name) {
    return res.status(400).json({
      ok: false, jobId,
      error: 'Impresora no configurada. Abrí http://localhost:9100',
    })
  }

  log(`Job ${jobId} → ${printerConfig.name}`)
  try {
    const printer = createClient(printerConfig)
    await renderFn(printer, payload)
    if (printerConfig.autocut) {
      try { printer.cut() } catch { /* modelo sin corte */ }
    }
    await printer.execute()
    log(`Job ${jobId} — OK`)
    res.json({ ok: true, jobId })
  } catch (err) {
    log(`Job ${jobId} — ERROR: ${err.message}`)
    res.status(500).json({ ok: false, jobId, error: err.message })
  }
}

const cfg = () => getConfig()

// Tickets → ticketPrinter
app.post('/print/ticket',     (req, res) => handlePrint(renderTicketVenta,      cfg().ticketPrinter,   req.body, res))
app.post('/print/devolucion', (req, res) => handlePrint(renderTicketDevolucion, cfg().ticketPrinter,   req.body, res))
app.post('/print/cierre',     (req, res) => handlePrint(renderCierreCaja,       cfg().ticketPrinter,   req.body, res))
app.post('/print/vale',       (req, res) => handlePrint(renderValeCambio,       cfg().ticketPrinter,   req.body, res))

// Etiquetas → etiquetaPrinter (TSPL o ESC/POS según protocolo)
app.post('/print/etiqueta', async (req, res) => {
  const printerConfig = cfg().etiquetaPrinter
  const jobId = uuidv4()

  if (!printerConfig.name) {
    return res.status(400).json({ ok: false, jobId, error: 'Impresora de etiquetas no configurada.' })
  }

  const isTspl = (printerConfig.protocol || 'escpos') === 'tspl'
  log(`Job ${jobId} → ${printerConfig.name} [${isTspl ? 'TSPL2' : 'ESC/POS'}]`)

  try {
    if (isTspl) {
      await renderEtiquetaTspl(
        (tspl) => sendRawFileToPrinter(tspl, printerConfig.name, true),
        req.body
      )
    } else {
      const printer = createClient(printerConfig)
      await renderEtiqueta(printer, req.body)
      await printer.execute()
    }
    log(`Job ${jobId} — OK`)
    res.json({ ok: true, jobId })
  } catch (err) {
    log(`Job ${jobId} — ERROR: ${err.message}`)
    res.status(500).json({ ok: false, jobId, error: err.message })
  }
})

// Prueba tickets
app.post('/print/test/ticket', async (req, res) => {
  const { ticketPrinter } = cfg()
  if (!ticketPrinter.name) {
    return res.status(400).json({ ok: false, error: 'Impresora de tickets no configurada.' })
  }
  try {
    await testPrint(ticketPrinter)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Prueba etiquetas
app.post('/print/test/etiqueta', async (req, res) => {
  const { etiquetaPrinter } = cfg()
  if (!etiquetaPrinter.name) {
    return res.status(400).json({ ok: false, error: 'Impresora de etiquetas no configurada.' })
  }
  try {
    await testPrintEtiqueta(etiquetaPrinter)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Alias legacy /print/test → ticket
app.post('/print/test', async (req, res) => {
  const { ticketPrinter } = cfg()
  if (!ticketPrinter.name) {
    return res.status(400).json({ ok: false, error: 'Impresora de tickets no configurada.' })
  }
  try {
    await testPrint(ticketPrinter)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Arranque ──────────────────────────────────────────────────────────────────
const PORT = getConfig().port || 9100
app.listen(PORT, '127.0.0.1', () => {
  const c = getConfig()
  log(`CValle PrintBridge v${VERSION} corriendo en http://localhost:${PORT}`)
  log(`Ticket:   ${c.ticketPrinter.name   || '(no configurada)'}`)
  log(`Etiqueta: ${c.etiquetaPrinter.name || '(no configurada)'}`)
  if (!c.ticketPrinter.name || !c.etiquetaPrinter.name) {
    log('AVISO: Abrí http://localhost:' + PORT + ' para configurar las impresoras')
  }
})
