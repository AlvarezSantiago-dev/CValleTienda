# Plan: Carga Express de Productos (Ropa) — NL + Matriz Inteligente + IA opcional

**Creado:** 2026-08-11
**Estado:** Implementado
**Pedido:** Profundizar y mejorar completamente la carga de productos para tiendas de ropa, ahorrando horas por carga, contemplando todos los campos del sistema (nombre, colores con stock distinto por color, precios compra/venta, categoría, tallas, códigos, etc.), evaluando IA si aporta, y su impacto en pricing del servicio.

---

## Descripción General

### Qué Logra Este Plan

Entrega un flujo **Carga Express** pensado como piensa una tienda de ropa al recibir mercadería: nombre del modelo, **stock por celda talle×color** (ej. 1 rojo XS, 2 rojos M, 3 azules XXL), precios, categoría — en **una sola pantalla con secciones** (híbrido; no wizard multi-página ni “todo ciego en un párrafo”), con preview y confirmación. Incluye **pegar texto NL local** que rellena la matriz, y **IA diferida** (no MVP) solo como fallback. Reutiliza `crearProducto` y `variantes_producto` sin romper el form clásico ni el CSV.

### Por Qué Importa

Hoy el onboarding comercial incluye solo **20 productos** (`estrategia.md`: onboarding $120.000) porque cargar catálogo es lento: matriz talla×color + bulk fill uniforme no cubre el caso real “1 rojo XS, 2 rojos M, 3 azules XXL” (cantidades distintas por combinación). Esa fricción es el mayor costo oculto del SaaS para ropa (Tier 1 comercial). Una carga express que baje de ~5–10 min/producto con variantes a ~20–40 s justifica **subir onboarding**, **incluir más SKUs en el alta**, y posicionar CValleTienda por encima de POS genéricos (Bepos, MiPOS) en el argumento “listos para vender el mismo día”.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Rutas / archivos | Qué hace hoy |
|------|------------------|--------------|
| Form clásico | `app/components/productos/ProductoForm.tsx`, `/productos/nuevo` | Nombre, categoría, precios, modo simple vs variantes |
| Matriz | `MatrizGenerador.tsx` | Cartesianas talla×color; **stock siempre 0** |
| Bulk | `BulkFill.tsx` | Mismo precio/stock para **todas** las filas |
| Taxonomías | `InlineCreate.tsx`, tabs categorías/tallas/colores | Crear sin salir del form |
| CSV | `/productos/importar`, `importarProductosCSV` | Hasta 500 filas; Pro; sin Excel |
| Voz | `components/voz/*`, `lib/voz/variantes.ts` | Wizard por pasos (Web Speech); parsea “S cinco M diez”; **no** stock por color en un solo utterance |
| Actions | `app/app/actions/productos.ts` → `crearProducto` | Producto + variantes + movimientos `inicial` |
| Modelo | `variantes_producto` (talla_id, color_id, stock_actual, codigo_barras, precio_venta) | SKU = combinación única |
| Planes | `app/lib/planes/config.ts` | Pro: `importar_csv`; Básico: max 300 productos (gating técnico) |
| Design system | `components/ui/`, tokens semánticos | UI nueva primitives-first |

### Brechas o Problemas que se Abordan

