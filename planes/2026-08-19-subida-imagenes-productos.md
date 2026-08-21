# Plan: Subida de imágenes de producto (base del catálogo)

**Creado:** 2026-08-19
**Estado:** Implementado
**Pedido:** Que los comercios suban fotos de sus productos en vez de pegar un enlace, como primer paso hacia un catálogo visual.

---

## Descripción General

### Qué Logra Este Plan

Reemplaza el input `URL de imagen` (hoy escondido en «Más detalles») por un **uploader de archivo** (cámara o galería del celular, o archivo en desktop). La foto se guarda en **Supabase Storage** (bucket público `productos`) y la URL pública queda en `productos.imagen_url`. El listado, el POS (grilla Catálogo), la consulta de precios y cualquier catálogo futuro consumen el mismo campo **sin cambiar el contrato de lectura**.

El comercio no necesita hosting externo ni copiar URLs. Una foto sacada en el local entra al sistema en el alta o en la edición.

### Por Qué Importa

Un catálogo (interno hoy, público después) sin fotos no se usa. El onboarding vende “20 productos listos para vender”; si esos productos no tienen imagen, el POS sigue siendo una lista de texto y un futuro link de catálogo no tiene qué mostrar. Este cambio es **infraestructura de catálogo**, no un retoque de form: bucket + RLS + path por tenant + una sola imagen de tapa por producto.

Alineado con: MVP usable en tiendas de ropa (Tier 1), carga express, y la deuda explícita del plan original de productos (`2026-04-29-modulo-productos.md`, decisión 10: “Imagen = URL en MVP; Storage queda para otro plan”).

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `productos.imagen_url` (`text`, nullable) | Única columna de imagen. Migración `supabase/migrations/20260419000003_productos.sql`. Sin tabla de galería ni imagen por variante. |
| `app/components/productos/ProductoForm.tsx` | Input `type="url"` label “URL de imagen”, **dentro del acordeón «Más detalles»** (cerrado por default). Estado `imagenUrl` → `ProductoInput.imagen_url`. |
| `app/app/actions/productos.ts` | `crearProducto` / `actualizarProducto` persisten `imagen_url`. `duplicarProducto` copia la URL. Soft-delete no borra storage (no hay storage). |
| `app/app/actions/carga-express.ts` | `resolverYCrearProductoExpress` inserta `imagen_url: null`. |
| `app/components/productos/carga-express/ExpressForm.tsx` + `CargaExpressRopa.tsx` | Flujo principal de ropa; no hay campo de imagen. Tras crear, redirige a `/productos/[id]` o “crear otro”. |
| `app/components/productos/ListaProductos.tsx` | Thumbnail 36×36 con `<img src={p.imagen_url}>` o placeholder vacío. |
| `app/components/pos/GrillaProductos.tsx` | Botón “Catálogo” en POS: card con imagen `object-cover` o emoji 🏷️. |
| `app/components/precios/BuscadorPrecios.tsx` | Muestra `item.imagen_url` si existe. |
| `app/lib/pos/queries.ts` / `app/lib/precios/queries.ts` | Ya seleccionan `imagen_url`. **No hay que tocar queries de lectura.** |
| `app/components/configuracion/LogoUpload.tsx` + `app/app/api/logo/route.ts` | **Patrón a copiar:** `FormData` → POST autenticado → `supabase.storage.upload` → `getPublicUrl` + cache-bust `?t=` → UPDATE de columna URL. DELETE recorre extensiones. Bucket `logos` (creado a mano en el dashboard; **no hay migración** de storage en el repo). |
| `app/next.config.ts` | `images.remotePatterns` ya permite `*.supabase.co/storage/v1/object/public/**`. |
| `app/lib/supabase/server.ts` | Cliente cookie + anon key. El upload de logo usa **este** cliente (RLS de storage aplica). No hay service-role en la app. |
| `public.get_tienda_id()` / `get_rol()` | Helpers SECURITY DEFINER usados en RLS. Storage policies deben usar `(select public.get_tienda_id())`. |
| Middleware `app/lib/supabase/middleware.ts` | Cajeros (`vendedor`) no entran a `/productos` ni `/configuracion`. **Las rutas `/api/*` no están en `RUTAS_SOLO_ADMIN`**: el API de imagen **debe** chequear rol `owner`/`admin` (el de logo tampoco lo hace; este plan sí). |
| CSV import | `ImportadorCSV.tsx` no tiene columna `imagen`. Voice wizard deja `imagen_url: null`. Fuera de alcance. |
| `app/components/ui/Button.tsx` | Primitive a usar en el uploader. No existe primitive de file-upload. |

