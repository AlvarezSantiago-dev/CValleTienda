# CLAUDE.md

Este archivo provee instrucciones a Claude Code (claude.ai/code) cuando trabaja con código en este repositorio.

---

## Qué Es Esto

Este es un **Claude Workspace Template** — un entorno estructurado diseñado para trabajar con Claude Code como un potente asistente agente entre sesiones. El usuario abrirá nuevas sesiones de Claude Code repetidamente, usando `/iniciar` al comienzo de cada una para cargar contexto esencial sin sobrecargar el contexto.

**Este archivo (CLAUDE.md) es la base.** Se carga automáticamente al inicio de cada sesión. Mantenelo actualizado — es la única fuente de verdad sobre cómo Claude debe entender y operar dentro de este workspace.

---

## La Relación Claude-Usuario

Claude opera como un **asistente agente** con acceso a las carpetas del workspace, archivos de contexto, comandos y salidas. La relación es:

- **Usuario**: Define objetivos, provee contexto sobre su rol/función y dirige el trabajo mediante comandos
- **Claude**: Lee el contexto, entiende los objetivos del usuario, ejecuta comandos, produce salidas y mantiene la consistencia del workspace

Claude siempre debe orientarse a través de `/iniciar` al inicio de la sesión, y luego actuar con plena conciencia de quién es el usuario, qué está tratando de lograr y cómo este workspace lo apoya.

---

## Estructura del Workspace

```
.
├── CLAUDE.md              # Este archivo — contexto principal, siempre cargado
├── .claude/
│   └── commands/          # Comandos que Claude puede ejecutar
│       ├── iniciar.md      # /iniciar — inicialización de sesión
│       ├── crear-plan.md   # /crear-plan — crear planes de implementación
│       ├── implementar.md  # /implementar — ejecutar planes
│       └── contenido-redes.md # /contenido-redes — pack Instagram (feed/Stories/copy)
├── contexto/              # Contexto de fondo sobre el usuario y el proyecto
│                          # (El usuario debe completar con rol, objetivos, estrategias)
├── planes/                # Planes de implementación creados por /crear-plan
├── salidas/               # Productos de trabajo, herramientas y entregables
│   └── redes/             # Packs Instagram (PNG + copy); playbook en referencia/
├── referencia/            # Plantillas, ejemplos, patrones reutilizables
└── scripts/               # Scripts de automatización auxiliares (si aplica)
```

**Directorios principales:**

| Directorio    | Propósito                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `contexto/`   | Quién es el usuario, su rol, prioridades actuales, estrategias. Leído por `/iniciar`.           |
| `planes/`     | Planes de implementación detallados. Creados por `/crear-plan`, ejecutados por `/implementar`.  |
| `salidas/`    | Entregables, análisis, reportes, herramientas y productos de trabajo.                           |
| `referencia/` | Docs de ayuda, plantillas y patrones para asistir en distintos flujos de trabajo.               |
| `scripts/`    | Scripts de automatización auxiliares (bash, python, etc.) que soporten otros flujos.            |

---

## Comandos

### /iniciar

**Propósito:** Inicializar una nueva sesión con plena conciencia del contexto.

Ejecutalo al inicio de cada sesión. Claude:

1. Leerá CLAUDE.md y los archivos de contexto
2. Resumirá su comprensión del usuario, el workspace y los objetivos
3. Confirmará que está listo para asistir

### /crear-plan [pedido]

**Propósito:** Crear un plan de implementación detallado antes de hacer cambios.

Usalo cuando se agrega nueva funcionalidad, comandos, scripts, o se hacen cambios estructurales. Produce un documento de plan exhaustivo en `planes/` que captura contexto, justificación y tareas paso a paso.

Ejemplo: `/crear-plan agregar comando de análisis de competidores`

### /implementar [ruta-al-plan]

**Propósito:** Ejecutar un plan creado por /crear-plan.

Lee el plan, ejecuta cada paso en orden, valida el trabajo y actualiza el estado del plan.

Ejemplo: `/implementar planes/2026-01-28-comando-analisis-competidores.md`

### /contenido-redes [pilar o brief]

**Propósito:** Generar un pack de Instagram (feed 4:5, Stories 9:16, caption, guion de Reel) listo para publicar a mano.

Leé `referencia/redes-sociales.md`, instanciá `salidas/redes/_plantilla-pack/`, exportá PNG con `scripts/export-pieza-redes.mjs`. CTA: WhatsApp, no registro. Ejemplo: `/contenido-redes stock`

---

## Instrucción Crítica: Mantener Este Archivo

**Siempre que Claude haga cambios en el workspace, DEBE considerar si CLAUDE.md necesita actualizarse.**

Después de cualquier cambio — agregar comandos, scripts, flujos de trabajo, o modificar la estructura — preguntarse:

1. ¿Este cambio agrega nueva funcionalidad que los usuarios necesitan conocer?
2. ¿Modifica la estructura del workspace documentada arriba?
3. ¿Debe listarse un nuevo comando?
4. ¿Necesita `contexto/` nuevos archivos para capturar esto?

