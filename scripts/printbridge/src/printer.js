'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer')

// Ruta al script PowerShell de impresión RAW (sin módulo nativo)
const RAW_PRINT_PS1 = path.join(__dirname, '..', 'raw-print.ps1')

/**
 * Lista las impresoras instaladas en Windows.
 * Intenta PowerShell primero (Win10/11), cae a WMIC como fallback.
 * @returns {Promise<string[]>}
 */
function listPrinters() {
  return new Promise((resolve) => {
    const psCmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"'
    exec(psCmd, (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        const names = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        if (names.length > 0) {
          resolve(names)
          return
        }
      }
      // Fallback: WMIC (Windows 7/8/10 más viejos)
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

/**
 * Envía un archivo binario como trabajo RAW a una impresora Windows
 * usando la Win32 API (winspool.drv) via PowerShell — sin módulo nativo.
 * @param {string} filePath  Ruta al archivo binario ESC/POS
 * @param {string} printerName  Nombre de la impresora Windows
 * @returns {Promise<void>}
 */
function sendRawFileToPrinter(filePath, printerName) {
  return new Promise((resolve, reject) => {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${RAW_PRINT_PS1}" -PrinterName "${printerName.replace(/"/g, '')}" -FilePath "${filePath}"`
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message))
        return
      }
      resolve()
    })
  })
}

/**
 * Crea un cliente ThermalPrinter que genera ESC/POS en buffer.
 * execute() escribe el buffer a un archivo temp y lo envía vía PowerShell RAW.
 * No requiere ningún módulo nativo (@thiagoelg/node-printer, etc.)
 * @param {object} config
 * @returns {ThermalPrinter}
 */
function createClient(config) {
  // Caracteres por línea:
  //   58mm + Font B → 42 chars (Font B ~9 dots/char, área ~384 dots)
  //   76mm + Font A → 42 chars (ya funcionaba)
  //   80mm + Font A → 46 chars (margen de seguridad: área imprimible real ≈ 46, no 48)
  const widthChars = config.paperWidthMm === 58 ? 42 : config.paperWidthMm === 76 ? 42 : 46
  const charSet = CharacterSet[config.characterSet] ?? CharacterSet.PC858_EURO

  // Usamos tcp: como interfaz dummy — nunca se conecta porque sobreescribimos execute()
  const thermal = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'tcp://127.0.0.1:65534',
    width: widthChars,
    characterSet: charSet,
    removeSpecialCharacters: false,
    lineCharacter: '-',
  })

  // Sobreescribir execute(): obtener buffer → escribir temp file → enviar RAW via PS1
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
      fs.unlink(tmpFile, () => { /* ignorar error de cleanup */ })
    }
  }

  // Sobreescribir isPrinterConnected(): verificar via listPrinters()
  thermal.isPrinterConnected = async () => {
    const printers = await listPrinters()
    return printers.some((p) => p.toLowerCase() === config.printerName.toLowerCase())
  }

  return thermal
}

/**
 * Verifica si la impresora configurada está instalada en Windows.
 * @param {object} config
 * @returns {Promise<boolean>}
 */
async function isPrinterOnline(config) {
  if (!config.printerName) return false
  try {
    const printers = await listPrinters()
    return printers.some((p) => p.toLowerCase() === config.printerName.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Imprime un ticket de prueba.
 * @param {object} config
 */
async function testPrint(config) {
  const printer = createClient(config)
  const now = new Date().toLocaleString('es-AR')

  printer.alignCenter()
  printer.println('================================')
  printer.bold(true)
  printer.println('CValle PrintBridge')
  printer.bold(false)
  printer.println('--- Ticket de Prueba ---')
  printer.println('')
  printer.alignLeft()
  printer.println(`Fecha: ${now}`)
  printer.println(`Impresora: ${config.printerName || '(sin nombre)'}`)
  printer.println(`Ancho: ${config.paperWidthMm}mm`)
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
