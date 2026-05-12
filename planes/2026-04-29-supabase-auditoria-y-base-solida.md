# Plan: Auditoría y consolidación de la base Supabase

**Creado:** 2026-04-29
**Estado:** Borrador
**Pedido:** Revisar y dejar lista la carpeta `supabase/` — auditar migraciones, RLS multi-tenant, seeds, MCP, entorno local/deploy y documentación de esquema.

---

## Descripción General

### Qué Logra Este Plan

Deja la carpeta [supabase/](supabase/) en un estado sólido y profesional para construir el MVP: migraciones revisadas y reorganizadas, RLS validado, seeds reproducibles para desarrollo, integración MCP funcionando con el workspace, flujo claro de entorno local + deploy, y documentación del esquema (ERD + diccionario de datos). También cierra brechas detectadas en la auditoría (bug en trigger de devoluciones, README confuso, falta de seeds, etc.).

### Por Qué Importa

CValleTienda está en pre-MVP con 0 clientes. La base de datos ya tiene 13 migraciones y 24 tablas — toda la lógica de POS, stock, caja, devoluciones e impresión vive ahí. Antes de sumar features nuevas o conseguir el primer tenant pago hay que:

1. Asegurar que el esquema actual está libre de bugs (uno detectado en devoluciones).
2. Tener un flujo de desarrollo local reproducible (seed → dev → push) para iterar rápido con feedback de tiendas reales.
3. Tener documentación del schema para no perder tiempo "leyendo SQL" cada vez que se construye un módulo de UI.
4. Aprovechar el MCP de Supabase para que Claude Code pueda inspeccionar el schema y datos directamente.

Todo esto acelera el camino al objetivo Q2 2026: **MVP funcional + 2-3 tiendas pagas**.

---

## Estado Actual

### Estructura Existente Relevante

```
supabase/
├── config.toml                  # CLI config: puertos 54321/54322/54323, project_id remoto
├── package.json                 # MCP server TS (NO la CLI de Supabase)
├── tsconfig.json
├── README.md                    # Docs DEL MCP (engañoso — no documenta migraciones)
├── all_migrations.sql           # Concat de todas las migraciones (referencia)
├── src/index.ts                 # MCP server
└── migrations/                  # 13 archivos *.sql
    ├── 20260419000001_tiendas.sql
    ├── 20260419000002_perfiles.sql
    ├── 20260419000003_productos.sql
    ├── 20260419000004_clientes.sql
    ├── 20260419000005_ventas.sql
    ├── 20260419000006_stock.sql
    ├── 20260419000007_configuracion.sql
    ├── 20260419000008_cuentas_fondos.sql
    ├── 20260419000009_metodos_pago.sql
    ├── 20260419000010_sesiones_caja.sql
    ├── 20260419000011_devoluciones.sql
    ├── 20260419000012_cola_impresion.sql
    └── 20260419000013_fix_handle_new_user.sql
```

**Schema:** 24 tablas, todas multi-tenant con `tienda_id` y RLS aplicada usando helper `get_tienda_id()`. Triggers automatizan stock, fondos y métricas de cliente. Función `cerrar_caja()` orquesta cierre de turno completo. Sincronizado 1:1 con [app/types/database.ts](app/types/database.ts).

**Proyecto remoto:** `uwtzoxdagiqfwrzjjyzt.supabase.co` (Supabase Cloud).
**Variables consumidas:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en [app/.env.local](app/.env.local).

### Brechas o Problemas que se Abordan

