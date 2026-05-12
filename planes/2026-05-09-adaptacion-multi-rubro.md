# Plan: Adaptación Multi-Rubro del Sistema

**Creado:** 2026-05-09
**Estado:** Borrador
**Pedido:** Adaptar CValleTienda para múltiples rubros (ropa, ferretería, corralón, despensa/kiosco, etc.) en 3 fases, comenzando desde el registro de usuario.

---

## Descripción General

Actualmente el sistema está hardcodeado para tiendas de ropa: variantes con `talla` y `color`, stock entero (sin decimales), sin concepto de rubro ni unidad de medida. La arquitectura multi-tenant ya es sólida, lo que facilita la adaptación.

El plan se divide en **3 fases incrementales** que permiten cerrar clientes reales (el corralón) desde la Fase 1 sin esperar a la implementación completa.

---

## Contexto Técnico — Estado Actual

### Lo que existe y funciona ✓
- Multi-tenant por `tienda_id` con RLS completo
- Registro crea tienda automáticamente via trigger `handle_new_user()` en Supabase
- El trigger lee `raw_user_meta_data` del usuario de Auth para crear la tienda
- `registroAction` en `app/actions/auth.ts` envía solo: `nombre`, `nombre_tienda`, `rol`
- Variantes: `talla_id` (FK → tabla `tallas`) + `color_id` (FK → tabla `colores`)
- `stock_actual INTEGER` en `variantes_producto`
- `cantidad INTEGER` en `detalles_venta`
- POS busca solo por código de barras o nombre de producto

### Problemas que bloquean otros rubros ✗
- `stock_actual` y `cantidad` son `INTEGER` → no permite kg, litros, metros
- No existe campo `rubro` en `tiendas` ni `configuracion_tienda`
- No existe `unidad_de_medida` en `productos`
- Variantes hardcodeadas a talla/color — no aplica a ferretería/corralón
- Formulario de registro no pregunta rubro
- UI nombra "Talla" y "Color" en todos lados
- Etiquetas tienen `mostrar_talla` y `mostrar_color` hardcodeados

---

## Rubros objetivo

| Rubro | ID slug | Venta típica | Variantes | Unidades |
|-------|---------|--------------|-----------|----------|
| Tienda de ropa | `ropa` | Por unidad | Talla + Color | unidad |
| Ferretería | `ferreteria` | Por unidad / pack | Medida + Material | unidad, pack |
| Corralón | `corralon` | Por kg, m³, unidad | Tipo + Calidad | kg, tonelada, m³, m lineal, bolsa, unidad |
| Despensa / Kiosco | `despensa` | Por unidad / kg | Marca + Presentación | unidad, kg, litro, pack |
| Librería | `libreria` | Por unidad | Marca + Modelo | unidad |
| Genérico | `generico` | Por unidad | Var1 + Var2 | unidad |

---

## Fase 1 — Básico (Corralón ya puede operar)

**Objetivo:** Permitir el registro por rubro, habilitar decimales en cantidades y stock, agregar unidad de medida por producto. El POS detecta la unidad y habilita cantidad decimal cuando corresponde.

**Tiempo estimado:** 3-4 días  
**Resultado:** El corralón puede registrarse y operar en el sistema.

---

### 1.1 — Migración de base de datos

**Archivo:** `supabase/migrations/20260509000001_multi_rubro_fase1.sql`