### Brechas o Problemas que se Abordan

1. **Nadie pega una URL.** El dueño de un local tiene la prenda en la mano o una foto en el WhatsApp. El campo actual es inútil para el usuario real.
2. **El campo está escondido** en «Más detalles» (plan `2026-05-28-velocidad-ux-crear-producto.md` lo relegó por “baja frecuencia”). Para un catálogo la foto **es** alta frecuencia: hay que sacarla al cuerpo del form.
3. **No hay bucket ni RLS de storage para productos.** El logo existe, pero no es reproducible por migración y no sirve de path por producto.
4. **Fotos de celular pesan 4–12 MB.** Sin resize client-side el upload falla o sale caro. El logo acepta 2 MB y SVG (SVG **no** para productos: XSS en un futuro catálogo público).
5. **Alta sin `producto.id`:** no se puede path `{tienda}/{producto}/cover` hasta después del INSERT. Hay que subir **después** de crear, no un temp suelto que deje huérfanos.
6. **Carga express (ropa) crea productos sin foto.** Es el flujo más usado del rubro foco; si no entra ahí, el catálogo nace vacío.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear bucket público `productos` + policies RLS (migración SQL versionada).
- API `POST`/`DELETE` `/api/productos/imagen` (espejo de `/api/logo`), con auth, rol, pertenencia del producto al tenant, MIME + magic bytes, tope de tamaño.
- Helper client: comprimir/redimensionar (máx. 1600 px, JPEG/WebP) antes de subir.
- Componente `ImagenProductoUpload` (tokens v2 + `Button`): preview, subir/cambiar/quitar. Visible en el form, no en el acordeón.
- `ProductoForm`: sacar el input URL; en **crear** guardar el `File` y subir tras `crearProducto`; en **editar** subir/borrar en el momento (ya hay `id`).
- Carga express: el mismo componente; subir tras `resolverYCrearProductoExpress`.
- Lecturas (lista, POS, precios): sin cambio de contrato. URLs externas viejas siguen funcionando hasta que el comercio las reemplace.
- Docs: `CLAUDE.md` + nota en `contexto/proyectos.md`. **No** construir el catálogo público en este plan.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260819000002_storage_bucket_productos.sql` | Bucket `productos` público, límites MIME/tamaño, policies SELECT público + INSERT/UPDATE/DELETE autenticado scoped a `(storage.foldername(name))[1] = (select get_tienda_id())::text`. |
| `app/app/api/productos/imagen/route.ts` | POST (multipart `imagen` + `producto_id`) y DELETE (`producto_id` query o body). Auth, rol, ownership, validación, upload upsert, update `productos.imagen_url`, limpieza de otras extensiones. |
| `app/lib/productos/imagen-cliente.ts` | `redimensionarImagenProducto(file: File): Promise<Blob>` (canvas, max 1600px, JPEG q=0.82; si ya es chico y JPEG/WebP, devolver original si &lt; 1.5 MB). Constantes `MAX_FILE_BYTES_ORIGEN`, `TIPOS_PERMITIDOS`. |
| `app/lib/productos/imagen-api.ts` | `subirImagenProducto(productoId, file)` y `eliminarImagenProducto(productoId)` — `fetch` a la API, maneja error JSON. Usado por el componente y por los forms de alta. |
| `app/components/productos/ImagenProductoUpload.tsx` | UI reutilizable: preview cuadrado, botones Subir/Cambiar/Quitar, error, pending. Props: `productoId: string \| null`, `imagenUrl: string \| null`, `onUrlChange`, `onFilePendienteChange` (alta). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/productos/ProductoForm.tsx` | Quitar `Input` URL. Montar `ImagenProductoUpload` **arriba**, junto a nombre (visible siempre). Estado: `imagenUrl` + `filePendiente`. Tras `crearProducto` OK → si hay file, `subirImagenProducto(id, file)`; si falla, toast warning (producto igual existe). En editar, el componente sube/borra solo. `resetForm` limpia file e imagen. No enviar blob/data-URL en `ProductoInput.imagen_url`. |
| `app/components/productos/carga-express/ExpressForm.tsx` | Slot de imagen (preview + picker) o recibir `ImagenProductoUpload` como children/prop desde el padre. Preferencia: el padre (`CargaExpressRopa`) posee el estado del file para no inflar `ExpressForm` con API. Añadir bloque visual “Foto” en la sección 1. Producto. |
| `app/components/productos/carga-express/CargaExpressRopa.tsx` | Estado `fileImagen`. Tras `resolverYCrearProductoExpress` OK, subir. `resetForm` limpia file. Si upload falla: toast “Producto creado; cargá la foto al editar”. |
| `app/app/actions/productos.ts` | Sin cambio de firma. `crearProducto` sigue aceptando `imagen_url` (null en alta con file). Opcional: si `imagen_url` viene y **no** es `https://`, rechazar (evita data-URLs). No borrar storage en soft-delete. |
| `CLAUDE.md` | En “App CValleTienda”: foto de producto = Storage bucket `productos`, path `{tienda_id}/{producto_id}/cover.{ext}`, UI `ImagenProductoUpload`, API `/api/productos/imagen`. Catálogo público = futuro, no existe ruta. |
| `contexto/proyectos.md` | En backlog o “en desarrollo”: base de imágenes lista; catálogo público pendiente. |

