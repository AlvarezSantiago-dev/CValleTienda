# Carga express — ropa

Flujo rápido para cargar un modelo con **stock distinto por talle × color** en una sola pantalla.

**Ruta:** `/productos/carga-express` (solo rubro `ropa`)

## Cómo usarlo (demo / onboarding)

1. Abrí **Productos → Carga express** (o el botón en el listado).
2. Completá nombre, precios y categoría.
3. Elegí colores y talles (chips).
4. En la **matriz**, cargá cantidades solo donde hay mercadería (ej. 1 en rojo-XS, 2 en rojo-M, 3 en azul-XXL). Las celdas vacías **no** crean variante.
5. Revisá el preview y tocá **Crear producto** (o **Crear y cargar otro**).

### Atajo: dictado en 2 pasos

1. **Paso 1 — Datos:** nombre, colores, precios, categoría → **Interpretar datos**.
2. **Paso 2 — Stock:** `1 rojo XS, 2 azules M…` → **Interpretar stock**.
3. Revisá la matriz y creá el producto.

Así el sistema no confunde cantidades con talles. Micrófono: Chrome/Edge.

## Qué hace al interpretar (dictado)

- Si la **categoría**, **color** o **talle** no existen, los **crea al instante** (al tocar Interpretar).
- Los talles solo se crean si parecen válidos (XS, S, M, L, XL, números 20–60, etc.) para no inventar basura.

## Qué hace el sistema al guardar

- Resuelve cualquier taxonomía pendiente que haya quedado sin ID.
- Crea solo las variantes con stock &gt; 0.
- Genera EAN-13 si el toggle está activo.
- Registra movimientos de stock `inicial` (vía `crearProducto`).

## Pitch comercial

- “En minutos, no en horas”: stock real por talle y color sin armar planillas.
- Diferenciador vs POS genéricos en el onboarding de tiendas de ropa.
- No depende de APIs de IA (sin costo variable ni keys).

## Límites

- Máx. 50 variantes por carga.
- Formulario clásico (`/productos/nuevo`) y CSV siguen disponibles.
- IA / OCR de remitos: roadmap, no incluido.
