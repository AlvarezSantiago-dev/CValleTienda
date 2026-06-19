# Checklist — Auditoría reportes y devoluciones

**Fecha implementación:** 2026-06-20  
**Plan:** `planes/2026-06-20-auditoria-reportes-finanzas-csv-devoluciones.md`

---

## Escenario de prueba (valores esperados)

Supuesto: un mes con una sola venta y devoluciones posteriores.

| Evento | Monto | Costo | Tipo |
|--------|-------|-------|------|
| Venta A | $10.000 | $4.000 | — |
| Devolución reembolso 50% | $5.000 | $2.000 | `reembolso` |
| Devolución saldo a favor | $3.000 | $1.200 | `saldo_a_favor` |
| Cambio de variante | $X (según líneas) | — | `cambio` |

### Resultados esperados (post-fix)

| Métrica | Cálculo | Esperado |
|---------|---------|----------|
| Ventas brutas | 10.000 | $10.000 |
| Devoluciones | 5.000 + 3.000 (sin cambio) | $8.000 |
| Ventas netas | 10.000 − 8.000 | $2.000 |
| Ganancia ventas | (10.000 − 4.000) | $6.000 |
| Ganancia devuelta | (5.000 − 2.000) + (3.000 − 1.200) | $4.800 |
| Ganancia bruta neta | 6.000 − 4.800 | $1.200 |
| Margen % | 1.200 / 2.000 × 100 | 60% |

---

## Validación manual

- [ ] Aplicar migraciones `20260620120001`, `20260620120002`, `20260620120003` en Supabase
- [ ] `/reportes`: ganancia bruta del mes de prueba = esperado
- [ ] Dashboard ganancia mes = mismo valor que reportes (± $0.01)
- [ ] Devolución `cambio`: no baja ventas netas ni ganancia
- [ ] Devolución `reembolso`: baja ventas netas y ganancia
- [ ] CSV `/api/reportes/export` coincide con tabla
- [ ] CSV `/api/graficos/export?tab=finanzas` incluye devoluciones
- [ ] Cierre de caja: total devoluciones excluye cambio
- [ ] `npm run lint` y `npm run build` OK
- [ ] `node --test lib/reportes/formulas.test.ts` OK

---

## Reconciliación por fuente

| Fuente | Ventas netas | Ganancia bruta | Resultado neto |
|--------|--------------|----------------|----------------|
| Dashboard | | | — |
| `/reportes` | | | |
| `/graficos` finanzas | | | |
| CSV reportes-pl | | | |
| Caja turno | | — | |

_Completar con datos reales de staging antes del deploy a producción._

---

## Notas post-deploy

- Los meses históricos **con devoluciones** mostrarán ganancia menor (corrección contable).
- Avisar a clientes si exportan P&L comparando con períodos anteriores.
