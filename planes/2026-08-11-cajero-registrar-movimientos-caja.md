# Plan: Cajero puede registrar movimientos de caja (sin editar)

**Creado:** 2026-08-11
**Estado:** Implementado
**Pedido:** Que los cajeros puedan registrar movimientos de dinero (sobre todo egresos para pagar mercadería), sin poder editarlos; editar/eliminar queda solo para el dueño.

---

## Descripción General

### Qué Logra Este Plan

Permite que el rol `vendedor` (cajero) **registre ingresos y egresos manuales** en la sesión de caja abierta — caso típico: pagar mercadería al proveedor con efectivo de caja — y deja **editar/eliminar** solo para `owner`/`admin`. Endurece las RPCs SQL (hoy no chequean rol) para que un cajero no pueda mutar movimientos vía API aunque conozca los endpoints.

### Por Qué Importa

En el mostrador el cajero a menudo tiene que sacar plata de caja para pagar un proveedor. Hoy solo el dueño/admin ve el botón “Registrar movimiento”; el cajero queda bloqueado u obligado a anotar afuera. Al mismo tiempo, editar o borrar movimientos es poder de corrección contable: si el cajero pudiera corregir montos, se pierde la trazabilidad del turno. Separar **crear (cajero + dueño)** vs **editar/eliminar (solo dueño/admin)** alinea la operatoria real con la auditoría.

---

## Estado Actual

### Estructura Existente Relevante

**Roles** (`perfiles.rol`): `owner` | `admin` | `vendedor` (cajero).

**UI `/caja`** — `app/app/(dashboard)/caja/page.tsx`:

| Capacidad | owner/admin | cajero (`vendedor`) |
| --------- | ----------- | ------------------- |
| Abrir / cerrar turno | Sí | Sí |
| Saldos de cuentas + resumen turno | Sí | No (`mostrarSaldos={false}`) |
| Listado movimientos del turno | Sí | No (array vacío) |
| Botón “Registrar movimiento” | Sí | No (condicionado a `mostrarSaldos`) |
| Editar / Eliminar manuales | Sí (`editable` en tabla) | No (no ve la tabla) |
| Historial por mes | Sí | No |

**Componentes clave**

| Archivo | Rol |
| ------- | --- |
| `app/components/caja/SesionAbiertaPanel.tsx` | Panel sesión; botón registrar + `MovimientosTurnoTabla` solo si `mostrarSaldos` |
| `app/components/caja/RegistrarMovimientoForm.tsx` | Modal create ingreso/egreso → `registrarMovimientoCaja` |
| `app/components/caja/EditarMovimientoForm.tsx` | Modal edit → `editarMovimientoCaja` |
| `app/components/caja/MovimientosTurnoTabla.tsx` | Lista; acciones Editar/Eliminar si `editable && es_manual` |

**Backend**

| Pieza | Ubicación | Comportamiento hoy |
| ----- | --------- | ------------------ |
| `registrarMovimientoCaja` | `app/app/actions/caja.ts` | Cualquier autenticado vía `requireCtx()`; RPC `registrar_movimiento_caja_manual` |
| `editarMovimientoCaja` / `eliminarMovimientoCaja` | idem | Mismo: **sin chequeo de rol** |
| RPCs SQL | `supabase/migrations/20260723000001_movimientos_caja_editar_eliminar.sql` | SECURITY DEFINER; validan caja abierta + manual; **no validan `get_rol()`** |
| `cuentas_fondos` SELECT | RLS | Todos los de la tienda (cajero ya puede leer saldos a nivel DB) |
| `movimientos_fondos` SELECT | RLS | Todos los de la tienda |

**Planes previos**

- `planes/2026-07-23-movimientos-caja-resumen-editar-eliminar.md` (Implementado) — decidió “cajero no edita fondos; create/edit/delete alineados a owner/admin”.
- `planes/2026-05-25-gestion-equipo-y-rol-cajero.md` — vista reducida de caja para cajero: sin movimientos manuales.

Este plan **revisa** esa decisión de “cajero no registra” y mantiene “cajero no edita/elimina”.

### Brechas o Problemas que se Abordan

