'use strict'

/**
 * Instala / desinstala CValle PrintBridge como servicio de Windows.
 * Uso: node service.js install | uninstall | status
 *
 * Requiere ejecutar como Administrador.
 */

const path = require('path')
const { Service } = require('node-windows')

// Ruta al server principal. En el .exe compilado con pkg, __dirname
// apunta a la carpeta del ejecutable.
const scriptPath = path.join(__dirname, 'server.js')

const svc = new Service({
  name: 'CValle PrintBridge',
  description: 'Agente de impresion termica local para CValleTienda',
  script: scriptPath,
  nodeOptions: [],
  // Reiniciar automáticamente si falla, hasta 3 veces en 60 segundos
  maxRestarts: 3,
  maxRetries: 3,
  wait: 2,
  grow: 0.5,
})

const cmd = process.argv[2]

svc.on('install', () => {
  console.log('[PrintBridge] Servicio instalado. Iniciando...')
  svc.start()
})

svc.on('start', () => {
  console.log('[PrintBridge] Servicio iniciado correctamente.')
  console.log('[PrintBridge] Abrí http://localhost:9100 para configurar la impresora.')
  process.exit(0)
})

svc.on('uninstall', () => {
  console.log('[PrintBridge] Servicio desinstalado correctamente.')
  process.exit(0)
})

svc.on('error', (err) => {
  console.error('[PrintBridge] Error:', err)
  process.exit(1)
})

if (cmd === 'install') {
  console.log('[PrintBridge] Instalando servicio de Windows...')
  svc.install()
} else if (cmd === 'uninstall') {
  console.log('[PrintBridge] Desinstalando servicio de Windows...')
  svc.uninstall()
} else if (cmd === 'status') {
  console.log('[PrintBridge] Existe como servicio:', svc.exists)
  process.exit(0)
} else {
  console.log('Uso: node service.js [install|uninstall|status]')
  console.log('')
  console.log('  install    Registra e inicia el servicio de Windows (requiere Admin)')
  console.log('  uninstall  Detiene y elimina el servicio de Windows (requiere Admin)')
  console.log('  status     Muestra si el servicio está registrado')
  process.exit(1)
}
