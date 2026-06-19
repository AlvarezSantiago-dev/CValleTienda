# Novedades CV-MiTienda — Junio 2026 (actualizado)

Documento para clientes activos. Resumen de mejoras recientes en lenguaje simple.

**Generar PDF (recomendado):**

```bash
# Primera vez: instalar Playwright (solo el paquete npm, sin descargar Chromium)
npm install playwright

# Desde la raíz del repo
node scripts/generar-pdf-novedades.mjs
```

Salida: `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` (8 páginas A4)

**Fallback manual (Chrome):**

1. Abrí `2026-06-18-novedades-clientes-cvalletienda.html` en Chrome (doble clic desde `salidas/`)
2. Ctrl+P → Destino: **Guardar como PDF**
3. Papel: **A4** · Márgenes: **Ninguno** · Escala: **100%**
4. **Desactivar** “Encabezados y pies de página”
5. **Activar** “Gráficos de fondo”

---

## Portada

**CV-MiTienda** — Actualización Junio 2026 · **v2**

**Mejoras para tu tienda:** gráficos, Inicio, caja, POS y horarios.

Destacados:
- Nuevo módulo **Gráficos** para ver tu mes en un vistazo
- **Inicio** más claro con turnos de caja en el mismo día
- **Cierre de caja** con vista previa y detalle del turno
- **Cobro guiado** opcional en el POS (paso a paso)

---

## 1. Gráficos y reportes

### Gráficos de tu negocio (nuevo)

Ahora tenés una sección solo para ver cómo va el mes en un vistazo visual.

- **Dónde:** Menú lateral → **Gráficos**
- Cuatro pestañas: **Finanzas · Ventas · Stock · Operación**
- Tarjetas con los números más importantes del mes (ventas, ganancia, stock, etc.)
- Gráficos de barras y torta para entender tendencias sin planillas
- Los montos grandes se leen bien en celular y en la compu
- Podés **exportar a Excel (CSV)** desde el botón de descarga

**Tip:** En **Reportes** sigue la tabla de cierre de mes (números detallados). En **Gráficos** ves las tendencias y comparaciones visuales. Hay un enlace entre ambas secciones.

### Reportes (tabla de cierre)

- **Dónde:** Menú lateral → **Reportes**
- Tabla mensual con ingresos, costos, comisiones y resultado
- Elegí ver 3, 6 o 12 meses
- Exportá la tabla a CSV para tu contador

---

## 2. Productos y precios

### Carga de variantes (talle, color, etc.)

La tabla de variantes al crear o editar productos es más clara y rápida.

- Barra arriba que te dice **cuántas variantes faltan completar** (código o stock)
- **Stock inicial** más visible al dar de alta mercadería nueva
- Botón para **completar códigos de barras en lote**
- Vista más ordenada en notebook y celular

**Dónde:** **Productos** → Nuevo o Editar → tabla de variantes.

### Lista de precios

Pantalla para consultar precios sin hacer una venta.

- Escaneá un código o buscá por nombre
- El precio se muestra **grande y claro** al instante
- Ideal cuando un cliente pregunta “¿cuánto sale?” en mostrador

**Dónde:** Menú → **Lista de precios**.

---

## 3. Inicio y turnos de caja

### Inicio más claro cuando hay varios turnos

- En **Inicio**, los números grandes (“Ventas de hoy”) muestran **todo lo vendido en el día**, aunque hayas cerrado y vuelto a abrir la caja.
- El **banner verde** arriba muestra solo el **turno que está abierto ahora** (desde qué hora y cuánto vendió ese cajero).
- Si hoy hubo **mañana y tarde** con distintos cajeros, verás una tarjeta **“Turnos de hoy”** con cada apertura/cierre y su total.
- Si la caja está cerrada pero ya vendiste hoy, el banner te lo dice — **no es un error**.

**Tip:** Si tenés un solo cajero todo el día, los números del Inicio y del banner verde **van a coincidir**. Si no coinciden, probablemente hubo más de un turno — mirá “Turnos de hoy”.

**Dónde:** Menú → **Inicio**

---

## 4. Cierre de caja

### Cierre de caja más fácil de entender

- **Vista previa** antes de confirmar el cierre: ves ventas, devoluciones y cuánto efectivo debería haber.
- Al contar el efectivo, el sistema compara contra lo **esperado del turno** (no contra un saldo confuso de otra cuenta).
- Montos en **pesos argentinos** mientras cargás ($ 97.400,00).
- Después del cierre, el **detalle del turno** muestra ventas, movimientos, productos más vendidos y podés **imprimir el resumen**.

| Qué ves | Para qué sirve |
|---------|----------------|
| Vista previa | Revisar antes de cerrar |
| Efectivo esperado | Cuánto debería haber en caja |
| Efectivo contado | Lo que contaste físicamente |
| Detalle del turno | Auditoría después del cierre |

**Dónde:** Menú → **Caja** → Cerrar caja / Historial → Ver sesión

---

## 5. POS — cobro guiado y atajos (opcional)

