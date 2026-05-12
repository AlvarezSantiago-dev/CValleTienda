# Plan: Facturación Electrónica AFIP/ARCA — Plan Pro (TusFacturasAPP)

**Creado:** 2026-05-10  
**Estado:** Borrador  
**Pedido:** Integrar facturación electrónica AFIP/ARCA mediante API externa (TusFacturasAPP) para el Plan Pro de CValleTienda. El cliente pone su propia API key — CValleTienda no paga la API.

---

## Descripción General

### Qué Logra Este Plan

Permite que los tenants del Plan Pro emitan comprobantes fiscalmente válidos ante AFIP/ARCA (Facturas B y C principalmente, con soporte A) directamente desde el POS y desde el detalle de venta. El sistema llama a la API de TusFacturasAPP con las credenciales del cliente, recibe el CAE e imprime el comprobante con QR oficial.

### Por Qué Importa

El Plan Pro (a $45 USD/mes) necesita justificarse con funcionalidad diferencial real. La facturación electrónica es el requerimiento #1 de cualquier comercio que quiera operar formalmente. Sin esto, CValleTienda compite solo por precio contra sistemas más completos.

---

## Sobre la API Elegida: TusFacturasAPP

**URL:** https://developers.tusfacturas.app  
**Modelo:** REST/JSON — el cliente se registra con su CUIT y obtiene su API key  
**Prueba gratuita:** 1 mes sin costo  
**Tipos de comprobante soportados:** A, B, C, E, M, MiPyme  
**CAE y QR ARCA:** Generados automáticamente en cada comprobante  
**Modalidad que usamos:** Instantánea individual (POST → respuesta inmediata con CAE)

**Por qué TusFacturasAPP y no otra:**
- 11 años en el mercado, respaldada por estudio impositivo
- REST/JSON moderno, no SOAP
- El cliente gestiona su propia cuenta → CValleTienda no paga nada
- Soporte técnico gratuito e ilimitado
- Sandbox/testing disponible
- Documentación clara con ejemplos para cada tipo de comprobante

---

## Estado Actual

### Estructura Existente Relevante

```
app/app/actions/ventas.ts         — registrarVenta(), lógica de venta completa
app/app/actions/impresion.ts      — obtenerPayloadVenta(), build_payload_ticket_venta
app/lib/impresion/types.ts        — PayloadTicketVenta, TiendaPayload
app/components/impresion/         — TicketVentaRenderer (impresión CSS actual)
supabase/migrations/007_configuracion.sql — configuracion_tienda (datos fiscales ya presentes)
types/database.ts                 — Tienda, ConfiguracionTienda
```

**Datos fiscales ya en el sistema:**
- `configuracion_tienda.razon_social` ✅
- `configuracion_tienda.cuit` ✅
- `configuracion_tienda.condicion_iva` ✅
- `configuracion_tienda.prefijo_ticket` ✅
- `configuracion_tienda.ultimo_numero_ticket` ✅

### Brechas que se Abordan

- No existe campo para `punto_de_venta` AFIP en `configuracion_tienda`
- No existe campo para `api_key_facturacion` por tenant
- La tabla `ventas` no tiene `cae`, `cae_vencimiento`, `numero_comprobante`, `tipo_comprobante`
- El POS no tiene opción de emitir factura al confirmar venta
- El `TicketVentaRenderer` no incluye CAE ni QR ARCA
- No hay configuración de facturación en el módulo de Configuración

---

## Decisiones de Diseño

### Decisiones Clave

1. **El cliente pone su API key, no CValleTienda**: Cada tenant tiene su propia cuenta en TusFacturasAPP. Esto elimina el costo variable para el SaaS. CValleTienda solo almacena la key (cifrada) y la usa para hacer llamadas en nombre del tenant.

2. **Factura opcional por venta**: En el POS hay un toggle "Emitir factura" (default: desactivado). Si está activado, el sistema pide el CUIT del receptor (o lo toma del cliente seleccionado) y determina automáticamente el tipo de comprobante.

