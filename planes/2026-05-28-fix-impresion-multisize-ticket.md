# Plan: Fix impresión multi-tamaño ticket (58mm / 76mm / 80mm)

**Creado:** 2026-05-28  
**Estado:** Borrador  
**Pedido:** Los tickets de 80mm se cortan levemente a la derecha. Los de 58mm salen todo encimado y corrido. Quiero que cada tamaño de papel use tipografía adaptada para que todo entre correctamente.

---

## Descripción General

El sistema tiene tres tamaños de papel térmico: 58mm, 76mm y 80mm. El 76mm funciona bien. Los otros dos tienen problemas específicos de layout que provienen de configuraciones de ancho incorrectas y falta de Font B para el papel angosto.

### Causas raíz identificadas

**80mm (corta levemente):**
- `widthChars = 48` pero la mayoría de las impresoras térmicas de 80mm tienen área imprimible efectiva de **46 chars** (no 48). Resultado: `printRow` calcula leftW=27 + rightW=21 = 48 chars → los últimos 2 chars del precio se van fuera del margen físico.

**58mm (todo encimado):**
- Con `widthChars = 32`, `printRow` asigna `leftW = 18` para la columna de precio unitario.
- `"   $ 100.000,00 c/u"` = 19 chars → desborda en 1 char → se come el precio de la derecha.
- Nombres de producto largos (46+ chars) producen 2-3 líneas de wrap haciendo los items ilegibles.
- **Solución**: Font B (ESC/POS `ESC M 1`) → letra más chica → efectivamente **42 chars** por línea en papel de 58mm, igual que 76mm en Font A.

**Todos los tamaños:**
- `printer.newLine()` appenda `CTL_LF` directo al buffer. En algunas impresoras Epson-compatibles en modo buffer esto imprime el carácter "0". Debe reemplazarse con `printer.println('')`.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `scripts/printbridge/src/printer.js` | `widthChars` 80mm → 46; 58mm → 42 + Font B |
| `scripts/printbridge/src/renderer.js` | `newLine()` → `println('')`; activar Font B para 58mm al inicio de render |

**No se modifica nada en la app Next.js.** El ancho sigue viniendo de `payload.tienda.ancho_mm` (DB).

---

## Tareas

### T1 — Fix `printer.newLine()` → `printer.println('')` en renderer.js

Hay 2 ocurrencias en `renderTicketVenta` (bloque de datos del ticket, antes y después del número/fecha/vendedor). Reemplazar ambas.

```javascript
// ANTES
printer.newLine()

// DESPUÉS  
printer.println('')
```

Buscar también en `renderTicketDevolucion` y `renderCierreCaja` por si existen.

---

### T2 — Ajuste de widthChars en printer.js

En `createClient`:

```javascript
// ANTES
const widthChars = config.paperWidthMm === 58 ? 32 : config.paperWidthMm === 76 ? 42 : 48

// DESPUÉS
const widthChars = config.paperWidthMm === 58 ? 42 : config.paperWidthMm === 76 ? 42 : 46
```

**Justificación por tamaño:**
- `58mm → 42`: Con Font B activado (ver T3), la impresora entra 42 chars por línea. El ancho de la instancia ThermalPrinter debe coincidir para que `printRow` y `drawLine` usen 42.
- `76mm → 42`: Sin cambios, ya funciona.
- `80mm → 46`: Margen de seguridad de 2 chars para impresoras cuya área imprimible real es 46 en lugar de 48. En Epson TM-T88 con 48 físicos, solo pierde 2 chars de padding — imperceptible visualmente.

---

### T3 — Font B para 58mm en renderer.js

En `renderTicketVenta`, `renderTicketDevolucion` y `renderCierreCaja`, activar Font B cuando `ancho_mm === 58` **al inicio**, antes de cualquier contenido:

```javascript
async function renderTicketVenta(printer, payload) {
  const t = payload.tienda
  const sym = t.simbolo_moneda || '$'

  // Font B para 58mm → misma densidad de caracteres que 76mm en Font A
  if ((t.ancho_mm ?? 80) === 58) printer.setTypeFontB()

  // Encabezado tienda
  printer.alignCenter()
  ...
```