| Brecha | Impacto |
| ------ | ------- |
| Cajero no puede registrar egresos (pago mercadería / proveedor) | Operatoria real rota; plata sale de caja sin ledger |
| UI oculta formulario y lista al cajero (`esCajero` → sin cuentas ni movimientos) | No hay camino de producto para el caso |
| RPCs edit/delete no chequean rol | Un cajero podría invocar RPC y corregir/borrar movimientos |
| Actions `editar`/`eliminar` no chequean rol | Misma vulnerabilidad en la capa Next |

---

## Cambios Propuestos

### Resumen de Cambios

- En `/caja` con sesión abierta, el **cajero** ve: botón **Registrar movimiento**, formulario (ingreso/egreso), y listado de movimientos del turno en **solo lectura** (sin Editar/Eliminar).
- El cajero **sigue sin** ver: panel de saldos expandible, resumen financiero detallado del turno (`ResumenTurnoPanel`), historial por mes.
- En el formulario, el cajero **sí** ve el saldo de la cuenta elegida (necesario para no egresar de más); no se expone el panel completo de saldos.
- **owner/admin**: sin cambio de capacidades (crear + editar + eliminar + saldos + historial).
- Server Actions: `editarMovimientoCaja` / `eliminarMovimientoCaja` exigen `rol in ('owner','admin')`; `registrarMovimientoCaja` permite también `vendedor`.
- Migración SQL: `CREATE OR REPLACE` de las tres RPCs agregando chequeo de rol en edit/delete (y documentando que registrar incluye cajero).
- Copy del formulario: placeholder orientado a “Pago mercadería / proveedor” para reforzar el caso de uso.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260811000002_cajero_registrar_movimientos_caja.sql` | Reemplazar RPCs `editar`/`eliminar` con `get_rol() in ('owner','admin')`; actualizar comment de `registrar` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/(dashboard)/caja/page.tsx` | Cargar `cuentas` y `listarMovimientosTurno` también para cajero si hay sesión; pasar props nuevas al panel |
| `app/components/caja/SesionAbiertaPanel.tsx` | Separar “puede registrar / ver movimientos” de “mostrar saldos/resumen”; botón + tabla read-only para cajero |
| `app/components/caja/RegistrarMovimientoForm.tsx` | Props opcionales: `tiposPermitidos`, `titulo`/`descripcion`/`placeholderConcepto` para copy cajero; default igual que hoy |
| `app/components/caja/MovimientosTurnoTabla.tsx` | Sin cambio funcional obligatorio si `editable={false}` desde el padre; verificar que no haya acciones residuales |
| `app/app/actions/caja.ts` | `requireCtx` expone `rol`; gate edit/delete a owner/admin; `traducirError` para mensajes de permiso; registrar sigue abierto a cajero |
| `contexto/proyectos.md` | Opcional: nota breve en módulos Caja si se documenta el alcance por rol |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Crear sí / editar-eliminar no para `vendedor`**: Coincide con el pedido. La auditoría del turno queda intacta; el dueño corrige errores.

2. **Editar/eliminar = `owner` + `admin` (no solo literal “dueño”)**: En CValleTienda `admin` ya opera caja como el owner (movimientos, historial, equipo). Restringir solo a `owner` rompería tiendas donde el admin es el gerente de piso. Si el usuario pide “solo owner”, se ajusta en una línea.

3. **Cajero puede registrar ingreso y egreso**: El pedido habla de “movimientos” y destaca egresos; el form actual ya tiene ambos. Default del form sigue en **egreso**. No se crea un flujo aparte solo-egreso salvo que se confirme lo contrario.

4. **Lista read-only para cajero**: Ve los movimientos del turno (manuales + automáticos) para confirmar lo que cargó, sin acciones. No ve saldos ni resumen financiero completo (sigue la política de vista reducida del plan equipo/cajero).

5. **Saldo en el select del formulario sí**: El cajero necesita saber si hay efectivo suficiente al pagar mercadería. Eso no implica abrir el panel “Saldos actuales de cuentas”.

6. **Defensa en profundidad**: UI + Server Action + RPC SQL. Las RPCs SECURITY DEFINER hoy son el hueco real; sin gate en SQL el UI no alcanza.