1. **Stock distinto por talle×color** — BulkFill aplica el mismo stock a todas las filas; no soporta “1 rojo XS / 2 rojos M / 3 azules XXL”.
2. **Entrada mental del dueño** — piensa en modelo + combinaciones con qty + precios, no en matriz vacía + checkboxes.
3. **Texto libre incompleto** — el párrafo con talles exactos no tiene parser; la voz es multi-paso rígido y no arma matriz sparsa.
4. **Matriz actual es “todo o nada”** — genera el producto cartesiano con stock 0; no matriz sparsa (solo celdas con qty > 0).
5. **IA inexistente** — no hay LLM en `app/`; solo STT del navegador (y **no se recomienda para el MVP** — ver decisión de costo).
6. **Onboarding caro en tiempo** — 20 productos en el paquete refleja el costo operativo de carga manual.
7. **CSV útil pero no “express”** — requiere armar planilla; no ayuda en el mostrador al abrir cajas.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva ruta **`/productos/carga-express`** (rubro `ropa`) con UI **híbrida de una pantalla** (secciones, no wizard de muchas páginas).
- **Matriz sparsa talle×color con qty por celda** como núcleo (solo se crean variantes con qty > 0, o qty 0 si el usuario lo pide explícito).
- **Parser NL local** que entiende líneas tipo `1 rojo XS`, `2 rojos M`, `3 azules XXL` y rellena la matriz → preview → `crearProducto`.
- **IA fuera del MVP** (fase posterior opcional); el plan documenta costo real vs. beneficio.
- Atajos desde `/productos` (“Carga express”).
- Documentación comercial + tests del parser (incluido ejemplo New Balance con talles).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/app/(dashboard)/productos/carga-express/page.tsx` | Página server: auth, rubro ropa (redirect si no), catálogos, límites de plan |
| `app/components/productos/carga-express/CargaExpressRopa.tsx` | Orquestador: una pantalla con secciones + drawer/panel “Pegar texto” |
| `app/components/productos/carga-express/ExpressForm.tsx` | Cabecera: nombre, cat, precios; selección colores + tallas; enlaza matriz |
| `app/components/productos/carga-express/MatrizStockSparsa.tsx` | Grid color (filas) × talla (columnas); input qty por celda; total por fila/columna |
| `app/components/productos/carga-express/ExpressPreview.tsx` | Preview de N variantes + totales + CTA Crear / Crear y otro |
| `app/components/productos/carga-express/NlPasteBox.tsx` | Textarea “pegá o dictá el pedido” + botón Interpretar |
| `app/lib/productos/carga-express/parser-nl.ts` | Parser determinístico ES → `CargaExpressDraft` |
| `app/lib/productos/carga-express/expandir-variantes.ts` | Draft → `VarianteInput[]` según política tallas |
| `app/lib/productos/carga-express/tipos.ts` | Tipos del draft y resultado de parse |
| `app/lib/productos/carga-express/ejemplos.ts` | Placeholders / ejemplos de texto para onboarding UX |
| `app/app/api/productos/carga-express/interpretar/route.ts` | (Fase IA) POST texto → JSON draft vía LLM; auth + rate limit |
| `app/lib/productos/carga-express/llm-interpretar.ts` | Prompt + schema Zod + llamada provider |
| `app/__tests__/carga-express-parser.test.ts` (o `app/lib/.../parser-nl.test.ts`) | Casos: ejemplo New Balance, precios, categoría, sin tallas |
| `referencia/carga-express-ropa.md` | Guía operativa + copy comercial para demos |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/productos/TabsProductos.tsx` | Link/cta “Carga express” (solo `ropa`) |
| `app/app/(dashboard)/productos/page.tsx` | Botón primario secundario hacia carga express |
| `app/app/(dashboard)/productos/nuevo/page.tsx` | Banner corto: “¿Llegó mercadería? Usá Carga express” |
| `app/app/actions/productos.ts` | Opcional: `crearProductoDesdeExpress(draft)` thin wrapper (validación + auto-crear colores/tallas faltantes + EAN batch + `crearProducto`); o reutilizar helpers existentes |
| `app/lib/planes/config.ts` | Feature `carga_ia` (Pro); opcional flag UI `carga_express` disponible en todos si se decide |
| `app/lib/voz/*` + `VoiceProvider` | (Fase 2) modo one-shot que alimenta el mismo parser NL |
| `CLAUDE.md` | Mencionar Carga Express ropa + referencia |
| `contexto/estrategia.md` | Nota de valor: carga express como argumento de onboarding/pricing (tras OK comercial) |

### Archivos a Eliminar (si aplica)

Ninguno. El form clásico, matriz, CSV y voz por pasos se mantienen.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **UX ganadora = híbrido de una pantalla (cerrado)**:
   - **No** wizard de muchos pasos como default (lento al cargar 30 modelos).
   - **No** “redactá todo en un párrafo” como único camino (fácil errar talles sin ver la grilla).
   - **Sí**: una pantalla — (1) datos del producto, (2) colores y talles, (3) **matriz de stock** editable, (4) Crear. “Pegar / dictar” solo **rellena** la matriz; el humano corrige celdas antes de guardar.

2. **Núcleo = matriz sparsa talle×color** (ejemplo canónico):
   - `1 rojo XS`, `2 rojos M`, `3 azules XXL` → 3 variantes (no cartesiano completo).
   - Celdas vacías / 0 → no crear variante (default).

3. **Sin IA en MVP**: el 90% del ahorro es la matriz + cabecera. NL local es el extra. IA post-MVP.

4. **Costo de IA (cerrado: no MVP)**:
   - **Sí tiene costo de API** (tokens). Con modelo mini ≈ fracciones de centavo USD por interpretación; a escala de demos/primeros clientes es **irrelevante** vs $45.000/mes.
   - **El costo real** es complejidad, keys, errores y mal parseo de talles — no la factura.
   - **Veredicto:** no hace falta IA para que esto sea excelente; sumarla después (OCR remitos / texto caótico).

