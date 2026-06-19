# Plan: Actualizar PDF de novedades clientes (Junio 2026 — v2)

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Actualizar el documento de novedades para clientes con todas las mejoras y correcciones implementadas en los últimos días (cierre de caja, dashboard/turnos, cobro guiado y fixes UX).

---

## Descripción General

### Qué Logra Este Plan

Actualiza los entregables existentes `salidas/2026-06-18-novedades-clientes-cvalletienda.html` y `.md` para incluir **cuatro bloques de novedades** que quedaron fuera de la versión del 18/06: **cierre de caja rediseñado**, **Inicio/dashboard con turnos del día**, **modo de cobro guiado en el POS** y **correcciones de UX en el cobro** (descuentos, montos en pesos, búsqueda de cliente). El tono, diseño lime/black y formato imprimible A4 se mantienen; el documento pasa de ~6 a **7–8 páginas** sin perder legibilidad.

### Por Qué Importa

El PDF del 18/06 ya está en manos de algunos clientes pero **no refleja el trabajo más reciente** — justamente el que responde dudas operativas frecuentes (“¿por qué el Inicio no coincide con la caja?”, “¿cómo cierro bien el turno?”, “¿cómo activo el cobro paso a paso?”). Actualizar un solo documento evita enviar dos PDFs confusos y mantiene `salidas/` como fuente única para comunicación a clientes activos.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | PDF imprimible actual (6 páginas) — **archivo a actualizar** |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.md` | Versión texto — **archivo a actualizar** |
| `referencia/plantilla-novedades-clientes.html` | Plantilla reutilizable — actualizar comentarios/ejemplo si cambia estructura |
| `planes/2026-06-18-pdf-novedades-clientes-junio.md` | Plan original (Estado: Implementado) — agregar nota de v2 al final |
| `salidas/brochure-cvalle.html` | Referencia visual (sin cambios) |

### Contenido ya documentado en el PDF actual (mantener)

| # | Área | Estado en PDF |
|---|------|---------------|
| 1 | Gráficos y Reportes | ✓ Cubierto |
| 2 | Variantes de productos | ✓ Cubierto |
| 3 | Lista de precios | ✓ Cubierto |
| 4 | Atajos POS + descuentos % | ✓ Cubierto (parcial — falta cobro guiado) |
| 5 | Horario Argentina | ✓ Cubierto |
| 6 | Tickets T-XXXX / devoluciones | ✓ Cubierto |

### Novedades implementadas NO documentadas (últimos días)

| # | Área | Qué decir al cliente | Fuente técnica |
|---|------|----------------------|----------------|
| **N1** | **Cierre de caja** | Vista previa antes de cerrar; arqueo de efectivo más claro; detalle completo del turno; reimprimir cierre | `planes/2026-06-08-mejora-cierre-caja-detalle-admin.md` |
| **N2** | **Inicio / Dashboard** | KPIs muestran el **día completo**; banner verde muestra el **turno actual**; tarjeta “Turnos de hoy” si hay más de un cajero | `planes/2026-06-19-analisis-dashboard-datos-caja-turnos.md` |
| **N3** | **Cobro guiado (POS)** | Modo paso a paso configurable: Pago → Cliente → Descuento → Confirmar; ideal pantallas grandes | `planes/2026-06-08-pos-cobro-guiado-modal.md` |
| **N4** | **Mejoras cobro guiado** | Descuento por % **o** monto fijo (no mezclados); botón Quitar; montos en pesos ($ 12.450,00); buscar cliente sin scroll incómodo | `planes/2026-06-19-fix-cobro-guiado-ux.md` |

**No incluir en el PDF:**

- Detalles técnicos (RPC, `revalidatePath`, migraciones SQL).
- Mensaje outreach Denisee.
- Stock optimizado (`planes/2026-06-08-optimizar-stock-velocidad-ux.md`) — sigue en borrador / no prod.
- RPCs backend de reportes (`20260608100001_reportes_ventas_stock_rpc.sql`) — sin cambio visible para el cliente.

### Brechas que se Abordan

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | Clientes con doble turno creen que el Inicio “está mal” | Soporte; desconfianza en números |
| B2 | Admin no entiende el nuevo flujo de cierre / arqueo | Errores de arqueo, llamadas post-cierre |
| B3 | Tiendas no saben que existe cobro guiado | Feature no adoptada |
| B4 | PDF desactualizado respecto al producto real | Contradicciones si el cliente compara con la app |

---

## Cambios Propuestos

### Resumen de Cambios

- Actualizar **portada**: subtítulo y 3 bullets incluyendo caja e Inicio.
- Agregar **página “Inicio y turnos de caja”** (N2) — explicación en lenguaje simple del “doble reloj”.
- Agregar **página “Cierre de caja mejorado”** (N1) — preview, arqueo, detalle sesión, imprimir.
- **Expandir página POS** (N3 + N4): cobro guiado + mejoras; mantener atajos como subsección opcional.
- Actualizar **mensaje WhatsApp** y **checklist** en el `.md`.
- Regenerar PDF manualmente (mismo nombre de archivo).
- Nota de actualización en `planes/2026-06-18-pdf-novedades-clientes-junio.md` (referencia cruzada a este plan).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| Ninguno obligatorio | Se editan los archivos existentes en `salidas/` |

**Opcional:** si Santiago prefiere conservar la v1 enviada, duplicar antes de editar:

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-06-18-novedades-clientes-cvalletienda-v1.html` | Backup de la versión ya enviada (copia manual antes de editar) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.md` | Nuevas secciones N1–N4; portada; WhatsApp; checklist |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | Mismas secciones con markup/CSS existente; 2 páginas nuevas + ajuste portada/POS |
| `referencia/plantilla-novedades-clientes.html` | Comentario con secciones ejemplo (Inicio, Caja, Cobro guiado) |
| `planes/2026-06-18-pdf-novedades-clientes-junio.md` | Apéndice “Actualización v2 — ver plan 2026-06-08-actualizar-novedades-clientes-junio.md” |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Editar in place los archivos del 18/06:** Mismo nombre evita duplicar assets en `salidas/`; la portada llevará “Actualizado — Junio 2026” para distinguir de copias impresas antiguas.

2. **Explicar doble turno sin jerga:** Usar metáfora “el Inicio suma todo el día; el banner verde muestra solo el turno que está abierto ahora”. No usar “día calendario”, “sesión”, “KPI”.

3. **Cobro guiado como opt-in:** Dejar claro que el modo **clásico sigue igual** y que se activa en **Configuración → Cobros**. Evita miedo a cambios forzados.

4. **Fusionar N3 + N4 en una sola página POS:** El fix UX es refinamiento del wizard; no merece página aparte.

5. **Cierre de caja orientado al dueño/admin:** Cajeros ven preview simplificado; el PDF menciona ambos: “antes de cerrar ves un resumen; el dueño ve el detalle completo del turno”.

6. **7–8 páginas máximo:** Si supera 8, acortar bullets de Gráficos (ya documentados) antes que recortar caja o Inicio.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Crear `salidas/2026-06-19-novedades-...` nuevo | Dos PDFs en circulación confunden; el pedido pide actualizar el existente |
| Solo changelog en WhatsApp sin PDF | No reemplaza documento imprimible para capacitación |
| Incluir capturas obligatorias | Mantener placeholders editables (patrón v1) |
| Documentar migraciones SQL | Irrelevante para cliente final |

### Preguntas Abiertas

1. **¿Conservar backup v1?** Recomendado copiar HTML a `-v1.html` antes de editar si ya se envió a clientes.
2. **¿Mencionar reimpresión de ticket de cierre?** Sí, si `obtenerPayloadCierre` / botón Imprimir está en prod — verificar en `/caja/sesiones/[id]` antes de redactar.
3. **¿Cobro guiado ya activado en alguna tienda piloto?** Si no, el copy puede decir “disponible para activar” en lugar de “ya activo”.

---

## Tareas Paso a Paso

### Paso 1: Inventario y redacción en Markdown (fuente de verdad)

Redactar primero en `.md` todas las secciones nuevas. Validar cada bullet contra planes implementados — **no inventar features**.

**Textos propuestos (borrador para revisión):**

#### Sección — Inicio y turnos (N2)

> **Inicio más claro cuando hay varios turnos**
>
> - En **Inicio**, los números grandes (“Ventas de hoy”) muestran **todo lo vendido en el día**, aunque hayas cerrado y vuelto a abrir la caja.
> - El **banner verde** arriba muestra solo el **turno que está abierto ahora** (desde qué hora y cuánto vendió ese cajero).
> - Si hoy hubo **mañana y tarde** con distintos cajeros, verás una tarjeta **“Turnos de hoy”** con cada apertura/cierre y su total.
> - Si la caja está cerrada pero ya vendiste hoy, el banner te lo dice — no es un error.
>
> **Dónde:** Menú → **Inicio**

#### Sección — Cierre de caja (N1)

> **Cierre de caja más fácil de entender**
>
> - **Vista previa** antes de confirmar el cierre: ves ventas, devoluciones y cuánto efectivo debería haber.
> - Al contar el efectivo, el sistema compara contra lo **esperado del turno** (no contra un saldo confuso de otra cuenta).
> - Montos en **pesos argentinos** mientras cargás ($ 97.400,00).
> - Después del cierre, el **detalle del turno** muestra ventas, movimientos, productos más vendidos y podés **imprimir el resumen**.
>
> **Dónde:** Menú → **Caja** → Cerrar caja / Historial → Ver sesión

#### Sección — Cobro guiado + UX (N3 + N4)

> **Modo de cobro paso a paso (opcional)**
>
> - Podés elegir entre el panel de cobro **clásico** (como siempre) o un **asistente en pantalla grande**: ¿Cómo paga? → ¿Cliente? → ¿Descuento? → Confirmar.
> - Se activa en **Configuración → Cobros → Modo de cobro**.
> - **F2** abre el asistente cuando está activo.
> - Descuento: elegís **porcentaje o monto fijo** (uno solo), con botón **Quitar**.
> - Los montos se leen en pesos ($ 12.450,00).
> - Buscar cliente en el asistente es más cómodo (sin ventanita incómoda).
>
> **Dónde:** **Configuración → Cobros** (activar) · **Vender (POS)** (usar)

**Acciones:**

- Insertar secciones en `salidas/2026-06-18-novedades-clientes-cvalletienda.md` en este orden lógico:
  1. Portada (actualizar bullets)
  2. Gráficos y reportes (sin cambios sustanciales)
  3. Productos y precios (sin cambios)
  4. **Inicio y turnos** (nuevo)
  5. **Cierre de caja** (nuevo)
  6. POS — expandir con cobro guiado; mantener atajos como subsección opcional
  7. Correcciones importantes (horario, tickets — sin cambios)
  8. Cierre / contacto
- Actualizar mensaje WhatsApp mencionando caja, Inicio y cobro guiado.

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.md`

