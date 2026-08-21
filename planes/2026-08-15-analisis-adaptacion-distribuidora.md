# Plan: Análisis — adaptar CValleTienda a Distribuidora vs app nueva

**Creado:** 2026-08-15
**Estado:** Borrador
**Pedido:** Análisis completo de qué tan lejos está el sistema de una distribuidora; decidir si conviene otra app o cambiar rubro y adaptar.

---

## Descripción General

### Qué Logra Este Plan

Deja documentada la distancia real entre CValleTienda (POS/CRM minorista multi-rubro) y una distribuidora B2B argentina, con una matriz de gaps por módulo y una recomendación de producto: **no crear otra app**, **no alcanza con cambiar el rubro**, y **sí se puede adaptar el mismo codebase** en fases, solo si hay un cliente piloto concreto.

El entregable de `/implementar` no construye el módulo mayorista: persiste el análisis en `salidas/`, actualiza `contexto/` con la decisión, y deja listo el follow-up de Fase 1 (mostrador mayorista) para cuando se apruebe.

### Por Qué Importa

CValleTienda nació para comercios minoristas (ropa → 9 rubros). Una distribuidora no es “otro rubro con otros labels”: es otro **modelo operativo** (pedido → armado → remito → factura → cobranza vs scan → ticket → cobro). Elegir mal (fork de app, o “cambio el rubro y listo”) quema meses de un founder único y desvía la prioridad estratégica actual: primeros clientes pagos del POS retail.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Dónde vive | Qué cubre hoy |
|------|------------|---------------|
| Rubros (9) | `app/lib/rubro/config.ts`, `config_rubro` en DB, `tiendas.rubro` | Labels de variantes, unidades, flags `usarRemitos` / `usarPack` / `usarBalanza`. **No hay rubro `distribuidora`.** |
| Catálogo | `productos`, `variantes_producto` | Un `precio_venta` (+ override por variante). `precio_compra`. Unidades: unidad/kg/pack/caja/etc. |
| Packs | `variantes_producto.pack_*` | Misma SKU suelta y en pack (pensado explícitamente para “cerveza suelta vs six-pack”). |
| POS | `/pos`, `app/app/actions/ventas.ts` | Flujo mostrador: scanner → carrito → cobro inmediato → ticket 58/80. Cliente opcional. |
| “Lista de precios” | `/precios` | Consulta de **un** precio de mostrador. No es lista mayorista/minorista. |
| Clientes | `clientes` | Persona física: nombre, DNI, teléfono, ciudad. **Sin CUIT, razón social, condición IVA, límite de crédito.** `saldo_favor` = crédito por devolución (siempre ≥ 0), no deuda. |
| Remitos | `/remitos`, `remitos` + `remito_items` | A4, tipos `entrega` / `cuenta_corriente`, estados cobro `pendiente`/`cobrado`. Puede existir sin `venta_id`. Visible solo si el rubro tiene `usarRemitos: true` (ferretería, corralón, genérico). |
| Caja | `/caja`, `cuentas_fondos`, `sesiones_caja` | Turno de mostrador + conciliación por cuenta. Pensado para retail, no para chofer/ruta. |
| Stock | `/stock`, `movimientos_stock` | Un depósito implícito (la tienda). Ingreso manual “reposición de proveedor”. **Sin módulo Compras/Proveedores.** |
| Factura AFIP | TusFacturas, config en tienda | Emisor (la tienda) tiene CUIT/IVA. Receptor en POS es débil (no hay ficha fiscal del cliente). |
| Equipo | `perfiles.rol` | `owner` / `admin` / `vendedor` (cajero). **Sin preventista, chofer, depósito.** |
| Multi-tenant | RLS `tienda_id` | Infraestructura reusable al 100% para un tenant-distribuidora. |
| Copy comercial | `contexto/info-negocio.md`, landing, pitch | Mercado = **comercios minoristas**. Remito clásico se menciona como “ideal para ferreterías, corralones y distribuidoras” — es copy, no producto. |

**Nav actual** (`app/components/layout/nav-config.ts`): Inicio, POS, Ventas, Lista de precios, Devoluciones, Remitos, Productos, Stock, Caja, Clientes, Reportes, Gráficos, Config. No hay Pedidos, Cobranzas, Proveedores, Rutas, Listas.