```sql
-- 1. Agregar campo rubro a tiendas
ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS rubro text NOT NULL DEFAULT 'ropa';

ALTER TABLE public.tiendas
  ADD CONSTRAINT tiendas_rubro_check
  CHECK (rubro IN ('ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico'));

-- 2. Agregar unidad_de_medida a productos
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS unidad_de_medida text NOT NULL DEFAULT 'unidad';

ALTER TABLE public.productos
  ADD CONSTRAINT productos_unidad_check
  CHECK (unidad_de_medida IN ('unidad', 'kg', 'gramo', 'tonelada', 'litro', 'metro', 'm2', 'm3', 'bolsa', 'pack', 'caja'));

-- 3. Cambiar stock_actual a numeric(10,3) en variantes_producto
ALTER TABLE public.variantes_producto
  ALTER COLUMN stock_actual TYPE numeric(10,3) USING stock_actual::numeric(10,3);

-- 4. Cambiar cantidad a numeric(10,3) en detalles_venta
ALTER TABLE public.detalles_venta
  ALTER COLUMN cantidad TYPE numeric(10,3) USING cantidad::numeric(10,3);

-- (Los constraints existentes siguen válidos: cantidad > 0)
```

**Impacto en datos existentes:** ninguno. Los valores enteros actuales se convierten a numeric sin pérdida.

---

### 1.2 — Actualizar trigger `handle_new_user` en Supabase

El trigger en `20260419000002_perfiles.sql` debe leer `rubro` de los metadatos y almacenarlo en `tiendas`.

**Migración adicional:**

```sql
-- supabase/migrations/20260509000002_handle_new_user_rubro.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tienda_id     uuid;
  v_nombre_tienda text;
  v_rubro         text;
  v_rol           text;
BEGIN
  v_nombre_tienda := new.raw_user_meta_data ->> 'nombre_tienda';
  v_rubro         := coalesce(new.raw_user_meta_data ->> 'rubro', 'generico');

  IF (new.raw_user_meta_data ->> 'tienda_id') IS NOT NULL THEN
    v_tienda_id := (new.raw_user_meta_data ->> 'tienda_id')::uuid;
    v_rol       := coalesce(new.raw_user_meta_data ->> 'rol', 'vendedor');
  ELSE
    INSERT INTO public.tiendas (nombre, rubro)
    VALUES (coalesce(v_nombre_tienda, 'Mi Tienda'), v_rubro)
    RETURNING id INTO v_tienda_id;
    v_rol := 'owner';
  END IF;

  INSERT INTO public.perfiles (id, tienda_id, nombre, apellido, rol)
  VALUES (
    new.id,
    v_tienda_id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'apellido',
    v_rol
  );

  RETURN new;
END;
$$;
```

---

### 1.3 — Formulario de registro — agregar selector de rubro

**Archivo:** `app/app/(auth)/registro/page.tsx`

Agregar campo `rubro` como selector con opciones visuales (tarjetas con icono o select). Posición: entre "Nombre de la tienda" y "Tu nombre".

```tsx
// Select de rubro — opciones disponibles
const RUBROS = [
  { value: 'ropa',       label: 'Tienda de Ropa',      icon: '👗' },
  { value: 'ferreteria', label: 'Ferretería',           icon: '🔧' },
  { value: 'corralon',   label: 'Corralón',             icon: '🏗️' },
  { value: 'despensa',   label: 'Despensa / Kiosco',    icon: '🛒' },
  { value: 'libreria',   label: 'Librería',             icon: '📚' },
  { value: 'generico',   label: 'Otro rubro',           icon: '🏪' },
]
```

UI: grid de tarjetas seleccionables 2x3, con borde resaltado al seleccionar. Input hidden con el valor. Default: ninguno seleccionado (requiere selección).

---

### 1.4 — Server Action `registroAction` — pasar rubro

**Archivo:** `app/app/actions/auth.ts`

```ts
// Agregar lectura del rubro del formData
const rubro = formData.get('rubro') as string

if (!rubro) redirect('/registro?error=Seleccioná el tipo de negocio')

// Y pasarlo en los metadata:
options: {
  data: {
    nombre,
    nombre_tienda: nombreTienda,
    rubro,   // ← nuevo
    rol: 'owner',
  },
}
```

---

### 1.5 — Tipos TypeScript — actualizar

**Archivo:** `app/types/database.ts`