5. **Reutilizar `crearProducto`** sin tablas nuevas.

6. **Parser NL local** para `N color TALLE` + precios + categoría; rellena la misma matriz.

7. **Scope fase 1 = `ropa`**.

8. **Pricing:** Express sostiene onboarding más rico / upsell; no subir mensual “porque hay IA”.

### Alternativas Consideradas

| Enfoque | Pros | Contras | Decisión |
|---------|------|---------|----------|
| Wizard paso a paso | Bueno para primer uso | Lento en carga masiva | No default (opcional fase 2 capacitación) |
| Solo párrafo NL | Rápido si sale bien | Errores sin grilla | Solo relleno |
| Híbrido 1 pantalla + matriz | Rápido, visible, corregible | Un poco más de UI | **Elegido** |
| Solo LLM | Demo wow | Ops + riesgo | Post-MVP |
| Solo CSV | Migraciones | No mostrador | Paralelo |

### Preguntas Abiertas (restantes)

1. ¿Crear variantes con stock 0 en celdas vacías del grid, o solo qty &gt; 0? (recomendación: solo &gt; 0).
2. ¿Actualizar copy de onboarding (20 → N) en el mismo trabajo o aparte?
3. ¿Modo guiado (wizard) en fase 2 para capacitación?

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Tipos y motor de expansión (sin UI)

Definir el contrato del draft y cómo se convierte en variantes.

**Acciones:**

- Crear `tipos.ts` con algo equivalente a:

```ts
export type CargaExpressCelda = {
  colorNombre: string
  tallaNombre: string
  cantidad: number // enteros; > 0 para crear por default
}

export type CargaExpressDraft = {
  nombre: string
  descripcion?: string | null
  categoriaNombre?: string | null
  precioCompra: number
  precioVenta: number
  // ejes seleccionados (para armar el grid UI)
  colores: { nombre: string; hex?: string | null }[]
  tallas: string[]
  // stock sparso (fuente de verdad al guardar)
  celdas: CargaExpressCelda[]
  crearCeldasEnCero?: boolean // default false
  codigoBase?: string | null
  generarBarras: boolean // default true
}
```

- Implementar `expandir-variantes.ts`:
  - Por cada celda con `cantidad > 0` (o ≥ 0 si `crearCeldasEnCero`): 1 `VarianteInput` con ids resueltos.
  - No generar el cartesiano completo salvo que el usuario active “crear celdas en 0”.
- Validaciones: nombre, `precioVenta > 0`, ≥ 1 celda válida, tallas/colores resolubles o creables.

**Archivos afectados:**

- `app/lib/productos/carga-express/tipos.ts`
- `app/lib/productos/carga-express/expandir-variantes.ts`

---

### Paso 2: Parser NL determinístico

Que el ejemplo del usuario (y variantes) se transforme en draft sin IA.

**Acciones:**

- Implementar `parser-nl.ts` que detecte bloques (orden flexible):
  - Nombre: “nombre …”, comillas, o hasta “color(es)”
  - Lista de colores mencionados (para ejes del grid)
  - **Celdas sparsas**: `N color TALLE` / `N colores TALLE` (ej. `1 rojo xs`, `2 rojos M`, `3 azules XXL`); plurales; talles XS–XXXL y numéricos
  - Precios compra/venta; categoría
- Normalizar tallas/colores vs catálogo; marcar nuevos.
- Devolver `{ draft, warnings[], confidence }` — sin precio venta → warning bloqueante.
- Casos de test obligatorios:
  1. `Crear producto nombre "Nuevas prendas New Balance" colores rojo, azul, verde, amarillo. 1 rojo xs, 2 rojos M, 3 azules XXL. Precio compra 5000, precio venta 12000. Categoria zapatillas.` → 3 celdas.
  2. Orden distinto / sin comillas.
  3. Solo colores sin celdas → warning “faltan cantidades por talle”.
  4. Talle desconocido → warning + sugerencia crear.

**Archivos afectados:**

- `app/lib/productos/carga-express/parser-nl.ts`
- `app/lib/productos/carga-express/ejemplos.ts`
- test del parser

---

### Paso 3: Server action / resolución de taxonomías

**Acciones:**

