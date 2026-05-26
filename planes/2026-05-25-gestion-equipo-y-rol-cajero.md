# Plan: Gestión de equipo y rol cajero (multi-usuario por tienda)

**Creado:** 2026-05-25
**Estado:** Borrador
**Pedido:** Que el admin pueda crear cajeros con email + contraseña, y que el cajero ingrese con una vista reducida: POS, mis ventas del día, consulta de precios y apertura/cierre de turno de caja.

---

## Descripción General

### Qué Logra Este Plan

El dueño/admin podrá crear cuentas de cajero directamente desde Configuración → Equipo, asignando email y contraseña. Cuando el cajero inicia sesión, ve solo las pantallas que le corresponden (POS, ventas del día, precios, caja de turno), con el resto del sistema completamente oculto y protegido. Cada venta queda auditada con quién la realizó.

### Por Qué Importa

Es el paso que transforma CValleTienda de "herramienta del dueño" a "sistema del negocio". Muchos comercios tienen 1-2 empleados. Sin roles multi-usuario, el dueño está obligado a estar presente o compartir su acceso completo al sistema, lo cual es un bloqueante de adopción.

---

## Estado Actual

### Estructura Existente Relevante

- `types/database.ts` → `RolUsuario = 'owner' | 'admin' | 'vendedor'` — ya está definido
- `types/database.ts` → `Perfil { id, tienda_id, nombre, apellido, rol, activo }` — modelo completo
- `supabase/all_migrations.sql` → Trigger `handle_new_user()` ya soporta el flujo de "unirse a tienda existente": si `raw_user_meta_data` trae `tienda_id`, crea el perfil con ese tienda_id y el rol indicado
- `supabase/all_migrations.sql` → Función `get_rol()` (SECURITY DEFINER) — retorna el rol del usuario autenticado, usable en RLS
- `app/app/(dashboard)/layout.tsx` → Ya carga `perfil` completo (con `rol`) del usuario autenticado y lo pasa a `AppShell`
- `app/components/layout/Sidebar.tsx` → Recibe `perfil: Perfil` pero no filtra ítems por rol
- `app/app/actions/auth.ts` → `loginAction` — después del login redirige siempre a `/dashboard`
- `app/app/(dashboard)/configuracion/` → Ya existe la sección, tiene sub-páginas

### Brechas o Problemas que se Abordan

- No existe UI para crear miembros de equipo
- No existe action para crear usuario via Admin API de Supabase
- Sidebar muestra todos los ítems sin importar el rol
- No existe protección de rutas por rol (un cajero podría navegar a `/productos` si conoce la URL)
- No existe página `/precios` (consulta de precios read-only para cajero)
- La página `/caja` muestra resumen histórico completo — el cajero solo necesita ver su turno actual

---

## Cambios Propuestos

### Resumen de Cambios

- Nuevo server action `app/app/actions/equipo.ts` con `invitarMiembro`, `listarMiembros`, `desactivarMiembro`, `actualizarMiembro`
- Nueva página `app/app/(dashboard)/configuracion/equipo/page.tsx` — gestión del equipo
- Nueva variable de entorno `SUPABASE_SERVICE_ROLE_KEY` para el Admin API
- Nueva migración SQL que añade columna `cajero_id` a `ventas` (para auditoría por cajero)
- Sidebar filtrado por rol — cajero ve solo 4 ítems
- Nueva página `app/app/(dashboard)/precios/page.tsx` — consulta de precios (solo lectura)
- Middleware de protección de rutas por rol en `app/middleware.ts`
- Caja: vista condicional según `perfil.rol` — cajero ve solo su turno actual

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/app/actions/equipo.ts` | Server actions: crear, listar, desactivar miembros del equipo |
| `app/app/(dashboard)/configuracion/equipo/page.tsx` | Página de gestión de equipo (solo owner/admin) |
| `app/app/(dashboard)/precios/page.tsx` | Consulta de precios read-only para cajero |
| `supabase/migrations/20260525000001_equipo_cajero.sql` | Migración: cajero_id en ventas, RLS update para multi-user |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/components/layout/Sidebar.tsx` | Agregar `showForRoles?: RolUsuario[]` a NavItem, filtrar por `perfil.rol`, agregar ítem "Precios" |
| `app/app/(dashboard)/layout.tsx` | Pasar `perfil.rol` al redirect correcto post-login del cajero |
| `app/app/actions/auth.ts` | `loginAction` redirige a `/pos` si `rol === 'vendedor'`, a `/dashboard` si owner/admin |
| `app/middleware.ts` | Agregar guards: rutas admin-only devuelven 404 o redirigen si cajero intenta acceder |
| `app/app/(dashboard)/configuracion/page.tsx` | Agregar link/card a sección "Equipo" |
| `app/types/database.ts` | Agregar campo `cajero_id?: string` a interfaz `Venta` (opcional, para auditoría) |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Usar `supabase.auth.admin.createUser()` (sin invitación por email)**: El admin ingresa el email y la contraseña directamente. El cajero recibe las credenciales en mano. No hay flujo de invitación/confirmación de email porque en un kiosco/despensa esto sería una fricción innecesaria. La contraseña puede cambiarse después.