---

### Paso 2: Actualizar portada (HTML + MD)

**Portada — bullets sugeridos (reemplazar los 3 actuales):**

- 📊 **Gráficos** para ver tu mes en un vistazo
- 🏠 **Inicio** más claro con turnos de caja en el mismo día
- 💰 **Cierre de caja** con vista previa y detalle del turno
- ⌨️ **Cobro guiado** opcional en el POS (paso a paso)

**Subtítulo:** “Gráficos, Inicio, caja, POS y horarios”

**Badge opcional en HTML:** `<span class="eyebrow">Actualizado Junio 2026</span>` debajo del título.

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`
- `salidas/2026-06-18-novedades-clientes-cvalletienda.md`

---

### Paso 3: Agregar página HTML “Inicio y turnos”

Copiar patrón de página existente (`.page` > `.page-inner` > `.eyebrow` + `h2` + `.check-list` + `.tip-box`).

**Tip box sugerido:**

> **Tip:** Si tenés un solo cajero todo el día, los números del Inicio y del banner verde **van a coincidir**. Si no coinciden, probablemente hubo más de un turno — mirá “Turnos de hoy”.

**Placeholder captura:** “Captura: Inicio → banner verde + Turnos de hoy”

**Acciones:**

- Insertar nueva `<section class="page">` **después** de “Productos y precios” y **antes** de POS.
- `page-break-inside: avoid` en `.tip-box` (ya existe en CSS).

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`

