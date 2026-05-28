# Plan: Reestructuración del módulo de Configuración

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Reestructurar la configuración completa del negocio para darle más orden y velocidad en UX/UI. Ticket solo con cosas de ticket. Métodos de pago evaluado con cuentas de fondos.

---

## Descripción General

### Qué Logra Este Plan

Reorganiza el módulo `/configuracion` de **8 tabs caóticos** a **5 tabs temáticos y cohesivos**, dividiendo la mega-pantalla "Tienda y ticket" en secciones con propósito único. El ticket queda aislado con todo lo que le compete. Los cobros (cuentas + métodos) se unifican en una sola pantalla relacional. Lo infrecuente se agrupa en "Avanzado". El rubro deja de ser tab propio y se integra en "Mi negocio".

### Por Qué Importa

La configuración es lo primero que un dueño hace al abrir la app y lo que consulta cuando algo falla en la impresora o quiere cambiar una comisión. El diseño actual genera fricción: la tab "Tienda y ticket" mezcla datos fiscales con config de impresora; los cobros requieren navegar entre dos tabs para una tarea conceptualmente única; el rubro es un tab entero para un selector simple. Cada click innecesario es tiempo perdido en caja.

---

## Estado Actual

### Estructura de tabs existente (8 tabs)

| Tab | Ruta | Componente principal | Contenido |
|-----|------|---------------------|-----------|
| Tienda y ticket | `/configuracion` | `DatosTiendaForm` | Datos fiscales + logo + ticket + balanza + remito + margen (TODO mezclado) |
| Rubro | `/configuracion/rubro` | `RubroForm` | Selector de rubro (una sola acción) |
| Métodos de pago | `/configuracion/metodos-pago` | `MetodosPagoManager` | CRUD de métodos |
| Cuentas de fondos | `/configuracion/cuentas-fondos` | `CuentasFondosManager` | CRUD de cuentas |
| Etiquetas | `/configuracion/etiquetas` | `DisenadorEtiqueta` | Diseño etiqueta |
| Importar | `/configuracion/importar` | `DescargaTemplateCSV` | Import CSV |
| Facturación AFIP | `/configuracion/facturacion` | `FacturacionConfig` | AFIP (plan-gated) |
| Equipo | `/configuracion/equipo` | (equipo manager) | Team management |

### Problemas identificados

1. **"Tienda y ticket" es un mega-form** con 5 secciones conceptualmente distintas: datos fiscales, ticket, remito, balanza y margen. El usuario de ropa tarda en encontrar "días de cambio" entre opciones de balanza que no le corresponden.
2. **Métodos de pago y cuentas de fondos** son dependientes (un método apunta a una cuenta) pero están en tabs separadas. Para configurar un método nuevo hay que primero crear la cuenta y luego volver al tab anterior.
3. **Rubro** ocupa una tab entera para un formulario que se toca raramente. Genera ruido en la navegación.
4. **8 tabs** en la barra de navegación horizontal se superponen en pantallas medianas (tablet, 768px).
5. **No hay jerarquía visual** entre configuraciones frecuentes (ticket, cobros) e infrecuentes (etiquetas, balanza, importar, facturación).
6. **`DatosTiendaForm`** tiene un solo submit que guarda TODO — incluyendo campos de secciones que el usuario no tocó. Semánticamente raro.

### Archivos relevantes