### Dos “distribuidoras” distintas (no mezclar)

| Tipo | Cómo opera | ¿CValle sirve hoy? |
|------|------------|-------------------|
| **A — Mostrador mayorista** | El cliente (kiosco, almacén, obra) viene o llama. Se carga el pedido en un mostrador, se entrega, se hace remito, se cobra ahora o se anota. Un depósito. Pocas listas de precio. | **Parcial.** Se puede operar mal con rubro `generico`/`ferreteria` + remitos + packs. Faltan listas, ficha B2B y CC real. |
| **B — Distribuidora de ruta / preventa** | Preventista toma pedido → depósito arma → chofer entrega con remito → cobra o deja en CC → se factura por lote. Zonas, vendedores, mínimos, varias listas. | **No.** El POS y la caja de turno son el modelo equivocado. |

La pregunta “¿cambiamos el rubro?” solo tiene sentido para el tipo A. El tipo B es un producto distinto en UX, aunque comparta backend.

### Brechas o Problemas que se Abordan

1. No existe un veredicto documentado: adaptar vs fork vs app nueva.
2. “Cambiar el rubro” se confunde con “ya es una distribuidora”.
3. No hay matriz de cobertura por capacidad crítica de una distribuidora argentina.
4. El roadmap retail (primeros clientes pagos) puede desviarse si se construye mayorista “por las dudas”.

---

## Análisis de cobertura (el núcleo de este plan)

Escala: **Listo** / **Reusable con cambios** / **No existe**.

### 1. Infraestructura (alta reutilización)

| Capacidad | Estado | Nota |
|-----------|--------|------|
| Multi-tenant + Auth + RLS | Listo | Un tenant = una distribuidora. |
| Design system v2 + shell | Listo | UI nueva usa primitives. |
| Roles básicos | Reusable | Falta rol preventista/chofer si tipo B. |
| PrintBridge + A4 remito | Listo | El remito clásico ya se vende como “para distribuidoras”. |
| Importación CSV productos | Reusable | Falta columnas de listas / bulto. |
| Reportes P&L + gráficos | Reusable | Miden venta de mostrador, no cobranza vs facturado. |
| Planes / billing SaaS | Listo | Precio retail; una distribuidora pagaría más, no requiere otra app. |

**Cobertura infraestructura: ~85%.**

### 2. Catálogo y stock

| Capacidad | Estado | Nota |
|-----------|--------|------|
| SKU + variantes + barcode | Listo | Sirve. En distribuidora las “variantes” suelen ser presentación (1 L / 2 L / pack 6). |
| Unidad de medida + caja/pack | Listo | `unidad`, `pack`, `caja` ya existen. |
| Pack por variante (suelto vs bulto) | Listo | Pieza más cercana a distribuidora que hay. |
| Un precio de venta | Reusable | Hay que pasar a N listas. El precio actual = “lista mostrador”. |
| Precio de costo | Listo | Sirve para margen. |
| Stock único por variante | Reusable | Tipo A: alcanza. Tipo B: a veces 2 depósitos (central + camión). |
| Ingreso de mercadería | Reusable | Hoy es ajuste/ingreso manual. Falta OC + recepción + proveedor. |
| Lotes / vencimientos | No existe | Crítico en alimentos/bebidas/farmacia. No en ferretería. |
| Multi-depósito / camión | No existe | Solo tipo B. |

**Cobertura catálogo/stock tipo A: ~70%. Tipo B: ~45%.**

### 3. Comercial (el hueco grande)

