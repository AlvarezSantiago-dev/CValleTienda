'use strict'

const { exec } = require('child_process')
const fs   = require('fs')
const os   = require('os')
const path = require('path')
const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer')

// La ruta al script PS1 es inyectada por main.js de Electron antes de arrancar el servidor.
// En modo empaquetado (app.isPackaged) apunta a process.resourcesPath\raw-print.ps1.
// En modo desarrollo apunta a src/../raw-print.ps1.
// main.js setea: process.env.RAW_PRINT_PS1 = <ruta resuelta>
const RAW_PRINT_PS1 = process.env.RAW_PRINT_PS1
  || path.join(__dirname, '..', 'src', 'raw-print.ps1')

function listPrinters() {
  return new Promise((resolve) => {
    const psCmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"'
    exec(psCmd, (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        const names = stdout.split('\n').map((l) => l.trim()).filter(Boolean)
        if (names.length > 0) { resolve(names); return }
      }
      // Fallback: WMIC (Windows 7/8)
      exec('wmic printer get name', (err2, stdout2) => {
        if (err2) { resolve([]); return }
        const names = stdout2
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && l.toLowerCase() !== 'name')
          .filter(Boolean)
        resolve(names)
      })
    })
  })
}

function sendRawFileToPrinter(filePath, printerName) {
  return new Promise((resolve, reject) => {
    const safe = printerName.replace(/"/g, '')
    const cmd  = `powershell -NoProfile -ExecutionPolicy Bypass -File "${RAW_PRINT_PS1}" -PrinterName "${safe}" -FilePath "${filePath}"`
    exec(cmd, { timeout: 15000 }, (err, _stdout, stderr) => {
      if (err) { reject(new Error(stderr.trim() || err.message)); return }
      resolve()
    })
  })
}

function createClient(config) {
  const widthChars = config.paperWidthMm === 58 ? 42 : config.paperWidthMm === 76 ? 42 : 46
  const charSet    = CharacterSet[config.characterSet] ?? CharacterSet.PC858_EURO

  const thermal = new ThermalPrinter({
    type:                   PrinterTypes.EPSON,
    interface:              'tcp://127.0.0.1:65534',
    width:                  widthChars,
    characterSet:           charSet,
    removeSpecialCharacters: false,
    lineCharacter:          '-',
  })

  thermal.execute = async () => {
    const buffer = thermal.getBuffer()
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer ESC/POS vacío — no hay nada que imprimir')
    }
    const tmpFile = path.join(os.tmpdir(), `cvalle_${Date.now()}.bin`)
    try {
      await fs.promises.writeFile(tmpFile, buffer)
      await sendRawFileToPrinter(tmpFile, config.printerName)
    } finally {
      fs.unlink(tmpFile, () => {})
    }
  }

  thermal.isPrinterConnected = async () => {
    const printers = await listPrinters()
    return printers.some((p) => p.toLowerCase() === config.printerName.toLowerCase())
  }

  return thermal
}

async function isPrinterOnline(config) {
  if (!config.printerName) return false
  try {
    const printers = await listPrinters()
    return printers.some((p) => p.toLowerCase() === config.printerName.toLowerCase())
  } catch {
    return false
  }
}

async function testPrint(config) {
  const printer = createClient(config)
  const now     = new Date().toLocaleString('es-AR')

  printer.alignCenter()
  printer.println('================================')
  printer.bold(true)
  printer.println('CValle PrintBridge v2')
  printer.bold(false)
  printer.println('--- Ticket de Prueba ---')
  printer.println('')
  printer.alignLeft()
  printer.println(`Fecha:     ${now}`)
  printer.println(`Impresora: ${config.printerName || '(sin nombre)'}`)
  printer.println(`Ancho:     ${config.paperWidthMm}mm`)
  printer.println('')
  printer.alignCenter()
  printer.println('Si ves este ticket, el agente')
  printer.println('esta funcionando correctamente.')
  printer.println('================================')
  printer.println('')
  if (config.autocut) printer.cut()

  await printer.execute()
}

module.exports = { listPrinters, createClient, isPrinterOnline, testPrint }