```
app/app/(dashboard)/configuracion/
├── page.tsx                  ← "Tienda y ticket" (reemplazar con "Mi negocio")
├── rubro/page.tsx            ← Absorber en page.tsx
├── metodos-pago/page.tsx     ← Redirigir a /cobros
├── cuentas-fondos/page.tsx   ← Redirigir a /cobros
├── etiquetas/page.tsx        ← Actualizar tabs (mover a "Avanzado")
├── importar/page.tsx         ← Actualizar tabs (mover a "Avanzado")
├── facturacion/page.tsx      ← Actualizar tabs (sin cambios)
└── equipo/page.tsx           ← Actualizar tabs (sin cambios)

app/components/configuracion/
├── TabsConfiguracion.tsx     ← Rediseñar a 5 tabs
├── DatosTiendaForm.tsx       ← Dividir en NegocioForm + TicketForm
├── RubroForm.tsx             ← Extraer solo el selector, integrar en NegocioForm
├── MetodosPagoManager.tsx    ← Sin cambios funcionales
├── CuentasFondosManager.tsx  ← Sin cambios funcionales
├── LogoUpload.tsx            ← Mover a NegocioForm
└── PrintBridgeStatus.tsx     ← Mover a TicketForm

app/app/actions/configuracion.ts   ← Agregar acciones separadas
app/lib/configuracion/queries.ts   ← Sin cambios
```

---

## Nueva Estructura Propuesta

### Los 5 tabs

| # | Tab key | Label | Ruta | Contenido |
|---|---------|-------|------|-----------|
| 1 | `negocio` | Mi negocio | `/configuracion` | Logo · Datos fiscales · Rubro (integrado) · Margen de ganancia |
| 2 | `ticket` | Ticket | `/configuracion/ticket` | SOLO ticket: encabezado, pie, prefijo, ancho, impresora, PrintBridge, vale de cambio, logo/IVA |
| 3 | `cobros` | Cobros | `/configuracion/cobros` | Cuentas de fondos + Métodos de pago en una sola pantalla |
| 4 | `equipo` | Equipo | `/configuracion/equipo` | Sin cambios |
| 5 | `avanzado` | Avanzado | `/configuracion/avanzado` | Etiquetas · Remito (condicional) · Balanza (condicional) · Importar · Facturación |

### Agrupación semántica "Avanzado"

La tab "Avanzado" agrupa todo lo que se configura una vez al inicio y rara vez se toca:
- **Etiquetas** — diseño de etiqueta de producto
- **Remito** — solo si `configRubro.usarRemitos` (ferretería, corralone, genérico)
- **Balanza** — solo si `configRubro.usarBalanza` (carnicería, verdulería, despensa, corralone, genérico)
- **Importar** — importación masiva de productos CSV
- **Facturación** — integración AFIP (plan-gated)

Cada subsección dentro de "Avanzado" tiene su propio card con heading, descripción y form. Una sola página, scroll vertical.

### Cobros — diseño de página unificada

La página `/configuracion/cobros` muestra dos secciones en orden lógico:

```
┌─────────────────────────────────────────────────────┐
│  Cuentas de fondos                                  │
│  "Dónde va el dinero" — efectivo, MP, banco...     │
│  [CuentasFondosManager]                             │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  Métodos de pago                                    │
│  "Cómo te pagan" — cada método apunta a una cuenta │
│  [MetodosPagoManager]                               │
└─────────────────────────────────────────────────────┘
```

Primero cuentas (prerequisito), luego métodos. Ambas en la misma pantalla. Sin sub-tabs internos — solo scroll.

### Separación de acciones del servidor

El `actualizarConfiguracionTienda` actual acepta `ConfigTiendaInput` completo (todos los campos mezclados). Se divide en acciones semánticas:

| Acción nueva | Campos que maneja |
|---|---|
| `actualizarDatosFiscales(input)` | `razon_social, cuit, condicion_iva, direccion_legal` |
| `actualizarConfigTicket(input)` | `texto_encabezado, texto_pie, mostrar_logo, mostrar_iva, prefijo_ticket, impresora_ticket, ancho_ticket_mm, dias_cambio` |
| `actualizarMargenDefault(margen)` | `margen_ganancia_default` |
| `actualizarConfigRemito(input)` | `texto_pie_remito, estilo_remito` |
| `actualizarConfigBalanza(formato)` | `balanza_formato` |

La acción original `actualizarConfiguracionTienda` puede mantenerse o eliminarse al final del plan. Se opta por mantenerla (por si hay uso externo) pero ya no se usa desde la UI.

