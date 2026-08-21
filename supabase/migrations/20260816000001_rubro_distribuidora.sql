-- Rubro distribuidora: pedidos de mostrador, remito y cuenta corriente.

ALTER TABLE public.tiendas DROP CONSTRAINT IF EXISTS tiendas_rubro_check;
ALTER TABLE public.tiendas ADD CONSTRAINT tiendas_rubro_check CHECK (rubro IN (
  'ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico',
  'carniceria', 'farmacia', 'verduleria', 'distribuidora'
));

INSERT INTO public.config_rubro (
  rubro, label_var1, label_var2, usar_var1, usar_var2,
  unidades_disponibles, categorias_sugeridas, tallas_sugeridas, descripcion
) VALUES (
  'distribuidora', 'Marca', 'Presentación', true, true,
  ARRAY['unidad','pack','caja','litro','kg'],
  ARRAY['Bebidas','Almacén','Limpieza','Lácteos','Golosinas','Fiambres','Otros'],
  ARRAY['Unidad','Pack x6','Pack x12','Caja','1L','2L','500ml'],
  'Distribuidora — pedidos de mostrador, remito y cuenta corriente'
) ON CONFLICT (rubro) DO NOTHING;