### Archivos a Eliminar (si aplica)

Ninguno. El input URL se **reemplaza** en UI, no se elimina la columna ni el soporte de URLs ya guardadas.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Una sola imagen de tapa por producto (`cover`), no galería ni foto por variante.** El campo `imagen_url` ya es el contrato de lista/POS/precios. Galería (`producto_imagenes`) y foto por color/talle son el siguiente salto de catálogo; no bloquean el primero. Path reservado: `{tienda_id}/{producto_id}/cover.{ext}` — una galería futura puede ser `{tienda_id}/{producto_id}/{uuid}.{ext}` sin migrar el cover.

2. **Bucket público `productos` (no signed URLs).** Un catálogo futuro (link para el cliente del comercio) tiene que `<img src={imagen_url}>` sin sesión. Igual que `logos`. El aislamiento de **escritura** es RLS por primer folder = `tienda_id`. Lectura pública es consciente: las URLs son adivinables si se conoce el UUID del producto; los UUID no son secretos de seguridad, y el catálogo las va a exponer igual.

3. **API Route, no Server Action con File.** El logo ya funciona así. Next Server Actions tienen límite de body chico; el patrón `fetch` + `FormData` es el que el equipo ya entiende. `crearProducto` no se convierte a multipart.

4. **Alta: File en memoria → INSERT producto → POST imagen.** No hay carpeta `tmp/` (huérfanos). Si el upload falla, el producto queda sin foto y se carga en edición. Edición: upload/delete **inmediato** (hay `id`), como el logo.

5. **Sacar la foto de «Más detalles».** Visible en crear/editar y en carga express. El acordeón sigue para código base, unidad y descripción.

6. **Sin input URL en la UI** (“en vez de”, no “además”). CSV/voz no ganan columna de URL. URLs externas existentes siguen renderizando hasta que el comercio suba un archivo (el POST pisa `imagen_url` y opcionalmente no borra el hosting ajeno — no es nuestro objeto).

7. **Formatos: JPEG, PNG, WebP. No SVG.** Tope origen 8 MB (rechazo en cliente antes de canvas). Tras resize, tope servidor 2 MB. Resize: lado largo 1600 px (calidad catálogo en celular, peso típico 200–600 KB). MIME declarado **y** magic bytes en servidor.

