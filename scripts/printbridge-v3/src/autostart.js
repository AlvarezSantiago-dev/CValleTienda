'use strict'

const fs   = require('fs')
const path = require('path')
const os   = require('os')

const STARTUP_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
)
const SHORTCUT_PATH = path.join(STARTUP_DIR, 'CValle PrintBridge.bat')

function getServerBatPath() {
  // En modo pkg el ejecutable es el propio .exe; en desarrollo es start.bat
  if (process.pkg) return process.execPath
  return path.resolve(__dirname, '..', 'start.bat')
}

function isAutoStartEnabled() {
  return fs.existsSync(SHORTCUT_PATH)
}

function enableAutoStart() {
  const target  = getServerBatPath()
  const isPkg   = process.pkg
  const content = isPkg
    ? `@echo off\nstart /min "" "${target}"\n`
    : `@echo off\nstart /min "" cmd /c "${target}"\n`
  fs.writeFileSync(SHORTCUT_PATH, content, 'utf8')
}

function disableAutoStart() {
  if (fs.existsSync(SHORTCUT_PATH)) fs.unlinkSync(SHORTCUT_PATH)
}

module.exports = { isAutoStartEnabled, enableAutoStart, disableAutoStart }
