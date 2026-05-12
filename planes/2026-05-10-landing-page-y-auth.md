# Plan: Landing Page CValleTienda + Auth Refinado

**Fecha:** 2026-05-10  
**Estado:** Pendiente  
**Alcance:** Landing page pública de ventas + flujo de registro/login mejorado  

---

## Contexto

El MVP está completo con facturación electrónica AFIP integrada. Para conseguir los primeros clientes (tiendas de Cinco Saltos / Río Negro), necesitamos:

1. Una **landing page pública** en `/` que presente el producto profesionalmente
2. Un **flujo de auth** claro: registro con confirmación de email, login, y manejo correcto de onboarding

### Estado actual del auth
- `/` → redirige a `/dashboard` o `/login` (no hay landing)
- `/login` → form básico funcional
- `/registro` → form básico funcional, redirige a `/onboarding` post-registro
- `/setup` → pantalla de error si la cuenta no tiene tienda
- `registroAction` → llama a `supabase.auth.signUp()` con metadata, redirige a `/onboarding`
- Supabase tiene **email confirmation activado** por defecto → el usuario puede quedar en limbo si no confirma

### Problema de auth a resolver
Cuando Supabase tiene "Confirm email" activado, `signUp` no loguea automáticamente al usuario — el usuario necesita confirmar el email primero. El redirect actual a `/onboarding` puede fallar si no hay sesión activa. Hay que manejar esto con una página de "revisá tu email".

---

## Arquitectura de Rutas

```
/                    → Landing page (pública, nueva)
/login               → Form login (existente, mejorar UI)
/registro            → Form registro (existente, mejorar UI)
/confirmar-email     → Página de "revisá tu email" (nueva)
/onboarding          → Setup inicial de tienda (existente)
/dashboard           → App (requiere auth + tienda)
```

---

## Tareas

### Paso 1: Landing page — estructura y hero
**Archivo:** `app/app/page.tsx` (reemplazar redirect por landing)  
**Archivo nuevo:** `app/components/landing/LandingPage.tsx`

La landing tiene:
- **Header** fijo: logo "CValleTienda" + botones "Ingresar" y "Empezar gratis"
- **Hero**: headline + subheadline + CTA principal + imagen/mockup o lista de features clave
- **Features**: 6-8 módulos del sistema con ícono + título + descripción corta
- **Facturación AFIP**: sección destacada — diferencial clave
- **Pricing**: placeholder simple (ej: "Consultá precio" o precio fijo mensual)
- **Footer**: nombre + links a login/registro