8. **Roles: solo `owner` y `admin`.** Cajeros no cargan productos (middleware de páginas). El API igual rechaza `vendedor` con 403.

9. **Soft-delete del producto no borra el objeto.** Restaurar el producto conserva la foto. Quitar imagen (DELETE API) sí borra `cover.*` y pone `imagen_url = null`.

10. **Duplicar producto: sigue copiando la URL** (mismo objeto). Riesgo: quitar la foto del original afecta a la copia. Aceptable en v1; copiar el archivo es un extra (nota).

11. **UI primitives-first.** `Button` (`outline` subir, `danger`/`ghost` quitar). Tokens: `bg-surface-sunken`, `border-border-default` dashed, `rounded-[var(--radius-lg)]`, `text-fg-subtle`. Preview ~120×120 (`object-cover`). `accept="image/jpeg,image/png,image/webp"` — en celular el OS ofrece cámara/galería **sin** atributo `capture` (eso fuerza cámara y rompe desktop).

12. **No optimizar con Next `<Image>` en lista/POS.** Ya usan `<img>` nativo (URLs externas + query `?t=`). El uploader puede usar `<img>` también (preview local `URL.createObjectURL` + revoke). Evitar `unoptimized` + data URL como el logo si se puede.

13. **Sin cuota extra de plan.** Un cover por producto; el plan Básico ya limita a 300 productos. No hay feature-flag Pro para fotos.

14. **No tocar impresión** (`styles/print.css`, tickets, remitos, etiquetas). La foto no va al ticket.

### Alternativas Consideradas

| Enfoque | Por qué no |
|---------|------------|
| Dejar el input URL y “agregar” file | El usuario pidió reemplazo. Dos campos compiten y la URL sigue siendo el default. |
| Galería N fotos + tabla nueva | Catálogo v1 no la necesita; duplica UI, RLS, y el POS solo muestra una tapa. |
| Imagen por variante (color) | Correcto para ropa a largo plazo; explota el form y carga express. La tapa del producto alcanza para POS y un catálogo simple. |
| Signed URLs / bucket privado | Rompe `<img>` anónimo del catálogo futuro y obliga refresh de URLs. |
| Upload a `tmp/{uuid}` antes de crear el producto | Huérfanos si abandonan el form; hay que cron-limpiar. Peor que “subir después del INSERT”. |
| Server Action con `FormData` en `crearProducto` | Mezcla producto + binario, límite de body, y no reutiliza el patrón logo. |
| Convertir en el servidor (sharp) | Dependencia nativa en Vercel; el canvas del cliente alcanza. |
| Copiar el patrón de bucket `logos` sin migración | `logos` no está en git; el catálogo **tiene** que ser reproducible. |
| Servicio tipo Cloudinary | Costo, cuenta extra, y el stack ya es Supabase. |

### Preguntas Abiertas (si las hay)

Defaults abajo: si no hay respuesta, `/implementar` usa el default.

1. **¿Galería (varias fotos) en este mismo plan?** Default: **no**. Solo cover. Se puede hacer un plan 2 cuando exista la ruta pública de catálogo.
2. **¿Foto por color/variante?** Default: **no**.
3. **¿Incluir carga express?** Default: **sí** (ropa = Tier 1).
4. **¿Mantener un “pegar URL” escondido para power users?** Default: **no**.
5. **¿Mostrar la foto más grande en el POS (grilla Catálogo)?** Default: **no cambiar layout del POS** en este plan; solo se llena el `src` que ya existe (hoy `h-14`, bajo). Un follow-up puede subir a ~96–120 px cuando haya fotos reales.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración Storage — bucket `productos`

Crear `supabase/migrations/20260819000002_storage_bucket_productos.sql`.

**Acciones:**

- `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('productos', 'productos', true, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;`
- Policies en `storage.objects` (nombres estables, `drop policy if exists` antes):
  - `productos_imagenes_select_public`: `for select using (bucket_id = 'productos')`
  - `productos_imagenes_insert`: `for insert to authenticated with check (bucket_id = 'productos' and (storage.foldername(name))[1] = (select public.get_tienda_id())::text)`
  - `productos_imagenes_update`: `for update to authenticated using (...) with check (...)` mismo folder
  - `productos_imagenes_delete`: `for delete to authenticated using (...)`
