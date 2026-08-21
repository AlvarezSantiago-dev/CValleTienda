# Plan: PDF de novedades para clientes (Julio–Agosto 2026)

**Creado:** 2026-08-21
**Estado:** Implementado
**Pedido:** PDF para clientes con lo importante actualizado hasta hoy, marcando fixes/bugs, vendiendo el cajero con IA como próximo gran salto, y anunciando que el catálogo público llega para todos en la próxima actualización.

---

## Descripción General

### Qué Logra Este Plan

Produce un **documento A4 imprimible (HTML → PDF)** listo para WhatsApp/email, en el mismo patrón que el changelog de junio (`salidas/2026-06-18-novedades-clientes-cvalletienda.html`). Resume **solo lo que el dueño y el cajero notan**: cara nueva del sistema, caja/cobro, productos, cuenta corriente, y una página de **correcciones**. Cierra con dos páginas de **próximamente**: catálogo público para todos, y **inteligencia artificial en caja** (cajero hablado) vendida como diferencial, sin decir que ya está prendido para el cliente.

### Por Qué Importa

Los clientes no leen planes técnicos. El PDF de junio ya cubrió gráficos, atajos y horario. Desde entonces hubo un rediseño completo, varios bugs reales de caja (peso con coma, devoluciones que inflaban el cierre, montos recortados, menú roto en celular) y dos features de alto valor que **todavía no se anuncian como “ya está”**: catálogo e IA. Un solo PDF evita soporte repetido, comunica valor del abono y genera expectativa controlada para la próxima entrega.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | Changelog junio (8 págs). **Clonar CSS + componentes**, no el contenido. |
| `salidas/2026-06-18-novedades-clientes-cvalletienda.md` | Versión texto + mensaje WhatsApp. Replicar. |
| `salidas/cv-mitienda-actualizaciones-junio-2026.pdf` | PDF junio. **No sobrescribir.** |
| `referencia/plantilla-novedades-clientes.html` | Esqueleto con `@page` A4 y CSS print ya corregido (sin `min-height` anidado). |
| `scripts/generar-pdf-novedades.mjs` | Playwright + Edge/Chrome del sistema. Hoy hardcodea HTML/PDF de **junio** y espera 8 páginas. |
| Contacto canónico junio | WhatsApp `+54 299 658-7715`. Email en PDF junio: `santiagoalvarezc5@gmail.com`. Playbook redes: `santiagoalvarezz.dev@gmail.com`. |
| Branding PDF junio | **CV-MiTienda**, lime `#65a30d` / black `#0A0A0A`, Inter. |

### Inventario de contenido (fuente = planes Implementado jul–ago 2026)

**Regla:** el PDF de junio **no se repite**. Este es la secuela (julio + agosto). No inventar features. No nombrar tenants (Adonai), ni IDs, ni jerga (RLS, SSR, Playwright, Haiku).

#### A. NUEVO / MEJORA — incluir (lenguaje cliente)