2. **Rol `vendedor` = cajero**: No se crea un rol nuevo. `vendedor` ya existe en la DB con su check constraint. Se usa ese rol para el cajero. En la UI se muestra como "Cajero" para el usuario (label amigable), internamente es `vendedor`.

3. **Crear usuario via Service Role en server action**: Requiere `SUPABASE_SERVICE_ROLE_KEY` en las env vars del servidor (nunca expuesta al cliente). La action usa `createClient()` con service role solo para la creación, luego la política RLS controla el resto.

4. **El trigger `handle_new_user` ya soporta esto**: Si el usuario nuevo tiene `tienda_id` en su metadata, el trigger crea el perfil en esa tienda. No hay que modificar el trigger.

5. **Protección de rutas en middleware (no solo en UI)**: El sidebar oculta ítems, pero el middleware bloquea acceso real. Un cajero que navega manualmente a `/productos` recibe redirect a `/pos`.

6. **Caja reducida: vista condicional en la misma página**: En vez de crear una nueva página `/caja/turno`, la página `/caja` existente lee `perfil.rol` y renderiza una vista simplificada (solo apertura/cierre de turno y resumen del turno actual) para `vendedor`. El owner/admin ve la vista completa actual.

7. **`cajero_id` en ventas**: Se agrega como columna nullable a `ventas` para poder filtrar "mis ventas del día" en la vista del cajero. Al crear una venta, se guarda el `user.id` del vendedor. Retrocompatible (las ventas existentes quedan con `cajero_id = null`).

### Alternativas Consideradas

- **Invitación por email**: Más profesional, pero agrega un paso que en un negocio chico es una fricción innecesaria. El admin puede cambiar la contraseña luego si quiere.
- **Crear un layout separado para cajero**: Más limpio en teoría, pero duplicaría lógica de auth, providers (RubroProvider, PlanProvider), etc. Mejor filtrar dentro del layout existente.
- **PIN en vez de contraseña**: Simple pero no compatible con Supabase Auth natively. Requeriría un sistema custom. No vale la complejidad.

### Preguntas Abiertas

Ninguna — el alcance está bien definido.

---

## Tareas Paso a Paso

### Paso 1: Migración SQL — cajero_id en ventas + RLS ajuste

Crear migración que agrega `cajero_id` a `ventas` y actualiza políticas si es necesario para que un vendedor solo pueda VER sus propias ventas (o las de su tienda, dependiendo del caso de uso).

**Acciones:**

- Crear `supabase/migrations/20260525000001_equipo_cajero.sql`
- Agregar columna `cajero_id uuid references auth.users(id) on delete set null` a `ventas` (nullable, retrocompatible)
- Crear índice `ventas_cajero_id_idx`
- Actualizar la RLS policy de `ventas` para que `vendedor` pueda insertar y ver solo las ventas de su tienda (el filtro `tienda_id = get_tienda_id()` ya cubre multi-user)
- Nada más necesario — el trigger `handle_new_user` ya maneja la creación de perfil para nuevos usuarios con `tienda_id` en metadata

**Archivos afectados:**
- `supabase/migrations/20260525000001_equipo_cajero.sql` (nuevo)

---

### Paso 2: Variable de entorno para Service Role

Para crear usuarios via Admin API, el server action necesita `SUPABASE_SERVICE_ROLE_KEY`.

**Acciones:**