---

## Cambios Propuestos

### Nuevos archivos

| Ruta | Propósito |
|------|-----------|
| `app/components/configuracion/NegocioForm.tsx` | Form "Mi negocio": logo + datos fiscales + selector de rubro integrado + margen. Reemplaza a `DatosTiendaForm` para esa sección. |
| `app/components/configuracion/TicketForm.tsx` | Form "Ticket": solo campos de ticket. Sin datos fiscales, sin balanza, sin remito. |
| `app/components/configuracion/AvanzadoPage.tsx` | Página client que compone las secciones de Avanzado (remito, balanza, etiquetas, importar, facturación). |
| `app/app/(dashboard)/configuracion/ticket/page.tsx` | Server page: carga config + rubro → monta `TicketForm` |
| `app/app/(dashboard)/configuracion/cobros/page.tsx` | Server page: carga cuentas + métodos → monta ambos managers en página única |
| `app/app/(dashboard)/configuracion/avanzado/page.tsx` | Server page: carga config + rubro + etiquetas → monta `AvanzadoPage` |

### Archivos a modificar

| Ruta | Cambios |
|------|---------|
| `app/components/configuracion/TabsConfiguracion.tsx` | Rediseñar a 5 tabs: `negocio \| ticket \| cobros \| equipo \| avanzado` |
| `app/app/(dashboard)/configuracion/page.tsx` | Reemplazar "Tienda y ticket" por "Mi negocio" — monta `NegocioForm` |
| `app/app/(dashboard)/configuracion/metodos-pago/page.tsx` | Redirect 307 a `/configuracion/cobros` |
| `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx` | Redirect 307 a `/configuracion/cobros` |
| `app/app/(dashboard)/configuracion/rubro/page.tsx` | Redirect 307 a `/configuracion` |
| `app/app/(dashboard)/configuracion/etiquetas/page.tsx` | Actualizar tab active a `avanzado`, redirect a `/configuracion/avanzado` |
| `app/app/(dashboard)/configuracion/importar/page.tsx` | Redirect 307 a `/configuracion/avanzado` |
| `app/app/(dashboard)/configuracion/facturacion/page.tsx` | Actualizar tab active a `avanzado` |
| `app/app/(dashboard)/configuracion/equipo/page.tsx` | Actualizar tab active de `equipo` (sin cambios de contenido) |
| `app/app/actions/configuracion.ts` | Agregar las 5 acciones semánticas nuevas |

### Archivos a eliminar (al final)

- `app/components/configuracion/DatosTiendaForm.tsx` — reemplazado por `NegocioForm` + `TicketForm`

---

## Decisiones de Diseño

### Decisiones clave

1. **"Avanzado" como tab unificado en lugar de tabs individuales**: Etiquetas, balanza, remito, importar y facturación se consultan raramente. Unificarlos reduce el conteo de tabs de 8 a 5. El scroll vertical dentro de Avanzado es más rápido que navegar entre tabs para estas opciones infrecuentes.

2. **Rubro integrado en "Mi negocio"**: El rubro es identidad del negocio — va junto con la razón social y el logo. Libera un tab entero. El `RubroForm` ya tiene su lógica; se extrae el grid de cards y se embebe como sección dentro de `NegocioForm`.

3. **Cobros en una sola pantalla**: Cuentas de fondos son prerequisito de métodos de pago. Al verlos juntos, el usuario entiende la relación: "primero creo la cuenta, luego le asigno el método". No se cambia nada de `MetodosPagoManager` ni `CuentasFondosManager` — solo el layout de la página.

4. **Acciones separadas en lugar de un mega-form**: Cada subsección tiene su propio botón "Guardar" y su propia server action. Así el usuario sabe exactamente qué guardó y hay mensajes de feedback localizados. Evita el problema de "guardé todo sin querer" al clickear el botón equivocado.