| # | Área | Qué decir | Dónde | Fuente |
|---|------|-----------|-------|--------|
| 1 | **Cara nueva** | El sistema se ve más claro y rápido. Misma caja, mismos menús, lectura más fácil. | Todo el sistema | `2026-07-28-rediseno-uiux-completo-fable.md` |
| 2 | **Celular y tablet** | El menú en el teléfono ahora abre, navega y cierra bien. | Menú inferior / hamburguesa | `2026-08-11-fix-responsive-mobile-tablet.md` *(también es FIX — ver página correcciones)* |
| 3 | **Cobro en caja** | Los montos grandes ya no se cortan. Al cobrar se abre una pantalla grande para método, recibido y vuelto. Cliente / descuento / notas siguen en el panel. | POS → Cobrar (F2) | `2026-08-18-pos-modal-cobro-montos.md` *(FIX visual + mejora)* |
| 4 | **Cajero y caja** | El cajero puede registrar un ingreso o egreso del turno (ej. pagar mercadería). Corregir o borrar un movimiento: solo el dueño, con caja abierta. Se ve quién cargó cada movimiento. | Menú → Caja | `2026-08-11-cajero-registrar-movimientos-caja.md`, `2026-07-23-movimientos-caja-resumen-editar-eliminar.md` |
| 5 | **Plata por cuenta** | Tres números claros: **al momento** (ya está), **por acreditar** (MP/transferencia que todavía no entra), **proyectado**. | Inicio + Caja + al registrar un egreso | `2026-08-15-saldos-al-momento-cuentas.md` |
| 6 | **Fotos de producto** | Sacá la foto en el local o subí desde el celular. Se ve en el listado, en la grilla del POS y queda lista para el catálogo. | Productos → alta/edición | `2026-08-19-subida-imagenes-productos.md` |
| 7 | **Carga express (ropa)** | Una pantalla: modelo, precios y stock distinto por talle×color. También pegar texto tipo `1 rojo XS, 2 rojos M`. | Productos → Carga express *(solo rubro ropa)* | `2026-08-11-carga-express-productos-ropa.md` |
| 8 | **Stock ilimitado** | Productos de reposición constante (pan, bebidas, fiambre) se marcan como ∞: se venden sin tope y no descuentan unidades. | Productos / Stock *(despensa y carnicería)* | `2026-07-21-stock-infinito-menos-uno.md` |
| 9 | **Packs** | Si escaneás un código nuevo, podés asociarlo a un producto que ya existe. Al completar N unidades sueltas, el POS aplica solo el precio del pack. | Productos + POS *(rubros con pack)* | `2026-07-17-packs-asociar-codigo-precio-auto.md` |
| 10 | **Descuento por cantidad** | En el producto: “desde N unidades, X % off”. El POS lo aplica solo. | Productos → tramos | `2026-08-20-tramos-cantidad-pedidos-recibos.md` |
| 11 | **Contado / A cuenta** | En distribuidora: el POS pide Contado o A cuenta, recargo por producto, remito automático y saldo del cliente. | POS + Clientes *(rubro distribuidora)* | `2026-08-15-rubro-distribuidora-pedidos-cc.md` |
| 12 | **Recibo de cobro CC** | Cada seña o cobro de cuenta imprime un ticket 80 mm. El remito muestra Total / Pagado / Pendiente. | Clientes / Recibos CC / Remitos | `2026-08-20-tramos-cantidad-pedidos-recibos.md` |
| 13 | **Redondeo efectivo** | Vuelto en múltiplos de $100, visible y trazable (no “plata que desaparece”). Configurable por tienda. | POS + ticket | `2026-07-25-auditoria-redondeo-efectivo-100.md` |

#### B. FIX — página propia, badge visible

| # | Corrección (texto cliente) | No decir | Fuente |
|---|----------------------------|----------|--------|
| F1 | En venta por kilo/gramo, **la coma argentina funciona** (`1,350`). El total de pantalla coincide con el ticket. Códigos de balanza en gramos se interpretan bien. | `parseFloat`, Adonai, round2 | `2026-07-23-fix-venta-productos-por-peso.md` |
| F2 | **Cambio de producto y saldo a favor** ya no inflan el cierre de caja del turno. En ventas se entiende si se pagó con crédito. Preferí “Cambio de producto” cuando el cliente cambia talle/color. | Caso jean, IDs de tenant | `2026-07-02-auditoria-completa-devoluciones-caso-jean.md` |
| F3 | **Los importes grandes en cobro ya no se recortan** (ej. millones). | grid 5+3+3, overflow | `2026-08-18-pos-modal-cobro-montos.md` |
| F4 | **El menú en celular/tablet** dejaba de responder; ya navega. | z-index, overlay | `2026-08-11-fix-responsive-mobile-tablet.md` |
| F5 | **Tickets térmicos:** un solo “gracias”, sin caracteres raros, vale de cambio con texto corto. Si PrintBridge lo pide, actualizar el programita de impresión. | UTF-8, PC437, v3.1.5 | `2026-07-20-printbridge-version-final-textos-tickets.md` + `2026-07-19-printbridge-v311-analisis-fix-regresiones.md` |
| F6 | **Un remito, no dos** al confirmar un pedido a cuenta/envío (piloto distribuidora / catálogo interno). | `convertirPedidoAVenta`, remitoAutoVenta | `2026-08-20-tramos-cantidad-pedidos-recibos.md` |
| F7 | **Saldos de cuentas** ahora restan comisión y distinguen “ya está” vs “por acreditar”. | trigger `monto` vs `monto_neto` | `2026-08-15-saldos-al-momento-cuentas.md` |

#### C. PRÓXIMAMENTE — anuncios (pedido explícito del usuario)

Aunque el código de catálogo y cajero hablado esté en el repo, **el PDF los trata como no disponibles aún para todos**. No poner “Dónde: Menú → …” como si ya lo vieran.