---

### Paso 4: Agregar página HTML “Cierre de caja”

Misma estructura visual. Incluir mini-tabla conceptual opcional (no técnica):

| Qué ves | Para qué sirve |
|---------|----------------|
| Vista previa | Revisar antes de cerrar |
| Efectivo esperado | Cuánto debería haber en caja |
| Efectivo contado | Lo que contaste físicamente |
| Detalle del turno | Auditoría después del cierre |

**Placeholder captura:** “Captura: Caja → Vista previa del cierre”

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`

---

### Paso 5: Expandir página POS en HTML

En la página POS existente (atajos opcionales):

1. **Nueva subsección arriba:** “Modo de cobro paso a paso” con `.optional-badge` solo si se quiere marcar como configurable.
2. Lista de 4 pasos del wizard (Pago → Cliente → Descuento → Confirmar).
3. Bullets de N4 (descuento % o monto, Quitar, pesos ARS).
4. Mantener tabla de atajos **debajo**, con nota: “En modo guiado, **F2** abre el asistente.”

**Actualizar `PosAtajosHelp` coherencia:** F2 en guiado = asistente; en clásico = cobrar rápido — reflejar en tabla con nota al pie.

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.html`
- `salidas/2026-06-18-novedades-clientes-cvalletienda.md`

---

