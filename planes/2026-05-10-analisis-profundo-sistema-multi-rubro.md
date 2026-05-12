# Plan: Análisis Profundo del Sistema — Mejoras Operativas Multi-Rubro

**Creado:** 2026-05-10  
**Estado:** Borrador  
**Pedido:** Análisis profesional del sistema desde el punto de vista de un usuario real. Identificar gaps operativos, mejoras de flujo de caja, política de devoluciones, POS y adaptación multi-rubro.

---

## Descripción General

Este plan documenta el análisis completo del sistema actual, los problemas reales que tendría un dueño de tienda al usarlo día a día, y las mejoras concretas a implementar. Está organizado por área funcional con una visión profesional de cada una.

---

## Análisis por Módulo

### 1. MÓDULO CAJA — Gaps críticos

#### Estado actual
- Apertura: solo se declara efectivo (correcto — el efectivo es lo único físico)
- Cierre: manual, sin automatización por horario
- Sin posibilidad de anular un cierre
- Sin cierre de emergencia
- Sin multi-turno (mañana/tarde)

#### Punto de vista profesional
**La declaración de solo efectivo en apertura ES la práctica correcta.** Mercado Pago, tarjetas y transferencias son virtuales — no se "cuentan" al abrir caja. Lo que sí falta es mostrar el **saldo inicial de cada cuenta** al momento de abrir (para que el cajero sepa cuánto había antes del turno).

**Problemas reales que surgen sin mejoras:**
1. La caja queda "abierta" toda la noche si el cajero se olvida cerrar → distorsiona los reportes
2. Si el sistema falla y la caja queda abierta, no hay forma de cerrarla sin afectar datos
3. Un cierre mal hecho no puede revertirse → el dueño pierde visibilidad
4. No se puede operar con dos cajeros en simultáneo (mañana/tarde)

#### Mejoras a implementar

**A) Cierre de emergencia (forzado)**
- Botón "Cerrar caja de emergencia" visible solo cuando hay sesión abierta
- No requiere declarar efectivo ni completar el arqueo
- Registra `tipo_cierre: 'emergencia'` con timestamp y usuario
- El reporte marca estos cierres con ⚠️ para auditarlos

**B) Cierre automático por horario (opcional por tienda)**
- En Configuración → Caja: campo "Hora de cierre automático" (ej. 23:59)
- Un cron job de Supabase (pg_cron) o un check en la apertura del día siguiente detecta sesiones abiertas del día anterior y las cierra automáticamente como `tipo_cierre: 'automatico'`
- Se notifica al dueño con un banner en el dashboard

**C) Anulación / Reapertura de cierre**
- Los cierres NO deben borrarse (son registros de auditoría)
- En cambio: "Reabrir sesión" que crea una sesión nueva vinculada a la anterior
- El cierre original queda marcado como `anulado: true` con motivo y usuario
- Requiere rol `admin` o `dueno`

**D) Mostrar saldos previos al abrir**
- En `AbrirSesionForm`: mostrar los saldos actuales de cada cuenta antes de abrir
- Así el cajero ve "Mercado Pago: $45.000" y sabe que es el arrastre del día anterior

---

### 2. MÓDULO DEVOLUCIONES — Gap de negocio importante

#### Estado actual
- Toda devolución registra un `pago_devolucion` obligatorio
- El dinero siempre "vuelve" al cliente
- No hay concepto de "nota de crédito" o "saldo a favor"

#### Punto de vista profesional
**En la mayoría de los comercios minoristas argentinos, no se devuelve dinero.** Se da un cambio o un saldo a favor para usar en la próxima compra. La política actual del sistema es incorrecta para la mayoría de los casos de uso.

**Los tres escenarios reales:**
1. **Cambio inmediato**: se devuelve el producto y se lleva otro en el mismo acto → ya funciona (es una devolución + nueva venta)
2. **Nota de crédito / Saldo a favor**: se devuelve el producto, el dinero queda en la cuenta del cliente como crédito para uso futuro → **NO implementado**
3. **Reembolso real**: el dinero vuelve efectivamente al cliente → implementado pero es el menos común

#### Mejoras a implementar