3. **Tipo de comprobante automático**:
   - Emisor Monotributista → siempre **Factura C**
   - Emisor RI + receptor CF (sin CUIT) → **Factura B**
   - Emisor RI + receptor con CUIT RI → **Factura A**

4. **La venta se registra aunque falle la facturación**: La venta queda guardada en la DB. Si AFIP falla, se puede intentar facturar desde el detalle de venta. Nunca se bloquea una venta por un fallo de API externa.

5. **Modo instantáneo individual**: POST a `/comprobantes` → respuesta síncrona con CAE. Es el más simple y adecuado para POS (volumen bajo, respuesta inmediata).

6. **API key cifrada en DB**: Se guarda con `encode(encrypt(...), 'base64')` en Postgres o simplemente cifrada a nivel aplicación antes de guardar. Nunca se expone al frontend.

7. **El QR ARCA lo genera TusFacturasAPP**: Devuelve el string del QR en la respuesta. Se renderiza en el ticket con la librería QR existente o una nueva.

### Alternativas Consideradas

- **Facturación directa AFIP (WSFE)**: Descartada por complejidad operativa multi-tenant y necesidad de gestionar certificados por cliente.
- **Modo asincrónico con webhook**: Descartado para MVP — el modo instantáneo es más simple y predecible en POS.
- **Guardar la API key sin cifrar**: Descartado por seguridad — se cifra antes de persistir.

### Preguntas Abiertas

- ¿Qué pasa si el cliente tiene varias condiciones IVA mixtas? (fuera de scope MVP)
- ¿Se emiten Notas de Crédito al hacer devoluciones? (fase 2)
- ¿Se envía la factura por email al cliente? (TusFacturasAPP lo puede hacer automáticamente — configuración futura)

---

## Cambios Propuestos

### Resumen

- Nueva migración SQL con campos de facturación en `configuracion_tienda` y `ventas`
- Nueva tabla `facturacion_config` (más limpio que saturar `configuracion_tienda`)
- Server action `emitirFactura(ventaId)` que llama a TusFacturasAPP
- Toggle "Emitir factura" en el POS (dentro del panel de confirmación)
- Sección "Facturación" en el módulo de Configuración
- `TicketVentaRenderer` actualizado para mostrar CAE + QR cuando hay factura
- Tipos TypeScript actualizados

### Nuevos Archivos

| Ruta | Propósito |
|---|---|
| `supabase/migrations/20260510000001_facturacion_electronica.sql` | Agrega campos a `ventas` y crea `facturacion_config` |
| `app/app/actions/facturacion.ts` | Server actions: guardarConfigFacturacion, emitirFactura, verificarConfigFacturacion |
| `app/lib/facturacion/tusfacturas.ts` | Cliente HTTP para la API de TusFacturasAPP |
| `app/lib/facturacion/tipos.ts` | Tipos para request/response de TusFacturasAPP |
| `app/lib/facturacion/comprobante.ts` | Lógica para determinar tipo de comprobante (A/B/C) |
| `app/components/configuracion/FacturacionConfig.tsx` | Formulario de configuración de facturación electrónica |
| `app/components/pos/FacturaToggle.tsx` | Toggle + campos de factura en el panel de cobro del POS |

### Archivos a Modificar

| Ruta | Cambios |
|---|---|
| `app/types/database.ts` | Agregar `FacturacionConfig`, campos a `Venta` |
| `app/app/actions/ventas.ts` | Integrar llamada a `emitirFactura()` post-venta si el toggle está activo |
| `app/components/impresion/TicketVentaRenderer.tsx` | Agregar bloque CAE + QR cuando `payload.factura` existe |
| `app/lib/impresion/types.ts` | Agregar campo `factura?: FacturaPayload` a `PayloadTicketVenta` |
| `app/app/(dashboard)/configuracion/page.tsx` | Agregar tab/sección de Facturación |

---

## Tareas Paso a Paso

---

### Paso 1: Migración de Base de Datos

Crear la migración SQL que agrega los campos necesarios.

**Acciones:**

