# Plan: Reestructuración UX/UI de /caja y sesiones

**Creado:** 2026-08-23
**Estado:** Implementado
**Pedido:** Reestructurar por completo `/caja` (y detalle de sesiones): se entiende poco; UX/UI más profesional; adaptable a todos los dispositivos; aclarar todos los datos del turno/sesión.

---

## Descripción General

### Qué Logra Este Plan

Reorganizar la información de Caja en capas claras (**turno vivo → arqueo/cierre → cuentas de la tienda → historial**), con copy explicativo y layout responsive (móvil primero). El cajero ve solo lo necesario para operar; el owner/admin ve análisis sin mezclar “plata del cajón del turno” con “saldos globales de la tienda”.

### Por Qué Importa

Caja es el ritual diario del local. Si no se entiende el arqueo, aparecen faltantes “fantasma”, cierres a ciegas y desconfianza en el sistema. Fase 5 (`planes/2026-07-28-fase5-caja-redesign.md`) solo cambió tokens/modales; **no** resolvió arquitectura de información ni móvil. Este plan cierra esa deuda sin tocar la frontera de impresión térmica (PrintBridge / `CierreCajaRenderer` internos).

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivos |
|------|----------|
| Hub | `app/app/(dashboard)/caja/page.tsx` — grid 2 cols: sesión abierta + cerrar; historial debajo |
| Detalle | `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` |
| Paneles | `SesionAbiertaPanel`, `CerrarSesionForm`, `AbrirSesionForm`, `ResumenTurnoPanel`, `CierreDetalle`, `HistorialCajaMes` |
| Movimientos | `RegistrarMovimientoForm`, `EditarMovimientoForm`, `MovimientosTurnoTabla` |
| Lib | `lib/caja/{queries,types,labels,resumen-turno}.ts` · `app/actions/caja.ts` |
| Glosario | `referencia/modelo-saldos-cuentas.md` · `referencia/reportes-definiciones-metricas.md` |
| DS v2 | `Card`, `Tabs`, `StatCard`, `Tooltip`, `DataTable`, `PageHeader`, `Badge`, `Modal` |

### Brechas o Problemas que se Abordan

1. **Dos mundos mezclados** en un scroll: resultado del **turno** vs **saldos de cuentas** (“Disponible para gastar”) vs historial del mes.
2. **Resumen duplicado**: `ResumenTurnoPanel` en panel izquierdo y otra vez dentro de `CerrarSesionForm`.
3. **Móvil**: columnas apiladas kilométricas; CTA “Cerrar caja” enterrado; tablas anchas solo con `overflow-x`.
4. **Jerga sin ancla**: “Total neto”, “esperado”, “por acreditar”, “reintegro/crédito”, “ajustes redondeo” sin definición inline.
5. **Sesiones**: detalle `/caja/sesiones/[id]` denso; acciones (imprimir/reabrir) sin jerarquía táctil.
6. **Cierre emergencia** junto al badge “Caja abierta” (destructivo en zona de status).
7. **Efectivo declarado opcional**: vacío ≠ 0 poco evidente.
8. Primitives incompletos: muchos `div`+tabla en vez de `Card` / cards mobile / `StatCard` / `Tooltip`.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva **arquitectura por pestañas/secciones** en `/caja` según estado (abierta / cerrada) y rol.
- **Arqueo como héroe del cierre**; resto en “Ver detalle del turno”.
- **Saldos de tienda** fuera del flujo de cierre (sección/tab propia, solo owner/admin).
- **Copy + tooltips** alineados al glosario (`modelo-saldos-cuentas.md`).
- **Responsive**: sticky barra de cierre en mobile; listas-card para movimientos/historial; botones `min-h-11`.
- Detalle de sesión: misma jerarquía (hero arqueo → KPIs → desgloses → movimientos).
- Sin cambios de lógica RPC de cierre/apertura salvo tipado si hace falta; **no** tocar PrintBridge / markup interno de `CierreCajaRenderer`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/components/caja/CajaHubTabs.tsx` | Tabs client: `Turno` \| `Cuentas` \| `Historial` (historial oculto para cajero) |
| `app/components/caja/ArqueoEfectivoCard.tsx` | Bloque único reutilizable: apertura → esperado → declarado → diferencia + ayuda |
| `app/components/caja/MetricasTurnoStrip.tsx` | 3–4 KPIs del turno con labels + Tooltip (ventas, devoluciones, comisiones, neto) |
| `app/components/caja/SaldosTiendaPanel.tsx` | Extrae saldos “Disponible / por acreditar / proyectado” del panel de sesión |
| `app/components/caja/MovimientosTurnoCards.tsx` | Vista mobile (cards) de movimientos; desktop sigue tabla o DataTable |
| `app/lib/caja/glosario.ts` | Textos cortos para tooltips (fuente única de copy explicativo) |
| `app/components/caja/CajaEmptyState.tsx` | Estado sin sesión: CTA abrir + último cierre resumido |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/(dashboard)/caja/page.tsx` | Componer hub por tabs/secciones; menos grid crudo 2-col siempre |
| `app/components/caja/SesionAbiertaPanel.tsx` | Slim: status + KPIs turno + movimientos; sacar saldos y emergencia del header |
| `app/components/caja/CerrarSesionForm.tsx` | Hero arqueo; sin `ResumenTurnoPanel` duplicado; sticky actions mobile |
| `app/components/caja/ResumenTurnoPanel.tsx` | Usar `ArqueoEfectivoCard` + `MetricasTurnoStrip`; desgloses colapsados por defecto en mobile |
| `app/components/caja/AbrirSesionForm.tsx` | Card DS + ayuda “fondo de cambio”; full-width mobile |
| `app/components/caja/HistorialCajaMes.tsx` | Ya DataTable; reforzar labels de columnas + cards si hace falta |
| `app/components/caja/CierreDetalle.tsx` | Misma jerarquía que resumen; tipografía/spacing |
| `app/components/caja/MovimientosTurnoTabla.tsx` | Integrar cards mobile; confirm delete con `Modal` (no `window.confirm`) |
| `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` | Header acciones stackable; secciones tituladas |
| `app/lib/caja/labels.ts` | Labels más humanos si faltan (tipo cierre, etc.) |
| `contexto/proyectos.md` | Registrar entrega |
| `app/types/database.ts` (opcional) | Alinear campos de `CierreCaja` (`tipo_cierre`, splits devolución) si se muestran |

