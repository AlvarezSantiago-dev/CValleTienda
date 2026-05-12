-- =============================================================
-- Migración Fase 3: Onboarding + Remitos + Rubros adicionales
-- =============================================================

-- ─── 1. Campo onboarding_completado en perfiles ──────────────

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS onboarding_completado boolean NOT NULL DEFAULT false;

-- ─── 2. Rubros adicionales ────────────────────────────────────

-- Actualizar CHECK constraint en tiendas para soportar nuevos rubros
ALTER TABLE public.tiendas
  DROP CONSTRAINT IF EXISTS tiendas_rubro_check;

ALTER TABLE public.tiendas
  ADD CONSTRAINT tiendas_rubro_check CHECK (rubro IN (
    'ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico',
    'carniceria', 'farmacia', 'verduleria'
  ));

-- Insertar nuevos rubros en config_rubro
INSERT INTO public.config_rubro (
  rubro, label_var1, label_var2, usar_var1, usar_var2,
  unidades_disponibles, categorias_sugeridas, tallas_sugeridas, descripcion
) VALUES
(
  'carniceria', 'Corte', 'Procedencia', true, false,
  ARRAY['kg','gramo','unidad'],
  ARRAY['Vacuno','Cerdo','Aves','Fiambres y quesos','Embutidos','Achuras'],
  ARRAY[]::text[],
  'Carnicería y fiambrería'
),
(
  'farmacia', 'Presentación', 'Laboratorio', true, false,
  ARRAY['unidad','caja','pack'],
  ARRAY['Medicamentos','Higiene personal','Vitaminas y suplementos','Primeros auxilios','Cosméticos'],
  ARRAY[]::text[],
  'Farmacia y perfumería'
),
(
  'verduleria', 'Variedad', 'Origen', true, false,
  ARRAY['kg','gramo','unidad'],
  ARRAY['Verduras de hoja','Frutas','Tubérculos','Hierbas y condimentos','Frutos secos'],
  ARRAY[]::text[],
  'Verdulería y frutería'
)
ON CONFLICT (rubro) DO NOTHING;

-- ─── 3. Numeración de remitos en configuracion_tienda ─────────

ALTER TABLE public.configuracion_tienda
  ADD COLUMN IF NOT EXISTS ultimo_numero_remito integer NOT NULL DEFAULT 0;

-- ─── 4. Tabla remitos ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.remitos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id         uuid        NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  venta_id          uuid        REFERENCES public.ventas(id) ON DELETE SET NULL,
  usuario_id        uuid        REFERENCES public.perfiles(id) ON DELETE SET NULL,
  numero_remito     integer     NOT NULL,
  estado            text        NOT NULL DEFAULT 'borrador',
  destinatario      text        NOT NULL,
  direccion_entrega text,
  telefono_entrega  text,
  observaciones     text,
  fecha_entrega     date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT remitos_estado_check  CHECK (estado IN ('borrador', 'emitido', 'entregado', 'anulado')),
  CONSTRAINT remitos_numero_unique UNIQUE (tienda_id, numero_remito)
);

-- Índices
CREATE INDEX IF NOT EXISTS remitos_tienda_id_idx ON public.remitos(tienda_id);
CREATE INDEX IF NOT EXISTS remitos_venta_id_idx  ON public.remitos(venta_id);
CREATE INDEX IF NOT EXISTS remitos_estado_idx    ON public.remitos(estado);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER remitos_updated_at
  BEFORE UPDATE ON public.remitos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.remitos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remitos_policy ON public.remitos;
CREATE POLICY remitos_policy ON public.remitos
  USING  (tienda_id = get_tienda_id())
  WITH CHECK (tienda_id = get_tienda_id());

-- ─── 5. RPC: get_siguiente_numero_remito ──────────────────────

CREATE OR REPLACE FUNCTION public.get_siguiente_numero_remito()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tienda_id uuid;
  v_numero    integer;
BEGIN
  v_tienda_id := get_tienda_id();
  IF v_tienda_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.configuracion_tienda
  SET ultimo_numero_remito = ultimo_numero_remito + 1
  WHERE tienda_id = v_tienda_id
  RETURNING ultimo_numero_remito INTO v_numero;

  RETURN v_numero;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_siguiente_numero_remito() TO authenticated;

-- ─── 6. RPC: marcar_onboarding_completado ────────────────────

CREATE OR REPLACE FUNCTION public.marcar_onboarding_completado()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.perfiles
  SET onboarding_completado = true
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_onboarding_completado() TO authenticated;