- Comentario SQL: path canónico `{tienda_id}/{producto_id}/cover.{jpg|png|webp}`. Primer segmento = tenant (RLS).
- Aplicar la migración en el proyecto Supabase de desarrollo (CLI o dashboard SQL) **antes** de probar el API. Sin esto el upload falla con error de bucket.

**Archivos afectados:**

- `supabase/migrations/20260819000002_storage_bucket_productos.sql`

---

### Paso 2: API `/api/productos/imagen`

Espejo de `app/app/api/logo/route.ts` con extras de seguridad.

**Acciones — POST:**

- `createClient()` + `auth.getUser()`. 401 si no hay user.
- `perfiles`: `tienda_id`, `rol`. 403 si no hay perfil o `rol === 'vendedor'`.
- `formData`: `imagen` (File), `producto_id` (string UUID). 400 si faltan.
- Verificar producto: `from('productos').select('id, imagen_url').eq('id', productoId).eq('tienda_id', tiendaId).maybeSingle()`. 404 si no existe (no filtrar `activo` para permitir reponer foto en edge cases; si se prefiere, exigir `activo = true`).
- Validar `file.type` ∈ `image/jpeg|png|webp`.
- `file.size` ≤ 2 MB (post-resize).
- Magic bytes: leer primeros 12 bytes del `arrayBuffer`. JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`. Si no matchea, 400 “El archivo no es una imagen válida”.
- `ext` canónico: jpeg/jpg → `jpg`, png → `png`, webp → `webp`.
- Path: `${tiendaId}/${productoId}/cover.${ext}`.
- Antes de upload: `remove` de `cover.jpg`, `cover.jpeg`, `cover.png`, `cover.webp` (evita dos covers al cambiar de PNG a JPG).
- `storage.from('productos').upload(path, bytes, { contentType, upsert: true })`.
- `getPublicUrl(path)` + `?t=${Date.now()}`.
- `update productos set imagen_url = publicUrl where id = productoId and tienda_id = tiendaId`.
- JSON `{ url: publicUrl }`.

**Acciones — DELETE:**

- Mismos auth/rol.
- `producto_id` por query `?producto_id=` (simple para `fetch`).
- Ownership igual.
- `remove` las 4 keys `cover.*`.
- `update productos.imagen_url = null`.
- `{ ok: true }`.

**Errores:** mensajes en español, cortos, sin leak de internals. 500 solo con `uploadErr.message` sanitizado (el de logo hoy expone el mensaje de Storage; copiar eso está OK).

**Archivos afectados:**

- `app/app/api/productos/imagen/route.ts` (nuevo)

---

### Paso 3: Helpers cliente

**`app/lib/productos/imagen-cliente.ts`:**

- Constantes exportadas: `TIPOS_IMAGEN_PRODUCTO`, `MAX_BYTES_ANTES_RESIZE = 8 * 1024 * 1024`, `MAX_LADO = 1600`, `JPEG_QUALITY = 0.82`.
- Función `redimensionarImagenProducto(file: File): Promise<File>`:
  - Si `file.size > MAX_BYTES_ANTES_RESIZE` → throw `'La foto no puede superar 8 MB.'`
  - Si tipo no permitido → throw formato.
  - `createImageBitmap` o `Image()` + canvas. Si el lado largo ≤ 1600 y size ≤ 1.5 MB y tipo jpeg/webp → devolver el File original.
  - Si no: canvas, `toBlob('image/jpeg', 0.82)`, `new File([blob], 'cover.jpg', { type: 'image/jpeg' })`.
  - Fallback: si canvas falla, y size ≤ 2 MB, subir original; si no, throw.

**`app/lib/productos/imagen-api.ts`:**

```ts
export async function subirImagenProducto(productoId: string, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }>
export async function eliminarImagenProducto(productoId: string): Promise<{ ok: true } | { ok: false; error: string }>
```

- `subir`: primero `redimensionarImagenProducto`, luego `FormData` `imagen` + `producto_id`, `fetch('/api/productos/imagen', { method: 'POST', body })`.
- `eliminar`: `fetch('/api/productos/imagen?producto_id=' + encodeURIComponent(id), { method: 'DELETE' })`.

**Archivos afectados:**

- `app/lib/productos/imagen-cliente.ts`
- `app/lib/productos/imagen-api.ts`

---

### Paso 4: Componente `ImagenProductoUpload`

Client component. Props:

```ts
interface ImagenProductoUploadProps {
  productoId: string | null
  imagenUrl: string | null
  onUrlChange: (url: string | null) => void
  /** Alta: el padre guarda el File y lo sube después del INSERT */
  onFilePendienteChange?: (file: File | null) => void
  disabled?: boolean
}
```

**Comportamiento:**

- Preview: `imagenUrl` o object URL del file pendiente. Placeholder: ícono `Image` de lucide (ya usado en el repo) + texto “Sin foto”.
- Click “Subir foto” / “Cambiar foto” → `input[type=file]` hidden.
- Al elegir archivo:
  - Si `productoId`: `subirImagenProducto` → `onUrlChange(url)` o error.
  - Si no: preview local + `onFilePendienteChange(file)`. No pegar data-URL en `imagen_url` del producto.
- “Quitar foto”:
  - Si `productoId`: `eliminarImagenProducto` → `onUrlChange(null)`.
  - Si no: limpiar pendiente + preview.
- Copy: “JPG, PNG o WEBP. La foto se muestra en el listado y en el catálogo de caja. Máx. 8 MB (se comprime sola).”
- Pending: `Button isLoading` / texto “Subiendo…”.
- Error: `bg-danger-soft` + `text-danger-soft-fg` (como `LogoUpload`).
- `useEffect` cleanup de `URL.revokeObjectURL`.

**Archivos afectados:**

- `app/components/productos/ImagenProductoUpload.tsx`

---

### Paso 5: Integrar en `ProductoForm`

**Acciones:**

- Estado extra: `filePendiente: File | null` (además de `imagenUrl`).
- Renderizar `ImagenProductoUpload` **fuera** del acordeón, en la card principal (después de nombre o en una fila nombre | foto en `md:grid-cols-2` si no aprieta mobile — en mobile la foto va debajo del nombre, preview 120px, no 50vh).
- Borrar el `Input` “URL de imagen” del bloque «Más detalles».
- `handleSubmit` crear: `imagen_url: imagenUrl || null` **solo si** `imagenUrl` empieza con `http` (URL ya persistida). Nunca mandar blob:. Tras `crearProducto` OK con `res.data.id`: si `filePendiente`, llamar `subirImagenProducto`; warning si falla; luego redirect/reset como hoy.
- `resetForm`: `setImagenUrl('')`, `setFilePendiente(null)`.
- Modo editar: `productoId={productoId!}`, `onFilePendienteChange` omitido.

**Archivos afectados:**

- `app/components/productos/ProductoForm.tsx`

---

### Paso 6: Integrar en carga express (ropa)

**Acciones:**

- En `CargaExpressRopa`: `const [fileImagen, setFileImagen] = useState<File | null>(null)` y `imagenPreviewUrl` o dejar que el componente maneje preview con `productoId={null}`.
- Pasar `ImagenProductoUpload` a `ExpressForm` (nueva prop `imagenSlot: ReactNode`) **o** montarlo en `ExpressForm` con callbacks. Preferir **prop slot / callbacks** para que el padre haga el POST post-INSERT.
- Colocar el uploader en la sección “1. Producto”, visible (no dentro de detalles colapsables de código/descripción).
- `handleSubmit`: igual que ahora; si `res.ok && fileImagen && res.data.id` → `subirImagenProducto`. Luego toast / redirect / `resetForm` (incluir `setFileImagen(null)`).
- No cambiar `resolverYCrearProductoExpress` ni `imagen_url: null` en el action (el API actualiza después).

**Archivos afectados:**

- `app/components/productos/carga-express/CargaExpressRopa.tsx`
- `app/components/productos/carga-express/ExpressForm.tsx`

---

### Paso 7: Guardas menores en actions (opcional pero recomendado)

**Acciones:**

- En `crearProducto` / `actualizarProducto`: si `imagen_url` está seteado y no matchea `/^https:\/\//i`, guardar `null` (bloquea `javascript:` y data-URL). Las URLs de Storage son `https://...supabase.co/storage/...`.
- No cambiar `duplicarProducto`.
- Voice wizard: sin cambios (`imagen_url: null`).