7. **Sin columna nueva ni tabla nueva**: Reutilizar `movimientos_fondos` + RPCs existentes; solo permisos y UI.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
| ----------- | ------------------ |
| Solo egresos para cajero (bloquear ingreso en UI+RPC) | Más restrictivo de lo pedido; “movimientos” implica ambos; se puede endurecer después |
| Cajero solo ve/edita **sus** movimientos | El pedido es no editar en absoluto; ver solo los propios fragmenta el ledger del turno |
| Soft-delete / “anular” por el cajero | Es otra forma de editar; fuera de alcance |
| Nueva pantalla `/caja/egresos` | Fragmenta; el flujo ya vive en `/caja` |
| Confiar solo en ocultar botones en UI | Inseguro: RPCs grant a `authenticated` sin rol |

### Preguntas Abiertas (si las hay)

1. **¿Editar/eliminar solo `owner`, o también `admin`?**  
   Propuesta por defecto: **owner + admin** (consistente con el resto de caja).

2. **¿El cajero puede registrar ingresos además de egresos?**  
   Propuesta por defecto: **sí ambos**; form default = egreso.

3. **¿El cajero ve el listado completo del turno (ventas + manuales) o solo los manuales?**  
   Propuesta por defecto: **listado completo read-only** (misma query `listarMovimientosTurno`), sin saldos/resumen. Alternativa más minimal: solo manuales.

4. **¿Mostrar saldo de la cuenta en el dropdown del formulario del cajero?**  
   Propuesta por defecto: **sí** (evita egresos que fallan por “saldo insuficiente”).

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración SQL — gate de rol en edit/delete

Crear `supabase/migrations/20260811000002_cajero_registrar_movimientos_caja.sql`.

**Acciones:**

- `CREATE OR REPLACE` de `editar_movimiento_caja_manual` y `eliminar_movimiento_caja_manual` copiando el cuerpo actual de `20260723000001_...` e insertando al inicio (después de auth/tienda):

  ```sql
  if public.get_rol() is distinct from 'owner'
     and public.get_rol() is distinct from 'admin' then
    raise exception 'Sin permiso para modificar movimientos de caja';
  end if;
  ```

- Actualizar `comment on function` de `registrar_movimiento_caja_manual`:

  > Registra ingreso/egreso manual. Requiere sesión abierta. Permitido a owner, admin y vendedor (cajero). Atómico con lock de cuenta.

- Actualizar comments de edit/delete:

  > Solo owner/admin. Requiere caja abierta y movimiento manual del turno.

- `GRANT EXECUTE` se mantiene a `authenticated` (el gate está dentro de la función).
- No hace falta tocar `registrar_movimiento_caja_manual` en lógica salvo el comment (el cajero ya podía ejecutarla a nivel DB; faltaba UI).

**Archivos afectados:**

- `supabase/migrations/20260811000002_cajero_registrar_movimientos_caja.sql`

---

### Paso 2: Server Actions — permisos por rol

En `app/app/actions/caja.ts`:

**Acciones:**

- Extender `requireCtx()` para devolver `rol: string` (ya se selecciona en query: agregar `rol` al `.select('tienda_id, rol')` — hoy solo usa `tienda_id`).
- En `editarMovimientoCaja` y `eliminarMovimientoCaja`, tras `requireCtx()`:

  ```ts
  if (rol !== 'owner' && rol !== 'admin') {
    return { ok: false, error: 'Solo el dueño o un administrador pueden editar o eliminar movimientos' }
  }
  ```

- En `registrarMovimientoCaja`: no bloquear `vendedor`; opcionalmente documentar en comentario que cajero está permitido.
- En `traducirError`: mapear `'Sin permiso para modificar movimientos'` → mensaje amigable en español.

**Archivos afectados:**

- `app/app/actions/caja.ts`

---

### Paso 3: Página `/caja` — datos para cajero

En `app/app/(dashboard)/caja/page.tsx`:

**Acciones:**

- Cambiar carga de cuentas: si `sesion` (con o sin `esCajero`), cargar cuentas activas (hoy solo `sesion && !esCajero`).
- Cambiar carga de movimientos: `sesion ? await listarMovimientosTurno(sesion.id) : []` (quitar el `&& !esCajero`).
- Pasar a `SesionAbiertaPanel` props nuevas, por ejemplo:
  - `mostrarSaldos={!esCajero}` (igual que hoy)
  - `puedeRegistrarMovimientos={true}` cuando hay sesión (todos los roles con caja abierta)
  - `puedeEditarMovimientos={!esCajero}`
  - `movimientos` y `cuentas` siempre que haya sesión