1. **Bug funcional:** trigger `devoluciones_actualizar_cliente` en [migrations/20260419000011_devoluciones.sql](supabase/migrations/20260419000011_devoluciones.sql) **no decrementa `total_compras`** del cliente al devolver — solo decrementa `monto_total`. Inconsistencia con la métrica.
2. **README engañoso:** [supabase/README.md](supabase/README.md) documenta el MCP server, no las migraciones ni el flujo de la base.
3. **Confusión `package.json`:** El `package.json` en `supabase/` corresponde al MCP server, no a la CLI. No hay scripts npm de DB (`db:push`, `db:reset`, `db:diff`).
4. **No hay seeds:** Cero datos de desarrollo. Cada vez que se reinicia local hay que crear todo a mano (tienda, productos, clientes, ventas demo).
5. **Falta documentación del schema:** No existe ERD ni diccionario. Los desarrolladores (vos / Claude) tienen que leer 13 archivos SQL cada vez.
6. **MCP no integrado al workspace:** Existe el código MCP en `supabase/src/`, pero no hay archivo `.mcp.json` ni instrucciones de cómo activarlo desde Claude Code.
7. **Migración 013 sin justificar:** [20260419000013_fix_handle_new_user.sql](supabase/migrations/20260419000013_fix_handle_new_user.sql) es un parche sobre 002 sin comentarios. Idealmente las dos se unificarían (pero no se reescriben migraciones ya aplicadas en remoto).
8. **`all_migrations.sql` desincronizado:** archivo de referencia generado a mano que puede drift respecto al estado real de `migrations/`. No hay script que lo regenere.
9. **Sin smoke test de RLS:** No hay forma rápida de validar que un usuario de tienda A no ve datos de tienda B.
10. **Sin scripts de `package.json` raíz para Supabase:** Comandos comunes (`supabase start`, `db push`, `gen types`) se ejecutan a mano.

---

## Cambios Propuestos

### Resumen de Cambios

- Reescribir [supabase/README.md](supabase/README.md) con setup, migraciones, deploy, troubleshooting.
- Crear migración `20260429000001_fix_devolucion_total_compras.sql` que corrige el bug del trigger.
- Crear estructura `supabase/seed/` con SQL idempotente para datos de desarrollo (tienda demo, catálogo, clientes, ventas).
- Crear script `supabase/scripts/regenerar-all-migrations.mjs` que regenera `all_migrations.sql` a partir de `migrations/`.
- Crear script `supabase/scripts/smoke-test-rls.sql` que valida aislamiento multi-tenant entre 2 tiendas demo.
- Crear documentación del schema: `supabase/docs/SCHEMA.md` (diccionario de datos por tabla) y `supabase/docs/ERD.md` (mermaid del modelo).
- Agregar `.mcp.json` en raíz del workspace para registrar el MCP de Supabase con variables de entorno.
- Renombrar `supabase/package.json` → `supabase/mcp/package.json` (mover MCP a subcarpeta) **O** dejarlo donde está y solo aclarar en README. (Decisión: ver "Decisiones de Diseño".)
- Agregar scripts npm en [app/package.json](app/package.json) para flujo Supabase: `db:start`, `db:push`, `db:reset`, `db:gen-types`, `db:seed`.
- Crear archivo `supabase/.env.example` con variables esperadas para correr el MCP y la CLI.
- Actualizar [CLAUDE.md](CLAUDE.md) raíz con nueva estructura `supabase/` y flujo de DB.
- Actualizar [contexto/proyectos.md](contexto/proyectos.md) marcando "Integración MCP Supabase" como completada.

### Nuevos Archivos a Crear

| Ruta del Archivo                                                | Propósito                                                                  |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `supabase/migrations/20260429000001_fix_devolucion_total_compras.sql` | Corrige trigger `devoluciones_actualizar_cliente` para decrementar `total_compras`. |
| `supabase/seed/seed.sql`                                        | Entrada principal de seed. Idempotente. Carga datos demo.                  |
| `supabase/seed/01_tienda_demo.sql`                              | Crea usuario demo + tienda + perfil owner.                                 |
| `supabase/seed/02_catalogo.sql`                                 | Categorías, tallas, colores, productos, variantes con códigos de barras.   |
| `supabase/seed/03_clientes.sql`                                 | 10 clientes demo.                                                          |
| `supabase/seed/04_ventas.sql`                                   | 5–10 ventas históricas con detalles y pagos para tener datos en reportes.  |
| `supabase/seed/README.md`                                       | Cómo correr el seed y qué crea.                                            |
| `supabase/scripts/regenerar-all-migrations.mjs`                 | Concatena todas las migraciones en `all_migrations.sql`.                   |
| `supabase/scripts/smoke-test-rls.sql`                           | Valida aislamiento RLS entre 2 tiendas (crea fixtures + asserts).          |
| `supabase/docs/SCHEMA.md`                                       | Diccionario de datos: tabla por tabla, columnas, FKs, RLS, triggers.       |
| `supabase/docs/ERD.md`                                          | Diagrama Mermaid del modelo entidad-relación.                              |
| `supabase/docs/RLS.md`                                          | Cómo funciona RLS: helper `get_tienda_id()`, patrón de políticas, debug.   |
| `supabase/docs/FLUJO-DEV.md`                                    | Flujo: start → seed → desarrollar → push a remoto → gen-types.             |
| `supabase/.env.example`                                         | Variables esperadas (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).   |
| `.mcp.json`                                                     | Registro del MCP Supabase para Claude Code.                                |

