# Plan: PrintBridge — Agente de Impresión Profesional

**Creado:** 2026-05-27
**Estado:** Borrador
**Pedido:** Construir un agente local (CValle PrintBridge) que corra en la PC de caja, reciba órdenes de impresión desde la web app y las envíe directo a la impresora térmica sin diálogo, empaquetado como .exe con instalador silencioso.

---

## Descripción General

### Qué Logra Este Plan

Un pequeño servidor HTTP local (`localhost:9100`) compilado como `.exe` que se registra como servicio de Windows, arranca automáticamente al encender la PC, recibe el payload JSON del ticket desde CValleTienda y lo convierte a comandos ESC/POS enviados directo a la impresora térmica — sin diálogo de impresión, sin que el usuario tenga que hacer nada. La web app detecta automáticamente si PrintBridge está disponible y lo usa; si no, cae al `window.print()` actual como fallback.

### Por Qué Importa

El flujo actual con `window.print()` requiere que cada cliente configure manualmente el tamaño de papel, márgenes y elija la impresora en un diálogo que aparece en cada venta. Esto es inaceptable en un SaaS de POS. PrintBridge elimina toda esa fricción: el cliente lo instala una sola vez, elige su impresora y nunca más toca nada.

---

## Estado Actual

### Estructura Existente Relevante

- `app/lib/impresion/usePrint.tsx` — Hook que orquesta `window.print()`. Es el único punto de integración a modificar.
- `app/lib/impresion/types.ts` — `PayloadTicketVenta`, `PayloadTicketDevolucion`, `PayloadCierreCaja`, `PayloadEtiquetaProducto`. Son los contratos de datos.
- `app/components/impresion/TicketVentaRenderer.tsx` — Renderiza el ticket como JSX. El renderer ESC/POS del agente tomará el mismo payload.
- `app/app/(dashboard)/configuracion/` — Sección de configuración de la tienda donde se agregará el panel de estado de PrintBridge.
- `app/components/configuracion/DatosTiendaForm.tsx` — Tiene el campo `ancho_ticket_mm` con opciones 58/76/80mm.
- `supabase/migrations/20260419000007_configuracion.sql` — Constraint `check (ancho_ticket_mm in (58, 80))` que excluye 76mm (bug).
- `scripts/` — Directorio donde vivirá el agente.

### Brechas o Problemas que se Abordan

1. **Diálogo de impresión en cada venta.** Rompe el flujo del cajero. PrintBridge lo elimina.
2. **Configuración manual de papel.** El cliente tiene que saber que 80mm = papel personalizado. Con PrintBridge, el agente ya sabe el ancho.
3. **Dependencia del OS para el tamaño de papel.** El agente formatea el ticket directamente en ESC/POS al ancho correcto.
4. **Bug 76mm.** El form ofrece 76mm pero el constraint SQL solo acepta 58 y 80. Se corrige en esta iteración.
5. **Sin feedback de error de impresión.** Si la impresora está offline, el sistema no lo sabe. El agente devuelve HTTP 4xx/5xx con mensaje claro.

---

## Cambios Propuestos

### Resumen de Cambios