**A) Tipo de resolución de devolución**
- Al crear devolución, seleccionar `tipo_resolucion`:
  - `reembolso` → flujo actual (pagos_devolucion)
  - `saldo_a_favor` → suma crédito al cliente, sin mover fondos
  - `cambio` → solo revierte stock, sin mover dinero (el cambio se procesa como nueva venta)

**B) Saldo a favor en clientes**
- Nueva columna `saldo_favor numeric DEFAULT 0` en tabla `clientes`
- En el POS: si el cliente tiene saldo a favor, mostrar aviso y opción de aplicarlo como método de pago
- En la ficha del cliente: historial de movimientos de saldo

**C) Devolución sin cliente**
- Si no hay cliente asociado: solo puede ser `reembolso` o `cambio` (no se puede acreditar a nadie)
- El sistema ya lo maneja pero conviene validar explícitamente

---

### 3. MÓDULO POS — UX crítica para el cajero

#### Estado actual
- Lista de productos vacía al entrar: **solo aparecen resultados cuando se escribe**
- El cajero que no sabe el nombre de un producto no puede buscarlo visualmente
- No hay categorías ni filtros visuales en el POS

#### Punto de vista profesional
**El POS es el módulo más usado del día. Cada segundo de fricción se multiplica por 50 ventas.** Un sistema sin listado inicial es inutilizable para:
- Negocios con productos sin código de barras
- Clientes que señalan el producto en góndola
- Cajeros nuevos que no saben los nombres exactos

#### Mejoras a implementar

**A) Panel de productos en el POS (vista grilla)**
- Al cargar el POS: mostrar los últimos productos más vendidos (top 20) en grilla de tarjetas
- Cada tarjeta: foto/emoji del rubro + nombre + precio + indicador de variantes
- Click en una tarjeta: abre un mini-modal para seleccionar la variante (talla/color/etc.)
- El buscador sigue funcionando en paralelo para búsqueda rápida

**B) Filtro por categoría en el POS**
- Chips de categoría horizontales sobre la grilla
- Click en categoría filtra los productos visibles
- Útil para rubros con muchos productos (ferreterías, despensas)

**C) Buscar con stock = 0 (con indicador)**
- Actualmente `buscarVariantes` filtra `.gt('stock_actual', 0)` — los productos sin stock no aparecen
- Opción de configuración: "Permitir venta sin stock" → si está activo, aparecen con badge "Sin stock"
- Decisión del dueño por rubro (despensa: no; ropa: a veces sí para pedidos)

**D) Calculadora de cambio**
- En el panel de cobro: si el cliente paga en efectivo, mostrar "Vuelto: $X" automáticamente

---

### 4. ADAPTACIÓN MULTI-RUBRO — Texto hardcodeado restante

#### Estado actual (revisado en sesión anterior)
- ✅ `VariantesEditor`: usa `labelVar1`/`labelVar2` del `useRubro()`
- ✅ `BuscadorVariantes`: usa labels dinámicos
- ✅ `FiltrosStock`: usa labels y oculta var2 si el rubro no la usa
- ✅ `TabsProductos`: ahora client component con labels dinámicos
- ✅ `Tallas/Colores pages`: título y descripción dinámicos

**Textos hardcodeados que quedan:**
- `stock/TablaStock.tsx`: columna "Variante" y rendering `{it.talla} / {it.color}`
- `ventas/[id]/page.tsx`: muestra `talla` y `color` en la tabla de detalles
- `devoluciones/[id]`: igual
- Emails/tickets: si los hay, probablemente digan "talla/color"
- `TablaStock` en la columna "Variante": renderiza `talla` y `color` directamente sin labels
- El onboarding: dice "Configurá tu tienda de ropa" (de sesiones previas)

#### Mejoras a implementar

**A) TablaStock con labels dinámicos**
- Pasar `labelVar1` y `labelVar2` como props o convertir a client component con `useRubro()`
- Mostrar "—" cuando la variante no usa esa dimensión (ej. corralón sin var2)

**B) Detalle de venta/devolución**
- Las columnas `talla` y `color` en las tablas de detalle deben usar los labels del rubro
- Agregar `labelVar1`/`labelVar2` al contexto del servidor o pasar como prop desde el server component

**C) Onboarding**
- Revisar que el texto no mencione "ropa" específicamente antes del paso de selección de rubro

---

### 5. OTROS PUNTOS PROFESIONALES — Lo que revisaría antes de producción