```ts
// Agregar al tipo Tienda
rubro: 'ropa' | 'ferreteria' | 'corralon' | 'despensa' | 'libreria' | 'generico'

// Agregar al tipo Producto
unidad_de_medida: 'unidad' | 'kg' | 'gramo' | 'tonelada' | 'litro' | 'metro' | 'm2' | 'm3' | 'bolsa' | 'pack' | 'caja'

// Cambiar en CartItem y DetalleVenta
cantidad: number  // ya es number en TS, pero el backend ahora acepta decimales
```

---

### 1.6 — POS — habilitar cantidad decimal por unidad de medida

**Archivo:** `app/components/pos/Carrito.tsx`

- Si `unidad_de_medida !== 'unidad' && !== 'pack' && !== 'caja' && !== 'bolsa'` → el input de cantidad permite decimales (`step="0.001"`)
- Mostrar unidad junto a la cantidad: "2.500 kg", "3 unidad"
- El botón de incremento (+1) respeta la unidad: si es kg, incrementa 0.5 por defecto

**Archivo:** `app/components/pos/BuscadorVariantes.tsx`

- En los resultados de búsqueda, mostrar la unidad de medida del producto
- Ejemplo: "Cemento Portland — $3500/bolsa" o "Arena — $150/kg"

---

### 1.7 — Productos — mostrar y editar unidad de medida

**Archivo:** `app/components/productos/ProductoForm.tsx`

- Agregar campo `unidad_de_medida` como select en el formulario de producto
- Las opciones disponibles pueden variar por rubro (ver helpers de Fase 2), pero en Fase 1 se muestran todas

---

### 1.8 — Stock — mostrar decimales

**Archivos:** componentes del módulo de stock

- Mostrar `stock_actual` con decimales donde corresponda
- Formulario de ajuste de stock: permitir cantidad decimal

---

### Checklist Fase 1

- [ ] Migración SQL `20260509000001_multi_rubro_fase1.sql` aplicada
- [ ] Migración SQL `20260509000002_handle_new_user_rubro.sql` aplicada
- [ ] Registro muestra y requiere selección de rubro
- [ ] `registroAction` envía `rubro` en metadata
- [ ] Tienda creada con `rubro` correcto en la DB
- [ ] Tipos TypeScript actualizados
- [ ] POS acepta cantidad decimal cuando la unidad no es entera
- [ ] Buscador muestra unidad de medida en resultados
- [ ] Formulario de producto tiene campo `unidad_de_medida`
- [ ] Stock acepta y muestra decimales

---

## Fase 2 — Completo (Variantes dinámicas por rubro)

**Objetivo:** Reemplazar el sistema hardcodeado de `talla`/`color` por atributos configurables por rubro. El POS y los módulos se adaptan visualmente según el rubro de la tienda.

**Tiempo estimado:** 2 semanas  
**Resultado:** Cada rubro tiene sus propios atributos de variante. "Talla" se convierte en "Medida" para ferretería, "Tipo" para corralón, etc.

---

### 2.1 — Sistema de atributos de variante genéricos

**Nuevo paradigma:** En lugar de `talla_id` y `color_id` hardcodeados, los rubros definen qué dimensiones tienen sus variantes.

**Opción A (recomendada para MVP):** Mantener `talla_id` y `color_id` en la DB pero configurar **labels** por rubro. Más simple, menos riesgo.

