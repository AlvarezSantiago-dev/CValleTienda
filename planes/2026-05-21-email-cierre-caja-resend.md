# Plan: Email de cierre de caja con Resend

**Creado:** 2026-05-21
**Estado:** Borrador
**Pedido:** Al cerrar la caja manualmente, enviar un email detallado al dueño del local con el resumen del turno.

---

## Descripción General

### Qué Logra Este Plan

Cuando el cajero o dueño cierra una sesión de caja (manual, normal o emergencia), el sistema envía automáticamente un email HTML al email configurado en la tienda con un resumen inteligente y detallado del turno: totales, desglose por método de pago, top productos vendidos, diferencia de efectivo y alertas.

### Por Qué Importa

El dueño del negocio no siempre está presente en el cierre. Este email le permite tener visibilidad instantánea de cómo cerró el día sin necesidad de entrar al sistema, fortaleciendo la confianza en la plataforma y agregando valor diferencial frente a alternativas.

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Relevancia |
|---------|-----------|
| `app/app/actions/caja.ts` | `cerrarSesion()` y `cerrarSesionEmergencia()` — aquí se hookea el envío |
| `app/lib/caja/queries.ts` | `obtenerCierre()` — devuelve cierre + detalles por cuenta |
| `app/lib/configuracion/queries.ts` | Fuente de `logo_url`, nombre tienda |
| `supabase/migrations/20260419000001_tiendas.sql` | `tiendas.email` — email del dueño |
| `supabase/migrations/20260419000010_sesiones_caja.sql` | `cierres_caja`, `cierres_caja_detalle` — estructura del cierre |
| `app/package.json` | Resend **no instalado** — hay que agregarlo |

### Brechas que se Abordan

- No existe ningún mecanismo de notificación post-cierre
- El dueño no recibe feedback inmediato cuando se cierra el turno
- No hay archivos bajo `lib/email/` — se crea desde cero

---

## Diseño Técnico

### Datos que incluye el email

**Sección 1 — Encabezado**
- Nombre de la tienda + logo (si existe)
- Fecha y hora del cierre
- Tipo de cierre: Normal / Emergencia (con badge de color)

**Sección 2 — Resumen del turno**
- Total ventas: cantidad y monto
- Total devoluciones: cantidad y monto
- **Total neto** (ventas − devoluciones): destacado en grande
- Diferencia de efectivo (si la hubo): verde si 0, rojo si hay faltante, amarillo si hay sobrante

**Sección 3 — Desglose por cuenta/método de pago**
- Tabla: Cuenta | Ingresos | Egresos | Neto
- Datos de `cierres_caja_detalle`

**Sección 4 — Top 5 productos del turno**
- Nombre del producto + cantidad vendida + subtotal
- Query: `ventas_items` JOIN `productos` WHERE `venta.sesion_caja_id = sesionId`

**Sección 5 — Pie**
- "Enviado por CValleTienda" + link al sistema

### Variables de entorno necesarias

```env
RESEND_API_KEY=re_xxxx          # API key de Resend
RESEND_FROM_EMAIL=noreply@cvalle.com  # Dominio verificado en Resend (o usar onboarding@resend.dev en dev)
```

### Flujo de envío

```
cerrarSesion() / cerrarSesionEmergencia()
    → llama cerrar_caja RPC → obtiene cierreId
    → llama enviarEmailCierre(cierreId, tiendaId)  [fire & forget, no bloquea]
        → obtiene datos: cierre + detalles + top productos + tienda email
        → si no hay email configurado → no envía, solo loguea
        → genera HTML con buildCierreEmailHtml()
        → resend.emails.send(...)
        → logs error si falla, no propaga (no rompe el cierre)
```

**Importante**: el email es fire & forget — si falla el envío, el cierre ya se realizó y no se revierte. Solo se loguea el error.

---

## Archivos a Crear / Modificar

### Nuevos