- **Nuevo proyecto `scripts/printbridge/`**: servidor Node.js Express compilado con `pkg` → un único `CValle-PrintBridge.exe`. Se registra como servicio de Windows con `node-windows`. Tiene UI de config en `localhost:9100`.
- **API HTTP del agente**: endpoints para listar impresoras, configurar, imprimir ticket/devolución/cierre/etiqueta, verificar estado.
- **Renderer ESC/POS en Node.js**: convierte el mismo payload JSON que usa la web app a comandos `node-thermal-printer`.
- **Integración en `usePrint.tsx`**: antes de `window.print()`, intenta POST a `localhost:9100/print`. Si responde 200, listo. Si no disponible (ECONNREFUSED), fallback silencioso a `window.print()`.
- **Panel de estado en Configuración**: badge "PrintBridge conectado / desconectado" con link a `localhost:9100` para configurar.
- **Migración SQL aditiva**: corrige el constraint de `ancho_ticket_mm` para incluir 76.
- **Batch de instalación**: `instalar-servicio.bat` y `desinstalar-servicio.bat` (correr como administrador).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `scripts/printbridge/package.json` | Dependencias del agente: express, node-thermal-printer, node-windows, cors, pkg |
| `scripts/printbridge/src/server.js` | Servidor Express. Monta todas las rutas, sirve la UI, gestiona CORS |
| `scripts/printbridge/src/printer.js` | Abstracción de la impresora: listar impresoras disponibles (Windows), crear cliente `node-thermal-printer`, enviar trabajo |
| `scripts/printbridge/src/renderer.js` | Convierte `PayloadTicketVenta / Devolucion / CierreCaja / Etiqueta` → comandos ESC/POS usando `ThermalPrinter` |
| `scripts/printbridge/src/config.js` | Lee/escribe `config.json` en `%APPDATA%\CVallePrintBridge\`. Campos: `printerName`, `paperWidthMm`, `allowedOrigins`, `port` |
| `scripts/printbridge/src/service.js` | Script separado: instala/desinstala el servicio de Windows con `node-windows` |
| `scripts/printbridge/public/index.html` | UI de configuración: selección de impresora (dropdown con las detectadas), ancho de papel, test de impresión, estado del servicio |
| `scripts/printbridge/public/style.css` | Estilos mínimos de la UI de configuración (branding CValle) |
| `scripts/printbridge/instalar-servicio.bat` | Bat que corre `node service.js install` como admin. Doble clic para instalar |
| `scripts/printbridge/desinstalar-servicio.bat` | Bat que corre `node service.js uninstall` como admin |
| `scripts/printbridge/README.md` | Guía de instalación para dar al cliente |
| `supabase/migrations/20260527000001_fix_ancho_ticket_76mm.sql` | Migración que elimina el constraint viejo y crea uno nuevo incluyendo 76 |
| `app/components/configuracion/PrintBridgeStatus.tsx` | Componente cliente que hace fetch a `localhost:9100/status` y muestra badge con estado y link de config |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/lib/impresion/usePrint.tsx` | Agregar función `tryPrintBridge(payload, tipo)` que intenta POST a `localhost:9100/print/{tipo}`. Si falla (ECONNREFUSED o timeout 500ms), retorna `false` y el hook cae al `window.print()` actual. Si éxito, retorna `true` y no llama `window.print()` |
| `app/components/configuracion/DatosTiendaForm.tsx` | Agregar sección "PrintBridge" debajo de la sección de impresora que renderiza `<PrintBridgeStatus />` |
| `app/app/actions/configuracion.ts` | Ampliar validación `ancho_ticket_mm` para aceptar también `76` (además de 58 y 80) |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Node.js + `node-thermal-printer` (no Electron).** Electron suma ~150MB al instalador solo para el tray. Para un servicio de fondo sin UI compleja, Node.js compilado con `pkg` da un `.exe` de ~40MB con todo incluido. La UI de configuración se sirve como página web en `localhost:9100` — el cliente la abre desde el navegador, es familiar y no asusta.

2. **Servicio de Windows vía `node-windows`, no proceso de tray.** Un servicio de Windows arranca antes del login, sobrevive a crashes y el cliente lo ve en `services.msc` como "CValle PrintBridge". Esto es lo que hace cualquier software profesional (QZ Tray, PrintNode, etc). El "ícono en bandeja" se puede agregar en una fase 2 sin cambiar la arquitectura.

3. **Comunicación por HTTP local, no WebSocket.** El payload ya existe como JSON. Un POST simple es más fácil de depurar, tiene herramientas (Postman, curl) y no requiere reconexión automática. El agente responde en < 200ms desde localhost.

4. **ESC/POS directo, no re-renderizado HTML.** El agente replica la lógica del `TicketVentaRenderer.tsx` pero en ESC/POS. Esto significa que la impresión es instantánea (~50ms), no depende de un browser headless ni de Puppeteer, y funciona con cualquier impresora ESC/POS estándar (el 95% del mercado térmico).

5. **Fallback transparente a `window.print()`.** Si el cliente no tiene PrintBridge instalado, todo sigue funcionando exactamente como hoy. La integración es aditiva, no rompe nada.

6. **CORS restringido al origen de la app.** El agente solo acepta requests de `https://cvalle.vercel.app` (o el dominio configurado) más `localhost` para desarrollo. Esto evita que cualquier web en el navegador del cliente pueda controlar la impresora.

7. **Config en `%APPDATA%\CVallePrintBridge\config.json`.** Persiste entre actualizaciones del agente. El cliente no pierde la configuración al actualizar.

8. **`pkg` con Node 20.** Genera un `.exe` standalone para Windows x64. No requiere que el cliente tenga Node instalado. El `.exe` se puede firmar con un certificado de código (Windows SmartScreen) en fase 2.