### Archivos a Modificar

| Ruta del Archivo                       | Cambios                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `supabase/README.md`                   | Reescribir: descripción, setup local, comandos, deploy a remoto, troubleshooting, link a docs. |
| `supabase/all_migrations.sql`          | Regenerar con script tras agregar la migración 014.                                      |
| `app/package.json`                     | Agregar scripts: `db:start`, `db:stop`, `db:reset`, `db:push`, `db:gen-types`, `db:seed`. |
| `app/types/database.ts`                | Regenerar (post `supabase gen types typescript`) — verificar que sigue sincronizado.     |
| `CLAUDE.md` (raíz)                     | Agregar sección sobre la base de datos: estructura de `supabase/`, flujo de migraciones, link a `supabase/docs/`. |
| `contexto/proyectos.md`                | Mover "Integración MCP Supabase" del backlog a "Completados".                            |
| `contexto/datos-actuales.md`           | Agregar nota: "Schema base auditado y documentado en `supabase/docs/`".                  |

### Archivos a Eliminar (si aplica)

Ninguno. Ninguna migración aplicada en remoto se reescribe ni elimina (regla de oro de migrations). Si más adelante se decide mover el MCP a subcarpeta, se hará en un plan aparte.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **No tocar las migraciones 001–013.** Son inmutables porque ya están aplicadas en el remoto `uwtzoxdagiqfwrzjjyzt`. Cualquier corrección va en una nueva migración (014).
2. **El bug de `total_compras` se corrige con CREATE OR REPLACE FUNCTION** sobre `actualizar_metricas_cliente_devolucion()` en una migración nueva, no editando la 011.
3. **Seed se mantiene en SQL puro, no en TypeScript.** Razón: simple, rápido de ejecutar con `psql`, no requiere instalar deps. Idempotente con `ON CONFLICT DO NOTHING` y UUIDs determinísticos para fixtures.
4. **El MCP server queda donde está (`supabase/`).** Renombrar a subcarpeta tendría costo (rutas en MCP, scripts) sin beneficio claro hoy. Se documenta claramente en README qué es cada cosa.
5. **`.mcp.json` va en la raíz del workspace** (no dentro de `supabase/`). Es el lugar estándar que detecta Claude Code.
6. **Tipos generados se commitean** ([app/types/database.ts](app/types/database.ts)) en lugar de generarse en build. Más simple, menos sorpresas en CI.
7. **Documentación del schema en Markdown, no autogenerada.** Razón: las descripciones humanas (propósito, decisiones, gotchas) no se pueden generar desde SQL. ERD sí en Mermaid (texto, versionable).
8. **Smoke test de RLS en SQL, no en Vitest/Jest.** Razón: corre en `psql` contra Postgres real, sin runtime JS. Es chequeo manual on-demand, no CI (por ahora).
9. **Scripts npm se agregan a `app/package.json`**, no a `supabase/package.json`. Razón: el dev trabaja desde `app/` la mayor parte del tiempo y `supabase/package.json` es del MCP.
10. **Idempotencia obligatoria en seed.** Volver a correr seed nunca debe duplicar datos ni romper. Usar `ON CONFLICT`, `IF NOT EXISTS`, UUIDs fijos.

### Alternativas Consideradas