- Crear `supabase/migrations/20260510000001_facturacion_electronica.sql`
- Agregar tabla `facturacion_config` con: `tienda_id`, `punto_de_venta` (int), `api_usertoken` (text, cifrado), `api_apitoken` (text, cifrado), `api_apikey` (text), `condicion_iva_emisor` (text), `activo` (bool default false)
- Agregar a `ventas`: `tipo_comprobante` (text nullable), `numero_comprobante` (text nullable), `cae` (text nullable), `cae_vencimiento` (date nullable), `qr_afip` (text nullable), `pdf_url` (text nullable)
- Habilitar RLS en `facturacion_config` (solo owner/admin pueden leer y escribir)
- Index en `ventas.cae` para búsquedas

**Contenido de la migración:**

```sql
-- =============================================
-- FACTURACIÓN ELECTRÓNICA AFIP/ARCA
-- =============================================

-- Configuración de facturación por tenant
CREATE TABLE IF NOT EXISTS public.facturacion_config (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id             uuid NOT NULL UNIQUE REFERENCES public.tiendas(id) ON DELETE CASCADE,
  -- Credenciales TusFacturasAPP (nunca exponerlas al frontend)
  api_usertoken         text,     -- token de usuario TusFacturasAPP
  api_apitoken          text,     -- token de API TusFacturasAPP
  api_apikey            text,     -- key de empresa TusFacturasAPP
  -- Datos AFIP del emisor
  punto_de_venta        integer,  -- número registrado en AFIP (ej. 1)
  condicion_iva_emisor  text NOT NULL DEFAULT 'Monotributista',
  -- Control
  activo                boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER facturacion_config_updated_at
  BEFORE UPDATE ON public.facturacion_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.facturacion_config ENABLE ROW LEVEL SECURITY;

-- Solo usuarios de la tienda pueden ver y modificar su configuración
CREATE POLICY "facturacion_config_select" ON public.facturacion_config
  FOR SELECT USING (
    tienda_id IN (SELECT tienda_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "facturacion_config_insert" ON public.facturacion_config
  FOR INSERT WITH CHECK (
    tienda_id IN (SELECT tienda_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "facturacion_config_update" ON public.facturacion_config
  FOR UPDATE USING (
    tienda_id IN (SELECT tienda_id FROM public.perfiles WHERE id = auth.uid())
  );

-- Campos de facturación en ventas
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS tipo_comprobante text,      -- 'A', 'B', 'C', null = ticket X
  ADD COLUMN IF NOT EXISTS numero_comprobante text,    -- '0001-00000042'
  ADD COLUMN IF NOT EXISTS cae text,                   -- código AFIP
  ADD COLUMN IF NOT EXISTS cae_vencimiento date,
  ADD COLUMN IF NOT EXISTS qr_afip text,               -- string para generar QR
  ADD COLUMN IF NOT EXISTS pdf_url text,               -- URL del PDF de TusFacturasAPP
  ADD COLUMN IF NOT EXISTS cuit_receptor text;         -- CUIT del cliente (para fact. A)

-- Index para buscar por CAE
CREATE INDEX IF NOT EXISTS ventas_cae_idx ON public.ventas(cae) WHERE cae IS NOT NULL;
```

**Archivos afectados:**
- `supabase/migrations/20260510000001_facturacion_electronica.sql` (crear)

---

### Paso 2: Tipos TypeScript

Actualizar `types/database.ts` con los nuevos tipos.

**Acciones:**

- Agregar tipo `FacturacionConfig` con todos los campos de la tabla
- Agregar campos de facturación a `Venta` (como opcionales/nullable)
- Agregar tipo `TipoComprobante = 'A' | 'B' | 'C'`

**Archivos afectados:**
- `app/types/database.ts`

---

### Paso 3: Cliente HTTP TusFacturasAPP

Crear el módulo que encapsula las llamadas a la API.

**Acciones:**

- Crear `app/lib/facturacion/tipos.ts` con los tipos de request/response de TusFacturasAPP:
  - `TusFacturasRequest` — estructura del body del POST
  - `TusFacturasResponse` — estructura de la respuesta exitosa (CAE, vencimiento, QR, PDF URL)
  - `TusFacturasError` — estructura de errores