```sql
-- supabase/migrations/20260509000003_rubro_config.sql

-- Configuración de etiquetas de variante por rubro
CREATE TABLE public.config_rubro (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubro           text NOT NULL UNIQUE,
  label_var1      text NOT NULL DEFAULT 'Talla',    -- Qué se llama la talla en este rubro
  label_var2      text NOT NULL DEFAULT 'Color',    -- Qué se llama el color
  usar_var1       boolean NOT NULL DEFAULT true,    -- Si usa la primera variante
  usar_var2       boolean NOT NULL DEFAULT true,    -- Si usa la segunda variante
  unidades_disponibles text[] NOT NULL DEFAULT ARRAY['unidad'],
  categorias_sugeridas text[] DEFAULT NULL,          -- Categorías precargadas
  descripcion     text
);

-- Datos iniciales por rubro
INSERT INTO public.config_rubro (rubro, label_var1, label_var2, usar_var1, usar_var2, unidades_disponibles, categorias_sugeridas, descripcion)
VALUES
  ('ropa',       'Talla',      'Color',      true,  true,  ARRAY['unidad'],                                                    ARRAY['Remeras', 'Pantalones', 'Vestidos', 'Calzado', 'Accesorios'],             'Tienda de indumentaria y accesorios'),
  ('ferreteria', 'Medida',     'Material',   true,  true,  ARRAY['unidad', 'pack', 'caja'],                                    ARRAY['Herramientas', 'Fijaciones', 'Pinturas', 'Electricidad', 'Plomería'],      'Ferretería y materiales de construcción menores'),
  ('corralon',   'Tipo',       'Calidad',    true,  false, ARRAY['unidad', 'kg', 'tonelada', 'm3', 'metro', 'bolsa'],           ARRAY['Áridos', 'Cementos', 'Hierros', 'Maderas', 'Cables', 'Cañerías'],         'Corralón de materiales de construcción'),
  ('despensa',   'Marca',      'Presentac.', true,  true,  ARRAY['unidad', 'kg', 'litro', 'pack'],                             ARRAY['Almacén', 'Bebidas', 'Lácteos', 'Limpieza', 'Golosinas'],                 'Despensa, kiosco o minimarket'),
  ('libreria',   'Marca',      'Modelo',     true,  true,  ARRAY['unidad', 'pack', 'caja'],                                    ARRAY['Útiles', 'Papelería', 'Arte', 'Tecnología', 'Libros'],                    'Librería y papelería'),
  ('generico',   'Variante 1', 'Variante 2', true,  true,  ARRAY['unidad', 'kg', 'litro', 'metro', 'pack', 'caja', 'bolsa'],   NULL,                                                                             'Negocio genérico — configurable');
```

**Opción B (más correcta pero costosa):** Crear tabla `tipos_atributo` y `valores_atributo` por tienda, y una tabla de join `variante_atributos`. Esto requiere refactorizar toda la lógica de variantes. **Dejar para post-MVP.**

---

### 2.2 — Hook/helper de rubro en el frontend

**Nuevo archivo:** `app/lib/rubro/config.ts`

```ts
export type Rubro = 'ropa' | 'ferreteria' | 'corralon' | 'despensa' | 'libreria' | 'generico'

export interface ConfigRubro {
  rubro: Rubro
  labelVar1: string      // Nombre de la primera variante
  labelVar2: string      // Nombre de la segunda variante
  usarVar1: boolean
  usarVar2: boolean
  unidadesDisponibles: string[]
  categoriasSugeridas: string[] | null
}

// Configuración local (espejo de config_rubro en DB) para uso en UI sin consulta
export const CONFIG_RUBROS: Record<Rubro, ConfigRubro> = { ... }

// Hook
export function useRubroConfig(rubro: Rubro): ConfigRubro { ... }
```

---

### 2.3 — Renombrar "Talla" y "Color" dinámicamente en la UI

Todos los componentes que dicen "Talla" o "Color" deben consumir `ConfigRubro.labelVar1` y `labelVar2`.

**Archivos afectados:**
- `app/components/productos/ProductoForm.tsx` — campos de variante
- `app/components/pos/BuscadorVariantes.tsx` — resultados de búsqueda
- `app/components/pos/Carrito.tsx` — ítems del carrito
- `app/components/stock/` — formularios de ajuste
- `app/components/ventas/` — detalle de venta
- `app/components/impresion/TicketVentaRenderer.tsx` — ticket impreso
- `app/components/configuracion/` — configuración de etiquetas (reemplazar `mostrar_talla`/`mostrar_color` por `mostrar_var1`/`mostrar_var2`)