- **Reescribir todas las migraciones en una sola "baseline".** Rechazado: el remoto ya tiene las 13 aplicadas; rebaselining requiere coordinación cuidadosa y no aporta hoy.
- **Usar Supabase Seed con `supabase/seed.sql` (path estándar).** Aceptado parcialmente: el archivo principal `seed/seed.sql` puede ser referenciado o copiado a `supabase/seed.sql` (path que `supabase db reset` usa automáticamente). Decisión: crear `supabase/seed.sql` que hace `\i seed/seed.sql` para integrarse con la CLI.
- **Generar ERD con dbdiagram.io o pg_dump → graphviz.** Rechazado: agrega dependencia externa. Mermaid funciona en GitHub/VS Code y es texto plano.
- **Mover MCP a subcarpeta `supabase/mcp/`.** Postergado a otro plan — costo > beneficio en este momento.

### Preguntas Abiertas

- **¿Querés que el seed cree un usuario de auth real (con password) o solo un perfil "huérfano" para inspección?** Recomiendo crear un usuario real `demo@cvalle.local / demo1234` para poder loguearse en el dashboard y ver datos. Marcar como "para uso local exclusivamente".
- **¿El `.env.example` debe incluir el `project_id` remoto actual o dejarlo en blanco?** Recomiendo dejar en blanco con placeholder para no commitear datos del proyecto en histórico.
- **¿Generar tipos contra el proyecto remoto o contra Supabase local?** Recomiendo: local cuando se trabaja en migraciones nuevas, remoto antes de deploy. Documentarlo en FLUJO-DEV.md.

---

## Tareas Paso a Paso

Ejecutar en orden. Cada paso es atómico y validable.

### Paso 1: Crear migración 014 — fix bug de devoluciones

Crear nueva migración que corrija `actualizar_metricas_cliente_devolucion()` para decrementar también `total_compras`.

**Acciones:**

- Crear `supabase/migrations/20260429000001_fix_devolucion_total_compras.sql`.
- Contenido: `CREATE OR REPLACE FUNCTION public.actualizar_metricas_cliente_devolucion()` que decrementa `total_compras = greatest(0, total_compras - 1)` además de `monto_total`. Mantener resto de la lógica.
- Incluir comentario al inicio explicando que es fix de la 011 y referenciando el bug.
- No tocar el trigger (ya apunta a la función por nombre).

**Archivos afectados:**

- `supabase/migrations/20260429000001_fix_devolucion_total_compras.sql` (nuevo)

**Validación:** ejecutar `supabase db reset` (local) y verificar que aplica sin error.

---

### Paso 2: Crear estructura de seed

Crear archivos SQL idempotentes para poblar una tienda demo completa.

**Acciones:**

- Crear carpeta `supabase/seed/`.
- Crear `supabase/seed/01_tienda_demo.sql`: insertar tienda demo con UUID fijo (ej. `00000000-0000-0000-0000-000000000001`) usando `ON CONFLICT (id) DO NOTHING`. Incluir creación de usuario auth demo via `supabase.auth.admin` no es posible desde SQL puro — usar `INSERT INTO auth.users` con password hash conocido (documentar credenciales en seed/README.md). Crear perfil owner asociado.
- Crear `supabase/seed/02_catalogo.sql`: categorías ("Remeras", "Pantalones", "Camisas"), tallas (XS–XXL con orden), colores (Negro, Blanco, Azul, Rojo con hex), 5 productos, ~20 variantes con códigos de barras EAN-13 ficticios pero realistas.
- Crear `supabase/seed/03_clientes.sql`: 10 clientes con datos verosímiles AR (DNI, teléfono, ciudad).
- Crear `supabase/seed/04_ventas.sql`: 5–10 ventas usando `INSERT INTO ventas` + `INSERT INTO detalles_venta` + `INSERT INTO pagos_venta`. Distribuidas en últimos 30 días para tener datos de "ventas recientes". Disparará triggers de stock y métricas.
- Crear `supabase/seed/seed.sql`: orquestador con `\i 01_...sql`, `\i 02_...sql`, etc.
- Crear `supabase/seed.sql` (raíz de supabase) con `\i seed/seed.sql` para integración con `supabase db reset`.
- Crear `supabase/seed/README.md`: explicar credenciales demo, qué datos se cargan, cómo correr y resetear.