5. **Redirects en rutas antiguas**: `/configuracion/metodos-pago`, `/configuracion/cuentas-fondos`, `/configuracion/rubro` redirigen a las nuevas rutas. Evita links rotos si el usuario tiene bookmarks o si el sidebar los referencia directamente.

6. **AvanzadoPage como componente client opcional**: La página `/configuracion/avanzado` puede ser server con secciones anidadas, o bien un componente client con un mini-accordeon. Se opta por server page con secciones visibles — misma estructura que la página de Cobros.

7. **No se toca el backend**: Ningún cambio en las funciones SQL, RLS, queries o la estructura del DB. Solo UI + actions nuevas en el frontend.

### Alternativas descartadas

- **Sidebar de navegación lateral dentro de /configuracion**: Más escalable pero requiere cambio de layout. La app usa un sidebar global — agregar un segundo nivel de sidebar anida demasiado. Los tabs siguen siendo la decisión correcta para 5 ítems.
- **Sub-tabs dentro de "Avanzado"**: Tentador, pero agrega un nivel más de navegación anidada. El scroll vertical en una página bien separada con headings es más natural.
- **Mantener `DatosTiendaForm` y solo ocultarle secciones**: Ya se hizo con `usarRemitos` y `usarBalanza`. Pero sigue siendo un form gigante. La división en componentes separados con submit propio es la solución correcta.

---

## Tareas Paso a Paso

### T1 — Actualizar `TabsConfiguracion`

**Archivo:** `app/components/configuracion/TabsConfiguracion.tsx`

Reemplazar los 8 tabs actuales por 5:

```typescript
const tabs = [
  { href: '/configuracion',           label: 'Mi negocio', key: 'negocio'    },
  { href: '/configuracion/ticket',    label: 'Ticket',     key: 'ticket'     },
  { href: '/configuracion/cobros',    label: 'Cobros',     key: 'cobros'     },
  { href: '/configuracion/equipo',    label: 'Equipo',     key: 'equipo'     },
  { href: '/configuracion/avanzado',  label: 'Avanzado',   key: 'avanzado'   },
]

type ActiveTab = 'negocio' | 'ticket' | 'cobros' | 'equipo' | 'avanzado'
```

Sin cambios de estilos — misma visual de tab con border-b activo.

---

### T2 — Server actions separadas

**Archivo:** `app/app/actions/configuracion.ts`

Agregar al final del archivo las 5 acciones nuevas (sin tocar las existentes):

```typescript
// ─── DATOS FISCALES ────────────────────────────────────────────────────────

export interface DatosFiscalesInput {
  razon_social: string | null
  cuit: string | null
  condicion_iva: string | null
  direccion_legal: string | null
}

export async function actualizarDatosFiscales(input: DatosFiscalesInput): Promise<ActionResult> {
  // validación CUIT + update de esos 4 campos solamente
  // revalidatePath('/configuracion')
}

// ─── CONFIG TICKET ─────────────────────────────────────────────────────────

export interface ConfigTicketInput {
  texto_encabezado: string | null
  texto_pie: string | null
  mostrar_logo: boolean
  mostrar_iva: boolean
  prefijo_ticket: string | null
  impresora_ticket: string | null
  ancho_ticket_mm: number
  dias_cambio: number | null
}

export async function actualizarConfigTicket(input: ConfigTicketInput): Promise<ActionResult> {
  // validaciones de ancho + prefijo + dias_cambio
  // revalidatePath('/configuracion/ticket')
}

// ─── MARGEN DEFAULT ────────────────────────────────────────────────────────

export async function actualizarMargenDefault(margen: number): Promise<ActionResult> {
  // validar 0..9999
  // revalidatePath('/configuracion')
}

// ─── CONFIG REMITO ─────────────────────────────────────────────────────────

export interface ConfigRemitoInput {
  texto_pie_remito: string | null
  estilo_remito: 'moderno' | 'clasico'
}

export async function actualizarConfigRemito(input: ConfigRemitoInput): Promise<ActionResult> {
  // update de solo esos 2 campos
  // revalidatePath('/configuracion/avanzado')
}

// ─── CONFIG BALANZA ────────────────────────────────────────────────────────

export async function actualizarConfigBalanza(
  formato: 'precio' | 'peso' | null
): Promise<ActionResult> {
  // update de solo balanza_formato
  // revalidatePath('/configuracion/avanzado')
}
```