**Por qué funciona:** ESC/POS Font B usa ~9 dots/char vs Font A's 12 dots/char. En papel de 58mm (área imprimible ≈ 384 dots), Font A da 32 chars, Font B da 42 chars. Al setear `widthChars = 42` en T2, el printer object ya sabe que una línea tiene 42 posiciones → `printRow`, `drawLine`, alineación centrada, todo consistente.

**setTextSize(1,1) + Font B**: La fuente doble del título funciona correctamente. "CABRA TEST" (10 chars) en doble ancho Font B = 180 dots, bien dentro de los 384 dots del área.

---

### T4 — Reiniciar PrintBridge y verificar

```powershell
cd scripts/printbridge
node src/service.js uninstall
# esperar 3 segundos
node src/service.js install
```

Luego imprimir ticket de prueba con cada configuración (58mm, 76mm, 80mm) y verificar:
- Sin "0" suelto en líneas en blanco
- Precios completos sin corte
- Nombres de productos con word-wrap limpio cuando son largos
- `drawLine` (separadores) llega hasta el margen pero no se pasa

---

## Validación esperada por tamaño

### 58mm con Font B (42 chars efectivos)
```
CABRA TEST
Monotributista
------------------------------------------
COMPROBANTE INTERNO
NO VALIDO COMO FACTURA
------------------------------------------

Ticket T-0005
28/05/2026 10:39
Atendio: Santiago

------------------------------------------
1x REMERAS ESTAMPADA TALLES S/M
(OVER/S/Gris)
   $ 55.000,00 c/u       $ 55.000,00
1x ZAPATILLAS PROSA CAPRI
(40/PISTACHO)
   $ 100.000,00 c/u      $ 100.000,00
------------------------------------------
Subtotal               $ 155.000,00
TOTAL                  $ 155.000,00
------------------------------------------
Efectivo               $ 155.000,00
------------------------------------------
Gracias por tu compra!
```
Los nombres largos hacen word-wrap pero el layout de precios es limpio.

### 76mm (42 chars — sin cambios)
Funciona. No se modifica.

### 80mm con 46 chars
```
CABRA TEST
Monotributista
----------------------------------------------
COMPROBANTE INTERNO
NO VALIDO COMO FACTURA
----------------------------------------------

Ticket T-0005
28/05/2026 10:39
Atendio: Santiago

----------------------------------------------
1x REMERAS ESTAMPADA TALLES S/M (OVER/S/Gris)
   $ 55.000,00 c/u            $ 55.000,00
1x ZAPATILLAS PROSA CAPRI (40/PISTACHO)
   $ 100.000,00 c/u           $ 100.000,00
----------------------------------------------
Subtotal                      $ 155.000,00
TOTAL                         $ 155.000,00
----------------------------------------------
Efectivo                      $ 155.000,00
----------------------------------------------
Gracias por tu compra!
```
Los nombres con variante corta caben en 1 línea (46 chars). Los muy largos hacen word-wrap de 2 líneas.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Impresora de 58mm no soporta Font B | Poco probable — todo Epson-compatible soporta ESC M 1. Si falla, se puede revertir a widthChars=32 con truncación manual de nombres |
| Impresora de 80mm tiene exactamente 48 chars (Epson TM genuino) | Con 46 chars solo se pierden 2 chars de padding en la columna izquierda — imperceptible. El precio en la derecha sigue igual |
| PrintBridge config local tiene widthChars=80 (lo viejo) | No afecta: el widthChars local es reemplazado por `payload.tienda.ancho_mm` en server.js desde el fix anterior |

---

## Notas de implementación

- No hay cambios en la base de datos ni en la app Next.js.
- El constraint de 76mm en Supabase debe estar aplicado (migración `20260527000001_fix_ancho_ticket_76mm.sql`).
- `printer.setTypeFontB()` appenda `[0x1B, 0x4D, 0x01]` al buffer. Se ejecuta antes de cualquier contenido para que toda la sesión de impresión use Font B.
- `drawLine()` usa `this.config.width` iterations → con 42 el separador tiene 42 guiones = 42 × 9 dots = 378 dots ≈ 49.5mm sobre área de ~48mm. Correcto.