**Archivos afectados:**

- `supabase/seed/seed.sql` (nuevo)
- `supabase/seed/01_tienda_demo.sql` (nuevo)
- `supabase/seed/02_catalogo.sql` (nuevo)
- `supabase/seed/03_clientes.sql` (nuevo)
- `supabase/seed/04_ventas.sql` (nuevo)
- `supabase/seed/README.md` (nuevo)
- `supabase/seed.sql` (nuevo)

**Validación:** `supabase db reset` carga seed sin errores. Loguearse con `demo@cvalle.local` en dashboard local y ver productos, clientes, ventas.

---

### Paso 3: Script regenerar-all-migrations

Crear script que concatena `migrations/*.sql` en orden para regenerar `all_migrations.sql`.

**Acciones:**

- Crear `supabase/scripts/regenerar-all-migrations.mjs`: usa `node:fs` para listar `migrations/`, ordena por nombre, concatena con headers `-- ========= NOMBRE ARCHIVO =========`, escribe a `supabase/all_migrations.sql`.
- Ejecutarlo y commitear el `all_migrations.sql` actualizado (incluyendo migración 014).
- Documentar en README cuándo correrlo (después de agregar migración).

**Archivos afectados:**

- `supabase/scripts/regenerar-all-migrations.mjs` (nuevo)
- `supabase/all_migrations.sql` (regenerado)

**Validación:** correr el script, abrir `all_migrations.sql` y verificar que contiene las 14 migraciones en orden.

---

### Paso 4: Smoke test de RLS

Crear script SQL que valida aislamiento entre tiendas.

**Acciones:**

- Crear `supabase/scripts/smoke-test-rls.sql`:
  - Crea (si no existen) 2 usuarios + 2 tiendas + perfiles.
  - Inserta 1 producto en cada tienda.
  - Usa `SET ROLE authenticated` + `SET request.jwt.claims` para simular cada usuario.
  - Hace `SELECT count(*) FROM productos` y verifica que cada usuario ve solo el suyo (1 fila).
  - Usa `DO $$ BEGIN ... ASSERT ...; END $$` o `RAISE EXCEPTION` si falla.
  - Limpia los fixtures al final.
- Documentar uso en `supabase/docs/RLS.md`: `psql -f scripts/smoke-test-rls.sql`.

**Archivos afectados:**

- `supabase/scripts/smoke-test-rls.sql` (nuevo)

**Validación:** correr contra DB local y obtener "RLS OK" sin excepciones.

---

### Paso 5: Documentación del schema

Crear documentación humana del modelo de datos.

**Acciones:**

- Crear `supabase/docs/SCHEMA.md`: por cada una de las 24 tablas, documentar:
  - Propósito en una línea.
  - Columnas clave con tipo y constraints.
  - FKs y relaciones.
  - Triggers que la afectan.
  - Notas operativas (ej. "el `numero_ticket` se obtiene con `get_siguiente_numero_ticket()`").
- Agrupar por dominio: Core, Catálogo, CRM, Finanzas, POS, Inventario, Impresión, Config.
- Crear `supabase/docs/ERD.md` con diagrama Mermaid `erDiagram` que muestre relaciones principales (no todas las columnas).
- Crear `supabase/docs/RLS.md`: explicar `get_tienda_id()`, patrón de políticas (select/insert/update por tenant), cómo debuggear permisos denegados, link a smoke test.
- Crear `supabase/docs/FLUJO-DEV.md`:
  1. Levantar local: `npm run db:start`.
  2. Aplicar seed: `npm run db:reset` (que aplica migraciones + seed).
  3. Generar tipos: `npm run db:gen-types`.
  4. Crear migración nueva: `supabase migration new <nombre>`.
  5. Push a remoto: `npm run db:push`.
  6. Troubleshooting (Docker, puertos ocupados, regenerar tipos).