| Capacidad | Estado | Nota |
|-----------|--------|------|
| Cliente persona (DNI) | Listo | Retail. |
| Cliente empresa (CUIT, razón social, IVA) | No existe | Bloqueante para Factura A y CC seria. |
| Listas de precio (mayorista / minorista / especial) | No existe | `/precios` es lookup de un precio. |
| Precio por cliente o zona | No existe | |
| Descuento por volumen / mínimo de bultos | No existe | Hay descuento de línea/ticket en POS, no reglas. |
| Pedido con estados (borrador → armado → entregado) | No existe | `ventas.estado` tiene `pendiente` pero el POS cierra en el acto. |
| Preventa / vendedor con comisión por pedido | No existe | Comisión hoy = % del medio de pago (MP), no del vendedor. |
| Rutas / zonas / hoja de ruta | No existe | |
| Remito como documento central | Reusable | Existe, pero es satélite del POS. En distribuidora el remito **es** la operación. |
| Cuenta corriente real (deuda, límite, vencimiento, estado de cuenta) | No existe | `saldo_favor` es crédito a favor del cliente. Remito `cuenta_corriente` anota pendiente/cobrado, sin ledger ni límite. |
| Cobranzas (recibo, imputación a remitos/facturas) | No existe | Se “marca cobrado” el remito. |
| Factura A/B por lote de remitos | Reusable | AFIP existe; falta receptor fiscal + agrupar remitos. |
| Ticket 80 mm + caja de turno | Listo (retail) | En tipo A puede quedar. En tipo B estorba si es el flujo principal. |

**Cobertura comercial tipo A: ~35%. Tipo B: ~15%.**

### 4. Compras (lado proveedor)

| Capacidad | Estado | Nota |
|-----------|--------|------|
| Proveedores | No existe | |
| Orden de compra | No existe | |
| Recepción vs OC | No existe | |
| Actualizar costo al comprar | No existe | Se edita `precio_compra` a mano. |

**Cobertura compras: ~5%** (solo ingreso de stock).

### Distancia resumida

```
Infraestructura     ████████████████░░  85%
Catálogo / packs    ██████████████░░░░  70%  (tipo A)
Stock               ████████████░░░░░░  60%  (un depósito)
Remitos             ██████████░░░░░░░░  50%  (existe, no es el centro)
Clientes B2B        ██░░░░░░░░░░░░░░░░  15%
Listas de precio    █░░░░░░░░░░░░░░░░░   5%
Pedidos / preventa  ░░░░░░░░░░░░░░░░░░   0%
CC + cobranzas      ██░░░░░░░░░░░░░░░░  10%
Compras/proveedores █░░░░░░░░░░░░░░░░░   5%
Rutas / chofer      ░░░░░░░░░░░░░░░░░░   0%

TIPO A (mostrador mayorista):  ~40–50% del producto necesario
TIPO B (ruta / preventa):      ~25–30% del producto necesario
```

**Esfuerzo estimado (founder único, sin pausar retail):**

| Alcance | Semanas | Qué se entrega |
|---------|---------|----------------|
| Solo agregar rubro `distribuidora` (labels + remitos + packs) | 0.5 | Demo cosmética. **No cambia la operación.** |
| Tipo A — mostrador usable | 4–6 | Ficha B2B, 2–3 listas, CC ledger simple, remito como flujo principal, IVA en documentos. |
| Tipo A + compras básicas | +2–3 | Proveedores + ingreso con costo. |
| Tipo B — preventa + rutas | +10–16 | Pedidos, roles, hoja de ruta, cobranzas de viaje. **Otro producto.** |

---

## Decisión de producto (veredicto)

### Recomendación

**No conviene hacer otra app.** Conviene **el mismo codebase**, con un rubro `distribuidora` y un flag de operación (`mostrador` vs, más adelante, `preventa`). Motivos:

1. El 60–85% de lo caro ya está: tenant, RLS, catálogo, stock, packs, remitos A4, AFIP, caja, reportes, impresión, design system.
2. Una segunda app duplica auth, billing, deploy, bugs y soporte. Un founder no sostiene dos productos.
3. Un fork “CValleDistribuye” solo se justifica si el UX retail y el UX preventa se pisan tanto que el código compartido duele más que ayuda. Eso aparece en tipo B, no ahora.
4. Cambiar el rubro **sin** listas + cliente CUIT + CC real es mentirle a un financiero o a un dueño de distribuidora: los números y el flujo no son los de su negocio.

### Qué NO hacer

- No clonar el repo ni crear `app-distribuidora/`.
- No implementar tipo B (rutas/preventa) hasta tener un piloto que lo pague o lo use todos los días.
- No pausar el MVP retail “para convertirlo en distribuidora” si no hay un cliente concreto. La estrategia vigente (`contexto/estrategia.md`) es primeros tenants pagos minoristas.

### Qué SÍ hacer, en orden