### Alternativas Consideradas

- **Electron con tray icon**: demasiado pesado (150MB+) y complejo para lo que se necesita.
- **Extensión de Chrome**: solo funciona en Chrome, requiere Chrome Web Store (USD 5), no funciona en Edge/Firefox.
- **QZ Tray**: software existente, pero tiene licencia comercial y es Java (pesado). No tiene branding de CValle.
- **ESC/POS directo vía TCP desde la web app**: muchas impresoras tienen puerto 9100 TCP, pero CORS y seguridad del browser bloquean conexiones TCP desde JavaScript.
- **Re-renderizado HTML con Puppeteer**: genera el ticket idéntico al web, pero Puppeteer son 300MB adicionales y el proceso es más lento.

### Preguntas Abiertas

1. **¿Firmado de código?** Windows SmartScreen muestra advertencia "ejecutable desconocido" sin un certificado de firma de código (EV Code Signing, ~$300/año). Para el MVP y clientes de confianza esto no es un problema. ¿Querés contemplarlo ya o en fase 2?
2. **¿Auto-update?** ¿El agente debe actualizarse solo o el cliente lo re-descarga manualmente cuando hay nueva versión? Recomiendo `check + notificación` automático, pero lo deja para fase 2.
3. **¿Impresoras de red (TCP/IP) además de USB?** `node-thermal-printer` soporta ambas. La UI de configuración puede tener "Modo: USB (Windows driver) / Red (IP:puerto)". ¿Lo incluimos en V1?

---

## Tareas Paso a Paso

### Paso 1: Migración SQL — fix constraint 76mm

Crear la migración aditiva que corrija el constraint de `ancho_ticket_mm` en la tabla `configuracion_tienda`.

**Acciones:**
- Crear `supabase/migrations/20260527000001_fix_ancho_ticket_76mm.sql`
- Eliminar el constraint viejo `config_ancho_ticket_check`
- Crear constraint nuevo: `check (ancho_ticket_mm in (58, 76, 80))`
- Actualizar validación en `app/app/actions/configuracion.ts` línea 62: `if (![58, 76, 80].includes(input.ancho_ticket_mm))`

**Archivos afectados:**
- `supabase/migrations/20260527000001_fix_ancho_ticket_76mm.sql` (nuevo)
- `app/app/actions/configuracion.ts`

---

### Paso 2: Inicializar proyecto PrintBridge

Crear la estructura base del agente Node.js.

**Acciones:**
- Crear directorio `scripts/printbridge/`
- Crear `package.json` con dependencias:
  - `express` ^4.x — servidor HTTP
  - `cors` ^2.x — CORS configurable
  - `node-thermal-printer` ^4.x — ESC/POS
  - `node-windows` ^1.x — Windows service
  - `uuid` ^9.x — IDs de trabajo
- Scripts: `"start": "node src/server.js"`, `"install-service": "node src/service.js install"`, `"uninstall-service": "node src/service.js uninstall"`
- `pkg` config en `package.json`: `"pkg": { "targets": ["node20-win-x64"], "assets": ["public/**/*"] }`
- Ejecutar `npm install` en `scripts/printbridge/`

**Archivos afectados:**
- `scripts/printbridge/package.json` (nuevo)

---

### Paso 3: Módulo de configuración (`config.js`)

Gestión de la config persistente del agente.

**Acciones:**
- Crear `scripts/printbridge/src/config.js`
- Usar `os.homedir()` + `APPDATA` para la ruta de config: `C:\Users\{user}\AppData\Roaming\CVallePrintBridge\config.json`
- Crear directorio si no existe (`fs.mkdirSync` con `recursive: true`)
- Estructura del config:
```json
{
  "printerName": "",
  "paperWidthMm": 80,
  "port": 9100,
  "allowedOrigins": ["https://app.cvalletienda.com", "http://localhost:3000"],
  "autocut": true,
  "characterSet": "PC858_EURO"
}
```
- Exponer `getConfig()`, `setConfig(partial)`, `resetConfig()`

**Archivos afectados:**
- `scripts/printbridge/src/config.js` (nuevo)

---

### Paso 4: Módulo de impresora (`printer.js`)

Abstracción para listar impresoras disponibles en Windows y crear el cliente ESC/POS.