| # | Anuncio | Pitch (vender valor, sin overpromise técnico) |
|---|---------|-----------------------------------------------|
| P1 | **Catálogo público — próxima actualización, para todos** | Link con el nombre del local. El cliente ve fotos y precios, arma el pedido (retiro o envío) y te llega por WhatsApp **y** al inbox del sistema. El stock se mueve cuando confirmás, no cuando te escriben. Cada producto se marca a mano para que no se filtre lo que no querés mostrar. |
| P2 | **Inteligencia artificial en caja — pronto** | No es un chatbot de preguntas: es un **cajero que te escucha**. Mantenés un botón (o F10), le hablás como en el mostrador: *“cobrame 3 Coca de 3 litros, 359 gramos de paleta y un aceite, me dieron 20 mil”*. El sistema arma la venta, te dice total y vuelto **en voz**, y recién cobra cuando confirmás. También: dar de alta un producto y cambiar un precio, hablando. Confirmación siempre obligatoria. Diferencial de producto: la caja deja de ser solo teclado/scanner. |

**Límites honestos de P2 (en el PDF, una línea chica, no un descargo técnico):** v1 cubre venta de contado, alta de producto y cambio de precio. No promete “hace todo el negocio solo” (no stock físico, no rutas, no AFIP, no armar el catálogo entero). El titular vende **el 80 % del mostrador sin tipear**.

#### D. Excluir del PDF

| Ítem | Por qué |
|------|---------|
| Gráficos, atajos POS, horario Argentina, lista `/precios`, variantes 3 capas | Ya salieron en el PDF de junio |
| Superadmin / `acceso_hasta` / pantalla de vencido | Operación interna CValle, no del comercio |
| Landing, legales, `/presentacion`, PDF comercial, Instagram | Marketing nuestro, no changelog del sistema que usan |
| Análisis / planes en borrador | No está en producción para el cliente |
| Precios CValle ($45k, onboarding) | El brochure/presentación ya lo cubre |
| Nombres de tenants, emails de clientes, IDs | Confidencial |
| Decir que el catálogo o la IA “ya están prendidos” | Pedido del usuario: próxima actualización / pronto |

### Brechas o Problemas que se Abordan

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | No hay changelog post-junio | Clientes no descubren fotos, cobro modal, carga express, CC |
| B2 | Fixes de caja (peso, devoluciones, menú) no se comunicaron | Sigue la sensación de “el sistema falla” aunque ya está corregido |
| B3 | Catálogo e IA no se pueden vender como “ya está” pero sí como expectativa | PDF con sección Próximamente evita soporte (“¿dónde está el catálogo?”) y genera anticipación |
| B4 | El script de PDF está atado a junio | Hay que parametrizarlo para no pisar el PDF viejo |

---

## Cambios Propuestos

### Resumen de Cambios

- Crear HTML A4 de **9 páginas** (portada → 5 de contenido vivo → 1 de fixes → 2 de próximamente → cierre).
- Crear markdown espejo + mensaje WhatsApp.
- Parametrizar `scripts/generar-pdf-novedades.mjs` (`--html`, `--out`, `--pages`) **sin romper** la regeneración de junio.
- Generar `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf`.
- Actualizar `referencia/plantilla-novedades-clientes.html` con badges NUEVO / FIX / PRÓXIMAMENTE.
- **No tocar `app/`.** Doc estático en `salidas/`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-08-21-novedades-clientes-cvalletienda.html` | Documento imprimible (fuente del PDF) |
| `salidas/2026-08-21-novedades-clientes-cvalletienda.md` | Mismo contenido + mensaje WhatsApp + cómo generar el PDF |
| `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf` | Entregable para enviar (generado por el script) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `scripts/generar-pdf-novedades.mjs` | CLI: `--html`, `--out`, `--pages`. Default = junio (8 págs) para no romper el flujo viejo. Documentar comando agosto en el header. |
| `referencia/plantilla-novedades-clientes.html` | Badges `.eyebrow.fix` y `.eyebrow.soon`; nota de uso “duplicar para YYYY-MM”. |
| `contexto/info-negocio.md` | Una línea: changelog clientes ago 2026 en `salidas/`. |
| Este plan | Al implementar: **Estado: Implementado** + Notas de Implementación. |

### Archivos a Eliminar (si aplica)

Ninguno. No borrar el PDF/HTML de junio.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Secuela de junio, no “todo el historial desde abril”:** “hasta hoy” = lo nuevo desde el último PDF enviado. Un PDF de 20 páginas no se lee. Portada aclara “Julio y agosto 2026”.

2. **HTML + script Playwright (no librería en la app):** mismo pipeline que el fix de junio. CSS print ya aprendido: una `.page` = una hoja; sin `min-height` anidado; `@page { size: A4; margin: 0 }`.

3. **9 páginas fijas:** suficiente para vender IA en página propia y no mezclar “ya está” con “próximo”. Conteo validado por el script (`--pages 9`).

4. **Badges en cada bloque:** `NUEVO` (lime), `MEJORA` (gris), `CORREGIDO` (ámbar `#b45309` / fondo `#fffbeb`), `PRÓXIMAMENTE` (negro). La página 6 es 100 % correcciones.