| Archivo | Propósito |
|---------|-----------|
| `app/lib/email/resend.ts` | Singleton del cliente Resend |
| `app/lib/email/templates/cierre-caja.ts` | Función que genera el HTML del email |
| `app/lib/email/enviar-cierre.ts` | Orquesta datos + envío del email de cierre |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `app/app/actions/caja.ts` | Agregar llamada a `enviarEmailCierre()` en `cerrarSesion` y `cerrarSesionEmergencia` |
| `app/.env.local` | Agregar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` (instrucción manual al usuario) |

---

## Tareas de Implementación

### Paso 1 — Instalar Resend

```bash
cd app && npm install resend
```

### Paso 2 — Crear `lib/email/resend.ts`

Singleton del cliente:

```ts
import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('[email] RESEND_API_KEY no configurada — emails deshabilitados')
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null
```

### Paso 3 — Crear `lib/email/templates/cierre-caja.ts`

Función `buildCierreEmailHtml(data: CierreEmailData): string` que devuelve HTML inline limpio con:
- Tailwind-like inline styles (sin dependencias externas)
- Colores: verde para neto positivo, rojo para diferencia negativa
- Tabla responsive de detalles por cuenta
- Lista de top productos
- Formato de moneda ARS
- Condición especial para cierre de emergencia (banner naranja)

**Interfaz de datos:**
```ts
interface CierreEmailData {
  tienda_nombre: string
  tienda_logo_url: string | null
  fecha_cierre: string
  tipo_cierre: 'normal' | 'emergencia' | 'automatico'
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_devoluciones_monto: number
  total_devoluciones_cantidad: number
  total_neto: number
  efectivo_declarado: number | null
  diferencia_efectivo: number | null
  detalles: Array<{
    nombre_cuenta: string
    tipo_cuenta: string
    total_ingresos: number
    total_egresos: number
    total_neto: number
  }>
  top_productos: Array<{
    nombre: string
    cantidad: number
    subtotal: number
  }>
}
```

### Paso 4 — Crear `lib/email/enviar-cierre.ts`

Función `enviarEmailCierre(cierreId: string, tiendaId: string): Promise<void>`:

1. Obtener email de la tienda:
```ts
const { data: tienda } = await supabase
  .from('tiendas')
  .select('nombre, email, logo_url')
  .eq('id', tiendaId)
  .maybeSingle()
if (!tienda?.email) return  // sin email configurado → skip silencioso
```

2. Obtener cierre + detalles (usar `obtenerCierre(cierreId)` de queries.ts — ya existe)

3. Obtener top 5 productos del turno:
```ts
// ventas de la sesión → items de cada venta → agrupados por producto
const { data: items } = await supabase
  .from('ventas_items')
  .select('producto_nombre, cantidad, subtotal, venta:ventas!inner(sesion_caja_id)')
  .eq('venta.sesion_caja_id', sesionId)
  .order('cantidad', { ascending: false })
  .limit(20)
// agrupar por producto_nombre y tomar top 5
```

4. Armar `CierreEmailData` y llamar `buildCierreEmailHtml(data)`

5. Enviar con Resend:
```ts
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
  to: tienda.email,
  subject: `Cierre de caja — ${tienda.nombre} — ${fechaFormateada}`,
  html: htmlContent,
})
```

6. Try/catch: si falla, solo `console.error('[email] Error al enviar email de cierre:', err)` — no re-throw

### Paso 5 — Modificar `app/actions/caja.ts`

En `cerrarSesion()`, después del RPC exitoso, agregar fire & forget:

```ts
// Fire & forget — no bloquea ni revierte el cierre
enviarEmailCierre(data as string, tiendaId).catch((err) =>
  console.error('[caja] email cierre fallido:', err)
)
```

Lo mismo en `cerrarSesionEmergencia()`.

### Paso 6 — Variables de entorno (instrucción al usuario)

Agregar a `app/.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
```

En Vercel: Settings → Environment Variables → agregar las mismas.

---

## Consideraciones de Seguridad

- **API key solo en servidor**: `RESEND_API_KEY` nunca se expone al cliente (no tiene prefijo `NEXT_PUBLIC_`)
- **Email sin escapado de usuario**: el HTML usa datos de la DB, no input directo del usuario. Los valores de texto se escapan con función helper `esc()` antes de insertar en el HTML
- **No bloquear el flujo de cierre**: si Resend falla (rate limit, red, etc.), el cierre de caja ya se registró. El email es best-effort

## Consideraciones de UX

- Si la tienda no tiene email configurado → no hay error visible, solo log silencioso
- Si el email fue enviado → no hay UI que lo indique en esta versión (suficiente para MVP)
- En el futuro: toast "📧 Resumen enviado a tu email" en `CerrarSesionForm` si el action devuelve `emailEnviado: true`

---

## Estado de Tareas

- [ ] Paso 1: Instalar Resend (`npm install resend`)
- [ ] Paso 2: Crear `lib/email/resend.ts`
- [ ] Paso 3: Crear `lib/email/templates/cierre-caja.ts`
- [ ] Paso 4: Crear `lib/email/enviar-cierre.ts`
- [ ] Paso 5: Modificar `app/actions/caja.ts`
- [ ] Paso 6: Instrucción de variables de entorno al usuario
- [ ] Verificar TypeScript sin errores (`npx tsc --noEmit`)