#### A) Roles y multi-usuario ⚠️
**El sistema actual asume que cada tienda tiene un solo usuario.** En la práctica:
- Una tienda mediana tiene 1 dueño + 2-3 cajeros
- Los cajeros no deberían ver la configuración ni el dashboard de ganancias
- El dueño debería poder ver qué cajero hizo cada venta

**Gap**: La tabla `perfiles` tiene un campo `rol` pero no se usa para restringir nada.

**Lo mínimo viable**: dos roles — `admin` (dueño, acceso total) y `cajero` (solo POS + caja).

#### B) Precios y listas de precio ⚠️
- Un solo precio de venta por variante
- No hay precio mayorista / minorista / especial
- No hay descuentos automáticos por cliente o categoría
- No hay "precio por cantidad" (ej. 3x$1000)

Para rubros como despensa o ferretería, esto es un gap importante.

#### C) Exportación de reportes 📊
- No hay forma de exportar nada a Excel/PDF desde el sistema
- El dashboard muestra datos pero no hay descarga
- Mínimo: exportar el historial de ventas y el cierre de caja a CSV/PDF

#### D) Historial de precios
- Si se cambia el precio de un producto, las ventas antiguas muestran el precio actual (no el de la venta)
- `detalles_venta` ya tiene `precio_unitario` como snapshot ✅ — esto está bien
- Pero en la ficha del producto no hay historial de cambios de precio

#### E) Venta sin caja abierta
- El POS bloquea completamente si no hay caja → `EmptyState` con solo un botón
- Algunos negocios quieren poder registrar ventas aunque "no quieran gestionar la caja"
- Configuración opcional: "Requerir caja abierta para vender" (default: sí)

#### F) Descuento en la apertura de caja
- Actualmente solo se declara el efectivo inicial
- No hay forma de registrar un "retiro de efectivo" mid-turno (ej. el dueño saca $5000 para gastos)
- Los "egresos de caja" son un requerimiento frecuente en comercios

#### G) Productos con imagen
- El campo `imagen_url` existe en `productos` pero no se usa en ningún lado del UI
- En el POS con grilla (mejora A), la imagen sería muy útil
- Para negocios sin código de barras, la imagen ayuda a identificar el producto

#### H) Backup / exportación de DB
- No hay mecanismo de backup accesible para el dueño
- Mínimo: export de productos + clientes + historial de ventas a CSV

---

## Priorización Recomendada

### Prioridad ALTA (bloquea producción real)
1. **POS con listado inicial de productos** — el flujo de trabajo diario lo requiere
2. **Saldo a favor en devoluciones** — la práctica de negocio más común en Argentina
3. **Adaptación TablaStock + detalles** — textos hardcodeados visibles en uso diario

### Prioridad MEDIA (mejora la calidad operativa)
4. **Cierre automático + emergencia** — evita cierres olvidados
5. **Egresos de caja mid-turno** — retiro de efectivo es operación cotidiana
6. **Exportación de ventas a CSV** — para contabilidad básica

### Prioridad BAJA (importante pero no urgente)
7. **Roles y multi-usuario** — requiere diseño de permisos completo
8. **Precios con listas** — solo si el rubro lo requiere
9. **Imágenes en POS** — mejora UX pero no bloquea operación

---

## Tareas de Implementación

### TAREA 1: POS con listado inicial
**Archivos:** `lib/pos/queries.ts`, `components/pos/POSContainer.tsx`, `components/pos/BuscadorVariantes.tsx`
- [ ] Agregar función `listarProductosDestacados(tiendaId, limit=20)` que retorna top vendidos del mes o los más recientes
- [ ] Crear componente `GrillaProductos.tsx` — grilla responsive de tarjetas de producto
- [ ] Crear componente `VarianteSelector.tsx` — modal para seleccionar variante de un producto
- [ ] Integrar grilla en `POSContainer` debajo del buscador
- [ ] Agregar chips de categoría para filtrado visual
- [ ] La grilla se oculta cuando hay texto en el buscador

