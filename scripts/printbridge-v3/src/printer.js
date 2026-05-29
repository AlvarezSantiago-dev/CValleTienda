'use strict'

const { exec } = require('child_process')
const fs   = require('fs')
const os   = require('os')
const path = require('path')
const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer')

const RAW_PRINT_PS1  = path.join(__dirname, 'raw-print.ps1')
const TSPL_PRINT_PS1 = path.join(__dirname, 'tspl-print.ps1')

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

function sendRawFileToPrinter(filePathOrContent, printerName, isContent = false) {
  return new Promise((resolve, reject) => {
    const doSend = (fp, useTsplPort = false) => {
      const safe   = printerName.replace(/"/g, '')
      const script = useTsplPort ? TSPL_PRINT_PS1 : RAW_PRINT_PS1
      const cmd    = `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -PrinterName "${safe}" -FilePath "${fp}"`
      exec(cmd, { timeout: 15000 }, (err, _stdout, stderr) => {
        if (err) { reject(new Error(stderr.trim() || err.message)); return }
        resolve()
      })
    }

    if (isContent) {
      // TSPL raw — escribe al puerto directo, bypaseando el driver GDI
      const tmpFile = path.join(os.tmpdir(), `cvalle_tspl_${Date.now()}.prn`)
      fs.writeFile(tmpFile, filePathOrContent, 'binary', (werr) => {
        if (werr) { reject(werr); return }
        doSend(tmpFile, true)   // <-- true = usar tspl-print.ps1 (direct port)
        setTimeout(() => fs.unlink(tmpFile, () => {}), 5000)
      })
    } else {
      doSend(filePathOrContent, false)
    }
  })
}

/**
 * @param {object} config - { name, paperWidthMm, autocut, characterSet, protocol }
 */
function createClient(config) {
  const isTspl     = (config.protocol || 'escpos') === 'tspl'
  const widthChars = config.paperWidthMm === 58 ? 42 : config.paperWidthMm === 76 ? 42 : 46
  const charSet    = CharacterSet[config.characterSet] ?? CharacterSet.PC858_EURO
  const printerType = isTspl ? PrinterTypes.TSC : PrinterTypes.EPSON

  const thermal = new ThermalPrinter({
    type:                    printerType,
    interface:               'tcp://127.0.0.1:65534',
    width:                   widthChars,
    characterSet:            charSet,
    removeSpecialCharacters: false,
    lineCharacter:           '-',
  })

  thermal.execute = async () => {
    const buffer = thermal.getBuffer()
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer vacío — nada que imprimir')
    }
    const tmpFile = path.join(os.tmpdir(), `cvalle_${Date.now()}.bin`)
    try {
      await fs.promises.writeFile(tmpFile, buffer)
      await sendRawFileToPrinter(tmpFile, config.name)
    } finally {
      fs.unlink(tmpFile, () => {})
    }
  }

  return thermal
}

async function isPrinterOnline(name) {
  if (!name) return false
  try {
    const printers = await listPrinters()
    return printers.some((p) => p.toLowerCase() === name.toLowerCase())
  } catch {
    return false
  }
}

async function testPrint(config) {
  const printer = createClient(config)
  const now = new Date().toLocaleString('es-AR')

  printer.alignCenter()
  printer.println('================================')
  printer.bold(true)
  printer.println('CValle PrintBridge v3')
  printer.bold(false)
  printer.println('--- Prueba TICKETS ---')
  printer.println('')
  printer.alignLeft()
  printer.println(`Fecha:     ${now}`)
  printer.println(`Impresora: ${config.name || '(sin nombre)'}`)
  printer.println(`Ancho:     ${config.paperWidthMm}mm`)
  printer.println('')
  printer.alignCenter()
  printer.println('Si ves este ticket, la impresora')
  printer.println('de tickets esta funcionando OK.')
  printer.println('================================')
  printer.println('')
  if (config.autocut) printer.cut()

  await printer.execute()
}

async function testPrintEtiqueta(config) {
  const isTspl = (config.protocol || 'escpos') === 'tspl'
  const now    = new Date().toLocaleString('es-AR')
  const w      = config.paperWidthMm || 50
  const h      = config.paperHeightMm || 25

  if (isTspl) {
    // Enviar TSPL2 directamente — evita problemas de traducción ESC/POS→TSPL
    const tspl = [
      `SIZE ${w} mm, ${h} mm`,
      'GAP 2 mm, 0 mm',
      'DIRECTION 1',
      'CLS',
      `TEXT 10,5,"3",0,1,1,"Prueba Etiqueta"`,
      `TEXT 10,25,"2",0,1,1,"Impresora: ${(config.name || '').replace(/"/g, '')}"`,
      `TEXT 10,45,"2",0,1,1,"Ancho: ${w}mm  Proto: TSPL2"`,
      `TEXT 10,65,"2",0,1,1,"Producto: Zapatilla Nike T42"`,
      `TEXT 10,85,"3",0,1,1,"$ 15.000,00"`,
      `BARCODE 10,110,"128",50,1,0,2,2,"7790001234567"`,
      'PRINT 1,1',
      '',
    ].join('\r\n')
    await sendRawFileToPrinter(tspl, config.name, true)
    return
  }

  // Fallback ESC/POS (si protocol = 'escpos')
  const printer = createClient(config)
  printer.alignCenter()
  printer.println('--- Prueba ETIQUETA ---')
  printer.println('')
  printer.alignLeft()
  printer.println(`Fecha:     ${now}`)
  printer.println(`Impresora: ${config.name || '(sin nombre)'}`)
  printer.println(`Ancho:     ${config.paperWidthMm}mm`)
  printer.println('Producto:  Zapatilla Nike')
  printer.println('Talla: 42  Color: Negro')
  printer.bold(true)
  printer.println('$ 15.000,00')
  printer.bold(false)
  printer.println('')
  if (config.autocut) printer.cut()
  await printer.execute()
}

module.exports = { listPrinters, createClient, isPrinterOnline, testPrint, testPrintEtiqueta, sendRawFileToPrinter }