5. **Catálogo e IA = próximamente:** aunque estén implementados en código. Evita “¿cómo lo prendo?” antes del rollout. El catálogo se anuncia **para todos en la próxima actualización**. La IA se vende como el salto de producto.

6. **Pitch de IA sin mentir el alcance:** titular ambicioso (“hablale a la caja y cobra”), ejemplo de frase real del plan `2026-08-21-cajero-hablado.md`, confirmación obligatoria, y una línea de qué **no** hace v1.

7. **Audiencia dueño + cajero:** vos/tú rioplatense, oraciones cortas, “Dónde: Menú → …”. Rubro-específico se marca *“Si tu negocio es ropa / despensa / distribuidora”*.

8. **Branding:** **CV-MiTienda** como en junio (lo que ven en login). No mezclar pricing.

9. **Capturas:** placeholders con comentario `<!-- CAPTURA: ... -->`. Sin texto visible `CAPTURA:`. Screenshots opcionales post-HTML si Santiago los pega en `salidas/capturas/`.

10. **Contacto:** WhatsApp `+54 299 658-7715`. Email: **el mismo que junio** (`santiagoalvarezc5@gmail.com`) salvo que en implementación se confirme el de redes.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Un solo PDF “todo 2026” incluyendo junio | Duplica lo ya enviado; 15+ páginas |
| Página `/novedades` en la app | Scope extra; el pedido es un PDF para enviar |
| Anunciar catálogo e IA como ya disponibles | El usuario pidió explícitamente “próxima actualización” / “pronto” |
| Prometer “la IA hace todo el negocio sola” | Falso para v1; rompe confianza al activarlo |
| Puppeteer dentro de `app/` | Deps de producción innecesarias |
| Incluir pricing / brochure | Ya existe `salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf` |

### Preguntas Abiertas (si las hay)

1. **Email de pie:** ¿`santiagoalvarezc5@gmail.com` (PDF junio) o `santiagoalvarezz.dev@gmail.com` (playbook redes)? **Default al implementar:** el de junio, para no cambiar el canal que ya conocen.
2. **¿Pegar capturas reales antes de enviar?** El plan genera placeholders. Santiago puede pegar 2–3 (POS cobro, fotos producto, Inicio saldos) en `salidas/capturas/` y regenerar.
3. **¿Mencionar PrintBridge “actualizá el programita”?** Recomendado sí, en una viñeta de F5, sin número de versión técnico. Si ningún cliente imprime con el agente, se puede bajar a una línea.
4. **¿Página 5 (CC / tramos / distribuidora) para todos?** Recomendado sí, con frases “si tu rubro es…”. Los tramos sirven también a ropa/mayorista chico.

Si no hay respuesta al implementar, usar los defaults de arriba.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Redactar el markdown (contenido final, para revisar)

Crear `salidas/2026-08-21-novedades-clientes-cvalletienda.md` con el outline de 9 páginas (copy cerrado abajo). Español rioplatense. Una viñeta = beneficio + dónde.

**Estructura de páginas:**

| Pág | Título | Badge dominante |
|-----|--------|-----------------|
| 1 | Portada | — |
| 2 | Una cara nueva, también en el celular | NUEVO + CORREGIDO |
| 3 | Caja y cobro: montos, cajero, saldos | NUEVO / MEJORA |
| 4 | Productos: fotos, carga rápida, stock y packs | NUEVO |
| 5 | Cantidad, cuenta corriente y recibos | NUEVO *(con “si tu rubro…”)* |
| 6 | Lo que corregimos | CORREGIDO |
| 7 | Próxima actualización: catálogo para todos | PRÓXIMAMENTE |
| 8 | Pronto: inteligencia artificial en tu caja | PRÓXIMAMENTE |
| 9 | Cierre y contacto | — |

**Copy cerrado — Portada (pág. 1)**

