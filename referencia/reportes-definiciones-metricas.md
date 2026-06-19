# Definiciones de métricas — Reportes y Gráficos

Referencia para dueños y contadores. Aplica a `/reportes`, `/graficos` y exportación CSV.

---

## Política de devoluciones

| Tipo | ¿Resta ventas netas? | ¿Resta ganancia bruta? | Notas |
|------|---------------------|------------------------|-------|
| `reembolso` | Sí | Sí | Egreso de caja según método de pago |
| `saldo_a_favor` | Sí | Sí | Crédito al cliente, no siempre egreso inmediato |
| `cambio` (otra variante) | **No** | **No** | Rotación de stock; movimiento de inventario |
| `NULL` (legacy) | Sí | Sí | Registros antiguos sin tipo |

**Imputación:** las devoluciones se asignan al **mes en que se registraron** (`devoluciones.created_at`), no al mes de la venta original.

---

## Tabla P&L (`/reportes`)

| Columna | Definición | Fuente SQL |
|---------|------------|------------|
| Tickets | Cantidad de ventas completadas | `ventas` estado completada |
| Ventas brutas | Suma de `ventas.total` | Incluye descuentos ya aplicados |
| Devoluciones | Suma `total_devuelto` (≠ cambio) | `devoluciones` completadas |
| Ventas netas | Brutas − Devoluciones | — |
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

`preview_resumen_turno` y `cerrar_caja` suman devoluciones monetarias del turno (**excluye cambio**), alineado con reportes.

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
