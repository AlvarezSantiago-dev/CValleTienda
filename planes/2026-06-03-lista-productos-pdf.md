# Plan: Lista de productos descargable en PDF atractivo

**Creado:** 2026-06-03
**Estado:** Borrador
**Pedido:** Descargar lista de los productos organizados en formato PDF atractivo visualmente, fácil de leer

---

## Descripción General

### Qué Logra Este Plan

Agrega un botón "Descargar PDF" en la página `/productos` que genera una lista completa de productos, agrupada por categoría, con precio de compra, precio de venta, stock y código de barras. El PDF se genera en el navegador como HTML imprimible (sin dependencias externas), siguiendo el mismo patrón que los remitos del sistema.

### Por Qué Importa

Los dueños de comercios necesitan frecuentemente una lista impresa para control de inventario, exhibición de precios para clientes, o referencia rápida del stock. Hoy la única forma de exportar es un CSV técnico que no sirve para mostrar o imprimir. Un PDF atractivo y organizado mejora la operatoria diaria.

---

## Estado Actual

### Estructura Existente Relevante

- `app/lib/productos/queries.ts` — `listarProductos()` devuelve productos con categoría y stock agregado (con paginación)
- `app/app/(dashboard)/productos/page.tsx` — página principal de productos con búsqueda y filtro por categoría
- `app/app/api/productos/template-csv/route.ts` — patrón de API route para exportar datos de productos
- `app/components/productos/ListaProductos.tsx` — componente que lista productos en pantalla
- Patrón de impresión HTML: remitos en `app/components/remitos/RemitoImprimible.tsx` generan HTML con estilos inline y usan `window.print()` en el cliente

### Brechas o Problemas que se Abordan

- No hay manera de imprimir/descargar la lista de productos en un formato presentable
- El CSV es técnico y no apto para mostrar a clientes o usar como referencia visual
- No se puede ver el listado completo (la página tiene paginación de 20 items por página)

---

## Diseño Técnico

### Estrategia: API Route HTML + window.print()

Sin dependencias externas de PDF. Igual al patrón de remitos del sistema:

1. **API Route** `GET /api/productos/pdf` — recibe `?categoria=` (opcional) como query param, autentica al usuario, carga **todos** los productos (sin paginación), genera HTML completo con estilos inlineados y lo devuelve como `text/html`
2. **Botón cliente** en `/productos` — hace `window.open('/api/productos/pdf')` y el navegador abre la página; el usuario puede imprimir o guardar como PDF con Ctrl+P → "Guardar como PDF"

### Diseño del PDF

**Layout por categoría** — los productos se agrupan bajo encabezados de categoría:

```
┌────────────────────────────────────────────────────┐
│  LOGO   NOMBRE TIENDA            Fecha: 03/06/2026 │
│         Lista de Precios                           │
├────────────────────────────────────────────────────┤
│ ▪ BEBIDAS (12 productos)                           │
├──────┬────────────────────────┬───────┬─────┬──────┤
│ Cód  │ Nombre                 │ P.C.  │ P.V.│Stock │
├──────┼────────────────────────┼───────┼─────┼──────┤
│      │ Cerveza Quilmes 355ml  │ $800  │$1200│  24  │
│      │ Cerveza Quilmes 1L     │$1.200 │$1800│   8  │
├──────┴────────────────────────┴───────┴─────┴──────┤
│ ▪ ROPA (34 productos)                              │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

**Opciones visuales:**
- Fuente: system-ui/sans-serif (no requiere Google Fonts)
- Colores: encabezado oscuro `#0A0A0A`, filas alternadas con `#f9fafb`
- Logo de la tienda si está configurado (usando `/api/logo`)
- Precio compra configurable (mostrar/ocultar según param `?mostrar_costo=1`)
- Footer con nombre de tienda y fecha de generación
- Diseño A4, márgenes optimizados para impresión

---

## Tareas de Implementación

### Tarea 1 — API Route para generar HTML

