-- =============================================================
-- MIGRATION: FACTURACIÓN ELECTRÓNICA AFIP/ARCA
-- Agrega tabla facturacion_config por tenant y campos de comprobante
-- fiscal en la tabla ventas.
-- =============================================================

-- -------------------------------------------------------------
-- TABLA: facturacion_config
-- Configuración de facturación electrónica por tenant.
-- Almacena credenciales de TusFacturasAPP y datos AFIP del emisor.
-- NUNCA exponer al frontend las credenciales API.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facturacion_config (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id             uuid NOT NULL UNIQUE REFERENCES public.tiendas(id) ON DELETE CASCADE,
  -- Credenciales TusFacturasAPP (leer solo server-side)
  api_usertoken         text,     -- token de usuario TusFacturasAPP
  api_apitoken          text,     -- token de API TusFacturasAPP
  api_apikey            text,     -- key de empresa TusFacturasAPP
  -- Datos AFIP del emisor
  punto_de_venta        integer,  -- número de punto de venta registrado en AFIP (ej. 1)
  condicion_iva_emisor  text NOT NULL DEFAULT 'Monotributista'
                        CHECK (condicion_iva_emisor IN (
                          'Monotributista',
                          'Responsable Inscripto',
                          'Exento',
                          'No Responsable'
                        )),
  -- Control
  activo                boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER facturacion_config_updated_at
  BEFORE UPDATE ON public.facturacion_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.facturacion_config ENABLE ROW LEVEL SECURITY;

-- Solo usuarios de la misma tienda pueden operar su configuración
CREATE POLICY "facturacion_config_select" ON public.facturacion_config
  FOR SELECT USING (
    tienda_id IN (
      SELECT tienda_id FROM public.perfiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "facturacion_config_insert" ON public.facturacion_config
  FOR INSERT WITH CHECK (
    tienda_id IN (
      SELECT tienda_id FROM public.perfiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "facturacion_config_update" ON public.facturacion_config
  FOR UPDATE USING (
    tienda_id IN (
      SELECT tienda_id FROM public.perfiles WHERE id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- ALTER TABLE ventas — campos de comprobante fiscal
-- Todos nullable: solo se completan si se emite factura electrónica.
-- Las ventas sin factura son "Ticket X" (comportamiento actual).
-- -------------------------------------------------------------
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS tipo_comprobante  text         -- 'A', 'B', 'C' — null = Ticket X
    CHECK (tipo_comprobante IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS numero_comprobante text,       -- '00001-00000042'
  ADD COLUMN IF NOT EXISTS cae               text,        -- código AFIP (14 dígitos)
  ADD COLUMN IF NOT EXISTS cae_vencimiento   date,        -- fecha de vencimiento del CAE
  ADD COLUMN IF NOT EXISTS qr_afip           text,        -- URL del QR ARCA para imprimir
  ADD COLUMN IF NOT EXISTS pdf_url           text,        -- URL del PDF de TusFacturasAPP
  ADD COLUMN IF NOT EXISTS cuit_receptor     text;        -- CUIT del comprador (Fact. A)

-- Index para búsqueda por CAE (útil en auditorías)
CREATE INDEX IF NOT EXISTS ventas_cae_idx
  ON public.ventas(cae)
  WHERE cae IS NOT NULL;