**Estrategia:** Crear un `RubroProvider` (React Context) que exponga la config del rubro actual. El layout del dashboard lo provee al cargar el perfil del usuario.

---

### 2.4 — Configuración de etiquetas adaptada al rubro

**Tabla:** `configuracion_etiquetas`

Renombrar `mostrar_talla` → `mostrar_var1` y `mostrar_color` → `mostrar_var2` en la DB (o agregar columnas nuevas y deprecar las anteriores gradualmente).

```sql
-- Migración
ALTER TABLE public.configuracion_etiquetas
  ADD COLUMN IF NOT EXISTS mostrar_var1 boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_var2 boolean NOT NULL DEFAULT false;

-- Copiar datos existentes
UPDATE public.configuracion_etiquetas
  SET mostrar_var1 = mostrar_talla, mostrar_var2 = mostrar_color;
```

---

### 2.5 — Módulo "Configuración de Rubro" en Settings

**Nueva sección en configuración:** Permite al owner cambiar las etiquetas de variantes, las unidades disponibles para sus productos, y la categoría del negocio.

**Pantalla:** `/configuracion` → tab "Rubro"
- Cambiar rubro (con advertencia de que cambia labels)
- Personalizar `label_var1` y `label_var2`
- Ver/editar unidades de medida disponibles para este negocio

---

### 2.6 — Precarga de categorías por rubro al registrarse

**Función Supabase:** Cuando se crea la tienda (en `handle_new_user`), insertar las categorías sugeridas del rubro automáticamente.

```sql
-- En handle_new_user, después de crear la tienda:
INSERT INTO public.categorias (tienda_id, nombre)
SELECT v_tienda_id, unnest(categorias_sugeridas)
FROM public.config_rubro
WHERE rubro = v_rubro AND categorias_sugeridas IS NOT NULL;
```

---

### 2.7 — Precarga de tallas/atributos por rubro

Para rubros que usen `var1`, crear valores sugeridos automáticamente:

- **Ropa:** XS, S, M, L, XL, XXL (+ 36, 38, 40... para calzado)
- **Ferretería:** M4, M6, M8, M10, 1/4", 3/8", 1/2"...
- **Corralón:** Fine, Medio, Grueso (para áridos); H8, H10, H12... (para hierros)
- **Despensa:** 250g, 500g, 1kg, 1L, 2L, etc.

Esto se hace con una migración de datos o en el trigger de registro.

---

### Checklist Fase 2

- [x] Migración `config_rubro` aplicada con datos de los 6 rubros
- [x] Columnas `mostrar_var1` / `mostrar_var2` en `configuracion_etiquetas`
- [x] `inicializar_tienda` inserta categorías sugeridas al registrarse
- [x] `inicializar_tienda` inserta tallas/atributos sugeridos al registrarse
- [x] `app/lib/rubro/config.ts` creado con `CONFIG_RUBROS` y helpers
- [x] `RubroProvider` en el layout del dashboard
- [x] `VariantesEditor` usa `labelVar1` / `labelVar2` dinámicos y oculta var2 si `usarVar2=false`
- [x] `ProductoForm` filtra unidades disponibles por rubro
- [x] `Carrito` usa labels dinámicos y oculta var2 si `usarVar2=false`
- [x] `BuscadorVariantes` muestra labels dinámicos en resultados
- [x] Tab "Rubro" en configuración con `RubroForm` y página `/configuracion/rubro`
- [x] `actualizarRubroTienda` server action con validación de rol

---

## Fase 3 — Full (Onboarding guiado + expansión de rubros)

**Objetivo:** Experiencia de onboarding completa por rubro al registrarse, plantillas de importación por rubro, rubros adicionales, y base para landing page multi-rubro.