- Agregar `resolverYCrearProductoExpress(draft: CargaExpressDraft)` en `productos.ts` (o archivo `carga-express.ts` actions):
  1. Auth + `tienda_id` + chequear límite Básico `max_productos` si aplica.
  2. Resolver/crear categoría por nombre (`crearCategoria` si no existe).
  3. Resolver/crear cada color (`crearColor` + hex default si falta).
  4. Resolver/crear tallas si modo expandir.
  5. Mapear a `ProductoInput` + variantes vía `expandir-variantes` (con ids reales).
  6. Si `generarBarras`: `generarCodigosBarrasBatch`.
  7. `crearProducto(input)`.
  8. `revalidatePath` productos/stock.
- No duplicar lógica de stock: seguir dejando movimientos `inicial` a `crearProducto`.

**Archivos afectados:**

- `app/app/actions/productos.ts` o `app/app/actions/carga-express.ts`

---

### Paso 4: UI Carga Express (híbrido 1 pantalla)

**Acciones:**

- Página `carga-express/page.tsx`: catálogos + rubro `ropa` (si no → redirect `/productos/nuevo`).
- Secciones en orden vertical (siempre visibles, scroll):
  1. **Producto**: Nombre*, Categoría (InlineCreate), Precio compra, Precio venta*, detalles colapsados.
  2. **Ejes**: multi-select / chips Colores + Talles (+ crear inline).
  3. **MatrizStockSparsa**: filas = colores, columnas = talles; inputs numéricos; totales; solo celdas &gt; 0 entran al draft.
  4. **Preview + CTA**: Crear / Crear y cargar otro; toggle generar EAN.
- Design system v2 primitives-first.

**Archivos afectados:**

- `app/app/(dashboard)/productos/carga-express/page.tsx`
- `app/components/productos/carga-express/*`

---

### Paso 5: Pegar texto (NL → rellena matriz)

**Acciones:**

- Panel `NlPasteBox` (colapsable arriba o lateral) con ejemplo New Balance + talles.
- Interpretar → parser local → setea nombre/precios/ejes/`celdas` en el mismo estado.
- Usuario corrige en la **matriz** (fuente de verdad visual) y confirma.
- Micrófono opcional → texto al textarea (sin wizard multi-paso).

**Archivos afectados:**

- `NlPasteBox.tsx`, `CargaExpressRopa.tsx`

---

### Paso 6: Navegación y descubrimiento

**Acciones:**

- CTA “Carga express” en listado / tabs / banner en `/productos/nuevo` (ropa).
- Empty state prioriza express.

**Archivos afectados:**

- `TabsProductos.tsx`, `productos/page.tsx`, `nuevo/page.tsx`

---

### Paso 7: Fase IA — NO implementar en el primer `/implementar`

Queda documentada en Notas. Solo si más adelante el parser local no alcanza (remitos foto, texto caótico). Archivos `interpretar/route.ts` y `llm-interpretar.ts` **no se crean en MVP**.

---

### Paso 8: Documentación y consistencia workspace

**Acciones:**

- Escribir `referencia/carga-express-ropa.md` (cómo usarlo en demo comercial + ejemplos).
- Actualizar `CLAUDE.md` (App CValleTienda): bullet Carga Express ropa.
- Opcional: párrafo en `contexto/estrategia.md` sobre valor onboarding (si el usuario aprueba el ángulo comercial).
- Marcar este plan **Implementado** + Notas al cerrar `/implementar`.

**Archivos afectados:**

- `referencia/carga-express-ropa.md`, `CLAUDE.md`, este plan

---

### Paso 9: Validación

**Acciones:**

- Tests parser (Paso 2).
- Manual: crear producto New Balance 4 colores / qtys distintas; verificar filas en DB y stock en `/stock`.
- Manual: expandir S/M/L replicar; contar variantes = 4×3 = 12.
- Manual: color nuevo se crea en catálogo.
- Manual: códigos EAN únicos.
- Verificar no regresión: `/productos/nuevo` y CSV siguen igual.
- Lighthouse/UX móvil: form usable en tablet (carga en local).

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `crearProducto`, `crearColor`, `crearTalla`, `crearCategoria`, `generarCodigosBarrasBatch`
- `lib/rubro/config.ts` (`ropa`)
- Voz: puede consumir el mismo draft a futuro
- Import CSV: camino paralelo para migraciones grandes
- Planes comerciales / PDF en `salidas/` (copy onboarding)

### Actualizaciones Necesarias para Consistencia

- Feature flag `carga_ia` en `DESCRIPCION_FEATURE`
- Presentación comercial / pitch: mencionar “Carga express” cuando esté live
- No tocar impresión (`styles/print.css`, remitos)