- Verificar que `.env.local` tenga `SUPABASE_SERVICE_ROLE_KEY` (si no, el developer debe agregarlo desde el Dashboard de Supabase → Settings → API)
- Crear helper `app/lib/supabase/admin.ts` que instancia el cliente con service role:
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  
  export function createAdminClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  ```
- Este cliente solo se usa en server actions, NUNCA se importa en componentes cliente

**Archivos afectados:**
- `app/lib/supabase/admin.ts` (nuevo)

---

### Paso 3: Server action `equipo.ts`

Crear las 4 acciones del módulo de equipo.

**Acciones:**

Crear `app/app/actions/equipo.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Listar miembros del equipo de la tienda actual
export async function listarMiembros() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', data: null }

  const { data: perfil } = await supabase
    .from('perfiles').select('tienda_id, rol').eq('id', user.id).single()
  if (!perfil || perfil.rol === 'vendedor') return { error: 'Sin permiso', data: null }

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, rol, activo, created_at')
    .eq('tienda_id', perfil.tienda_id)
    .order('created_at', { ascending: true })

  return { data, error: error?.message ?? null }
}

// Crear cajero — usa Admin API para crear user en auth + trigger crea perfil
export async function invitarMiembro(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('perfiles').select('tienda_id, rol').eq('id', user.id).single()
  if (!perfil || perfil.rol === 'vendedor') return { error: 'Sin permiso' }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nombre = formData.get('nombre') as string
  const apellido = (formData.get('apellido') as string) || null

  if (!email || !password || !nombre) return { error: 'Completá todos los campos' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // No requiere confirmación por email
    user_metadata: {
      nombre,
      apellido,
      tienda_id: perfil.tienda_id,
      rol: 'vendedor',
    },
  })

  if (error) {
    if (error.message.includes('already registered')) return { error: 'Ese email ya está en uso' }
    return { error: 'Error al crear el cajero. Intentá de nuevo.' }
  }

  revalidatePath('/configuracion/equipo')
  return { error: null }
}

// Activar / desactivar miembro
export async function toggleActivoMiembro(miembroId: string, activo: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('perfiles').select('tienda_id, rol').eq('id', user.id).single()
  if (!perfil || perfil.rol === 'vendedor') return { error: 'Sin permiso' }

  // Validar que el miembro pertenece a la misma tienda
  const { data: miembro } = await supabase
    .from('perfiles').select('tienda_id, rol').eq('id', miembroId).single()
  if (!miembro || miembro.tienda_id !== perfil.tienda_id) return { error: 'Sin permiso' }
  if (miembro.rol === 'owner') return { error: 'No podés desactivar al dueño de la tienda' }

  const { error } = await supabase
    .from('perfiles').update({ activo }).eq('id', miembroId)

  revalidatePath('/configuracion/equipo')
  return { error: error?.message ?? null }
}