**Tiempo estimado:** 3-4 semanas  
**Resultado:** El sistema se presenta como una plataforma multi-rubro. Nuevos clientes se auto-configuran solos.

---

### 3.1 — Wizard de onboarding post-registro

**Flujo:** Después de `/registro` exitoso → en vez de ir directo a `/dashboard`, ir a `/onboarding`.

**Pasos del wizard:**
1. **Bienvenida** — "¡Tu tienda está lista! Vamos a configurarla en 3 pasos"
2. **Datos de la tienda** — Logo, dirección, teléfono, CUIT
3. **Configuración de productos** — ¿Usás código de barras? ¿Cómo se llaman tus variantes?
4. **Primer producto** — Crear el primer producto de ejemplo (guiado)
5. **¡Listo!** — Resumen + acceso al dashboard

**Ruta:** `app/app/(dashboard)/onboarding/page.tsx` (nueva)  
**Condición:** Si el perfil tiene `onboarding_completado = false` → redirigir a onboarding.

**Migración:**
```sql
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS onboarding_completado boolean NOT NULL DEFAULT false;
```

---

### 3.2 — Templates de importación CSV por rubro

**Nueva sección en configuración:** "Importar productos"

- Descargar template CSV adaptado al rubro del usuario
- El template tiene las columnas correctas (con los labels del rubro)
- Importación masiva de productos con validación

**Archivos:**
- `app/app/(dashboard)/configuracion/importar/page.tsx`
- `app/app/actions/importar.ts`
- `app/lib/rubro/templates.ts` — genera el CSV template por rubro

---

### 3.3 — Rubros adicionales

Agregar rubros según demanda real:

| Rubro | Slug | Notas |
|-------|------|-------|
| Carnicería / Fiambrería | `carniceria` | Venta por kg, precios variables |
| Verdulería / Frutería | `verduleria` | Venta por kg, stock perecedero |
| Farmacia | `farmacia` | Por unidad, requiere vencimiento |
| Perfumería / Cosmética | `perfumeria` | Por unidad, variantes por fragancia |
| Electrónica | `electronica` | Por unidad, número de serie |
| Vivero / Florería | `vivero` | Por unidad o maceta |

Cada uno se agrega como un `INSERT` en `config_rubro` — el sistema escala sin cambio de código.

---

### 3.4 — Landing page multi-rubro

**Nueva ruta pública:** `/` (landing page de CValleTienda)

Secciones:
- Hero con propuesta de valor genérica
- Grid de rubros soportados (con caso de uso por rubro)
- Features del sistema
- Pricing
- CTA → `/registro`

**Implementación:** Next.js page estática en `app/app/(public)/` o proyecto separado.

---

### 3.5 — Dashboard adaptado al rubro

Adaptar los KPIs y reportes del dashboard según el rubro:

- **Ropa:** unidades vendidas, rotación por talla, productos sin stock
- **Corralón:** kg/toneladas despachadas, m³ vendidos, clientes con cuenta corriente
- **Despensa:** ticket promedio, productos de alta rotación

**Archivos:** `app/lib/dashboard/queries.ts` — agregar filtros por rubro

---

### 3.6 — Remitos y entregas (para corralón / ferretería)

Módulo nuevo: **Remitos**

- Crear remito desde una venta pendiente
- Estado: borrador → emitido → entregado
- Impresión de remito (similar a ticket pero con campos de entrega)
- Vincular a una venta confirmada

**DB:** Nueva tabla `remitos` con FK a `ventas`.  
**Ruta:** `app/app/(dashboard)/remitos/`

---

### Checklist Fase 3