### Impacto en Flujos de Trabajo Existentes

- **Form clásico**: intacto (productos unitarios / edición / kits).
- **CSV**: intacto (migración masiva).
- **Voz**: mejora opcional one-shot; wizard viejo puede quedar.
- **Onboarding humano**: el operador usa Express en la capacitación 3×1h → más productos cargados en la misma sesión.

---

## Lista de Validación

- [x] Ruta `/productos/carga-express` accesible para tienda rubro ropa
- [x] Matriz sparsa: `1 rojo XS / 2 rojos M / 3 azules XXL` crea exactamente 3 variantes con esos stocks
- [x] Celdas vacías no crean variantes (default)
- [x] Parser NL pasa tests del ejemplo New Balance **con talles**
- [x] Pegar texto rellena la matriz editable (no saltea el preview)
- [x] Colores/tallas/categoría inexistentes se crean al confirmar
- [x] Códigos EAN únicos si toggle on
- [x] Crear y cargar otro resetea sin perder catálogos
- [x] CTA visible desde listado productos (ropa)
- [x] Form clásico y CSV sin regresiones
- [x] Sin dependencia de LLM en MVP
- [x] `referencia/carga-express-ropa.md` + `CLAUDE.md` actualizados
- [x] Plan marcado Implementado con notas

---

## Criterios de Éxito

La implementación está completa cuando:

1. Un operador carga el ejemplo New Balance con **talles exactos y qtys distintas** en **&lt; 60 s** (matriz o pegar+corregir) y el stock en DB/POS coincide celda a celda.
2. El parser NL local resuelve ese ejemplo **sin LLM**.
3. No hay tablas nuevas ni regresión en `crearProducto` / escaneo.
4. Queda claro el ángulo comercial (onboarding más rico / upsell de carga) **sin** depender de IA para el pitch.

---

## Notas

### Recomendación UX (cerrada)

**Mejor forma posible = híbrido de una pantalla con matriz talle×color**, no wizard largo ni “todo en un texto” solo. El texto/voz es atajo; la grilla es la verdad.

### Costo de integrar IA

| Concepto | Realidad |
|----------|----------|
| ¿Tiene costo de plata? | **Sí**, por llamada API (muy bajo: ~centavos de dólar al mes con pocos clientes) |
| ¿Justifica el MVP? | **No** — la matriz sparsa ya resuelve el dolor |
| ¿Cuándo sí? | Texto muy desordenado, OCR de remitos, sugerir categoría/descripción |
| Riesgo mayor | Mal parseo de talles + ops (keys, errores), no la factura |

### ¿Es potente? ¿Se puede elevar el costo del servicio?

**Sí.** El argumento de venta es la matriz sparsa + velocidad de onboarding, no “tenemos IA”. Monetizar vía onboarding / pack carga / cierre vs POS baratos.

### Roadmap post-MVP

- Modo guiado (wizard) solo para capacitación
- OCR remito + IA
- Excel `.xlsx`
- Extender a otros rubros
- Plantillas por proveedor

### Relación con planes anteriores

Supersede en espíritu (ropa) a agilidad/velocidad ya parcialmente en código. Este plan: **matriz sparsa + NL local + híbrido UX**.

---

## Notas de Implementación

**Implementado:** 2026-08-11

### Resumen

Se entregó `/productos/carga-express` (ropa): pantalla híbrida con cabecera, ejes color/talle, matriz sparsa de stock, preview, pegar texto NL local (sin IA), action `resolverYCrearProductoExpress`, tests del parser, CTAs en listado/tabs/nuevo/empty state, y docs en `referencia/` + `CLAUDE.md`.

### Desviaciones del Plan

- No se crearon archivos de IA (`interpretar/route.ts`, `llm-interpretar.ts`, feature `carga_ia`) — explícito en Paso 7.
- No se actualizó `contexto/estrategia.md` ni copy comercial del PDF (preguntas abiertas 2–3 dejadas para plan comercial).
- No se extendió el wizard de voz one-shot (fase 2).
- Defaults cerrados: solo qty &gt; 0; sin wizard guiado en MVP.
- `CargaExpressClient.tsx` omitido: la page importa `CargaExpressRopa` directo.

### Problemas Encontrados

- Parser NL: tokens con punto final (`XXL.`) no matcheaban talles — se agregó `limpiarToken` y talles alfanuméricos más permisivos. Tests verdes (`npx tsx --test lib/productos/carga-express/parser-nl.test.ts`).
`)