// Cambiar contraseña de un miembro (admin → cajero)
export async function cambiarContrasena(miembroId: string, nuevaPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('perfiles').select('tienda_id, rol').eq('id', user.id).single()
  if (!perfil || perfil.rol === 'vendedor') return { error: 'Sin permiso' }

  if (nuevaPassword.length < 8) return { error: 'Mínimo 8 caracteres' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(miembroId, {
    password: nuevaPassword,
  })

  return { error: error?.message ?? null }
}
```

**Archivos afectados:**
- `app/app/actions/equipo.ts` (nuevo)

---

### Paso 4: Tipo `Venta` — agregar `cajero_id`

Actualizar la interfaz TypeScript para reflejar la nueva columna.

**Acciones:**

- En `app/types/database.ts`, en la interfaz `Venta`, agregar:
  ```typescript
  cajero_id: string | null
  ```
- En `app/app/actions/ventas.ts`, al crear una venta, incluir `cajero_id: user.id` en el insert

**Archivos afectados:**
- `app/types/database.ts`
- `app/app/actions/ventas.ts`

---

### Paso 5: Sidebar filtrado por rol

El sidebar ya recibe `perfil: Perfil`. Agregar la propiedad `showForRoles` a cada NavItem y filtrar según el rol del usuario.

**Acciones:**

- Cambiar la interfaz `NavItem` en `Sidebar.tsx`:
  ```typescript
  interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    showWhen?: 'always' | 'remitos' | 'devoluciones'
    showForRoles?: RolUsuario[]  // undefined = visible para todos los roles
  }
  ```
- Agregar ítem "Precios" al grupo Ventas:
  ```typescript
  { href: '/precios', label: 'Lista de precios', icon: <IconPrecios />, showWhen: 'always', showForRoles: ['owner', 'admin', 'vendedor'] }
  ```
- Marcar los ítems que solo ve el admin/owner:
  ```
  /dashboard         → showForRoles: ['owner', 'admin']
  /ventas            → showForRoles: ['owner', 'admin']  (cajero usa /precios como home)
  /devoluciones      → showForRoles: ['owner', 'admin']
  /remitos           → showForRoles: ['owner', 'admin']
  /productos         → showForRoles: ['owner', 'admin']
  /stock             → showForRoles: ['owner', 'admin']
  /clientes          → showForRoles: ['owner', 'admin']
  /reportes          → showForRoles: ['owner', 'admin']
  /configuracion     → showForRoles: ['owner', 'admin']
  /planes            → showForRoles: ['owner', 'admin']
  ```
- Los ítems que ve el cajero:
  ```
  /pos               → todos los roles
  /precios           → todos los roles (nuevo)
  /ventas            → todos los roles — pero cajero filtra por su cajero_id  
  /caja              → todos los roles (vista reducida si es vendedor)
  ```
- Agregar `IconPrecios` en `SidebarIcons.tsx` (SVG simple de etiqueta/precio)
- En el filtro de `navGroups`, agregar condición:
  ```typescript
  if (item.showForRoles && !item.showForRoles.includes(perfil.rol as RolUsuario)) return false
  ```

**Archivos afectados:**
- `app/components/layout/Sidebar.tsx`
- `app/components/layout/SidebarIcons.tsx`

---

### Paso 6: Middleware de protección de rutas

Crear o actualizar `app/middleware.ts` para bloquear acceso a rutas admin-only si el usuario es `vendedor`.

**Acciones:**

- Las rutas protegidas para admin/owner son: `/productos`, `/stock`, `/clientes`, `/remitos`, `/devoluciones`, `/reportes`, `/configuracion`, `/planes`, `/dashboard`
- Lógica:
  1. Si el usuario no está autenticado → dejar que el layout existente maneje el redirect a `/login`
  2. Si está autenticado y es `vendedor`, y la ruta solicitada es admin-only → redirect a `/pos`
- Para obtener el rol en middleware, usar el cookie de sesión de Supabase y consultar `perfiles`. El patrón ya existe en el proyecto (el layout lo hace).
- **Nota importante**: la consulta al perfil en middleware debe ser liviana. Usar el helper `get_rol()` via RPC o simplemente hacer un select mínimo.

```typescript
// app/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_ADMIN_ONLY = [
  '/dashboard', '/productos', '/stock', '/clientes',
  '/remitos', '/devoluciones', '/reportes', '/configuracion', '/planes',
]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* getAll/setAll usando request.cookies */ } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response // El layout maneja el redirect a /login

  const pathname = request.nextUrl.pathname
  const esRutaAdminOnly = RUTAS_ADMIN_ONLY.some(r => pathname === r || pathname.startsWith(r + '/'))
  if (!esRutaAdminOnly) return response

  // Solo consultamos el rol si la ruta lo requiere
  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user.id).single()

  if (perfil?.rol === 'vendedor') {
    return NextResponse.redirect(new URL('/pos', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|login|registro).*)'],
}
```

**Archivos afectados:**
- `app/middleware.ts` (crear o modificar si ya existe)

---

### Paso 7: Redirect post-login según rol

Modificar `loginAction` para redirigir al cajero a `/pos` en vez de `/dashboard`.

**Acciones:**

- En `app/app/actions/auth.ts`, después del login exitoso, consultar el perfil y redirigir según rol:
  ```typescript
  // Después de signInWithPassword exitoso:
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles').select('rol').eq('id', user.id).single()
    if (perfil?.rol === 'vendedor') redirect('/pos')
  }
  redirect('/dashboard')
  ```

**Archivos afectados:**
- `app/app/actions/auth.ts`

---

### Paso 8: Página de consulta de precios `/precios`

Nueva página read-only para que el cajero consulte precios por nombre o código de barras.

**Acciones:**

Crear `app/app/(dashboard)/precios/page.tsx`:

- Server component que no renderiza nada dinámico en sí — toda la búsqueda es client-side via un componente
- Crear `app/components/precios/BuscadorPrecios.tsx` (client component):
  - Input de búsqueda (texto o código de barras — usa el autofocus pattern existente)
  - Llama a una server action `buscarPrecios(query: string)` que devuelve nombre, precio_venta, stock_actual, unidad
  - Tabla simple con los resultados
  - Sin botones de edición ni navegación a detalle del producto

Server action `buscarPreciosPublico(query: string)` en `app/app/actions/precios.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function buscarPrecios(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, stock_actual, unidad, codigo_barras')
    .eq('tienda_id', supabase.rpc('get_tienda_id')) // RLS ya filtra por tienda
    .or(`nombre.ilike.%${query}%,codigo_barras.eq.${query}`)
    .eq('activo', true)
    .order('nombre')
    .limit(30)

  return { data, error: error?.message ?? null }
}
```

**Archivos afectados:**
- `app/app/(dashboard)/precios/page.tsx` (nuevo)
- `app/components/precios/BuscadorPrecios.tsx` (nuevo)
- `app/app/actions/precios.ts` (nuevo)

---

### Paso 9: Caja con vista reducida para cajero

La página `/caja` tiene historial, movimientos manuales, reportes de cierre. El cajero solo necesita abrir/cerrar su turno y ver el resumen del turno actual.

**Acciones:**

- En la página de caja (o en el componente principal de caja), obtener `perfil.rol` del contexto/layout
- Pasarlo como prop o leerlo via un nuevo contexto `PerfilProvider` simple
- Si `rol === 'vendedor'`, renderizar solo:
  - Estado del turno (abierto/cerrado)
  - Botón "Abrir turno" / botón "Cerrar turno"
  - Monto de apertura
  - Resumen del turno actual (efectivo, MP, total de ventas)
  - Sin historial de cierres anteriores
  - Sin movimientos manuales de fondo
- La alternativa más limpia: crear un componente `CajaTurno.tsx` con esta vista reducida, y en la página principal condicionar qué se muestra

**Archivos afectados:**
- `app/app/(dashboard)/caja/page.tsx` o su componente principal
- `app/components/caja/CajaTurno.tsx` (nuevo, vista reducida)

---

### Paso 10: Página de gestión de equipo en Configuración

Crear la UI para que el admin/owner vea y gestione a su equipo.

**Acciones:**

Crear `app/app/(dashboard)/configuracion/equipo/page.tsx`:

- Lista los miembros del equipo (`listarMiembros()`)
- Para cada miembro muestra: nombre, email (si disponible), rol badge, estado (activo/inactivo), botón "Desactivar"
- Botón "Agregar cajero" → abre un modal/formulario con campos: nombre, apellido (opcional), email, contraseña
- Al enviar, llama a `invitarMiembro(formData)`
- Toast de éxito/error
- **Agregar link a esta página** desde `app/app/(dashboard)/configuracion/page.tsx` en una nueva card "Equipo"

**Archivos afectados:**
- `app/app/(dashboard)/configuracion/equipo/page.tsx` (nuevo)
- `app/app/(dashboard)/configuracion/page.tsx` (agregar card "Equipo")

---

### Paso 11: Filtrar "mis ventas" para cajero

En la página `/ventas`, si el usuario es `vendedor`, mostrar solo las ventas donde `cajero_id = user.id` y filtradas al día actual.

**Acciones:**

- En la server action que carga ventas, si `perfil.rol === 'vendedor'`, agregar filtro `.eq('cajero_id', user.id)` y `.gte('created_at', hoy)`
- O bien, en la página de ventas, pasar el `perfil.rol` y `user.id` a los filtros de la consulta
- El título de la página para cajero cambia a "Mis ventas de hoy"

**Archivos afectados:**
- `app/app/(dashboard)/ventas/page.tsx` o su action correspondiente

---

### Paso 12: Validación final

**Acciones:**

- Correr la migración en Supabase local: `supabase db push` o aplicar el SQL manualmente en el dashboard
- Iniciar el dev server: `cd app && npm run dev`
- Flujo owner: crear cajero desde Configuración → Equipo
- Flujo cajero: iniciar sesión con las credenciales creadas → verificar redirect a `/pos`, sidebar reducido, acceso a `/precios` y `/caja`
- Verificar que cajero NO puede acceder a `/productos` (debe redirigir a `/pos`)
- Crear una venta como cajero → verificar que `cajero_id` se guarda correctamente
- Verificar que "Mis ventas de hoy" muestra solo las del cajero autenticado

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/layout.tsx` — carga `perfil`, base de todo el rol-awareness
- `app/components/layout/AppShell.tsx` — pasa `perfil` al Sidebar
- `app/app/actions/ventas.ts` — al crear venta, debe incluir `cajero_id`
- `app/types/database.ts` — necesita `cajero_id` en `Venta`

### Actualizaciones Necesarias para Consistencia

- Si el `dashboard` muestra KPIs, en una iteración futura puede mostrar un mini-dashboard para el cajero (fuera del scope de este plan)
- La tabla `ventas` en los reportes debería eventualmente poder filtrar por cajero (fuera del scope)
- Los tickets de venta podrían mostrar el nombre del cajero (fuera del scope)
