# Checklist de reconciliación — Devoluciones y saldo a favor

**Fecha:** 2026-07-02
**Contexto:** Validación de los fixes de la auditoría de devoluciones (plan `planes/2026-07-02-auditoria-completa-devoluciones-caso-jean.md`). Reproduce el caso real del cliente: devolución de un jean con saldo a favor y "venta" posterior del jean de reemplazo.

---

## Antes de empezar

- [ ] Aplicar las 3 migraciones nuevas en el proyecto Supabase:
  - `20260702000001_ventas_saldo_favor_usado.sql`
  - `20260702000002_caja_split_devoluciones.sql`
  - `20260702000003_payload_devolucion_resolucion.sql`
- [ ] Deployar la app con los cambios de código.
- [ ] Usar una tienda de prueba (o hacerlo fuera del horario del cliente).

---

## Escenario A — El caso del jean (saldo a favor + nueva venta)

1. **Abrir caja** con $10.000 de apertura en efectivo.
2. **Venta 1:** jean A ($30.000) + campera ($50.000), cliente asociado, pago en efectivo $80.000.
   - [ ] La venta aparece en `/ventas` con total $80.000.
3. **Devolución del jean A** con resolución **Saldo a favor**.
   - [ ] El formulario muestra la nota "No sale dinero de la caja" y la sugerencia de usar Cambio si se lleva otro producto ahora.
   - [ ] La devolución aparece en la tabla con badge verde **Saldo a favor**.
   - [ ] El cliente queda con `saldo_favor = $30.000` (ver `/clientes/[id]`).
   - [ ] En Supabase: `devoluciones.sesion_caja_id` NO es null (fix clave de esta auditoría).
4. **Venta 2:** jean B ($30.000) al mismo cliente, aplicando los $30.000 de saldo a favor (total a pagar $0).
   - [ ] El POS muestra "$30.000 se cubren con el crédito del cliente".
   - [ ] En `/ventas`, la venta 2 muestra la etiqueta "Pagada con saldo a favor".
   - [ ] En el detalle de la venta 2: "Saldo a favor aplicado $30.000" y la nota explicativa.
   - [ ] En Supabase: `ventas.saldo_favor_usado = 30000`.
5. **Resumen del turno** (panel de caja, antes de cerrar):
   - [ ] Ventas: 2 ventas, $110.000.
   - [ ] Devoluciones: 1, $30.000, con el desglose "Reintegros $0 · Créditos $30.000".
   - [ ] Neto del turno: $80.000 (lo realmente vendido).
   - [ ] Efectivo esperado: $90.000 (apertura $10.000 + venta 1 $80.000). **La venta 2 y la devolución no tocan el efectivo.**
6. **Cerrar caja** declarando $90.000.
   - [ ] Diferencia de efectivo: $0.
   - [ ] El ticket de cierre muestra el split Reintegros / Saldo a favor.
   - [ ] El email de cierre (si está configurado) muestra el mismo desglose.

**Resultado esperado para el cliente:** la plata de la caja cierra exacta. Los $110.000 de "ventas" y los $30.000 de "devoluciones" se compensan: el neto $80.000 coincide con la mercadería que realmente se llevó el cliente.

## Escenario B — Reembolso en efectivo

1. Con caja abierta, hacer una venta de $20.000 en efectivo.
2. Devolverla completa con resolución **Reembolso** en efectivo.
   - [ ] Exige caja abierta (probar con caja cerrada: debe bloquear).
   - [ ] Resumen del turno: Devoluciones $20.000 con "Reintegros $20.000 · Créditos $0" (o sin desglose si no hay créditos).
   - [ ] Efectivo esperado baja $20.000 (el dinero salió del cajón).

## Escenario C — Cambio de variante (flujo recomendado para el caso del jean)

1. Vender un jean talle 40.
2. Devolverlo con resolución **Cambio de producto** → otra variante (talle 42).
   - [ ] No genera venta nueva ni movimiento de dinero.
   - [ ] No suma en "Devoluciones" del turno (es rotación de stock).
   - [ ] El stock del talle 40 sube y el del 42 baja.
   - [ ] El ticket de devolución muestra "Resolución: Cambio de producto" y el artículo entregado.

## Escenario D — Anulación de venta pagada con saldo a favor

1. Repetir el escenario A hasta el paso 4 (venta 2 pagada con crédito).
2. Anular la venta 2.
   - [ ] El cliente recupera los $30.000 de saldo a favor.
   - [ ] El stock del jean B se repone.

## Escenario E — Devolución sin caja abierta (saldo a favor)

1. Con caja **cerrada**, registrar una devolución con resolución **Saldo a favor**.
   - [ ] Se permite (no exige caja, porque no sale dinero).
   - [ ] `sesion_caja_id` queda null → no impacta ningún turno (correcto: no había turno).

---

## Diagnóstico sobre datos históricos del cliente (SQL)

Correr en el SQL Editor de Supabase para dimensionar los datos previos al fix:

```sql
-- Devoluciones por resolución y si quedaron ligadas a una sesión
select tipo_resolucion, estado,
       count(*) as cantidad,
       sum(total_devuelto) as monto,
       count(*) filter (where sesion_caja_id is null) as sin_sesion
from devoluciones
group by tipo_resolucion, estado
order by tipo_resolucion;

-- Ventas con pagos que no cubren el total (candidatas a haber usado saldo a favor)
select v.id, v.numero_ticket, v.total, coalesce(sum(pv.monto), 0) as pagado,
       v.total - coalesce(sum(pv.monto), 0) as descubierto
from ventas v
left join pagos_venta pv on pv.venta_id = v.id
where v.estado = 'completada'
group by v.id, v.numero_ticket, v.total
having v.total - coalesce(sum(pv.monto), 0) > 0.01
order by descubierto desc;

-- Clientes con saldo a favor pendiente
select id, nombre, apellido, saldo_favor
from clientes
where saldo_favor > 0
order by saldo_favor desc;
```

Notas:
- Las devoluciones históricas `saldo_a_favor`/`cambio` con `sesion_caja_id` null no se corrigen retroactivamente (los cierres de esos turnos ya se hicieron con otra base). El fix aplica de acá en adelante.
- Las ventas "descubiertas" del segundo query son ventas viejas pagadas con saldo a favor antes de que existiera `saldo_favor_usado` (quedó en 0 por default).