### Paso 6: Sincronizar MD ↔ HTML y actualizar plantilla

**Acciones:**

- Verificar que `.md` y `.html` tienen el **mismo contenido factual** (no hace falta HTML en el MD).
- En `referencia/plantilla-novedades-clientes.html`, agregar comentario HTML con lista de secciones estándar actualizada (Inicio, Caja, Cobro guiado).
- En `planes/2026-06-18-pdf-novedades-clientes-junio.md`, al final:

```markdown
### Actualización v2 (2026-06-08)

Ver plan `planes/2026-06-08-actualizar-novedades-clientes-junio.md` — añade cierre caja, Inicio/turnos, cobro guiado.
```

**Archivos afectados:**

- `referencia/plantilla-novedades-clientes.html`
- `planes/2026-06-18-pdf-novedades-clientes-junio.md`

---

### Paso 7: Generar PDF y validar

**Acciones:**

1. (Opcional) Copiar HTML actual a `...-v1.html` como backup.
2. Abrir HTML actualizado en Chrome/Edge.
3. Ctrl+P → A4 → “Gráficos de fondo” activados → Guardar como `salidas/2026-06-18-novedades-clientes-cvalletienda.pdf`.
4. Releer en celular: títulos ≥ 18pt, cuerpo ≥ 11pt.
5. Cruzar con app en staging/prod:
   - `/dashboard` — banner + Turnos de hoy
   - `/caja` — preview cierre
   - `/configuracion/cobros` — selector modo cobro
   - POS modo guiado — wizard 4 pasos

**Checklist de contenido nuevo:**

- [ ] Inicio explica día completo vs turno actual
- [ ] Turnos de hoy mencionado
- [ ] Cierre: preview + arqueo + detalle + imprimir
- [ ] Cobro guiado: dónde activar + 4 pasos
- [ ] Descuento % o monto + Quitar
- [ ] Montos en pesos en cobro
- [ ] Atajos F2 actualizados según modo
- [ ] Sin jerga técnica (RPC, timezone, revalidate)
- [ ] Sin Denisee / pricing comercial

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.pdf` (generado manualmente, no en repo)

---

### Paso 8: Mensaje WhatsApp actualizado

Reemplazar en el `.md`:

```
Hola! 👋 Actualizamos el resumen de CV-MiTienda: ahora incluye el Inicio con turnos de caja, el cierre de caja mejorado y el cobro paso a paso opcional en el POS.

Te adjunto el PDF. Cualquier duda me escribís.
```

**Archivos afectados:**

- `salidas/2026-06-18-novedades-clientes-cvalletienda.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `planes/2026-06-08-mejora-cierre-caja-detalle-admin.md` | Fuente N1 |
| `planes/2026-06-19-analisis-dashboard-datos-caja-turnos.md` | Fuente N2 |
| `planes/2026-06-08-pos-cobro-guiado-modal.md` | Fuente N3 |
| `planes/2026-06-19-fix-cobro-guiado-ux.md` | Fuente N4 |
| `app/components/dashboard/TurnosHoyCard.tsx` | Verificar labels UI coinciden con copy |
| `app/components/caja/ResumenTurnoPanel.tsx` | Verificar términos (“vista previa”, “efectivo esperado”) |
| `app/app/(dashboard)/configuracion/cobros/page.tsx` | Label exacto del selector modo cobro |