### Archivos a Eliminar (si aplica)

Ninguno. Posible fusión futura de helpers locales de KPI dentro de `ResumenTurnoPanel` → `MetricasTurnoStrip` (sin borrar el panel).

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Separar capas, no borrar datos**: Turno ≠ Cuentas ≠ Historial. Los números ya existen y son correctos; el problema es presentación.
2. **Un solo resumen de turno visible** en el flujo de cierre; el panel de sesión muestra strip corto + link “Ver desglose”.
3. **Arqueo primero**: expected → count → diff es la decisión operativa; neto/comisiones son secundarios.
4. **Tabs en el hub** (`Turno` / `Cuentas` / `Historial`) en desktop y mobile (scroll horizontal de tabs ya existe en DS). Alternativa de rutas `/caja/cuentas` descartada en v1 para no fragmentar deep-links del historial (`?mes=`).
5. **Cajero**: tab Cuentas e Historial ocultos; Turno = operar + cerrar. Owner: las tres.
6. **Cierre emergencia**: menú “Más acciones” / footer secundario, no junto al badge de estado.
7. **Sin tocar** `styles/print.css`, internos de `components/impresion/CierreCajaRenderer.tsx`, ni RPCs de cierre salvo bugs de presentación.
8. **Primitives-first**: `Card`, `Tabs`, `StatCard`, `Tooltip`, `Button`, tokens semánticos.

### Alternativas Consideradas

| Alternativa | Por qué no |
|-------------|------------|
| Wizard Modal de cierre (multi-paso) | Útil, pero más riesgo UX; el form 2-step actual + sticky CTA alcanza en v1 |
| Rutas separadas `/caja/historial` | Más navegación; tabs + `?mes=` ya cubren historial |
| Rediseñar ledger / RPC | Fuera de alcance; datos ya reconciliados en planes 2026-06 |
| Unificar “neto del turno” con “disponible” | Incorrecto conceptualmente (`modelo-saldos-cuentas.md`) |

### Preguntas Abiertas (si las hay)

1. **Efectivo declarado**: ¿seguir opcional (hoy) o **obligatorio** al cerrar en contado/arqueo normal? (recomendación del plan: mantener opcional pero con copy mucho más claro + checkbox “No conté el cajón”).
2. **Tab default con caja abierta**: ¿`Turno` siempre, o detectar mobile y abrir directo en sección cierre? (recomendación: siempre `Turno`, con sticky “Ir a cerrar”).
3. ¿Incluir en este mismo plan el tokenizado de `AvisoCajaCerrada` (banner global), o dejarlo para un follow-up menor?