### TAREA 2: Saldo a favor en devoluciones
**Archivos:** `app/actions/devoluciones.ts`, `components/devoluciones/FormDevolucion.tsx`, `lib/clientes/queries.ts`
- [ ] Migración: `ALTER TABLE clientes ADD COLUMN saldo_favor numeric(12,2) NOT NULL DEFAULT 0`
- [ ] En `crearDevolucion` action: agregar campo `tipo_resolucion: 'reembolso' | 'saldo_a_favor' | 'cambio'`
- [ ] Si `saldo_a_favor`: sumar al `clientes.saldo_favor`, NO insertar en `pagos_devolucion`
- [ ] En el formulario de devolución: selector de tipo de resolución (default: saldo_a_favor si hay cliente)
- [ ] En `PanelPago` del POS: mostrar y aplicar saldo a favor del cliente seleccionado

### TAREA 3: Adaptación TablaStock multi-rubro
**Archivos:** `components/stock/TablaStock.tsx`, `app/(dashboard)/stock/page.tsx`
- [ ] Convertir `TablaStock` a `'use client'` e importar `useRubro`
- [ ] Columna "Variante" usa `labelVar1` / `labelVar2` en el header
- [ ] Rendering: `{[it.talla, it.color].filter(Boolean).join(' / ')}` → mantener pero con labels en el header
- [ ] Si `!usarVar2`: ocultar columna de color

### TAREA 4: Detalle de venta/devolución con labels dinámicos
**Archivos:** `app/(dashboard)/ventas/[id]/page.tsx`, `app/(dashboard)/devoluciones/[id]/page.tsx`
- [ ] Usar `getConfigRubro` en el server component para obtener `labelVar1`/`labelVar2`
- [ ] Pasar los labels como prop a la tabla de detalles
- [ ] Reemplazar encabezados "Talla" y "Color" por los labels dinámicos

### TAREA 5: Cierre de emergencia
**Archivos:** `app/actions/caja.ts`, `components/caja/SesionAbiertaPanel.tsx`
- [ ] Migración: `ALTER TABLE sesiones_caja ADD COLUMN tipo_cierre text DEFAULT 'normal'` (normal | emergencia | automatico)
- [ ] Nueva action `cerrarSesionEmergencia(sesion_id)` — cierra sin arqueo, sin `efectivo_declarado`
- [ ] Botón "Cerrar de emergencia" en `SesionAbiertaPanel` con confirmación (modal)
- [ ] En el historial de sesiones: badge ⚠️ para cierres de emergencia

### TAREA 6: Egresos de caja
**Archivos:** `app/actions/caja.ts`, `components/caja/SesionAbiertaPanel.tsx`
- [ ] Nueva tabla `egresos_caja` (id, tienda_id, sesion_id, monto, motivo, created_at)
- [ ] Action `registrarEgresoCaja(sesion_id, monto, motivo)`
- [ ] En `SesionAbiertaPanel`: botón "+ Egreso" con formulario inline
- [ ] El cierre de caja descuenta los egresos del efectivo esperado

### TAREA 7: Exportación CSV ventas
**Archivos:** `app/api/export/ventas/route.ts` (nuevo)
- [ ] GET `/api/export/ventas?desde=&hasta=` → CSV con columnas: fecha, ticket, cliente, total, método de pago
- [ ] Botón "Exportar CSV" en la página de ventas (header)
- [ ] Mismo para el historial del cierre de caja

---

## Decisiones de Diseño a Validar con el Usuario

Antes de implementar, confirmar:

1. **¿Cuál es la política de devolución por defecto?**  
   Opciones: siempre pedir (como ahora) | default saldo_a_favor | default reembolso

2. **¿Los cajeros deben poder ver el dashboard de ganancias?**  
   → Define si implementamos roles o no

3. **¿Querés un POS con grilla visual o preferís mantener solo el buscador?**  
   → Cambia el diseño del POS significativamente

4. **¿Los egresos de caja son importantes para el flujo diario?**  
   → Si sí, es TAREA 6 de alta prioridad

5. **¿Se necesita precio mayorista?**  
   → Solo si tenés clientes B2B o vendés por cantidad

---

## Estado del Plan
- [ ] TAREA 1: POS con listado inicial
- [ ] TAREA 2: Saldo a favor en devoluciones
- [ ] TAREA 3: TablaStock multi-rubro
- [ ] TAREA 4: Detalle venta/devolución con labels
- [ ] TAREA 5: Cierre de emergencia
- [ ] TAREA 6: Egresos de caja
- [ ] TAREA 7: Exportación CSV