Si la respuesta es sí a cualquiera, actualizar las secciones relevantes. Este archivo debe siempre reflejar el estado actual del workspace para que las sesiones futuras tengan contexto preciso.

**Ejemplos de cambios que requieren actualizar CLAUDE.md:**

- Agregar un nuevo comando → agregar a la sección de Comandos
- Crear un nuevo tipo de salida → documentar en Estructura del Workspace o crear una sección
- Agregar un script → documentar su propósito y uso
- Cambiar patrones de flujo de trabajo → actualizar la documentación relevante

---

## Para Usuarios que Descargan Esta Plantilla

Para personalizar este workspace según tus necesidades:

1. Completá los documentos de contexto en `contexto/` con tu información, negocio y objetivos
2. Usá `/crear-plan` para planificar cualquier adición o cambio estructural
3. Usá `/implementar` para ejecutar los planes

Esto asegura que todo se mantenga sincronizado — especialmente CLAUDE.md, que siempre debe reflejar el estado actual del workspace.

---

## Flujo de Trabajo de Sesión

1. **Inicio**: Ejecutar `/iniciar` para cargar el contexto
2. **Trabajo**: Usar comandos o dirigir a Claude con tareas
3. **Planificar cambios**: Usar `/crear-plan` antes de adiciones significativas
4. **Ejecutar**: Usar `/implementar` para ejecutar los planes
5. **Mantener**: Claude actualiza CLAUDE.md y `contexto/` a medida que el workspace evoluciona

---

## Uso de Skills — Cuándo Activar Cada Una

**Regla general:** Solo invocar un skill cuando la tarea lo requiere explícitamente. No cargar skills por defecto ni preventivamente. Menos skills = menos consumo de contexto y recursos.

### Skills de Desarrollo

| Skill | Activar cuando... |
|-------|-------------------|
| `senior-frontend` | Se construye o modifica UI: landing pages, dashboards, componentes React/Next.js |
| `senior-backend` | Se diseña o implementa una API, lógica de servidor, base de datos |
| `senior-prompt-engineer` | Se diseñan prompts para agentes de IA, flujos conversacionales, o se optimiza un LLM |
| `senior-security` | Se audita código, se diseña autenticación, se revisan vulnerabilidades |
| `code-reviewer` | Se pide revisión de código antes de entregar o deployar |
| `webapp-testing` | Se necesita testear una app web con Playwright |
| `skill-creator` | Se crea o modifica un skill del workspace |

### Skills de Diseño

| Skill | Activar cuando... |
|-------|-------------------|
| `ui-ux-pro-max` | Se diseña experiencia de usuario, flujos de navegación, wireframes |
| `ui-design-system` | Se construye un sistema de diseño: tokens, componentes, guías de estilo |
| `canvas-design` | Se genera un diseño visual como imagen (PNG/PDF): poster, banner, thumbnail |
| `brainstorming` | Se necesita explorar ideas antes de implementar algo creativo o nuevo |
| `frontend-design` | Se construye una interfaz con alto estándar visual de producción |

### Skills de Negocio / Marketing

| Skill | Activar cuando... |
|-------|-------------------|
| `seo-optimizer` | Se trabaja en contenido web, metadata, estrategia de posicionamiento orgánico |
| `competitive-ads-extractor` | Se analiza la publicidad de competidores en Meta Ads / LinkedIn Ads |
| contenido Instagram | Playbook `referencia/redes-sociales.md` · packs `salidas/redes/` · comando `/contenido-redes` |

### Skills de Base de Datos / Seguridad

| Skill | Activar cuando... |
|-------|-------------------|
| `supabase-postgres-best-practices` | Se escribe, revisa u optimiza código SQL o esquemas en Supabase/Postgres |
| `api-security-best-practices` | Se diseña o audita la seguridad de una API: auth, rate limiting, validación |

### Skills de Utilidades

| Skill | Activar cuando... |
|-------|-------------------|
| `pdf-processing-pro` | Se procesan, extraen o transforman documentos PDF |
| `video-downloader` | Se descarga video de YouTube u otras plataformas |
| `mcp-integration` | Se configura o integra un servidor MCP en el workspace |
| `using-superpowers` | Se necesita orquestar múltiples skills en una tarea compleja |

### Skills de Workflow (Superpowers)

Usar solo para tareas de desarrollo complejas, multi-paso o con múltiples agentes:

| Skill | Activar cuando... |
|-------|-------------------|
| `superpowers:brainstorming` | Antes de cualquier trabajo creativo o de implementación nueva |
| `superpowers:writing-plans` | Se tiene un spec y se necesita plan detallado antes de tocar código |
| `superpowers:executing-plans` | Se ejecuta un plan con checkpoints de revisión |
| `superpowers:systematic-debugging` | Se encuentra un bug o falla inesperada |
| `superpowers:verification-before-completion` | Antes de declarar algo como terminado o listo para deploy |
| `superpowers:dispatching-parallel-agents` | Hay 2+ tareas independientes que se pueden trabajar en paralelo |

---

## App CValleTienda — Design System v2

La app vive en `app/` (Next.js App Router). El rediseño UI/UX Fable (Fases 0–10) está **implementado**.