- Tag: `Actualización julio · agosto 2026`
- Título: `Lo nuevo en tu sistema`
- Sub: `Mejoras, correcciones y lo que se viene.`
- 4 highlights:
  1. Cara nueva + caja que se entiende (montos, saldos, el cajero carga un egreso)
  2. Fotos, carga express (ropa) y descuentos por cantidad
  3. Correcciones de peso, devoluciones, menú en el celular y tickets
  4. Se viene: **catálogo para todos** y **caja con inteligencia artificial**
- Pie: `CV-MiTienda · Para imprimir o guardar en el teléfono`

**Copy cerrado — pág. 2 (cara nueva)**

- Eyebrow `Nuevo`
- H2: `Se ve distinto. Es el mismo sistema, más claro.`
- Lead: pantallas más simples, números más legibles, mismos menús.
- Dónde: todo el sistema (no hay que “activar” nada).
- Viñetas: Inicio más limpio; POS y caja con más aire; celular y tablet usables.
- Tip: si algo “no está donde era”, es el mismo ítem con otro diseño — el menú no cambió de nombre.
- Caja pequeña `Corregido`: el menú del teléfono que no navegaba **ya está arreglado**.

**Copy cerrado — pág. 3 (caja y cobro)**

- H2: `Cobrar y ver la plata, sin adivinar`
- Dónde: `POS` y `Menú → Caja` / `Inicio`
- Viñetas:
  - Al tocar Cobrar se abre una **pantalla grande** de montos (método, recibido, vuelto). Cliente, descuento y notas siguen al costado.
  - El cajero puede **anotar un ingreso o un egreso** del turno (pagar al proveedor). Editar o borrar: solo el dueño, con la caja abierta.
  - En Inicio y Caja: **saldo al momento**, **por acreditar**, **proyectado**.
  - Redondeo de efectivo a $100 visible en el ticket (si lo tenés activo).
- Tip: “Por acreditar” es Mercado Pago / transferencia que todavía no impactó. El número grande es lo que ya debería estar.

**Copy cerrado — pág. 4 (productos)**

- H2: `Productos: foto, carga rápida y stock que no frena`
- Viñetas:
  - **Fotos:** cámara o archivo, no hace falta pegar un link. Se ven en productos y en la grilla de caja.
  - **Ropa — Carga express:** `Productos → Carga express`. Stock distinto por talle y color en una pantalla. Pegá `1 rojo XS, 2 rojos M`.
  - **Despensa / carnicería — stock ilimitado:** marcá ∞ en lo que reponés siempre; se vende sin tope y no descuenta unidades.
  - **Packs:** código nuevo → asociar al producto que ya existe. N latas sueltas = precio del pack solo.
- Tip: la foto que subas hoy es la que va a verse en el catálogo cuando se active.

**Copy cerrado — pág. 5 (tramos / CC)**

- H2: `Mayorista, fiado y un papel para cada cobro`
- Viñetas:
  - **Tramos:** en el producto, “desde 6 unidades, 10 %”. El POS aplica el descuento solo. Si no cargás tramos, el precio no cambia.
  - **Distribuidora:** Contado o A cuenta en el POS, recargo de cuenta por producto, remito solo, saldo en la ficha del cliente.
  - **Recibo de cobro:** cada seña o pago a cuenta imprime ticket. El remito muestra Total / Pagado / Pendiente.
- Tip: si tu tienda no es distribuidora, los tramos igual sirven para “llevate 3 y te hago precio”.

**Copy cerrado — pág. 6 (fixes)** — título `Lo que corregimos`. Intro de 2 líneas: bugs reales de caja y pantalla, ya en el sistema. Lista con badge `Corregido` por ítem (F1–F7 de la tabla B). Sin culpar al usuario. Cerrar con: *Si viste alguno de estos problemas, actualizá la página (o reabrí el sistema) y ya no debería pasar.*

**Copy cerrado — pág. 7 (catálogo)**

- Eyebrow `Próximamente · próxima actualización`
- H2: `Tu vidriera en un link — para todos`
- Lead: en la **próxima actualización** cada comercio va a poder compartir un catálogo con el nombre del local. No hace falta que el cliente se registre ni pague online.
- Viñetas de valor (futuro, verbo en futuro):
  - Link tipo el nombre de tu negocio, para Instagram / WhatsApp / estado.
  - Fotos y precios; el cliente arma el pedido (retiro o envío).
  - Te llega el WhatsApp **y** el pedido entra al sistema (campana + lista).
  - Vos elegís **qué** productos se muestran (nada se publica solo).
  - El stock se descuenta cuando **confirmás** el pedido, no cuando te escriben.