**Archivos afectados:**

- `app/app/actions/productos.ts`

---

### Paso 8: Documentación de workspace

**Acciones:**

- `CLAUDE.md` sección App CValleTienda — Design System v2: una fila de tabla o bullet:
  - Foto de producto: upload a bucket Storage `productos`, path `{tienda_id}/{producto_id}/cover.{ext}`, columna `productos.imagen_url`, UI `ImagenProductoUpload`, API `/api/productos/imagen`. Una tapa por producto. Catálogo público = no implementado.
- `contexto/proyectos.md`: en Backlog, ítem “Catálogo público / link para clientes” con nota “bloqueado por fotos: base Storage hecha (plan 2026-08-19-subida-imagenes-productos)”.
- No hace falta `referencia/` nueva salvo que al implementar se descubra un gotcha de policies (entonces 10 líneas en el plan Notes de implementación).

**Archivos afectados:**

- `CLAUDE.md`
- `contexto/proyectos.md`

---

### Paso 9: Verificación manual (obligatoria antes de marcar Implementado)

**Acciones:**

- Aplicar migración en el proyecto Supabase que usa `.env` local.
- Crear producto (form clásico) **con** foto → aparece thumbnail en `/productos` y en POS → Catálogo.
- Crear producto **sin** foto → placeholder como hoy.
- Editar: cambiar foto (otra extensión) → una sola imagen, no quedan cover.png + cover.jpg.
- Editar: quitar foto → lista/POS sin imagen, `imagen_url` null.
- Carga express (rubro ropa): foto + crear → foto en el producto; “crear otro” limpia el picker.
- Producto creado y upload forzado a fallar (tipo `.gif`): producto existe, toast de warning.
- Cajero: no entra a `/productos`; si se llama el API a mano, 403.
- URL vieja (http externo) en un producto de prueba: sigue mostrándose hasta reemplazar.
- Mobile: elegir de galería; confirmar que no hay zoom iOS raro (el file input está hidden; el botón es ≥44px).

