# CValle PrintBridge

Agente de impresión térmica local para CValleTienda. Recibe los tickets desde la app web y los envía directo a la impresora **sin diálogo**.

---

## Requisitos

- Windows 10 / 11
- Tu impresora térmica conectada (USB o red) con driver instalado
- Node.js 20+ instalado: https://nodejs.org (solo para instalación manual; el .exe incluye Node)

---

## Instalación (modo servicio Windows — recomendado)

1. **Descargar** la carpeta `printbridge` o el archivo `CValle-PrintBridge.exe`
2. **Clic derecho** en `instalar-servicio.bat` → **Ejecutar como administrador**
3. El instalador:
   - Instala dependencias automáticamente
   - Registra PrintBridge como servicio de Windows
   - Abre `http://localhost:9100` en el navegador
4. En el panel web:
   - Elegí tu impresora de la lista
   - Seleccioná el ancho de papel (58 / 76 / 80 mm)
   - Hacé clic en **Guardar configuración**
   - Hacé clic en **Imprimir ticket de prueba**

Listo. Desde ahora, PrintBridge arranca automáticamente cuando encendés la PC.

---

## Instalación manual (sin servicio)

```bat
cd printbridge
npm install
node src\server.js
```

Luego abrí http://localhost:9100 para configurar.

---

## Build — generar el .exe distribuible

Requiere tener `pkg` instalado globalmente:

```bash
npm install -g pkg
npm install
npm run build
```

El ejecutable queda en `dist/CValle-PrintBridge.exe` (~40MB, incluye Node.js).

---

## Cómo verifica que está funcionando

- Abrí `http://localhost:9100` en el navegador
- En la sección **Estado** debe aparecer en verde con el nombre de tu impresora
- En CValleTienda → Configuración debe aparecer el badge "PrintBridge conectado"

---

## Desinstalar

Clic derecho en `desinstalar-servicio.bat` → **Ejecutar como administrador**

---

## Troubleshooting

**La impresora no aparece en la lista**
- Verificá que el driver esté instalado (Panel de control → Dispositivos e impresoras)
- Hacé clic en "↺ Actualizar" en el panel de PrintBridge

**Error al imprimir: "printer not found"**
- El nombre de la impresora en PrintBridge debe coincidir exactamente con el que aparece en Windows
- Re-seleccioná la impresora del dropdown y guardá

**El servicio no arranca**
- Abrí el Administrador de Servicios de Windows (`services.msc`)
- Buscá "CValle PrintBridge" y hacé clic en Iniciar
- Si hay errores, revisá el log en `%APPDATA%\CVallePrintBridge\`

**Puerto 9100 ocupado**
- Otro programa usa ese puerto. Editá `%APPDATA%\CVallePrintBridge\config.json` y cambiá `"port"` por otro número (ej: 9101)
- Reiniciá el servicio

---

## Soporte

Contacto: [tu email de soporte]