---

### T3 — `NegocioForm` (nuevo componente)

**Archivo:** `app/components/configuracion/NegocioForm.tsx`

Form client con 3 secciones:

**Sección 1 — Logo** (extrae `LogoUpload` que hoy está en la page directamente)

**Sección 2 — Datos fiscales** (campos: razón social, CUIT, condición IVA, dirección)
- Submit propio → `actualizarDatosFiscales()`

**Sección 3 — Rubro del negocio** (extrae el grid de cards de `RubroForm`)
- Submit propio → `actualizarRubroTienda()` (ya existe)
- Solo muestra advertencia de cambio si `selected !== rubroActual`

**Sección 4 — Margen de ganancia** (campo numérico)
- Submit propio → `actualizarMargenDefault()`
- Hint: "0 = desactivado. Sugerencia automática en formulario de productos."

Props:
```typescript
interface NegocioFormProps {
  initial: ConfiguracionTienda | null
  rubroActual: Rubro
}
```

Cada sección tiene su propio `useTransition` + botón "Guardar" + feedback inline. No hay un submit global.

---

### T4 — `TicketForm` (nuevo componente)

**Archivo:** `app/components/configuracion/TicketForm.tsx`

Form client con los campos **exclusivos del ticket**:

```
┌─────────────────────────────────────────────────────┐
│ Ticket impreso                                      │
│ "Personalizá lo que se imprime en cada venta"       │
├─────────────────────────────────────────────────────┤
│ Texto de encabezado (Textarea)                      │
│ Texto del pie (Textarea)                            │
│ Prefijo de numeración (Input, maxLength=5)          │
│ Ancho del ticket (Select: 58/76/80mm)               │
│ Nombre de la impresora (Input)                      │
│ [si rubroTieneVale] Días para cambios (Input num)   │
│ ─────────────────────────────────────               │
│ ☑ Mostrar logo en el ticket                        │
│ ☐ Mostrar discriminación de IVA                    │
│ ─────────────────────────────────────               │
│ [PrintBridgeStatus]                                 │
│ ─────────────────────────────────────               │
│                        [Guardar ticket]             │
└─────────────────────────────────────────────────────┘
```

Props:
```typescript
interface TicketFormProps {
  initial: ConfiguracionTienda | null
  rubro: Rubro
}
```

Submit → `actualizarConfigTicket()`.

---

### T5 — Página "Mi negocio" (refactor `/configuracion`)

**Archivo:** `app/app/(dashboard)/configuracion/page.tsx`

```typescript
export default async function ConfiguracionPage() {
  const [config, rubroRaw] = await Promise.all([
    obtenerConfiguracionTienda(),
    obtenerRubroTienda(),
  ])
  const rubro = rubroRaw as Rubro

  return (
    <div>
      <h1>Mi negocio</h1>
      <p>Identidad, datos fiscales y configuración de rentabilidad.</p>
      <TabsConfiguracion active="negocio" />
      <div className="max-w-3xl mt-6">
        <NegocioForm initial={config} rubroActual={rubro} />
      </div>
    </div>
  )
}
```

---

### T6 — Página "Ticket" (nueva `/configuracion/ticket`)

**Archivo:** `app/app/(dashboard)/configuracion/ticket/page.tsx`