1. **Ahora (este plan):** documentar el veredicto y las preguntas abiertas.
2. **Si hay piloto tipo A:** ejecutar un plan de implementación Fase 1 (mostrador mayorista) — plan hijo, no este archivo.
3. **Si el piloto es tipo B:** cotizar como proyecto aparte (precio y plazo distintos al Pro $45k). No mezclarlo con el roadmap ropa/despensa.

### Alternativas consideradas

| Enfoque | Por qué se rechaza (o se pospone) |
|---------|-----------------------------------|
| **App nueva desde cero** | Tira a la basura tenant, remitos, packs, AFIP, stock, DS. 4–8 meses para llegar a lo que ya hay. |
| **Fork del repo** | Dos deploys, dos schemas o migraciones divergentes. Solo si tipo B se vuelve el 80% de los clientes. |
| **Solo cambiar rubro** | 2 horas de config. El POS sigue siendo ticket de mostrador con un precio. Un financiero lo detecta en 10 minutos. |
| **Adaptar el mismo app (recomendado)** | Reusa infra. El riesgo es inflar el POS retail con pantallas de mayorista: se mitiga con `usarRemitos` + flag de rubro (el patrón ya existe). |

---

## Cambios Propuestos

### Resumen de Cambios

Este plan **no implementa** el módulo distribuidora. `/implementar` solo:

- Persiste el análisis como entregable en `salidas/`.
- Actualiza `contexto/` (negocio, estrategia, proyectos) con el veredicto.
- Deja referenciado el follow-up: `planes/2026-08-15-fase1-mostrador-mayorista.md` se crea **solo si** el usuario confirma piloto tipo A (no en este `/implementar` salvo que las preguntas abiertas se respondan “sí, tipo A, adelante”).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-08-15-analisis-adaptacion-distribuidora.md` | Copia ejecutiva del análisis (matriz, veredicto, esfuerzo) para leer sin abrir `planes/`. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `contexto/info-negocio.md` | Aclarar: mercado actual = minorista; distribuidora = adaptación futura, no rubro mágico. |
| `contexto/estrategia.md` | Registrar decisión: no fork; tipo A solo con piloto; tipo B fuera de Q actual. |
| `contexto/proyectos.md` | Backlog: “Fase 1 mostrador mayorista (condicional a piloto)”. |
| `CLAUDE.md` | No requiere cambio estructural (no hay comando ni carpeta nueva). Solo tocar si se agrega el rubro en código (fuera de este plan). |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Misma app, no otra app:** el costo de duplicar SaaS supera el de un flag de rubro/operación.
2. **El rubro no es el producto:** `distribuidora` en `CONFIG_RUBROS` es un *preset* (remitos on, packs on, devoluciones off o mínimas, labels Marca/Presentación). La operación se cambia con módulos, no con el enum.
3. **Tipo A primero, tipo B después:** el 80/20 está en ficha B2B + listas + CC + remito-como-venta. Rutas/preventa es otro proyecto.
4. **No construir Fase 1 en este `/implementar`:** este pedido es análisis y decisión. Código mayorista sin piloto viola YAGNI y la estrategia de primeros clientes retail.
5. **Reusar patrones existentes:** `usarRemitos` / `usarPack` / `getConfigRubro()` ya esconden módulos por rubro. Un futuro `usarListasPrecio` / `usarCuentaCorriente` sigue el mismo patrón.
6. **CC ≠ saldo a favor:** no reutilizar `clientes.saldo_favor` como deuda (el check es `>= 0`). Hace falta ledger (`movimientos_cc`) con signo, límite y vencimiento.
7. **Precio actual = lista default:** al agregar listas, `productos.precio_venta` queda como lista “mostrador” / “lista 1” para no migrar el retail.

### Alternativas Consideradas

Ver tabla en “Decisión de producto”. Se rechazó app nueva y fork. Se pospuso tipo B.

### Preguntas Abiertas (bloquean Fase 1 de código)

Responder antes de un `/crear-plan` de implementación mayorista:

1. **¿Hay un cliente piloto concreto?** ¿Quién, qué vende (bebidas, alimentos, limpieza, materiales), de qué ciudad?
2. **¿Tipo A (mostrador) o tipo B (preventa/rutas)?** Si no está claro: asumir A.
3. **¿Cuántas listas de precio necesita el día 1?** (2 = mayorista/minorista suele alcanzar.)
4. **¿La factura electrónica es bloqueante el día 1** o con remito + CC alcanza para el piloto?
5. **¿Lotes/vencimientos** son obligatorios en su mercadería?
6. **¿Se pausa el roadmap retail** para esto o se hace en paralelo solo cuando el piloto está confirmado?

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante `/implementar`. Son de documentación, no de producto mayorista.

### Paso 1: Persistir el análisis en `salidas/`

Crear `salidas/2026-08-15-analisis-adaptacion-distribuidora.md` con:

- Veredicto en las primeras 15 líneas: misma app; no alcanza el rubro; tipo A 4–6 semanas; tipo B 3–5 meses; no fork.
- Tabla de cobertura (secciones 1–4 de este plan).
- Distancia resumida (barras %).
- Esfuerzo estimado.
- Preguntas abiertas.
- Link a este plan: `planes/2026-08-15-analisis-adaptacion-distribuidora.md`.

**Acciones:**

- Escribir el archivo en prosa ejecutiva (dueño / financiero puede leerlo).
- No copiar el formato de plan (sin “Tareas Paso a Paso”).

**Archivos afectados:**

- `salidas/2026-08-15-analisis-adaptacion-distribuidora.md`

---

### Paso 2: Actualizar `contexto/info-negocio.md`

En “Mercado objetivo” / “Contexto Clave”, agregar un párrafo:

- CValleTienda es un POS/CRM para **comercios minoristas**.
- Una **distribuidora B2B** no se cubre cambiando el rubro: requiere listas, cliente fiscal, CC y (si hay rutas) pedidos.
- Decisión 2026-08-15: adaptar el mismo sistema en fases si hay piloto; no crear otra app.
- Link al análisis en `salidas/`.

**Archivos afectados:**

- `contexto/info-negocio.md`

---

### Paso 3: Actualizar `contexto/estrategia.md`

Agregar bajo decisiones clave (sin cambiar el pricing vigente):

- **Distribuidora:** no fork / no app nueva. Tipo A solo con piloto. Tipo B fuera del foco hasta validar retail.
- Prioridad Q vigente sigue siendo primeros clientes pagos minoristas (ropa, despensa).

**Archivos afectados:**

- `contexto/estrategia.md`

---

### Paso 4: Actualizar `contexto/proyectos.md`

En Backlog, agregar una fila:

| Proyecto | Descripción |
|----------|-------------|
| Mostrador mayorista (condicional) | Fase 1 tipo A: ficha B2B, listas, CC ledger, remito como flujo. Bloqueado a piloto. Análisis: `salidas/2026-08-15-analisis-adaptacion-distribuidora.md`. |

No mover CValleTienda MVP ni inventar un segundo producto.

**Archivos afectados:**

- `contexto/proyectos.md`

---

### Paso 5: Verificar CLAUDE.md

Comprobar que no hace falta listar un comando nuevo ni cambiar la estructura de carpetas. **No editar** si no hay cambio estructural (este plan no agrega comandos ni módulos).

**Archivos afectados:**

- `CLAUDE.md` (solo si el check da que sí; esperado: no tocar)

---

### Paso 6: No escribir código de rubro ni módulos

Prohibido en este `/implementar`:

- Agregar `'distribuidora'` a `Rubro` / `CONFIG_RUBROS` / CHECK de `tiendas`.
- Tablas `listas_precio`, `movimientos_cc`, `proveedores`, `pedidos`.
- Cambiar el POS.

Eso va a un plan hijo **después** de responder las preguntas abiertas.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/lib/rubro/config.ts` | Presets de rubro; acá iría el preset `distribuidora` en Fase 1. |
| `app/types/database.ts` | `Rubro`, `Cliente`, `TipoRemito`. |
| `app/components/layout/nav-config.ts` | Habría que mostrar Remitos / futuras Cobranzas según flags. |
| `app/components/configuracion/RubroForm.tsx` | Selector de rubro. |
| `supabase/migrations/20260509000004_fase3.sql` | `remitos`. |
| `supabase/migrations/20260517000001_remito_cobro_items.sql` | Remito CC (pendiente/cobrado). |
| `supabase/migrations/20260510000003_saldo_a_favor.sql` | No reutilizar para deuda. |
| `planes/2026-05-09-adaptacion-multi-rubro.md` | Origen del modelo de rubros. |
| `planes/2026-05-23-pack-por-variante-reestructuracion.md` | Packs pensados para caso distribuidora (cerveza). |
| `planes/2026-05-10-facturacion-electronica-afip-tusfacturas.md` | AFIP reusable. |
| `planes/2026-05-10-analisis-profundo-sistema-multi-rubro.md` | Ya anotaba “no hay precio mayorista”. |