**Diseño:** Limpio, profesional, colores indigo (#4F46E5) — consistente con la app. Sin librerías externas, solo Tailwind.

**Redirección inteligente:** Si el usuario ya está logueado, redirige a `/dashboard`.

### Paso 2: Separar el layout de auth del de landing
**Archivo:** `app/app/(auth)/layout.tsx` — mantener para login/registro  
**Nuevo grupo de rutas:** `app/app/(landing)/` con su propio layout minimalista

La landing NO usa el layout del auth ni del dashboard. Tiene su propio layout con header/footer.

### Paso 3: Página "Revisá tu email"
**Archivo nuevo:** `app/app/(auth)/confirmar-email/page.tsx`

Pantalla simple que muestra:
- Ícono de email
- "Te enviamos un email a [email]. Revisá tu bandeja de entrada para activar tu cuenta."
- Link "¿No recibiste el email? Reenviar"
- Link "Volver al inicio"

`registroAction` pasa el email como query param: `/confirmar-email?email=xxx@yyy.com`

### Paso 4: Actualizar registroAction
**Archivo:** `app/app/actions/auth.ts`

Cambios:
- Post-registro redirigir a `/confirmar-email?email=...` en lugar de `/onboarding`
- Si Supabase devuelve sesión activa (email confirmation desactivado en DEV), redirigir a `/onboarding` directamente

### Paso 5: Callback de confirmación de email
**Archivo:** `app/app/api/auth/callback/route.ts` (verificar si existe, crear si no)

Supabase redirige aquí después de que el usuario hace clic en el email de confirmación. El callback:
1. Intercambia el `code` por una sesión
2. Redirige a `/onboarding` si el perfil no tiene tienda, o a `/dashboard` si ya tiene

### Paso 6: Mejorar UI de login y registro
**Archivos:** login/page.tsx y registro/page.tsx

- Agregar el logo/nombre de CValleTienda más visible
- Agregar tagline breve
- Link "Volver al inicio" (→ `/`)
- Mejorar mensajes de error

### Paso 7: Actualizar `app/app/page.tsx`
Reemplazar los redirects hardcodeados por la lógica:
- Usuario autenticado → `/dashboard`  
- Usuario no autenticado → mostrar landing (no redirigir a login)

---

## Contenido de la Landing

### Hero
**Headline:** "El sistema para tu negocio — control total desde el primer día"  
**Subheadline:** "POS con scanner, stock, caja, devoluciones, clientes y factura electrónica AFIP. Todo en uno, sin complicaciones."  
**CTA:** "Crear cuenta gratis" → `/registro`  
**CTA secundario:** "Ya tengo cuenta" → `/login`

### Features (6 cards)
1. 🛒 **POS con scanner** — Vendé rápido con código de barras. Ticket automático al instante.
2. 📦 **Stock en tiempo real** — Controlá tu inventario por variante. Alertas de stock bajo.
3. 💰 **Caja y cierre** — Apertura, cierre y conciliación por método de pago.
4. 🧾 **Factura electrónica AFIP** — Emitís facturas A, B o C validadas por ARCA. Sin papeles.
5. 👥 **Clientes y CRM** — Historial de compras, cuenta corriente, fidelización.
6. 📊 **Dashboard con KPIs** — Ganancia bruta, top productos, stock crítico. Todo visible.

### Sección AFIP (destacada)
"✅ Facturación electrónica incluida — Integramos TusFacturasAPP para que emitas facturas válidas ante AFIP/ARCA directo desde el sistema. Sin software adicional."

### Pricing (simple)
"Consultá el precio mensual para tu negocio. Primer mes de prueba gratis."  
CTA: "Hablar con nosotros" (WhatsApp o email)

---

## Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| `app/app/page.tsx` | Modificar — mostrar landing si no autenticado |
| `app/components/landing/LandingPage.tsx` | Crear — componente principal de la landing |
| `app/components/landing/LandingHeader.tsx` | Crear — header con nav |
| `app/components/landing/LandingFooter.tsx` | Crear — footer simple |
| `app/app/(auth)/confirmar-email/page.tsx` | Crear — pantalla post-registro |
| `app/app/api/auth/callback/route.ts` | Crear/verificar — callback de Supabase |
| `app/app/actions/auth.ts` | Modificar — redirect post-registro |
| `app/app/(auth)/login/page.tsx` | Modificar — agregar link a landing |
| `app/app/(auth)/registro/page.tsx` | Modificar — agregar link a landing |

---

## Dependencias

- Sin dependencias externas nuevas (solo Tailwind)
- Supabase Auth ya configurado
- Callback URL en Supabase debe apuntar a: `https://[dominio]/api/auth/callback`
  - En desarrollo: `http://localhost:3000/api/auth/callback`

---

## Criterios de Éxito

- [ ] `/` muestra landing cuando el usuario no está logueado
- [ ] `/` redirige a `/dashboard` cuando el usuario está logueado  
- [ ] Landing tiene hero, features, sección AFIP y CTA
- [ ] Registro redirige a pantalla de "revisá tu email"
- [ ] Callback de Supabase funciona y redirige correctamente
- [ ] Login y registro tienen link "Volver al inicio"
- [ ] No hay errores de TypeScript