```typescript
export default async function ConfiguracionTicketPage() {
  const [config, rubroRaw] = await Promise.all([
    obtenerConfiguracionTienda(),
    obtenerRubroTienda(),
  ])
  return (
    <div>
      <h1>Ticket de venta</h1>
      <p>Todo lo que se imprime en el ticket. Nada más.</p>
      <TabsConfiguracion active="ticket" />
      <div className="max-w-3xl mt-6">
        <TicketForm initial={config} rubro={rubro as Rubro} />
      </div>
    </div>
  )
}
```

---

### T7 — Página "Cobros" (nueva `/configuracion/cobros`)

**Archivo:** `app/app/(dashboard)/configuracion/cobros/page.tsx`

```typescript
export default async function ConfiguracionCobrosPage() {
  const [cuentas, metodos] = await Promise.all([
    listarCuentasFondos(false),
    listarMetodosPago(false),
  ])
  const cuentasActivas = cuentas.filter(c => c.activo)

  return (
    <div>
      <h1>Cobros</h1>
      <p>Dónde va el dinero y cómo aceptás pagos en el POS.</p>
      <TabsConfiguracion active="cobros" />
      
      <div className="mt-6 space-y-8">
        {/* Sección 1: Cuentas de fondos */}
        <section>
          <div className="mb-4">
            <h2>Cuentas de fondos</h2>
            <p>Efectivo, Mercado Pago, banco — el dinero vive acá.</p>
          </div>
          <CuentasFondosManager cuentas={cuentas} />
        </section>

        {/* Sección 2: Métodos de pago */}
        <section>
          <div className="mb-4">
            <h2>Métodos de pago</h2>
            <p>Cada método apunta a una cuenta. Se snapshot-ean en cada venta.</p>
          </div>
          <MetodosPagoManager metodos={metodos} cuentasActivas={cuentasActivas} />
        </section>
      </div>
    </div>
  )
}
```

---

### T8 — Página "Avanzado" (nueva `/configuracion/avanzado`)

**Archivo:** `app/app/(dashboard)/configuracion/avanzado/page.tsx`

Carga todo lo necesario y compone las secciones condicionalmente:

```typescript
export default async function ConfiguracionAvanzadoPage() {
  const [config, rubroRaw, ctx] = await Promise.all([
    obtenerConfiguracionTienda(),
    obtenerRubroTienda(),
    getContextoTienda(),
  ])
  const rubro = rubroRaw as Rubro
  const configRubro = getConfigRubro(rubro)
  // ... cargar etiquetas, facturación config
  
  return (
    <div>
      <h1>Avanzado</h1>
      <p>Configuraciones que se tocan una vez al inicio.</p>
      <TabsConfiguracion active="avanzado" />
      
      <div className="max-w-3xl mt-6 space-y-8">
        
        {/* Etiquetas — siempre visible (puede estar plan-gated) */}
        <section id="etiquetas">
          <h2>Etiquetas de producto</h2>
          {puedeUsar(ctx?.planEfectivo, 'disenador_etiquetas')
            ? <DisenadorEtiqueta inicial={inicial} />
            : <UpgradeBanner feature="disenador_etiquetas" />
          }
        </section>

        {/* Remito — solo si usarRemitos */}
        {configRubro.usarRemitos && (
          <section id="remito">
            <h2>Remito</h2>
            <RemotoForm initial={config} />
          </section>
        )}

        {/* Balanza — solo si usarBalanza */}
        {configRubro.usarBalanza && (
          <section id="balanza">
            <h2>Balanza electrónica</h2>
            <BalanzaForm initial={config} />
          </section>
        )}

        {/* Importar productos */}
        <section id="importar">
          <h2>Importar productos</h2>
          {puedeUsar(ctx?.planEfectivo, 'importar_csv')
            ? <DescargaTemplateCSV rubro={rubro} />
            : <UpgradeBanner feature="importar_csv" />
          }
        </section>

        {/* Facturación AFIP */}
        <section id="facturacion">
          <h2>Facturación electrónica AFIP</h2>
          {puedeUsar(ctx?.planEfectivo, 'facturacion')
            ? <FacturacionConfig initial={facturacionConfig} />
            : <UpgradeBanner feature="facturacion" />
          }
        </section>
      </div>
    </div>
  )
}
```