---

## Tareas Paso a Paso

### Paso 1: Glosario de UI

Crear `app/lib/caja/glosario.ts` con textos cortos (1–2 oraciones) para:

- Apertura efectivo  
- Efectivo esperado / declarado / diferencia  
- Ventas del turno / Devoluciones (reintegro vs crédito)  
- Comisiones / Total neto del turno  
- Saldo al momento / Por acreditar / Saldo proyectado  
- Movimiento del turno por cuenta vs Cobros por cuenta  
- Ajustes de redondeo  

Referenciar `referencia/modelo-saldos-cuentas.md` sin copiar el doc entero.

**Archivos afectados:** `app/lib/caja/glosario.ts` (nuevo), opcionalmente `labels.ts`.

---

### Paso 2: Componentes de presentación compartidos

1. `ArqueoEfectivoCard` — props: `apertura`, `esperado`, `declarado?`, `diferencia?`, `redondeo?`, `modo: preview|cerrado|edicion`.
2. `MetricasTurnoStrip` — KPIs con `Tooltip` desde glosario; responsive 2×2 / 4 cols.
3. `SaldosTiendaPanel` — lista de cuentas con al momento (grande), por acreditar, proyectado; nota “No es el arqueo del turno”.
4. `MovimientosTurnoCards` — card por movimiento (`md:hidden`); tabla `hidden md:block`.

**Archivos afectados:** nuevos bajo `app/components/caja/`.

---

### Paso 3: Reestructurar hub `/caja`

**Con sesión abierta:**

```
PageHeader (estado + hora apertura)
Tabs: Turno | Cuentas (owner) | Historial (owner)

[Tab Turno]
  - SesionAbiertaPanel (slim)
  - Arqueo + CerrarSesionForm (en desktop: 2 cols debajo o form sticky-right;
    en mobile: orden = status → KPIs → movimientos → cierre con sticky bar)
  - Más acciones: emergencia

[Tab Cuentas]
  - SaldosTiendaPanel + link a config cobros si aplica

[Tab Historial]
  - HistorialCajaMes (contenido actual)
```

**Sin sesión:**

```
CajaEmptyState: AbrirSesionForm (hero)
Último cierre (compacto) + link a detalle
Historial (owner) debajo o en tab
```

**Acciones:**

- Refactor `page.tsx` para armar tabs y pasar props.
- Evitar montar dos `ResumenTurnoPanel` completos a la vez.

**Archivos afectados:** `caja/page.tsx`, `CajaHubTabs.tsx`, `CajaEmptyState.tsx`, paneles existentes.

---

### Paso 4: Slim `SesionAbiertaPanel` + cierre

- Quitar bloque de saldos (mover a `SaldosTiendaPanel`).
- Quitar `ResumenTurnoPanel` completo del panel; dejar `MetricasTurnoStrip` + “Ver desglose” (collapse o link ancla al cierre).
- Emergencia → `Dropdown`/botón secundario al pie.
- `CerrarSesionForm`: hero con `ArqueoEfectivoCard` + input declarado + diferencia en vivo; desglose cuentas en `<details>` colapsado; sticky footer mobile (`Cerrar caja` / Confirmar).
- Copy declarado: “Si no contás, dejalo vacío: no se calcula diferencia. Cero cuenta como $0 contado.”

**Archivos afectados:** `SesionAbiertaPanel.tsx`, `CerrarSesionForm.tsx`, `ResumenTurnoPanel.tsx`.

---

### Paso 5: Movimientos responsive + Modal delete

- `MovimientosTurnoTabla`: cards en `< md`; tabla en desktop.
- Reemplazar `window.confirm` por `Modal` de confirmación.
- Botones touch `min-h-11` en mobile.

**Archivos afectados:** `MovimientosTurnoTabla.tsx`, `MovimientosTurnoCards.tsx`, forms de movimiento si hace falta spacing.

---

### Paso 6: Detalle `/caja/sesiones/[id]`

- PageHeader: badge + Imprimir + Reabrir en stack `flex-col sm:flex-row`, full-width mobile.
- Secciones con títulos claros:
  1. Resultado del cierre (arqueo hero)
  2. Números del turno (strip)
  3. Desglose por cuenta / cobros (collapse mobile)
  4. Ventas / top productos
  5. Movimientos