**Archivos afectados:**

- `supabase/docs/SCHEMA.md` (nuevo)
- `supabase/docs/ERD.md` (nuevo)
- `supabase/docs/RLS.md` (nuevo)
- `supabase/docs/FLUJO-DEV.md` (nuevo)

**Validación:** los 4 archivos abren correctamente, el Mermaid renderiza en VS Code, las 24 tablas están en SCHEMA.md.

---

### Paso 6: Reescribir README de supabase

**Acciones:**

- Reescribir [supabase/README.md](supabase/README.md) con secciones:
  - **Qué es esto**: carpeta de la base de datos del proyecto. Aclarar que el `package.json` y `src/` son del MCP server (no la CLI).
  - **Estructura**: árbol con descripción.
  - **Setup inicial**: requisitos (Docker, supabase CLI), comandos para levantar local y linkear a remoto.
  - **Migraciones**: lista enumerada con descripción de cada una.
  - **Seed**: cómo cargar datos demo, credenciales.
  - **Deploy a remoto**: `db push`, regenerar `all_migrations.sql`, regenerar tipos.
  - **MCP server**: qué hace, cómo ejecutarlo (`npm run watch`), link a `.mcp.json` en raíz.
  - **Documentación adicional**: links a `docs/SCHEMA.md`, `docs/ERD.md`, `docs/RLS.md`, `docs/FLUJO-DEV.md`.

**Archivos afectados:**

- `supabase/README.md` (reescrito)

**Validación:** un dev nuevo puede seguirlo y levantar el entorno sin preguntar.

---

### Paso 7: Configurar MCP en el workspace

**Acciones:**

- Crear `.mcp.json` en raíz del workspace registrando el MCP server de Supabase:
  ```json
  {
    "mcpServers": {
      "supabase": {
        "command": "node",
        "args": ["./supabase/dist/index.js"],
        "env": {
          "SUPABASE_URL": "${SUPABASE_URL}",
          "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
        }
      }
    }
  }
  ```
  (Verificar la forma exacta inspeccionando `supabase/src/index.ts` y `supabase/package.json` para nombre del entry point compilado y variables que el MCP consume.)
- Crear `supabase/.env.example` con `SUPABASE_URL=`, `SUPABASE_SERVICE_ROLE_KEY=`, `SUPABASE_PROJECT_ID=` (placeholders).
- En `supabase/README.md` agregar sección "Activar MCP en Claude Code": copiar `.env.example` a `.env`, completar, ejecutar `npm run build` en `supabase/`, abrir Claude Code → debería detectar `.mcp.json`.

**Archivos afectados:**

- `.mcp.json` (nuevo, raíz)
- `supabase/.env.example` (nuevo)
- `supabase/README.md` (sección agregada)

**Validación:** Claude Code detecta el MCP, las herramientas Supabase aparecen disponibles en el panel de tools.

---

### Paso 8: Scripts npm en `app/package.json`

**Acciones:**

- Editar [app/package.json](app/package.json) agregando en `scripts`:
  - `"db:start"`: `cd ../supabase && supabase start`
  - `"db:stop"`: `cd ../supabase && supabase stop`
  - `"db:reset"`: `cd ../supabase && supabase db reset`
  - `"db:push"`: `cd ../supabase && supabase db push`
  - `"db:gen-types"`: `cd ../supabase && supabase gen types typescript --local > ../app/types/database.ts`
  - `"db:diff"`: `cd ../supabase && supabase db diff`
  - `"db:regen-all"`: `cd ../supabase && node scripts/regenerar-all-migrations.mjs`
- Documentar en `supabase/docs/FLUJO-DEV.md` y en [supabase/README.md](supabase/README.md).

**Archivos afectados:**

- `app/package.json`

**Validación:** `npm run db:start` levanta Supabase local. `npm run db:gen-types` regenera el tipo y queda igual o con cambios mínimos esperados.

---

### Paso 9: Regenerar tipos TypeScript

**Acciones:**