- Actualizar `description` del `PageHeader` para cajero, ej.:  
  `'Apertura, cierre y egresos/ingresos del turno.'`

**Archivos afectados:**

- `app/app/(dashboard)/caja/page.tsx`

---

### Paso 4: `SesionAbiertaPanel` — UI cajero

**Acciones:**

- Reemplazar el acoplamiento “todo movimientos vive dentro de `mostrarSaldos`” por flags separados:
  - `mostrarSaldos` → resumen + panel saldos (solo owner/admin)
  - `puedeRegistrarMovimientos` → botón “Registrar movimiento” (visible si hay cuentas)
  - `puedeEditarMovimientos` → prop `editable` de `MovimientosTurnoTabla`
- Mostrar bloque de movimientos + botón registrar cuando `puedeRegistrarMovimientos` **aunque** `mostrarSaldos` sea false.
  - Layout sugerido para cajero: debajo de las stats (apertura / ventas / devoluciones), un bloque “Movimientos del turno” con botón outline “Registrar movimiento” y `MovimientosTurnoTabla` con `editable={false}`.
- Mantener “Cierre emergencia” y cierre normal como hoy.
- No mostrar `ResumenTurnoPanel` ni accordion de saldos al cajero.

**Archivos afectados:**

- `app/components/caja/SesionAbiertaPanel.tsx`

---

### Paso 5: Ajustes menores al formulario (copy)

En `RegistrarMovimientoForm.tsx`:

**Acciones:**

- Props opcionales:
  - `descripcion?: string` (default actual)
  - `placeholderConcepto?: string` (default: incluir “Pago mercadería / proveedor…”)
- Desde el panel, para cajero se puede pasar:  
  `descripcion="Registrá un egreso (ej. pago de mercadería) o un ingreso. No podrás editarlo después; pedile al dueño si hay un error."`
- No hace falta prop `tiposPermitidos` salvo que las preguntas abiertas digan “solo egreso”; por defecto ambos tipos.

**Archivos afectados:**

- `app/components/caja/RegistrarMovimientoForm.tsx`
- `app/components/caja/SesionAbiertaPanel.tsx` (pasar copy si `!puedeEditarMovimientos`)

---

### Paso 6: Verificación de `MovimientosTurnoTabla`

**Acciones:**

- Confirmar que con `editable={false}` no se renderiza columna Acciones ni se monta `EditarMovimientoForm`.
- No cambios si ya cumple (código actual: `{editable && <th>…}`).

**Archivos afectados:**

- `app/components/caja/MovimientosTurnoTabla.tsx` (solo si hace falta)

---

### Paso 7: Prueba manual / checklist

**Acciones:**

1. Login como **cajero**, caja abierta:
   - Ve botón Registrar movimiento.
   - Puede crear egreso “Pago mercadería X” en cuenta efectivo.
   - Aparece en la lista; **no** hay Editar/Eliminar.
   - No ve historial del mes ni panel de saldos completo.
2. Intentar egreso mayor al saldo → error “Saldo insuficiente”.
3. Login como **owner**:
   - Puede Editar/Eliminar el movimiento creado por el cajero.
4. (Opcional) Llamar RPC `editar_movimiento_caja_manual` autenticado como cajero → excepción “Sin permiso…”.
5. Caja cerrada: ningún rol registra (RPC existente).

**Archivos afectados:**

- Ninguno (validación)

---

### Paso 8: Documentación mínima

**Acciones:**

- Actualizar estado de este plan a `Implementado` + “Notas de Implementación” al ejecutar `/implementar`.
- `CLAUDE.md`: **no** requiere cambio estructural (mismo módulo Caja; solo permisos por rol).
- Opcional: una línea en `contexto/proyectos.md` bajo Caja: “cajero puede registrar movimientos manuales; edit/delete solo owner/admin”.

**Archivos afectados:**