- Crear `app/lib/facturacion/tusfacturas.ts`:
  ```typescript
  // Cliente para la API de TusFacturasAPP
  // Documentación: https://developers.tusfacturas.app
  const BASE_URL = 'https://www.tusfacturas.app/app/api/v2'
  
  export async function emitirComprobante(
    credenciales: { usertoken: string; apitoken: string; apikey: string },
    comprobante: TusFacturasRequest
  ): Promise<TusFacturasResponse>
  ```
  
  El método hace `POST /facturacion/nuevo` con el body en JSON, maneja errores HTTP y devuelve el CAE.

- Crear `app/lib/facturacion/comprobante.ts`:
  ```typescript
  // Determina tipo de comprobante según condición IVA del emisor y receptor
  export function determinarTipoComprobante(
    condicionEmisor: string,  // 'Monotributista' | 'Responsable Inscripto' | etc.
    cuitReceptor: string | null
  ): 'A' | 'B' | 'C'
  
  // Construye el objeto request para TusFacturasAPP a partir del payload de venta
  export function construirRequest(
    payload: PayloadTicketVenta,
    config: FacturacionConfig,
    tipoComprobante: 'A' | 'B' | 'C',
    cuitReceptor: string | null
  ): TusFacturasRequest
  ```

**Archivos afectados:**
- `app/lib/facturacion/tipos.ts` (crear)
- `app/lib/facturacion/tusfacturas.ts` (crear)
- `app/lib/facturacion/comprobante.ts` (crear)

---

### Paso 4: Server Action de Facturación

Crear `app/app/actions/facturacion.ts` con las acciones del servidor.

**Acciones:**

- `guardarConfigFacturacion(input)` — guarda o actualiza la config de facturación del tenant (upsert). Valida que los campos obligatorios estén presentes.

- `verificarConfigFacturacion()` — devuelve `{ ok: bool, activo: bool, puntoDeVenta: number | null }` para que el POS sepa si puede ofrecer facturación.

- `emitirFactura(ventaId, cuitReceptor?)` — acción principal:
  1. Carga `facturacion_config` del tenant
  2. Verifica que esté activo y tenga credenciales
  3. Obtiene el payload de la venta via `build_payload_ticket_venta`
  4. Determina tipo de comprobante (A/B/C)
  5. Construye el request para TusFacturasAPP
  6. Llama a la API
  7. Guarda `cae`, `cae_vencimiento`, `numero_comprobante`, `tipo_comprobante`, `qr_afip`, `pdf_url` en la venta
  8. Devuelve `{ ok, cae, numeroComprobante, tipoComprobante }`
  - Si la API falla: devuelve `{ ok: false, error }` — la venta NO se revierte

- `obtenerPayloadVentaConFactura(ventaId)` — extiende `obtenerPayloadVenta` para incluir los datos de factura si existen

**Seguridad:**
- Las credenciales (`api_usertoken`, `api_apitoken`, `api_apikey`) solo se leen server-side, nunca se devuelven al cliente
- Validar que el `ventaId` pertenece al tenant del usuario autenticado antes de cualquier operación

**Archivos afectados:**
- `app/app/actions/facturacion.ts` (crear)

---

### Paso 5: Toggle de Factura en el POS

Agregar la opción de emitir factura en el panel de cobro del POS.

**Acciones:**

- Crear `app/components/pos/FacturaToggle.tsx`:
  - Toggle "Emitir factura electrónica" (solo visible si `facturacion.activo === true`)
  - Si el toggle está ON: campo de texto "CUIT del receptor" (opcional para B/C, requerido para A)
  - Texto de ayuda: "Sin CUIT → Factura C/B (consumidor final)"
  - El componente expone `{ emitirFactura: boolean, cuitReceptor: string | null }`

- Modificar el componente de confirmación de venta del POS para:
  - Cargar `verificarConfigFacturacion()` al montar (solo una vez, cacheado)
  - Mostrar `FacturaToggle` si la facturación está activa
  - Pasar `emitirFactura` y `cuitReceptor` al action de venta