- Tip: ir subiendo fotos ahora (pág. 4) para que el día 1 el catálogo no esté vacío.
- **No** poner ruta de menú como si ya existiera para el lector.

**Copy cerrado — pág. 8 (IA)** — página “vender”

- Fondo: portada invertida o bloque hero negro + lime (como cover, pero no full-bleed obligatorio si desborda; preferir `.page` blanca con **banda negra** superior ~40 mm).
- Eyebrow `Próximamente`
- H2: `Hablale a la caja. La inteligencia artificial cobra por vos.`
- Lead (tono venta, 3 oraciones máx.): Pronto CV-MiTienda deja de ser solo teclado y scanner. Le hablás como le hablás al cajero, y el sistema arma la venta, te dice el total y el vuelto **en voz**, y cobra cuando vos decís que sí.
- Ejemplo en caja tipográfica (frase real):

  > “Cobrame 3 Coca de 3 litros, 359 gramos de paleta y un aceite de girasol, me dieron 20 mil.”

- Tres pilares:
  1. **Vender** varios ítems en una frase, con vuelto.
  2. **Cargar** un producto nuevo hablando (nombre, costo, venta, código).
  3. **Cambiar un precio** sin entrar a editar ficha.
- Garantía de control: *Nada se registra hasta que confirmás (voz o un toque).* Si hay dos “Coca”, pregunta cuál — no adivina.
- Línea chica de honestidad: *La primera versión cubre el mostrador del día a día: vender de contado, dar de alta y ajustar precio. El resto del sistema sigue como lo conocés.*
- Cierre de venta: *Va a estar incluido en tu sistema. Te avisamos cuando se active.* (No inventar recargo ni “add-on”.)

**Copy cerrado — pág. 9 (cierre)**

- H2: `Seguimos del lado de tu caja`
- Párrafo: este PDF cubre julio y agosto. El de junio (gráficos, atajos, horario) sigue valiendo.
- Recuadro: próxima entrega = **catálogo para todos** + **IA en caja**.
- Contacto: WhatsApp + email (decisión 10 / pregunta 1).
- Mensaje WhatsApp sugerido (apéndice del MD, no en el PDF):

```
Hola! Te paso el resumen de lo nuevo en CV-MiTienda (julio y agosto): caja, productos, correcciones, y lo que se viene (catálogo + inteligencia artificial en caja). Cualquier duda, escribime.
```

**Acciones:**

- Escribir el `.md` completo con las 9 páginas + apéndice de envío + comando del script.
- Releer contra las tablas A/B/C: nada de junio, nada de “ya está” en catálogo/IA.

**Archivos afectados:**

- `salidas/2026-08-21-novedades-clientes-cvalletienda.md`

---

### Paso 2: HTML imprimible (clonar CSS de junio, contenido de agosto)

**Base CSS:** copiar de `salidas/2026-06-18-novedades-clientes-cvalletienda.html` los bloques ya corregidos (`@page`, `.page` 210 mm, `.page-inner` **sin** `min-height: 297mm`, `@media print` con `height: 297mm` + `overflow: hidden`, `@media screen` con sombra).

**Agregar clases:**

```css
.eyebrow.fix {
  color: #b45309;
  background: #fffbeb;
}
.eyebrow.soon {
  color: #fff;
  background: var(--black);
}
.fix-item {
  border: 1px solid var(--gray3);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  page-break-inside: avoid;
}
.fix-item strong { display: block; margin-bottom: 2px; }
.quote-box {
  font-size: 13pt;
  font-weight: 700;
  background: var(--gray1);
  border-left: 3px solid var(--lime-b);
  padding: 12px 14px;
  margin: 14px 0;
}
.soon-band {
  background: var(--black);
  color: #fff;
  padding: 10mm 16mm 8mm;
}
.soon-band h2 { color: #fff; }
.pillars { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.pillar { background: var(--gray1); border-radius: 10px; padding: 10px; font-size: 10pt; }
```

**Reglas anti-overflow (lección junio):**

- Máximo **1** screenshot por página, `max-height: 50mm` en print.
- `.tip-box { margin-top: 12px; }` en print (no `margin-top: auto` que empuja fuera).
- Página 6: 7 ítems compactos (título + 1 línea), no párrafos largos.
- Página 8: banda negra + resto blanco; no anidar otro `min-height: 297mm`.
- Cero texto visible `CAPTURA:`.