---

### T9 — `RemotoForm` (nuevo componente pequeño)

**Archivo:** `app/components/configuracion/RemotoForm.tsx`

Form client minimalista con solo 2 campos:
- `texto_pie_remito` (Textarea)
- `estilo_remito` (Select: Moderno / Clásico)

Submit → `actualizarConfigRemito()`.

---

### T10 — `BalanzaForm` (nuevo componente pequeño)

**Archivo:** `app/components/configuracion/BalanzaForm.tsx`

Form client con 1 campo:
- `balanza_formato` (Select: Sin balanza / Precio embebido / Peso embebido)

Submit → `actualizarConfigBalanza()`.

---

### T11 — Redirects en rutas antiguas

**Archivos a modificar (redirect 307):**

`app/app/(dashboard)/configuracion/metodos-pago/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function MetodosPagoPage() {
  redirect('/configuracion/cobros')
}
```

`app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function CuentasFondosPage() {
  redirect('/configuracion/cobros')
}
```

`app/app/(dashboard)/configuracion/rubro/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function RubroPage() {
  redirect('/configuracion')
}
```

`app/app/(dashboard)/configuracion/etiquetas/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function EtiquetasPage() {
  redirect('/configuracion/avanzado#etiquetas')
}
```

`app/app/(dashboard)/configuracion/importar/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function ImportarPage() {
  redirect('/configuracion/avanzado#importar')
}
```

`app/app/(dashboard)/configuracion/facturacion/page.tsx` — no se redirige, solo se actualiza el tab active a `avanzado`.

---

### T12 — Limpiar `DatosTiendaForm`

**Archivo:** `app/components/configuracion/DatosTiendaForm.tsx`

Una vez creados `NegocioForm` y `TicketForm` y verificado que ningún archivo importa `DatosTiendaForm`, **eliminar** el archivo.

Verificar con búsqueda antes de eliminar: `grep -r "DatosTiendaForm" app/`.

---

### T13 — Verificar el sidebar

**Archivo:** `app/components/layout/Sidebar.tsx`

Verificar que el ítem de configuración del sidebar apunte a `/configuracion` (Mi negocio) y no a sub-rutas que ya no existen como tabs directas. Si hubiera links directos a `/configuracion/metodos-pago` o similares, actualizarlos a `/configuracion/cobros`.

---

## Orden de implementación recomendado

1. **T2** (acciones) → sin UI, no rompe nada
2. **T1** (tabs) → actualizar el componente de navegación
3. **T9 + T10** (RemotoForm + BalanzaForm) → componentes simples, base para T8
4. **T3** (NegocioForm) → componente principal, el más grande
5. **T4** (TicketForm) → componente limpio
6. **T5** (page Mi negocio) → conecta T1 + T3
7. **T6** (page Ticket) → conecta T1 + T4
8. **T7** (page Cobros) → conecta managers existentes
9. **T8** (page Avanzado) → conecta todo lo restante
10. **T11** (redirects) → rutas antiguas
11. **T12** (limpieza DatosTiendaForm)
12. **T13** (verificar sidebar)

---

## Resumen de impacto

| Métrica | Antes | Después |
|---------|-------|---------|
| Tabs visibles | 8 | 5 |
| Formularios que mezclan concerns | 1 (mega-form) | 0 |
| Clicks para configurar métodos + cuentas | 2 tabs + navegar | 1 tab (scroll) |
| Campos irrelevantes visibles (ej: balanza en ropa) | Algunos (ya condicionales) | 0 (en Avanzado, ni se ven) |
| Rutas con redirect → nueva ubicación | 0 | 5 (no rompe nada existente) |
| Archivos nuevos | — | 8 |
| Archivos a eliminar | — | 1 (DatosTiendaForm) |