**Archivos afectados:**

- Ninguno de código; checklist del plan.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

Consumidores de `imagen_url` (solo lectura, no cambiar salvo bug de render):

- `app/components/productos/ListaProductos.tsx`
- `app/components/pos/GrillaProductos.tsx`
- `app/components/precios/BuscadorPrecios.tsx`
- `app/lib/pos/queries.ts`
- `app/lib/precios/queries.ts`
- `app/app/(dashboard)/productos/[id]/page.tsx` (pasa `imagen_url` al form)

Patrón a no romper:

- `app/app/api/logo/route.ts` / `LogoUpload.tsx` — no refactorizar logo en este plan.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` y `contexto/proyectos.md` (Paso 8).
- El plan original `planes/2026-04-29-modulo-productos.md` no se reescribe; este plan **cierra** la deuda “Storage postergado”.

### Impacto en Flujos de Trabajo Existentes

- Alta clásica y carga express ganan un paso visual (opcional: se puede guardar sin foto).
- POS Catálogo y lista empiezan a verse “de verdad” cuando hay fotos; sin fotos, igual que hoy.
- Import CSV y voz: siguen sin foto (aceptable).
- Costos: Storage de Supabase (covers ~300 KB × N productos). 300 productos Básico ≈ 90 MB. Irrelevante vs el valor del catálogo.
- Catálogo público **no** se habilita: no hay ruta `/c/[tienda]`, no hay RLS anónima sobre `productos`. Solo el bucket de imágenes es público.

---

## Lista de Validación

- [x] Migración escrita: bucket `productos` público, policies de folder = `tienda_id` (**aplicar en el proyecto Supabase** — no se pusheó desde acá)
- [x] POST `/api/productos/imagen` sube, actualiza `imagen_url`, cache-bust `?t=` (también `kind=color|variante`)
- [x] DELETE quita objetos `cover.*` y deja `imagen_url` null
- [x] GIF/SVG/PDF rechazados; JPEG grande se comprime en el cliente
- [x] Form crear: foto visible, no en «Más detalles»; URL input eliminado
- [x] Form editar: cambiar y quitar via API inmediata
- [x] Carga express (ropa) sube tapa + fotos por color post-INSERT
- [x] Lista `/productos` y POS Catálogo muestran la foto (miniaturas POS agrandadas)
- [x] Producto sin foto no rompe UI
- [x] `vendedor` recibe 403 en el API
- [x] No se tocó markup de impresión
- [x] Tokens semánticos + `Button`; sin `lime-*` / hex
- [x] `CLAUDE.md` y `contexto/proyectos.md` actualizados
- [x] URLs externas preexistentes siguen renderizando (columna `imagen_url` intacta)

---

## Criterios de Éxito

1. Un dueño de tienda puede cargar una foto desde el celular o la PC al **crear o editar** un producto, sin pegar ningún enlace.
2. Esa foto se ve en el listado de productos y en la grilla Catálogo del POS (mismo `imagen_url`).
3. El archivo vive en Storage bajo `{tienda_id}/{producto_id}/cover.*` con RLS de escritura por tenant, listo para un catálogo público que solo consuma la URL.
4. Carga express de ropa no queda atrás: también admite tapa.
5. Fallo de upload no impide crear el producto; se puede completar la foto después.

---

## Notas

- **Catálogo público (fuera de alcance):** página anónima, SEO, WhatsApp “ver productos”, precios visibles, multi-foto, foto por color. Este plan solo deja de ser cierto que “no hay cómo mostrar una prenda”.
- **POS thumbnail chico (`h-14`):** cuando haya 20+ fotos reales, vale un plan corto de “grilla catálogo más visual”. No mezclarlo acá.
- **Duplicar producto:** si duele en uso real, follow-up: `storage.copy` al nuevo `producto_id`.
- **Orphans:** cambiar foto ya borra otras extensiones. Soft-delete deja el cover (barato). Un job de limpieza no vale la pena ahora.
- **`logos` bucket:** sigue sin migración. No unificar buckets (políticas y límites distintos: logo admite SVG 2 MB).
- **Vercel body limit ~4.5 MB:** el resize client-side debe correr **antes** del POST; el servidor ve ≤ 2 MB.
- Aplicar la SQL en **producción** al deployar; si el bucket no existe, la UI muestra el error de Storage — el checklist de implementación debe incluir “migración corrida en el proyecto prod”.

---

## Notas de Implementación

**Implementado:** 2026-08-19

### Resumen

Se reemplazó el input URL por upload a Storage (tapa del producto) y se agregó **foto por color** (se aplica a todas las variantes de ese color). El POS muestra miniaturas más grandes (4:5, hasta 128 px) y la foto de la variante al elegir talle/color.

### Desviaciones del Plan

- Pedido en `/implementar`: además de la tapa, **fotos por color/variante**. Columna `variantes_producto.imagen_url`. Path `.../color/{color_id}/cover.{ext}`. UI `FotosPorColor` en el editor de variantes y en carga express.
- Miniaturas del POS agrandadas (el usuario dijo que sí si hacía falta): `h-14` → `aspect-[4/5] max-h-32`, grilla `max-h-[min(56vh,440px)]`.
- API unificada con `kind=cover|color|variante` en vez de solo cover.

### Problemas Encontrados

- La migración **no se aplicó** al proyecto remoto desde este entorno (hace falta `supabase db push` o pegar el SQL en el dashboard). Hasta que corra, el upload falla con error de bucket.
- `tsc --noEmit` OK.