**Archivo:** `app/app/api/productos/pdf/route.ts`

```typescript
// GET /api/productos/pdf?categoria=ID&mostrar_costo=1
```

- Autenticar con `createClient()` y verificar usuario
- Llamar `listarProductos()` con `pageSize: 9999` para traer todos sin paginación
- Si viene `?categoria=ID`, filtrar solo esa categoría
- Agrupar productos por `categoria.nombre` (los sin categoría van en "Sin categoría")
- Ordenar grupos alfabéticamente; dentro de cada grupo, productos por nombre A-Z
- Obtener nombre de tienda, logo_url desde configuración
- Generar string HTML completo con estilos `<style>` inlineados en `<head>`
- Devolver `new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })`

**Estructura del HTML generado:**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Lista de Productos — {tiendaNombre}</title>
  <style>
    /* reset, tipografía, tabla, colores, @media print */
  </style>
</head>
<body>
  <header>logo + nombre tienda + fecha</header>
  <h1>Lista de Productos</h1>
  <p class="subtitle">Generado el {fecha}</p>
  
  {por cada categoría}
  <section class="categoria">
    <h2>BEBIDAS <span class="count">(12 productos)</span></h2>
    <table>
      <thead>...</thead>
      <tbody>
        {filas con color alternado}
      </tbody>
    </table>
  </section>
  
  <footer>{tiendaNombre} — {fecha}</footer>
  <script>window.print()</script>
</body>
</html>
```

**Columnas de la tabla:**
- Nombre del producto
- Código base (si tiene)
- Precio compra (solo si `?mostrar_costo=1`)
- Precio venta
- Stock total
- Cant. variantes (si > 1)

### Tarea 2 — Botón en la página de productos

**Archivo:** `app/app/(dashboard)/productos/page.tsx`

Agregar un `<a>` o botón al lado del botón "Importar" / "Nuevo producto":

```tsx
<a
  href="/api/productos/pdf"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
>
  <svg ...icono PDF/impresora... />
  Descargar PDF
</a>
```

Si hay categoría activa como filtro (`searchParams.categoria`), agregar el param a la URL del botón para que el PDF respete el mismo filtro:
```
href={`/api/productos/pdf${sp.categoria ? `?categoria=${sp.categoria}` : ''}`}
```

### Tarea 3 — Verificar con datos reales

- Abrir `/api/productos/pdf` en el navegador
- Verificar que se dispara el diálogo de impresión
- Probar con muchos productos (corte de página correcto)
- Probar con filtro de categoría
- Verificar que el logo aparece si está configurado

---

## Archivos a Crear/Modificar

| Archivo | Acción |
|---|---|
| `app/app/api/productos/pdf/route.ts` | **CREAR** — API route que genera el HTML |
| `app/app/(dashboard)/productos/page.tsx` | **MODIFICAR** — agregar botón "Descargar PDF" |

Solo 2 archivos. Sin migraciones. Sin dependencias nuevas.

---

## Consideraciones de Seguridad

- La API route verifica autenticación con `supabase.auth.getUser()` antes de devolver datos
- Los datos se obtienen via `createClient()` que respeta RLS (Row Level Security) — cada tienda solo ve sus propios productos
- El param `mostrar_costo` es opcional; por defecto el precio de compra NO se muestra (protección de márgenes ante capturas de pantalla)

---

## Notas de Diseño Visual

El PDF debe verse profesional pero simple. Referencia de estilo:

- **Fondo header categoría:** `#0A0A0A` texto blanco, border-radius 0
- **Filas impares:** blanco; **filas pares:** `#f9fafb`
- **Borde tabla:** `1px solid #e5e7eb`
- **Precio venta:** negrita, color `#0A0A0A`
- **Stock bajo (< stock_min):** celda en rojo suave `#fef2f2` con texto `#dc2626`
- **`page-break-inside: avoid`** en cada sección de categoría para que no se parta en la impresión
- Tamaño de fuente base: 11px (optimizado para A4)