### Actualizaciones Necesarias para Consistencia

- Labels en PDF deben coincar con menú Sidebar (`Inicio`, `Caja`, `Gráficos`, `Configuración → Cobros`).
- No modificar `app/` salvo que se detecte un label incorrecto durante validación (fuera de scope salvo typo grave).

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Envío masivo WhatsApp | Nuevo mensaje + PDF regenerado |
| Onboarding cajeros | Capacitar cobro guiado si la tienda lo activa |
| Soporte doble turno | PDF reduce consultas “números no coinciden” |
| Código producto | Ninguno |

---

## Lista de Validación

- [x] `salidas/2026-06-18-novedades-clientes-cvalletienda.md` incluye secciones N1–N4
- [x] `salidas/2026-06-18-novedades-clientes-cvalletienda.html` refleja el mismo contenido (8 páginas)
- [x] Portada actualizada con badge “Actualizado · v2”
- [ ] PDF regenerado y legible en móvil (manual — Ctrl+P)
- [x] Contenido alineado con labels de app (Inicio, Caja, Configuración → Cobros)
- [x] Secciones previas (Gráficos, variantes, horario, tickets) intactas
- [x] Sin Denisee / sin pricing del brochure
- [x] Mensaje WhatsApp actualizado
- [x] Plan original `2026-06-18-pdf-novedades-...` referencia v2
- [x] Guía de capturas en MD + `salidas/capturas/README.md`

---

## Criterios de Éxito

1. Un dueño con **dos turnos en el día** entiende leyendo el PDF por qué Inicio y banner muestran números distintos.
2. Un admin sabe **dónde ver la preview de cierre** y qué significa “efectivo esperado” sin llamar a soporte.
3. Una tienda puede **activar cobro guiado** siguiendo solo el PDF (Configuración → Cobros).
4. El documento **no contradice** la app en producción tras aplicar migraciones (`preview_resumen_turno`, `pos_modo_cobro`).
5. Santiago puede **reenviar el PDF hoy** sin tocar código (solo editar HTML → imprimir).

---

## Notas

### Mapa de páginas sugerido (post-actualización)

| Pág. | Título |
|------|--------|
| 1 | Portada (actualizada) |
| 2 | Gráficos y reportes |
| 3 | Productos y precios |
| 4 | **Inicio y turnos de caja** *(nuevo)* |
| 5 | **Cierre de caja mejorado** *(nuevo)* |
| 6 | POS — cobro guiado + atajos (opcional) |
| 7 | Correcciones (horario, tickets) |
| 8 | Cierre / contacto |

Si al imprimir POS + correcciones caben en una sola hoja, pueden quedar **7 páginas**.

### Diagrama para la sección Inicio (incluir simplificado en tip-box)

```
   INICIO (todo el día)  =  Turno mañana  +  Turno tarde
   Banner verde         =  solo el turno abierto ahora
```

### Ejecutar implementación

```
/implementar planes/2026-06-08-actualizar-novedades-clientes-junio.md
```

### Dependencia de migraciones

Antes de enviar a clientes, confirmar en Supabase:

- `20260608120001_preview_resumen_turno.sql` (preview cierre)
- `20260619100001_pos_modo_cobro.sql` (modo cobro guiado)

Si alguna no está aplicada, marcar en PDF “próximamente” o esperar al deploy.

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

- Actualizado HTML (8 páginas) y MD con N1–N4: Inicio/turnos, cierre de caja, cobro guiado, fixes UX.
- Portada v2 con nuevos destacados.
- Placeholders de captura documentados con patrón `<!-- CAPTURA -->` + `<img>` comentado + `data-captura`.
- Creado `salidas/capturas/README.md` con lista de archivos sugeridos.
- Sección “Cómo agregar capturas” en el MD.
- Referencia cruzada en plan original Jun 18.

### Desviaciones del Plan

- No se generó backup `-v1.html` (opcional; usuario puede copiar manualmente si ya envió v1).
- PDF binario no incluido en repo (generación manual Ctrl+P).

### Problemas Encontrados

Ninguno.

### Fix PDF (2026-06-08)

Ver `planes/2026-06-08-fix-pdf-novedades-generacion.md` — `node scripts/generar-pdf-novedades.mjs` genera `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` (8 páginas A4).