**9 secciones `<section class="page">`:** cover + 8 `page-inner` (págs 2–9). `page:last-child` sin break.

**Acciones:**

- Crear el HTML ~350–500 líneas.
- Preview en Chrome: cada `.page` = 1 hoja en pantalla.

**Archivos afectados:**

- `salidas/2026-08-21-novedades-clientes-cvalletienda.html`

---

### Paso 3: Parametrizar el script de PDF

En `scripts/generar-pdf-novedades.mjs`:

- Parsear `process.argv`: `--html <ruta relativa al repo>`, `--out <ruta>`, `--pages <n>`.
- **Defaults** (compat junio):

  - html: `salidas/2026-06-18-novedades-clientes-cvalletienda.html`
  - out: `salidas/cv-mitienda-actualizaciones-junio-2026.pdf`
  - pages: `8`

- Mantener `pathToFileURL`, `document.fonts.ready`, `channel: msedge → chrome → chromium`, `printBackground`, `preferCSSPageSize`, `margin 0`.
- Seguir fallando (exit 1) si el conteo de páginas ≠ `--pages`.
- Actualizar el comentario de cabecera con **los dos comandos**.

Comando agosto (el de este plan):

```bash
node scripts/generar-pdf-novedades.mjs --html salidas/2026-08-21-novedades-clientes-cvalletienda.html --out salidas/cv-mitienda-actualizaciones-agosto-2026.pdf --pages 9
```

**Archivos afectados:**

- `scripts/generar-pdf-novedades.mjs`

---

### Paso 4: Plantilla reutilizable

Actualizar `referencia/plantilla-novedades-clientes.html`:

- Comentario de secciones: Portada, contenido, **Correcciones**, **Próximamente**, Cierre.
- Incluir CSS de `.eyebrow.fix` / `.eyebrow.soon` / `.fix-item` / `.quote-box`.
- Recordar: no anidar `min-height: 297mm`.

**Archivos afectados:**

- `referencia/plantilla-novedades-clientes.html`

---

### Paso 5: Generar PDF y validar páginas

**Acciones:**

1. Desde la raíz del repo: comando del Paso 3 (agosto, 9 páginas).
2. Si Playwright no está: `npm install playwright` (solo paquete npm; browsers = Edge/Chrome del sistema).
3. Abrir el PDF: **exactamente 9 páginas**, lime visible, portada full-bleed negra, pág. 8 con banda IA, contacto en la 9.
4. Fallback Ctrl+P documentado en el MD (márgenes Ninguno, escala 100 %, sin encabezados, gráficos de fondo).
5. Hojeada en “móvil”: cuerpo ≥ 11 pt.

**Checklist de contenido (obligatorio):**

- [ ] Nada de gráficos/atajos/horario de junio como novedad
- [ ] Fixes en página propia con badge Corregido
- [ ] Catálogo en futuro + “para todos en la próxima actualización”
- [ ] IA vendida (frase de ejemplo, confirmación, 3 pilares) **sin** “ya está en el menú”
- [ ] IA no promete AFIP / stock / “hace todo el negocio”
- [ ] Sin Adonai, sin pricing, sin Denisee
- [ ] WhatsApp de soporte en página 9

**Archivos afectados:**

- `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf`

---

### Paso 6: Contexto + estado del plan

**Acciones:**

- En `contexto/info-negocio.md`, al final de Productos/Módulos o Contexto clave, una línea: changelog clientes ago 2026 = `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf` (HTML fuente `salidas/2026-08-21-novedades-clientes-cvalletienda.html`).
- **No** hace falta tocar `CLAUDE.md` (no hay comando nuevo ni cambio de estructura del workspace).
- Este archivo: `**Estado:** Implementado` y sección **Notas de Implementación** (comando usado, páginas reales, email elegido, si hubo capturas).

**Archivos afectados:**