- Reusar `ArqueoEfectivoCard`, `MetricasTurnoStrip`, `CierreDetalle` refactorizado.

**Archivos afectados:** `sesiones/[id]/page.tsx`, `CierreDetalle.tsx`, listas relacionadas.

---

### Paso 7: Historial y empty states

- Revisar columnas DataTable: labels humanos (“Diferencia efectivo”, “Neto del turno”).
- Empty states con mensaje accionable (“No hay turnos en este mes”).
- Mes navigator touch-friendly.

**Archivos afectados:** `HistorialCajaMes.tsx`.

---

### Paso 8: Docs + validación

- Actualizar `contexto/proyectos.md` (módulo Caja + completados).
- Checklist visual 390 / 768 / 1280.
- `npm run build` en `app/`.
- No actualizar CLAUDE.md salvo que se documente un patrón estructural nuevo (opcional: una línea en App CValleTienda sobre glosario caja).

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `EstadoCajaBanner`, `AvisoCajaCerrada`, `TurnosHoyCard` (dashboard) — **no** redesarrollar salvo copy inconsistente menor.
- POS / ventas: dependen de sesión abierta; no cambiar contrato.
- Email cierre / PrintBridge: consumen mismos payloads; UI hub no debe alterar actions de payload.

### Actualizaciones Necesarias para Consistencia

- Copy alineado a `referencia/modelo-saldos-cuentas.md`.
- `contexto/proyectos.md`.

### Impacto en Flujos de Trabajo Existentes

- Misma URL `/caja` y `/caja/sesiones/[id]`; query `?mes=` se mantiene.
- Roles: cajero sigue sin historial/saldos; owner igual de capaz, mejor ordenado.
- Impresión de cierre y reabrir: mismos botones, mejor layout.

---

## Lista de Validación

- [x] Con caja abierta en 390px: se entiende qué hacer en &lt; 5 s (status + cerrar alcanzable)
- [x] No hay dos bloques “vista previa del cierre” idénticos en pantalla
- [x] “Disponible / por acreditar” no aparece mezclado dentro del form de cierre
- [x] Tooltips o textos cortos en cada métrica clave del turno y saldos
- [x] Movimientos legibles sin scroll horizontal de página (cards en mobile)
- [x] Historial usable en mobile (DataTable / cards)
- [x] Detalle de sesión: arqueo visible primero; acciones touch
- [x] Cajero no ve tabs Cuentas/Historial
- [x] Cierre normal + emergencia siguen funcionando (manual smoke)
- [x] PrintBridge / ticket cierre intactos
- [x] `npm run build` OK
- [x] `contexto/proyectos.md` actualizado

---

## Criterios de Éxito

1. Un operador nuevo puede cerrar caja entendiendo esperado vs declarado vs diferencia.
2. Owner distingue “resultado del turno” de “plata disponible en cuentas”.
3. En celular la página no “rompe” el viewport ni exige scroll infinito antes de la acción principal.
4. Look alineado a DS v2 (Card/Tabs/StatCard/Tooltip), sin regresar a hex/`lime-*` ad-hoc.

---

## Notas

- Fase 5 Fable = cosmético; este plan = **IA + responsive + claridad semántica**.
- Defaults sugeridos ante preguntas abiertas: declarado **sigue opcional** + checkbox “No conté”; tab default **Turno**; banner global `AvisoCajaCerrada` como **follow-up** (no bloqueante).
- Implementar con: `/implementar planes/2026-08-23-caja-ux-reestructuracion.md` tras OK (y respuestas a preguntas abiertas si se quieren cerrar antes).

---

## Notas de Implementación

**Implementado:** 2026-08-23

### Resumen

- Hub `/caja` con tabs Turno / Cuentas / Historial (owner); cajero solo ve turno.
- Arqueo como héroe del cierre + sticky CTA mobile; checkbox “No conté el cajón”.
- Saldos de tienda fuera del flujo de cierre; glosario + tooltips; cards mobile en movimientos/desgloses.
- Emergencia al pie del panel; delete de movimientos con Modal; detalle de sesión con jerarquía clara.

### Desviaciones del Plan

- Defaults de preguntas abiertas aplicados (declarado opcional + checkbox; tab Turno; banner global no tocado).
- Tooltip del DS ampliado a `whitespace-normal` para textos del glosario.
- Tabs URL: default `tab=turno` cuando falta el param (igual que finanzas en reportes).

### Problemas Encontrados

Ninguno. `npm run build` OK.