- Aplicar migración 014 en local (`npm run db:reset`).
- Ejecutar `npm run db:gen-types`.
- Revisar diff en [app/types/database.ts](app/types/database.ts): no debería haber cambios significativos (solo eventualmente comentarios o reorden), porque la 014 solo cambia el cuerpo de una función.
- Si hay drift inesperado, investigar y resolver antes de commitear.

**Archivos afectados:**

- `app/types/database.ts` (regenerado)

**Validación:** `cd app && npm run lint && npm run build` pasa sin errores nuevos.

---

### Paso 10: Push a remoto y verificación

**Acciones:**

- Antes de pushear: confirmar con el usuario, dado que es operación contra producción.
- Ejecutar `npm run db:push` para aplicar la migración 014 al proyecto remoto.
- Verificar en Supabase Studio remoto que la función `actualizar_metricas_cliente_devolucion` tiene el body actualizado.
- Regenerar tipos contra remoto: `cd supabase && supabase gen types typescript --linked > ../app/types/database.ts` y confirmar que queda igual a la versión local.

**Archivos afectados:**

- Proyecto Supabase remoto (estado de DB).
- `app/types/database.ts` (verificación, no debería cambiar).

**Validación:** Studio remoto refleja la nueva función. Hacer una devolución de prueba (manual o vía seed remoto) y confirmar que `clientes.total_compras` decrementa.

---

### Paso 11: Actualizar contexto y CLAUDE.md

**Acciones:**

- Editar [CLAUDE.md](CLAUDE.md) raíz: agregar sección "Base de datos (Supabase)" en la estructura del workspace, con links a `supabase/docs/`. Mencionar comandos npm `db:*`.
- Editar [contexto/proyectos.md](contexto/proyectos.md): mover "Integración MCP Supabase" del backlog a "Completados" con resultado: "MCP activo vía `.mcp.json`, schema documentado en `supabase/docs/`". Agregar entrada en "Completados" para "Auditoría base Supabase".
- Editar [contexto/datos-actuales.md](contexto/datos-actuales.md) sección "Estado Actual": agregar "Schema Supabase auditado, documentado y con seed reproducible. 24 tablas multi-tenant con RLS validada por smoke test."

**Archivos afectados:**

- `CLAUDE.md`
- `contexto/proyectos.md`
- `contexto/datos-actuales.md`

**Validación:** la próxima sesión que ejecute `/iniciar` ya tiene el nuevo contexto.

---

### Paso 12: Validación end-to-end

**Acciones:**

- Borrar volúmenes locales (`supabase stop --no-backup` y reset).
- `npm run db:start && npm run db:reset` desde cero — debe correr migraciones 001–014 + seed sin errores.
- Loguearse en dashboard local con `demo@cvalle.local`.
- Hacer una venta desde POS, verificar ticket, ver en `/dashboard/ventas`.
- Hacer una devolución, verificar que `clientes.total_compras` decrementa (bug fix funciona).
- Correr `psql -f supabase/scripts/smoke-test-rls.sql` y obtener OK.
- Verificar que el MCP de Supabase responde a queries desde Claude Code.

**Archivos afectados:**

- Ninguno (solo verificación).