- Este plan (al implementar)
- `contexto/proyectos.md` (opcional)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/caja/page.tsx` — gate `esCajero`
- `app/components/caja/SesionAbiertaPanel.tsx` — UI movimientos
- `app/app/actions/caja.ts` — actions
- `supabase/migrations/20260723000001_movimientos_caja_editar_eliminar.sql` — base de las RPCs a reemplazar
- `planes/2026-07-23-movimientos-caja-resumen-editar-eliminar.md` — decisión previa “cajero no registra”
- `planes/2026-05-25-gestion-equipo-y-rol-cajero.md` — vista reducida caja
- `app/lib/caja/queries.ts` — `listarMovimientosTurno` (reutilizar sin cambios)
- Dashboard / reportes de egresos manuales (`GananciaBrutaCard`, etc.) — consumen los mismos movimientos; no requieren cambio

### Actualizaciones Necesarias para Consistencia

- Aplicar la migración en el proyecto Supabase (local/prod) antes de validar en producción.
- No regenerar tipos de DB salvo que se agreguen firmas nuevas de RPC (no se agregan; mismas firmas).

### Impacto en Flujos de Trabajo Existentes

- **Cajero**: gana capacidad operativa de sacar/meter plata documentada en el turno.
- **Dueño/admin**: sin pérdida; además puede corregir lo que cargó el cajero.
- **Cierre de caja / preview_resumen_turno**: sin cambios; los egresos del cajero ya entran al SUM del turno vía `movimientos_fondos`.
- **Seguridad**: cierra el hueco de edit/delete por cajero a nivel SQL.

---

## Lista de Validación

Cómo verificar que la implementación está completa y correcta:

- [x] Migración `20260811000002_...` creada (aplicar en Supabase local/prod)
- [x] Cajero con caja abierta ve “Registrar movimiento” y puede guardar egreso/ingreso (UI + action)
- [x] Cajero no ve botones Editar/Eliminar en la tabla (`puedeEditarMovimientos={false}`)
- [x] Action `editarMovimientoCaja` / `eliminarMovimientoCaja` rechazan rol `vendedor`
- [x] RPC edit/delete levantan excepción de permiso para `vendedor`
- [x] Owner/admin siguen creando, editando y eliminando como hoy
- [x] Cajero sigue sin historial por mes ni panel completo de saldos
- [x] Egreso con saldo insuficiente muestra error claro (RPC + traducirError existentes)
- [x] Movimiento del cajero aparece en listado del dueño y en el cierre del turno (misma tabla `movimientos_fondos`)
- [x] Placeholders/copy del form mencionan pago de mercadería / proveedor

---

## Criterios de Éxito

La implementación está completa cuando:

1. Un cajero en turno puede registrar un egreso “Pago mercadería” y queda auditado con su `usuario_id` en `movimientos_fondos`.
2. El mismo cajero no puede editar ni eliminar ese (ni ningún) movimiento, ni por UI ni por action/RPC.
3. Owner/admin conservan control total de corrección (edit/delete) y la vista completa de caja.

---

## Notas

- El `usuario_id` del movimiento se setea en la RPC de alta con `auth.uid()`; el dueño ya ve la columna Usuario en la tabla — útil para saber qué cajero pagó al proveedor.
- Si más adelante se quiere “cajero solo egresos” o “cajero no ve saldo”, son cambios chicos de props + un `if` en la RPC de registrar.
- No hace falta tocar impresión de ticket ni PrintBridge.
- Relacionado con trabajo reciente de redondeo en cobros (`20260811000001_...`): independiente; no compartir migración.

---

## Notas de Implementación

**Implementado:** 2026-08-11

### Resumen

Se habilitó el registro de movimientos manuales para cajeros (`vendedor`) en `/caja`, con listado read-only. Editar/eliminar quedan bloqueados en Server Actions y en las RPCs SQL (`owner`/`admin` únicamente). Defaults del plan aplicados (ambos tipos, listado completo, saldo en el form, edit para owner+admin).

### Desviaciones del Plan

- En `MovimientosTurnoTabla`, el título se omite cuando `titulo=""` para evitar encabezado duplicado en la vista cajero (el panel ya muestra el título + botón).

### Problemas Encontrados

Ninguno. Pendiente operativo: aplicar la migración `20260811000002_cajero_registrar_movimientos_caja.sql` en Supabase.
`}