- Modificar `registrarVenta()` en `ventas.ts` para aceptar `{ emitirFactura?: boolean, cuitReceptor?: string }` en el input:
  - Post-venta exitosa: si `emitirFactura === true`, llamar a `emitirFactura(ventaId, cuitReceptor)`
  - Si la facturación falla: continuar igual, loguear el error, no bloquear al usuario
  - La respuesta de `registrarVenta` incluye `{ ..., facturaEmitida: bool, cae?: string }`

**Archivos afectados:**
- `app/components/pos/FacturaToggle.tsx` (crear)
- `app/app/actions/ventas.ts` (modificar — agregar campos opcionales al input y llamada post-venta)
- Componente de cobro del POS (identificar exacto al implementar)

---

### Paso 6: Botón "Emitir Factura" desde Detalle de Venta

Permitir facturar una venta ya registrada que no tuvo factura al momento de la venta.

**Acciones:**

- En la página de detalle de venta `app/app/(dashboard)/ventas/[id]/page.tsx`:
  - Si la venta ya tiene CAE: mostrar "Factura N°... · CAE: ... · Vence: ..."
  - Si no tiene CAE y `facturacion.activo`: mostrar botón "Emitir Factura Electrónica"
  - Click en el botón: abre un mini-modal con campo CUIT receptor (opcional) y botón confirmar
  - Llama a `emitirFactura(ventaId, cuitReceptor)`
  - Muestra resultado: éxito (con CAE) o error

**Archivos afectados:**
- `app/app/(dashboard)/ventas/[id]/page.tsx` (modificar)
- Posible nuevo componente `EmitirFacturaModal.tsx`

---

### Paso 7: Ticket con CAE y QR ARCA

Actualizar el renderer del ticket para mostrar datos de factura cuando existen.

**Acciones:**

- Agregar `factura?: FacturaPayload` a `PayloadTicketVenta` en `lib/impresion/types.ts`:
  ```typescript
  export interface FacturaPayload {
    tipo_comprobante: 'A' | 'B' | 'C'
    numero_comprobante: string   // '0001-00000042'
    cae: string
    cae_vencimiento: string      // 'DD/MM/YYYY'
    qr_afip: string              // string para generar QR
  }
  ```

- Actualizar `obtenerPayloadVenta()` en `impresion.ts` para incluir los campos de factura de la venta si existen.

- Actualizar `TicketVentaRenderer.tsx`:
  - Si `payload.factura` existe: mostrar bloque al pie del ticket:
    ```
    ────────────────────────
    FACTURA ELECTRÓNICA C
    N°: 0001-00000042
    CAE: 12345678901234
    Vence: 20/05/2026
    [QR ARCA]
    ```
  - El QR se renderiza con `<QRCode value={payload.factura.qr_afip} size={60} />`
  - Instalar `qrcode.react` o similar si no hay una librería QR en el proyecto

- Si `payload.factura` NO existe: el ticket se imprime exactamente igual que ahora (Ticket X)

**Archivos afectados:**
- `app/lib/impresion/types.ts`
- `app/app/actions/impresion.ts`
- `app/components/impresion/TicketVentaRenderer.tsx`

---

### Paso 8: Configuración de Facturación en el Panel de Configuración

Agregar la sección de facturación al módulo de Configuración.

**Acciones:**

- Crear `app/components/configuracion/FacturacionConfig.tsx`:
  - Estado del servicio: badge "Activo" / "Inactivo"
  - Campos del formulario:
    - Condición IVA del emisor (select: Monotributista / Responsable Inscripto / Exento)
    - Punto de Venta AFIP (número, ej. 1)
    - User Token TusFacturasAPP (input password)
    - API Token TusFacturasAPP (input password)
    - API Key TusFacturasAPP (input password)
  - Botón "Guardar Configuración"
  - Toggle "Habilitar facturación electrónica" (solo activo si los 3 campos de API están completos)
  - Link a la documentación de TusFacturasAPP y al panel del cliente
  - Texto de ayuda: cómo obtener las credenciales paso a paso

- Agregar esta sección a la página de configuración existente (tab o sección nueva)

- `guardarConfigFacturacion()` nunca devuelve las keys al cliente — solo confirma si están configuradas con un booleano `{ usertoken_configurado: bool, apitoken_configurado: bool, apikey_configurado: bool }`