### Modo de cobro paso a paso (opcional)

Podés elegir entre el panel de cobro **clásico** (como siempre) o un **asistente en pantalla grande**:

1. ¿Cómo paga?
2. ¿Cliente?
3. ¿Descuento?
4. Confirmar

- Se activa en **Configuración → Cobros** → elegí **“Paso a paso (pantallas grandes)”**.
- El modo **clásico** (“Panel lateral”) sigue disponible sin cambios.
- **F2** abre el asistente cuando el modo guiado está activo; en modo clásico, F2 cobra directo.
- Descuento: elegís **porcentaje o monto fijo** (uno solo), con botón **Quitar**.
- Los montos se leen en pesos ($ 12.450,00).
- Buscar cliente en el asistente es más cómodo.

**Dónde:** **Configuración → Cobros** (activar) · **Vender (POS)** (usar)

### Cobro más ágil (modo clásico)

- **Chips de pago rápido:** un clic carga Efectivo, Débito, etc. con el total
- Panel de cobro más visible en notebook (menos scroll)
- Barra fija con total y botón Cobrar en pantallas chicas

### Atajos de teclado (POS)

| Tecla | Qué hace |
|-------|----------|
| **F2** | Modo clásico: cobrar rápido. Modo guiado: abre el asistente |
| **Ctrl + Enter** | Igual que F2 |
| **Enter** | Cobrar desde el monto / cerrar impresión |
| **↑ ↓** | Navegar resultados del buscador |
| **Esc** | Volver al buscador de productos |
| **?** | Mostrar ayuda de atajos en pantalla |

*Los atajos funcionan en el **POS** (Vender), cuando no estás escribiendo en un campo de texto.*

### Descuentos en el POS

Los descuentos por **porcentaje** o **monto fijo** se calculan correctamente al cobrar. Podés quitar el descuento con un clic.

---

## 6. Correcciones importantes

### Horario de ventas

- La hora que ves en **Ventas** ahora es la **misma que en el ticket impreso** (hora de Argentina)
- “Ventas de hoy” y los reportes del día usan el **día correcto**, sin desfase de horas

### Tickets y devoluciones

- **Mismo número en todos lados:** ticket impreso, vale de cambio y pantalla (ej. **T-0021**)
- Más fácil buscar una venta para hacer una devolución
- Ticket de devolución con más datos útiles (venta original, cliente, vendedor)

---

## 7. Cierre

Seguimos mejorando CV-MiTienda con feedback de tiendas como la tuya.

**¿Dudas o algo no te cierra?** Escribinos:

- WhatsApp: **+54 299 658-7715**
- Email: **santiagoalvarezc5@gmail.com**

Gracias por confiar en el sistema.

---

## Cómo agregar capturas de pantalla

Las capturas van en la carpeta **`salidas/capturas/`** (junto al HTML).

### Pasos (por cada captura)

1. Sacá el screenshot en la app (Win+Shift+S o similar).
2. Guardalo en `salidas/capturas/` con el nombre indicado en el HTML (ej. `inicio-turnos.png`).
3. Abrí `2026-06-18-novedades-clientes-cvalletienda.html` en un editor de texto.
4. Buscá el bloque `CAPTURA: inicio-turnos` (Ctrl+F).
5. **Borrá** el `<div class="screenshot-placeholder">…</div>` de ese bloque.
6. **Descomentá** la línea `<img …>` justo arriba (sacá `<!--` y `-->`).
7. Guardá, abrí el HTML en Chrome y verificá que se vea la imagen.
8. Ctrl+P → PDF (con “Gráficos de fondo” activado).

### Lista de capturas sugeridas

| Archivo | Qué capturar |
|---------|--------------|
| `graficos-finanzas.png` | Menú Gráficos → pestaña Finanzas |
| `variantes-tabla.png` | Productos → tabla de variantes con barra de progreso |
| `inicio-turnos.png` | Inicio → banner verde + tarjeta Turnos de hoy |
| `caja-preview-cierre.png` | Caja → formulario cerrar con vista previa |
| `pos-cobro-guiado.png` | POS → asistente paso a paso (modo guiado) |
| `venta-ticket-hora.png` | Detalle de venta con hora y T-XXXX |

> **Tip:** Abrí el HTML desde el explorador de archivos (doble clic). Las rutas `capturas/archivo.png` son relativas a la carpeta `salidas/`.

---

## Mensaje sugerido para WhatsApp

```
Hola! 👋 Actualizamos el resumen de CV-MiTienda: ahora incluye el Inicio con turnos de caja, el cierre de caja mejorado y el cobro paso a paso opcional en el POS.

Te adjunto el PDF. Cualquier duda me escribís.
```

---

## Checklist antes de enviar

- [ ] Ejecuté `node scripts/generar-pdf-novedades.mjs` (o Ctrl+P con opciones correctas)
- [ ] El PDF tiene **8 páginas** y se ve alineado
- [ ] Activé “Gráficos de fondo” si usás Ctrl+P manual
- [ ] Probé leer el PDF en el celular — texto legible
