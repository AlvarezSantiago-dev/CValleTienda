# Definiciones de métricas — Reportes y Gráficos

Referencia para dueños y contadores. Aplica a `/reportes`, `/graficos` y exportación CSV.

---

## Política de devoluciones

| Tipo | ¿Resta ventas netas? | ¿Resta ganancia bruta? | ¿Egreso de caja? | Notas |
|------|---------------------|------------------------|------------------|-------|
| `reembolso` | Sí | Sí | **Sí** | Egreso de caja según método de pago |
| `saldo_a_favor` | Sí | Sí | **No** | Crédito al cliente (pasivo); el dinero queda en caja |
| `cambio` (otra variante) | **No** | **No** | No | Rotación de stock; movimiento de inventario |
| `NULL` (legacy) | Sí | Sí | Sí | Registros antiguos sin tipo; se tratan como reembolso |

**Imputación:** las devoluciones se asignan al **mes en que se registraron** (`devoluciones.created_at`), no al mes de la venta original.

**Saldo a favor usado en ventas:** `ventas.saldo_favor_usado` guarda la parte del total cubierta con crédito de devoluciones. La venta cuenta completa en ventas brutas, pero esa parte **no genera ingreso de caja** (no hay registro en `pagos_venta`). Al anular la venta, el crédito se restituye al cliente.

**Por qué la devolución no se borra al reusar el crédito:** el crédito otorgado deshace la *venta original* (volvió mercadería). Usar el saldo es una *venta nueva*. Si se anulara la devolución al gastar el crédito, las ventas netas quedarían infladas (dos jeans vendidos y uno devuelto = dos netos). Caso típico mismo mes: brutas $110.000, crédito otorgado $30.000, crédito usado $30.000 → **ventas netas $80.000** y **cobrado $80.000**.

---

## Tabla P&L (`/reportes`)

| Columna | Definición | Fuente SQL |
|---------|------------|------------|
| Tickets | Cantidad de ventas completadas | `ventas` estado completada |
| Ventas brutas | Suma de `ventas.total` | Incluye tickets pagados con saldo a favor |
| Cobrado | Brutas − crédito usado | Lo que ingresó por `pagos_venta` (aprox.) |
| Reembolso | Devoluciones con plata de vuelta | `tipo_resolucion` reembolso o NULL |
| Crédito otorgado | Devoluciones a saldo a favor | `tipo_resolucion` = `saldo_a_favor` |
| Crédito usado | Suma `ventas.saldo_favor_usado` | No anula la devolución |
| Ventas netas | Brutas − reembolso − crédito otorgado | Mercadería neta del mes |
| Costo | Costo de mercadería vendida − devuelta | `detalles_venta` − `detalles_devolucion` |
| Ganancia bruta | Margen por línea (precio − costo) neto de devoluciones | RPC `get_reporte_historico_meses` |
| Margen % | Ganancia bruta / Ventas netas × 100 | Solo si hay costos cargados |
| Egresos | Movimientos manuales de caja (sin venta asociada) | `movimientos_fondos` tipo egreso |
| Comisiones | Comisiones de métodos de pago del mes | `pagos_venta.comision_calculada` |
| Resultado neto | Ganancia bruta − Egresos − Comisiones | — |

---

## Dashboard

`get_ganancia_bruta_mes` usa la **misma lógica por línea** que el P&L histórico y excluye devoluciones tipo `cambio`.

---

## Gráficos — tab Ventas

| Métrica | ¿Neto de devoluciones? |
|---------|------------------------|
| Ventas netas, ticket promedio, tasa devoluciones | Sí |
| Top productos, unidades vendidas, mix pagos | **No** (bruto de ventas del mes) |

---

## Caja — resumen de turno

`preview_resumen_turno` y `cerrar_caja` suman devoluciones monetarias del turno (**excluye cambio**), alineado con reportes, y las separan en dos categorías (columnas `total_devoluciones_reintegro` y `total_devoluciones_credito` en `cierres_caja`):

- **Reintegros** (`reembolso` o legacy `NULL`): salió dinero de las cuentas. Afectan el efectivo esperado.
- **Créditos store** (`saldo_a_favor`): el importe quedó como crédito del cliente. Restan del neto del turno pero **no** afectan el efectivo esperado ni los saldos por cuenta.

Toda devolución registrada con caja abierta queda ligada al turno (`devoluciones.sesion_caja_id`), sin importar la resolución. Solo el reembolso en efectivo **exige** caja abierta.

### Matriz de escenarios del turno

| Operación | Ventas del turno | Devoluciones del turno | Efectivo esperado |
|-----------|-----------------|------------------------|-------------------|
| Venta $80.000 efectivo | +$80.000 | — | +$80.000 |
| Devolución `reembolso` $20.000 efectivo | — | +$20.000 (reintegro) | −$20.000 |
| Devolución `saldo_a_favor` $30.000 | — | +$30.000 (crédito) | sin cambio |
| Devolución `cambio` (otra variante) | — | no cuenta | sin cambio |
| Venta $30.000 pagada 100% con saldo a favor | +$30.000 | — | sin cambio |
| Venta $30.000: $10.000 saldo a favor + $20.000 efectivo | +$30.000 | — | +$20.000 |

**Caso típico (el del jean):** venta $80.000 en efectivo → devolución de $30.000 como saldo a favor → nueva venta de $30.000 pagada con ese saldo. Resultado: ventas $110.000, devoluciones $30.000 (créditos), neto $80.000, efectivo esperado apertura + $80.000. La caja cierra exacta.

---

## Export CSV

- `/api/reportes/export`: mismas columnas que la tabla P&L.
- `/api/graficos/export?tab=finanzas`: incluye ventas brutas, devoluciones y ventas netas.
- Archivos con BOM UTF-8 para Excel.

---

## Limitaciones conocidas

- Las comisiones de ventas devueltas **no se revierten** automáticamente en resultado neto.
- El mix de pagos no refleja reembolsos posteriores.
- Los tops de productos no restan unidades devueltas (mejora planificada P2).