- `contexto/info-negocio.md`
- `planes/2026-08-21-pdf-novedades-clientes-agosto.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `salidas/2026-06-18-novedades-clientes-cvalletienda.html` | CSS y tono |
| `scripts/generar-pdf-novedades.mjs` | Generación PDF |
| `planes/2026-06-08-fix-pdf-novedades-generacion.md` | Lecciones print (no repetir el bug de 17 páginas) |
| `planes/2026-08-21-cajero-hablado.md` | Fuente factual del pitch IA (alcance v1) |
| `referencia/catalogo-publico.md` | Fuente factual del pitch catálogo (activar, opt-in, stock al confirmar) |
| `referencia/redes-sociales.md` | WhatsApp canónico |

### Actualizaciones Necesarias para Consistencia

- Plantilla de novedades con badges FIX / PRÓXIMAMENTE.
- `contexto/info-negocio.md` con puntero al PDF nuevo.
- CLAUDE.md: **sin cambios** (el flujo `/crear-plan` → `salidas/` ya existe).

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Envío WhatsApp a clientes | Nuevo adjunto agosto; el de junio sigue para quien no lo tenga |
| Regenerar PDF junio | Sigue `node scripts/generar-pdf-novedades.mjs` sin args |
| App Next.js | Ninguno |
| Rollout real de catálogo / IA | El PDF **no** sustituye el aviso de activación el día del deploy |

---

## Lista de Validación

- [ ] Existe `salidas/2026-08-21-novedades-clientes-cvalletienda.html` (9 secciones `.page`)
- [ ] Existe `salidas/2026-08-21-novedades-clientes-cvalletienda.md` con el mismo contenido + WhatsApp
- [ ] Script acepta `--html` `--out` `--pages` y **sigue** generando el PDF de junio sin args
- [ ] `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf` tiene **exactamente 9 páginas**
- [ ] Colores lime/black con `printBackground`
- [ ] Página 6 = solo correcciones (F1–F7)
- [ ] Páginas 7–8 = futuro (catálogo para todos + IA)
- [ ] Sin `min-height` anidado, sin texto `CAPTURA:` visible
- [ ] Sin contradicción con el comportamiento que el cliente **ya** tiene (no vender catálogo/IA como menú actual)
- [ ] `contexto/info-negocio.md` actualizado
- [ ] Este plan en estado Implementado

---

## Criterios de Éxito

1. Un cliente entiende en **menos de 5 minutos** qué hay de nuevo, qué se arregló, y qué **todavía no** tiene que buscar en el menú.
2. Santiago puede **regenerar el PDF con un comando** después de editar el HTML.
3. El documento **no afirma** que el catálogo o la IA ya están prendidos para todos.
4. El pitch de IA genera ganas (“quiero eso”) y el alcance v1 cabe en una línea, sin quedar como humo.
5. El PDF de junio **sigue intacto** en `salidas/`.

---

## Notas

### Mapa visual de badges (impresión)

| Badge | Uso |
|-------|-----|
| NUEVO | Features que el cliente ya puede usar |
| MEJORA | Lo que ya existía y ahora se entiende mejor (saldos, redondeo) |
| CORREGIDO | Bugs |
| PRÓXIMAMENTE | Catálogo (próxima actualización, todos) · IA (pronto) |

### Relación con el cajero hablado

El plan técnico `planes/2026-08-21-cajero-hablado.md` está **Implementado en código**. Este PDF **no** es el release note de activación. Cuando se prenda en producción (API key + aviso), se puede mandar un PDF corto de 2 páginas o un WhatsApp; no reabrir este de 9.

### Relación con el catálogo

Idem: `referencia/catalogo-publico.md` describe el producto real. El día del rollout masivo, el mensaje es “ya está: Configuración → Catálogo” — distinto de este PDF.

### Ejecutar implementación

```
/implementar planes/2026-08-21-pdf-novedades-clientes-agosto.md
```

---

## Notas de Implementación

**Implementado:** 2026-08-21

### Resumen

- Markdown + HTML A4 de 9 páginas en `salidas/2026-08-21-novedades-clientes-*`.
- Script `scripts/generar-pdf-novedades.mjs` con `--html` `--out` `--pages`; defaults siguen siendo junio.
- PDF: `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf` — **9 páginas**, 583 KB, Edge.
- Plantilla `referencia/plantilla-novedades-clientes.html` con badges FIX / PRÓXIMAMENTE.
- `contexto/info-negocio.md` apunta al changelog ago 2026.
- Email de pie: `santiagoalvarezc5@gmail.com` (default junio). Capturas: placeholders. PrintBridge: una viñeta en correcciones.

### Desviaciones del Plan

- Página 8 (IA): `.page-inner` con `height: auto` debajo de `.soon-band` para que banda + copy no peleen por `height: 100%`. La hoja sigue `overflow: hidden` + 297 mm en print.
- `min-height: 297mm` solo en `@media screen` (preview), igual que junio.

### Problemas Encontrados

Ninguno. Playwright ya estaba disponible; el script usó canal `msedge`.