### Actualizaciones Necesarias para Consistencia

- `contexto/*` (pasos 2–4).
- Landing/pitch **no** se cambian en este plan (seguir vendiendo minorista). Si se promete “distribuidora” en el PDF comercial, corregirlo en un plan de copy aparte.

### Impacto en Flujos de Trabajo Existentes

Ninguno hasta Fase 1. El POS retail, ropa, despensa y el resto de rubros no se tocan.

Cuando exista Fase 1: los tenants `ropa`/`despensa` no deben ver listas ni CC mayorista. El aislamiento es el mismo patrón que `usarRemitos`.

---

## Lista de Validación

- [ ] Existe `salidas/2026-08-15-analisis-adaptacion-distribuidora.md` con veredicto, matriz y esfuerzo
- [ ] `contexto/info-negocio.md` distingue minorista vs distribuidora
- [ ] `contexto/estrategia.md` registra “misma app, no fork, tipo A condicional”
- [ ] `contexto/proyectos.md` tiene el backlog condicional
- [ ] `CLAUDE.md` revisado; sin cambios innecesarios
- [ ] No se agregó rubro ni tablas nuevas
- [ ] El usuario tiene las 6 preguntas abiertas para decidir Fase 1

---

## Criterios de Éxito

La implementación de **este** plan está completa cuando:

1. Un tercero puede leer `salidas/2026-08-15-analisis-adaptacion-distribuidora.md` y entender: misma app, no basta el rubro, tipo A vs B, plazos.
2. El workspace (`contexto/`) no contradice el veredicto.
3. No se escribió código de producto mayorista.

La adaptación **de producto** (otra cosa) está completa cuando, en un piloto tipo A:

1. Un cliente con CUIT tiene lista mayorista y el remito usa ese precio.
2. La ficha muestra deuda real (no solo saldo a favor) y un estado de cuenta.
3. Un financiero entiende qué número es “cuánto me deben” vs “cuánto hay en caja”.

---

## Notas

### Si hay que demoar una distribuidora mañana (sin código nuevo)

1. Registrar tenant con rubro **`generico`** o **`ferreteria`** (remitos + packs on).
2. Cargar productos con pack (bulto) y unidad.
3. Usar remito tipo `cuenta_corriente` para “deja fiado”.
4. Advertir: un solo precio, cliente sin CUIT, no hay límite ni estado de cuenta, la caja es de mostrador.

Eso es una **demo de ferretería/corralón grande**, no una distribuidora. Sirve para no mentir en la reunión.

### Relación con el problema de saldos / dashboard

Si en una demo un financiero no entiende “cuánto hay en cada cuenta ahora” ni “cuánto se debe”, eso es un bug/UX de **caja y fondos** (retail), no se resuelve con el rubro distribuidora. Tratarlo en un plan aparte de saldos. Una CC mayorista **suma** un tercer número (“me deben”) que hoy no existe.

### Competencia

Sistemas tipo Contabilium / Softland / mayoristas verticales ya cubren tipo B. CValle no debe entrar a ese ring hasta tener 2–3 tenants retail pagando. El hueco defendible es **mostrador mayorista chico** (interior, 1 depósito, 50–300 clientes, 1–2 listas) que hoy usa Excel + remitos de Word.

### Siguiente comando (cuando respondan las preguntas)

`/crear-plan Fase 1 mostrador mayorista: ficha B2B, N listas, ledger CC, remito como flujo principal, sin rutas`

### Fase 1 producto

Implementado en `planes/2026-08-15-rubro-distribuidora-pedidos-cc.md`: mismo POS, un precio + recargo %, remito auto, ledger `saldo_cc`. Sin portal ni rutas.