**Acciones:**
- Crear `scripts/printbridge/src/printer.js`
- `listPrinters()`: usa `node-thermal-printer` con `getPrinterList()` o `exec('wmic printer get name')` para obtener nombres de impresoras del sistema. Devuelve array de strings.
- `createClient(config)`: instancia `ThermalPrinter` con `{ type: PrinterTypes.EPSON, interface: 'printer:' + config.printerName, width: config.paperWidthMm === 58 ? 32 : 48, characterSet: config.characterSet }`
- `testPrint(config)`: imprime un ticket de prueba con texto "CValle PrintBridge - OK" + fecha y hora.
- Exportar `{ listPrinters, createClient, testPrint }`

**Archivos afectados:**
- `scripts/printbridge/src/printer.js` (nuevo)

---

### Paso 5: Renderer ESC/POS (`renderer.js`)

Convierte los payloads JSON a comandos ESC/POS. Réplica en Node.js de la lógica de `TicketVentaRenderer.tsx`.

**Acciones:**
- Crear `scripts/printbridge/src/renderer.js`
- Función `renderTicketVenta(printer, payload)`:
  - `printer.alignCenter()`
  - Nombre tienda en bold grande
  - CUIT, condición IVA, dirección, texto_encabezado
  - Separador `---`
  - Número ticket + fecha (alineados)
  - Vendedor, cliente si existen
  - Separador
  - Tabla de líneas: cantidad × nombre / precio c/u / total_linea (con `printer.tableCustom`)
  - Separador
  - Subtotal, descuento, TOTAL (bold)
  - Separador
  - Pagos detallados
  - Observaciones si existen
  - Texto_pie
  - "¡Gracias por tu compra!"
  - `printer.cut()` si `config.autocut`
- Función `renderTicketDevolucion(printer, payload)` — similar con datos de devolución
- Función `renderCierreCaja(printer, payload)` — con totales, efectivo, por cuenta
- Función `renderEtiqueta(printer, payload)` — nombre, precio, código, barcode si corresponde
- Exportar `{ renderTicketVenta, renderTicketDevolucion, renderCierreCaja, renderEtiqueta }`

**Archivos afectados:**
- `scripts/printbridge/src/renderer.js` (nuevo)

---

### Paso 6: Servidor HTTP (`server.js`)

El núcleo del agente. Express con todos los endpoints.