**Archivos afectados:**
- `app/components/configuracion/FacturacionConfig.tsx` (crear)
- `app/app/(dashboard)/configuracion/page.tsx` (modificar — agregar sección)

---

### Paso 9: Listado de Ventas — Columna de Comprobante

Mostrar en el listado de ventas si una venta tiene factura emitida.

**Acciones:**

- En la tabla de ventas: agregar columna "Comprobante" que muestra:
  - Badge gris "Ticket X" si no tiene CAE
  - Badge verde "Fact. C N°..." si tiene CAE
- Filtro opcional: "Solo con factura" / "Solo ticket X"

**Archivos afectados:**
- `app/app/(dashboard)/ventas/page.tsx` o componente de tabla de ventas (identificar al implementar)

---

### Paso 10: Variables de Entorno

Agregar documentación de las variables necesarias.

**Acciones:**

- No se necesita ninguna variable de entorno nueva — las credenciales van en la DB por tenant
- Verificar que `NEXT_PUBLIC_*` no exponga nada relacionado con facturación
- Agregar comentario en `.env.example` (si existe) indicando que la config de facturación va en DB

---

## Notas de Implementación

### Estructura del request a TusFacturasAPP (Factura C — Monotributista)

```json
{
  "usertoken": "...",
  "apitoken": "...",
  "apikey": "...",
  "cliente": {
    "documento_tipo": "CONSUMIDOR_FINAL",
    "documento_nro": "0",
    "razon_social": "Consumidor Final",
    "email": "",
    "domicilio": ""
  },
  "comprobante": {
    "fecha": "13/05/2026",
    "tipo": { "id": "C" },
    "punto_venta": "1",
    "detalle": [
      {
        "cantidad": 2,
        "producto": {
          "descripcion": "Remera talle M azul",
          "precio_unitario_sin_iva": 5000.00,
          "alicuota": 0,
          "unidad_bulto": 1
        }
      }
    ],
    "total": 10000.00
  }
}
```

### Respuesta de TusFacturasAPP (éxito)

```json
{
  "error": "N",
  "errores": [],
  "rta": "El comprobante FACTURA C N° 00001-00000001 (ARCA) se ha guardado correctamente",
  "vencimiento_cae": "20261013",
  "vencimiento_pago": "",
  "comprobante_nro": "00001-00000001",
  "cae": "75269381345871",
  "qr": "https://www.afip.gob.ar/fe/qr/?p=eyJ2ZXIiOiI...",
  "envio_x_mail": "N",
  "comprobante_pdf_url": "https://..."
}
```

### Lógica de tipo de comprobante

```typescript
function determinarTipoComprobante(
  condicionEmisor: string,
  cuitReceptor: string | null
): 'A' | 'B' | 'C' {
  if (condicionEmisor === 'Monotributista') return 'C'
  if (!cuitReceptor) return 'B'  // RI sin CUIT receptor = consumidor final
  return 'A'  // RI a RI
}
```

---

## Checklist de Implementación

- [ ] Paso 1: Migración SQL creada y aplicada
- [ ] Paso 2: Tipos TypeScript actualizados
- [ ] Paso 3: Cliente HTTP TusFacturasAPP + lógica de comprobante
- [ ] Paso 4: Server actions de facturación
- [ ] Paso 5: FacturaToggle en el POS
- [ ] Paso 6: Botón emitir factura desde detalle de venta
- [ ] Paso 7: TicketVentaRenderer con CAE y QR
- [ ] Paso 8: Sección Facturación en Configuración
- [ ] Paso 9: Columna comprobante en listado de ventas
- [ ] Paso 10: Verificar variables de entorno
- [ ] Prueba end-to-end en sandbox de TusFacturasAPP
- [ ] Prueba de impresión de ticket con CAE en térmica

---

## Estimación

**Desarrollo:** 4-6 días  
**Dependencia externa:** cuenta en TusFacturasAPP para pruebas (1 mes gratis)  
**Costo para CValleTienda:** $0 (el cliente paga su propia suscripción a TusFacturasAPP)