| Recurso | Uso |
| ------- | --- |
| `referencia/design-system-v2.md` | Spec de tokens, semántica, reglas de composición |
| `app/app/globals.css` | Tokens CSS (`--brand-*`, `--primary`, `--fg`, radios, sombras) |
| `app/app/(dashboard)/design/page.tsx` | Showcase vivo de primitives (`/design`) |
| `app/components/ui/` | Primitives v2 (Button, Input, Tabs, Card, Badge, …) |
| `referencia/carga-express-ropa.md` | Carga express ropa: matriz talle×color + pegar texto NL |
| `/productos/carga-express` | UI de carga rápida (solo rubro `ropa`) |
| Rubro `distribuidora` | Flags `usarPedidoCc` / `remitoAutoVenta` / `clienteObligatorioCc`: POS Contado/A cuenta, remito auto, ledger CC |
| Tramos de cantidad | `producto_tramos_cantidad`: desde N u. → X %. Motor `lib/precios/tramos-cantidad.ts`. Orden: lista → tramo → recargo CC. Catálogo y POS. |
| Packs múltiples | `producto_packs` + `producto_pack_tramos` a nivel producto (x8, x24…). POS/catálogo eligen unidad o pack. Auto-pack solo si hay 1 tamaño. Foto `{tienda_id}/{producto_id}/pack/{pack_id}/cover.{ext}`. Recargo a cuenta opcional por pack (`recargo_cc_pct`, NULL = hereda producto/tienda). Migración `20260822000002_pack_recargo_cc.sql`. |
| Pedidos catálogo | Editables (qty/ítems, tope de stock) hasta convertir. Catálogo y cobro: Contado / A cuenta con recargo pack→producto→tienda. **un** remito (no duplicar si `remitoAutoVenta`). |
| Recibo CC | Ticket 80 mm `ReciboCcRenderer` en `/recibos-cc/[id]`. Remito CC impreso: Total / Pagado / Pendiente. |
| POS cobro clásico | `CobroPagoModal` para montos; chips Cliente/Descuento/Notas siguen en `PanelPago`. Modo guiado = wizard 4 pasos. |
| `referencia/modelo-saldos-cuentas.md` | Posición de caja: al momento / por acreditar / proyectado |
| Fotos de producto | Upload a Storage bucket `productos`, path `{tienda_id}/{producto_id}/cover.{ext}` (tapa) y `.../color/{color_id}/cover.{ext}` (por color). Columnas `productos.imagen_url` + `variantes_producto.imagen_url`. UI `ImagenProductoUpload` / `FotosPorColor`. API `/api/productos/imagen`. |
| Catálogo público | URL `/c/[slug]` (sin dashboard). Productos opt-in `visible_en_catalogo` (default off). Pedidos por WhatsApp del tenant. Inbox `/pedidos` + campana. Stock al confirmar envío/retiro (convertir a venta); catálogo/POS/pedido no permiten qty ni packs por encima del stock físico. Ficha de catálogo muestra stock (u. / packs) y por qué un pack no entra. Config `/configuracion/catalogo`. Stay-on-add (toast + badge, no redirect) + barra sticky «Ver pedido» + buscador en grilla. Spec: `referencia/catalogo-publico.md`. |
| Baja de cuenta | Owner: Configuración → Avanzado (confirmar nombre de tienda) borra tienda + logins. Cajero: mismo lugar o Equipo → Borrar. Superadmin: borrar tienda + panel de logins huérfanos. Ley 25.326: `/privacidad`. |
| Cajero hablado | Agente de voz push-to-talk (F10 / mantener FAB). API `/api/cajero`: cerebro Claude Haiku (`ANTHROPIC_API_KEY`) u OpenAI (`OPENAI_API_KEY`); STT Web Speech (gratis) o Whisper si hay OpenAI. Tools sobre server actions. Alcance v1: venta contado, alta producto, cambio de precio (owner/admin). Plan: `planes/2026-08-21-cajero-hablado.md`. |
| Dashboard Inicio | Agregados en Postgres: `get_dashboard_inicio`, `get_dashboard_ganancia`, `get_dashboard_tops`. Por cobrar lee `clientes.saldo_cc` (no reescribe el ledger en GET). Tops/últimas van en `Suspense`. Migración `20260821000002_dashboard_inicio_rpc.sql`. |

**Convención primitives-first:** toda UI nueva o tocada usa tokens semánticos (`bg-primary`, `text-fg`, `border-border-default`, …) y componentes de `components/ui/`. No reintroducir `lime-*` / `indigo-*` ni hex de marca hardcodeados fuera de tokens. **No tocar** markup de impresión (`styles/print.css`, `components/impresion/**`, RemitoImprimible*).

Plan maestro: `planes/2026-07-28-rediseno-uiux-completo-fable.md`.
Plan carga express: `planes/2026-08-11-carga-express-productos-ropa.md`.

---

## Notas

- Mantener el contexto mínimo pero suficiente — evitar sobrecarga
- Los planes viven en `planes/` con nombres de archivo con fecha para historial
- Las salidas se organizan por tipo/propósito en `salidas/`
- Los materiales de referencia van en `referencia/` para reutilización