**Acciones:**
- Crear `scripts/printbridge/src/server.js`
- Configurar CORS dinámico desde `config.allowedOrigins`
- Endpoints:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/status` | `{ ok: true, version, printerName, paperWidthMm, printerOnline }` |
| `GET` | `/printers` | Lista de impresoras del sistema |
| `GET` | `/config` | Config actual (sin datos sensibles) |
| `POST` | `/config` | Actualiza config. Body: `{ printerName, paperWidthMm, autocut, allowedOrigins }` |
| `POST` | `/print/ticket` | Body: `PayloadTicketVenta`. Imprime y responde `{ ok, jobId }` |
| `POST` | `/print/devolucion` | Body: `PayloadTicketDevolucion` |
| `POST` | `/print/cierre` | Body: `PayloadCierreCaja` |
| `POST` | `/print/etiqueta` | Body: `PayloadEtiquetaProducto` |
| `POST` | `/print/test` | Imprime ticket de prueba |
| `GET` | `/` | Sirve `public/index.html` |
| `GET` | `/style.css` | Sirve `public/style.css` |

- Todos los endpoints de print: crean cliente, llaman renderer, ejecutan `printer.execute()`, manejan errores y devuelven `{ ok: false, error: mensaje }` con HTTP 500 si falla.
- Escuchar solo en `127.0.0.1` (NO en `0.0.0.0`) por seguridad.
- Puerto configurable, default 9100.
- Log de cada trabajo con timestamp en consola.

**Archivos afectados:**
- `scripts/printbridge/src/server.js` (nuevo)

---

### Paso 7: UI de configuración web

Página HTML servida por el agente para que el cliente configure su impresora.

**Acciones:**
- Crear `scripts/printbridge/public/index.html`
- Secciones:
  1. **Header**: Logo/nombre "CValle PrintBridge" + versión + badge verde "Activo"
  2. **Estado actual**: nombre de impresora configurada, ancho de papel, estado conexión
  3. **Configurar impresora**: `<select>` que se llena con `GET /printers`, selector de ancho (58/76/80mm), checkbox autocut, botón "Guardar"
  4. **Test**: botón "Imprimir ticket de prueba" que llama `POST /print/test`
  5. **Orígenes permitidos**: textarea con una URL por línea
  6. **Footer**: instrucciones rápidas, link a soporte CValle
- Todo en vanilla HTML/CSS/JS (sin frameworks). ~150 líneas.
- Crear `scripts/printbridge/public/style.css` con colores de CValle (lima/verde).

**Archivos afectados:**
- `scripts/printbridge/public/index.html` (nuevo)
- `scripts/printbridge/public/style.css` (nuevo)

---

### Paso 8: Instalador de servicio Windows (`service.js`)

Script que registra/des-registra el agente como servicio de Windows.

**Acciones:**
- Crear `scripts/printbridge/src/service.js`
- Usar `node-windows` `Service` class
- Configuración del servicio:
  - `name: 'CValle PrintBridge'`
  - `description: 'Agente de impresión térmica para CValleTienda'`
  - `script`: ruta al `server.js` (o al .exe compilado)
  - `nodeOptions: ['--harmony']`
- `node service.js install` → instala y arranca el servicio
- `node service.js uninstall` → detiene y desinstala
- `node service.js status` → muestra si está corriendo
- Crear `instalar-servicio.bat`:
```bat
@echo off
echo Instalando CValle PrintBridge como servicio de Windows...
node src\service.js install
echo Listo. Abriendo configuracion en el navegador...
timeout /t 3
start http://localhost:9100
```
- Crear `desinstalar-servicio.bat` análogo.

**Archivos afectados:**
- `scripts/printbridge/src/service.js` (nuevo)
- `scripts/printbridge/instalar-servicio.bat` (nuevo)
- `scripts/printbridge/desinstalar-servicio.bat` (nuevo)

---

### Paso 9: Comando `pkg` para generar el .exe

Configurar el build que genera el ejecutable distribuible.

**Acciones:**
- En `package.json` agregar campo `pkg`:
```json
"pkg": {
  "scripts": "src/**/*.js",
  "assets": ["public/**/*"],
  "targets": ["node20-win-x64"],
  "outputPath": "dist"
}
```
- Agregar script `"build": "pkg . --compress GZip"`
- El output es `dist/CValle-PrintBridge.exe` (~40MB)
- Agregar `dist/` al `.gitignore` del proyecto (no commitear el .exe)
- Documentar en README.md el proceso de build

**Archivos afectados:**
- `scripts/printbridge/package.json`
- `scripts/printbridge/README.md` (nuevo)
- `.gitignore` (o `scripts/printbridge/.gitignore`)

---

### Paso 10: Integración en `usePrint.tsx`

Modificar el hook de impresión para detectar y usar PrintBridge automáticamente.

**Acciones:**
- Agregar función `tryPrintBridge` en el módulo (fuera del hook, nivel módulo):
```typescript
async function tryPrintBridge(
  tipo: 'ticket' | 'devolucion' | 'cierre' | 'etiqueta',
  payload: unknown
): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:9100/print/${tipo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000), // 3s max
    })
    return res.ok
  } catch {
    return false // ECONNREFUSED o timeout → PrintBridge no disponible
  }
}
```
- En el hook `usePrint`, exponer una nueva función `imprimirConPayload(tipo, payload)`:
  1. Llama `tryPrintBridge(tipo, payload)`
  2. Si `true`: solo llama `onDone()` (impresión exitosa, sin diálogo)
  3. Si `false`: cae al flujo actual (`window.print()`)
- La función `imprimir(jsx)` existente **no cambia** — sigue siendo el fallback limpio.
- No usar `imprimirConPayload` para etiquetas en formato A4 (esas tienen layout complejo, mejor `window.print()`).

**Archivos afectados:**
- `app/lib/impresion/usePrint.tsx`

---

### Paso 11: Panel de estado en Configuración

Mostrar si PrintBridge está activo en la página de configuración de la tienda.

**Acciones:**
- Crear `app/components/configuracion/PrintBridgeStatus.tsx` (Client Component)
- En `useEffect`: `fetch('http://localhost:9100/status', { signal: AbortSignal.timeout(2000) })`
- Si responde: badge verde "PrintBridge conectado — {printerName}" + botón "Configurar" que abre `localhost:9100` en nueva pestaña
- Si no responde: badge gris "PrintBridge no detectado" + link a instrucciones de descarga
- Agregar `<PrintBridgeStatus />` en `DatosTiendaForm.tsx`, en la sección de impresora, debajo del campo "Nombre de la impresora"

**Archivos afectados:**
- `app/components/configuracion/PrintBridgeStatus.tsx` (nuevo)
- `app/components/configuracion/DatosTiendaForm.tsx`

---

### Paso 12: Documentación para el cliente (`README.md`)

Guía de instalación para entregar al cliente.

**Acciones:**
- Crear `scripts/printbridge/README.md` con:
  1. Requisitos (Windows 10/11, impresora con driver instalado)
  2. Pasos de instalación (descargar .exe → doble clic en `instalar-servicio.bat` → abre navegador en `localhost:9100` → elegir impresora → guardar → imprimir test)
  3. Cómo verificar que está funcionando
  4. Cómo desinstalar
  5. Troubleshooting: "La impresora no aparece en la lista" / "Error al imprimir"
  6. Contacto de soporte

**Archivos afectados:**
- `scripts/printbridge/README.md` (nuevo)

---

### Paso 13: Validación end-to-end

Probar el flujo completo antes de declararlo listo.

**Acciones:**
- Correr `node src/server.js` localmente (sin compilar)
- Abrir `http://localhost:9100` → verificar UI de config
- `GET /printers` → verificar que lista las impresoras del sistema
- Configurar impresora y hacer `POST /print/test` → verificar impresión física
- Desde la web app en desarrollo (`localhost:3000`), confirmar una venta → verificar que llega a PrintBridge sin diálogo
- Desconectar impresora → confirmar que el error llega como `{ ok: false, error: '...' }` y la web app muestra mensaje útil
- Compilar con `pkg`: `npm run build` → ejecutar `dist/CValle-PrintBridge.exe` → repetir test
- Instalar como servicio con `instalar-servicio.bat`, reiniciar PC → verificar que arranca solo

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/ventas/PrintButtonClient.tsx` — usa `usePrint`. En fase 2 puede pasar el payload directamente a `imprimirConPayload`.
- `app/app/(dashboard)/imprimir/EstacionImpresion.tsx` — si existe, también puede integrar PrintBridge.
- `app/app/(dashboard)/configuracion/page.tsx` — renderiza `DatosTiendaForm` que incluirá `PrintBridgeStatus`.

### Actualizaciones Necesarias para Consistencia

- `contexto/proyectos.md` → agregar "CValle PrintBridge" como módulo implementado una vez completo.
- `CLAUDE.md` → no requiere cambios estructurales, el agente vive en `scripts/`.

### Impacto en Flujos de Trabajo Existentes

- **Flujo actual no se rompe.** `usePrint` sigue funcionando igual si PrintBridge no está activo.
- **Clientes sin PrintBridge** siguen usando `window.print()` exactamente como hoy.
- **Clientes con PrintBridge** no ven ningún diálogo — impresión silenciosa y automática.

---

## Lista de Validación

- [ ] Migración SQL ejecutada y constraint acepta 58, 76 y 80mm
- [ ] `npm install` en `scripts/printbridge/` sin errores
- [ ] `node src/server.js` levanta en `localhost:9100`
- [ ] `GET /printers` retorna lista de impresoras del sistema
- [ ] UI de configuración (`localhost:9100`) carga y permite seleccionar impresora
- [ ] `POST /print/test` imprime ticket físico correctamente (en 58 Y en 80mm)
- [ ] `POST /print/ticket` con payload real de venta imprime ticket correcto
- [ ] Web app detecta PrintBridge automáticamente (`usePrint` con `imprimirConPayload`)
- [ ] Sin PrintBridge activo, `window.print()` sigue funcionando (fallback)
- [ ] Panel `PrintBridgeStatus` muestra badge correcto en conectado y desconectado
- [ ] `pkg` genera `CValle-PrintBridge.exe` funcional
- [ ] `instalar-servicio.bat` registra el servicio en Windows
- [ ] El servicio arranca automáticamente tras reinicio del sistema
- [ ] Error de impresora offline llega correctamente a la web app

---

## Criterios de Éxito

- Un cajero puede confirmar una venta y el ticket sale impreso en la térmica **sin ningún clic adicional**.
- La instalación en una PC nueva toma **menos de 5 minutos**: descargar .exe, doble clic en `instalar-servicio.bat`, elegir impresora en el navegador, imprimir test.
- El cliente **nunca** tiene que configurar tamaño de papel, márgenes ni elegir impresora en el diálogo del browser.
- Si la impresora se desconecta, la web app muestra un mensaje de error claro (no queda en silencio).