- [x] Campo `onboarding_completado` en `perfiles` (migración 20260509000004_fase3.sql)
- [x] Wizard de onboarding en `/onboarding` con 4 pasos (Bienvenida, Datos, Ticket, Listo)
- [x] Redirección post-registro al onboarding (`registroAction` → `/onboarding`)
- [x] Templates CSV descargables por rubro (`lib/rubro/templates.ts` + API route)
- [ ] Importación masiva de productos con validación (pendiente — sólo descarga de plantilla)
- [x] Rubros adicionales: `carniceria`, `farmacia`, `verduleria` agregados a `config_rubro`
- [ ] Landing page pública multi-rubro (pendiente)
- [x] KPIs del dashboard adaptados por rubro (`TopVar1Card` + `obtenerTopVar1Mes`)
- [x] Módulo de remitos: tabla DB, lista, crear, detalle/imprimir, estados (borrador→emitido→entregado)

---

## Resumen de Dependencias entre Fases

```
Fase 1 ──────────────────────────────────────────────────────► Corralón puede operar
  │
  ├─ Rubro en tiendas (DB)
  ├─ Rubro en registro (UI)
  ├─ Decimales en stock y cantidad (DB)
  └─ Unidad de medida en productos (DB + UI)

Fase 2 (requiere Fase 1 completa) ───────────────────────────► Sistema adaptable a cualquier rubro
  │
  ├─ config_rubro con labels y unidades por rubro (DB)
  ├─ RubroProvider en frontend (label dinámico talla/color)
  ├─ Precarga de categorías y atributos al registrarse
  └─ Configuración de rubro en settings

Fase 3 (requiere Fase 2 completa) ───────────────────────────► Producto SaaS escalable
  │
  ├─ Onboarding guiado
  ├─ Import CSV por rubro
  ├─ Rubros adicionales
  ├─ Landing page multi-rubro
  └─ Remitos
```

---

## Orden de implementación recomendado

**Para cerrar el corralón AHORA:** Implementar Fase 1 completa (1.1 → 1.8) en orden.  
**Después:** Fase 2 mientras el corralón está operando y dando feedback.  
**Largo plazo:** Fase 3 cuando haya 2+ clientes reales validando el sistema.

---

## Archivos a crear/modificar por fase

### Fase 1
| Archivo | Acción |
|---------|--------|
| `supabase/migrations/20260509000001_multi_rubro_fase1.sql` | Crear |
| `supabase/migrations/20260509000002_handle_new_user_rubro.sql` | Crear |
| `app/app/(auth)/registro/page.tsx` | Modificar — agregar selector de rubro |
| `app/app/actions/auth.ts` | Modificar — leer y enviar `rubro` |
| `app/types/database.ts` | Modificar — agregar `rubro` y `unidad_de_medida` |
| `app/components/pos/Carrito.tsx` | Modificar — cantidad decimal |
| `app/components/pos/BuscadorVariantes.tsx` | Modificar — mostrar unidad |
| `app/components/productos/ProductoForm.tsx` | Modificar — campo `unidad_de_medida` |
| `app/app/actions/ventas.ts` | Revisar — asegurar que `cantidad` se envíe como float |

### Fase 2
| Archivo | Acción |
|---------|--------|
| `supabase/migrations/20260509000003_rubro_config.sql` | Crear |
| `supabase/migrations/20260509000004_config_etiquetas_var.sql` | Crear |
| `app/lib/rubro/config.ts` | Crear |
| `app/components/layout/RubroProvider.tsx` | Crear |
| `app/app/(dashboard)/layout.tsx` | Modificar — envolver con RubroProvider |
| Todos los componentes que usan "Talla"/"Color" | Modificar |

### Fase 3
| Archivo | Acción |
|---------|--------|
| `supabase/migrations/20260509000005_onboarding.sql` | Crear |
| `app/app/(dashboard)/onboarding/page.tsx` | Crear |
| `app/lib/rubro/templates.ts` | Crear |
| `app/app/(dashboard)/configuracion/importar/page.tsx` | Crear |
| `app/app/(dashboard)/remitos/` | Crear (módulo completo) |