**Validación:** todo el flujo end-to-end funciona en local con datos demo.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- [app/lib/supabase/client.ts](app/lib/supabase/client.ts) — usa env vars; no cambia.
- [app/lib/supabase/server.ts](app/lib/supabase/server.ts) — idem.
- [app/lib/supabase/middleware.ts](app/lib/supabase/middleware.ts) — idem.
- [app/types/database.ts](app/types/database.ts) — regenerado en Paso 9.
- [app/app/actions/auth.ts](app/app/actions/auth.ts) — usa `handle_new_user()` (sin cambios funcionales).
- Todas las rutas de [app/app/(dashboard)/](app/app/(dashboard)/) — consumen tablas, tipos siguen iguales tras la 014.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` raíz documenta nuevos comandos npm y carpeta `supabase/docs/`.
- [contexto/proyectos.md](contexto/proyectos.md) refleja "Integración MCP" completada.
- [contexto/datos-actuales.md](contexto/datos-actuales.md) menciona base auditada.
- `supabase/all_migrations.sql` regenerado tras 014.

### Impacto en Flujos de Trabajo Existentes

- **Desarrollo local:** ahora reproducible con un solo comando (`npm run db:reset`). Mejora el ciclo.
- **Deploy:** flujo claro `db push` documentado. Reduce riesgo.
- **Onboarding nuevo dev / sesión nueva de Claude:** docs en `supabase/docs/` evitan tener que leer 13 SQLs.
- **Trigger de devoluciones:** ahora correcto. Tiendas que ya tengan devoluciones aplicadas en remoto antes de la 014 no se "auto-corrigen" (la métrica acumulada queda mal). Considerar script de reconciliación de datos si llega a aplicar (probablemente no, dado 0 clientes hoy).

---

## Lista de Validación

- [ ] Migración `20260429000001_fix_devolucion_total_compras.sql` aplica sin errores en local.
- [ ] Devolución decrementa `total_compras` y `monto_total` del cliente (probado en local).
- [ ] `npm run db:reset` carga las 14 migraciones + seed sin errores.
- [ ] Login con `demo@cvalle.local / demo1234` funciona en dashboard local.
- [ ] `/dashboard/productos`, `/clientes`, `/ventas` muestran datos demo.
- [ ] Smoke test RLS pasa: usuario tienda A no ve productos de tienda B.
- [ ] `supabase/all_migrations.sql` regenerado contiene las 14 migraciones en orden.
- [ ] `supabase/docs/SCHEMA.md` cubre las 24 tablas.
- [ ] `supabase/docs/ERD.md` renderiza en VS Code.
- [ ] `supabase/README.md` reescrito y claro.
- [ ] `.mcp.json` registrado en raíz; Claude Code detecta el MCP Supabase.
- [ ] `app/package.json` tiene scripts `db:*` y funcionan.
- [ ] `app/types/database.ts` regenerado y `npm run build` pasa.
- [ ] `CLAUDE.md`, `contexto/proyectos.md`, `contexto/datos-actuales.md` actualizados.
- [ ] Migración 014 pusheada al remoto con confirmación del usuario.

---

## Criterios de Éxito

La implementación está completa cuando:

1. Un dev (vos o Claude en sesión nueva) puede clonar el repo, correr `npm run db:start && npm run db:reset` y tener una tienda demo funcional con productos, clientes y ventas en menos de 5 minutos.
2. El bug de `total_compras` en devoluciones está corregido en remoto y validado.
3. La carpeta `supabase/` tiene documentación completa: `README.md` claro, `docs/SCHEMA.md`, `docs/ERD.md`, `docs/RLS.md`, `docs/FLUJO-DEV.md`. Cualquiera entiende el modelo sin leer SQL.
4. El MCP de Supabase está registrado en `.mcp.json` y Claude Code puede consultar el schema directamente.
5. Smoke test de RLS pasa, dando confianza de que el aislamiento multi-tenant funciona.
6. El seed reproducible permite iterar UI y features sin reconstruir datos a mano.

---

## Notas

- **No se reescriben las migraciones 001–013.** Toda corrección o cambio va en migraciones nuevas. Esto es regla dura.
- **El seed crea un usuario auth manualmente con INSERT en `auth.users`.** Si la API admin de Supabase es necesaria (por ej. para hashing correcto del password), se puede mover ese paso a un script Node que use `service_role_key`. Decidir en Paso 2 según si SQL puro funciona.
- **El MCP server es código TypeScript en `supabase/src/`.** Para activarlo hay que correr `npm run build` (compila a `dist/`). Documentado en README.
- **Futuro (no en este plan):** rutas UI para Categorías/Tallas/Colores, módulo de reportes con funciones RPC de agregación, integración real de cola de impresión con dispositivos (Realtime + agente de impresora).
- **Si el seed manual con `INSERT INTO auth.users` falla por restricciones de Supabase**, alternativa: script Node `supabase/seed/auth-seed.mjs` que usa `supabase.auth.admin.createUser()` con `SUPABASE_SERVICE_ROLE_KEY`. Ejecutarlo después del seed SQL.
