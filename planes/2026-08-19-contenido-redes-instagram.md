# Plan: Sistema de contenido para redes + primer post Instagram

**Creado:** 2026-08-19
**Estado:** Borrador
**Pedido:** Generar contenido de redes (empezando por una foto de Instagram) que capte visualizaciones y atraiga clientes nuevos para CValleTienda.

---

## Descripción General

### Qué Logra Este Plan

Arma un **sistema repetible** para producir piezas de Instagram (imagen feed 4:5, Stories, copy y CTA a WhatsApp) alineadas a la marca lime/negro y al pitch comercial local. En la misma implementación entrega el **Pack 01 listo para publicar**: una foto/pieza de feed, una Stories companion, caption + hashtags + primer comentario, y un guion de Reel (el formato que realmente mueve alcance).

No toca la app Next.js. Todo vive en `referencia/`, `.claude/commands/` y `salidas/redes/`.

### Por Qué Importa

La prioridad estratégica es **conseguir los primeros clientes pagos** en Cinco Saltos / Alto Valle. Hoy hay PDF comercial, pitch `/presentacion` y mensajes de WhatsApp, pero **cero presencia visual en redes**. Un post suelto no alcanza: hace falta un playbook (qué decir, a quién, cómo se ve, a dónde mandar el clic) para que cada pieza futura se genere en minutos con `/contenido-redes` en vez de improvisar.

---

## Estado Actual

### Estructura Existente Relevante

| Recurso | Rol |
|---------|-----|
| `contexto/info-negocio.md` | Tagline, mercado (comercios minoristas, Cinco Saltos/RN), producto POS/CRM |
| `contexto/estrategia.md` | Clientes locales, Plan Pro $45.000/mes + onboarding $120.000, flujo visita → pitch → demo |
| `contexto/info-personal.md` | Santiago = founder único: producto + ventas |
| `contexto/datos-actuales.md` | 0 clientes / 0 MRR — el contenido no puede apoyar social proof falso |
| `salidas/2026-08-08-pitch-visita-brief.md` | WhatsApp 299 658-7715, CTA demo |
| `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` | Dolor real: caja, stock, ganancia del mes — **tono a copiar** |
| `app/components/pitch/pitch-content.ts` | 16 puntos de valor + precios vigentes |
| `referencia/design-system-v2.md` | Tokens: `#0a0a09`, `#65a30d`, `#84cc16`, `#fafaf9` |
| `salidas/logo-cloudvalle.png` | Logo |
| `salidas/capturas/*.png` | Screenshots reales (POS, caja, gráficos) — prueba visual, no stock art |
| `salidas/2026-06-23-analisis-competencia-pricing-mercado.md` | Bepos, MiPOS, Autogestión — no copiar; diferenciar operación de mostrador |
| `.claude/commands/{iniciar,crear-plan,implementar}.md` | Patrón de comandos a seguir |
| Skill `canvas-design` | Generación de piezas PNG de alto craft |
| Skill `competitive-ads-extractor` | Inspiración de ads (no plagio) |

### Brechas o Problemas que se Abordan

1. **No hay contenido de redes** ni carpeta `salidas/redes/`.
2. **No hay playbook**: qué hook, qué formato, qué CTA, qué no decir (precios, clientes inventados).
3. **El alcance orgánico de una foto estática es bajo** en Instagram 2026; sin sistema (Reels + Stories + bio → WhatsApp) la foto queda como “marca bonita” sin captura de leads.
4. Las piezas comerciales actuales (PDF A4, pitch 16 slides) **no caben** en un feed 4:5: hay que traducir dolor → imagen → un CTA.
5. Riesgo de generar arte abstracto (skill canvas-design en modo “museo”) que no se lee en 1 segundo en el celular. El plan **fuerza conversión primero, craft segundo**.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear playbook de contenido en `referencia/redes-sociales.md` (audiencia, pilares, formatos, reglas, funnel).
- Crear comando `/contenido-redes` para generar packs futuros.
- Crear carpeta `salidas/redes/` y el **Pack 01** (feed + stories + copy + guion Reel).
- Generar la **foto/pieza Instagram 1080×1350** (hook de caja) usando HTML a tamaño exacto + captura, o GenerateImage si el HTML no llega a calidad de feed.
- Actualizar `CLAUDE.md` (nuevo comando) y `contexto/estrategia.md` (pieza de adquisición).
- **No** modificar código de `app/`.
- **No** publicar automáticamente (Santiago sube a mano).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `referencia/redes-sociales.md` | Playbook: audiencia, 4 pilares, formatos, copy, CTA, hashtags, lo prohibido |
| `.claude/commands/contenido-redes.md` | Comando `/contenido-redes [pilar o brief]` — genera un pack nuevo |
| `salidas/redes/README.md` | Índice de packs y cómo publicar |
| `salidas/redes/2026-08-19-pack-01-caja/` | Pack 01 completo |
| `salidas/redes/2026-08-19-pack-01-caja/brief.md` | Concepto, hook, visual, CTA |
| `salidas/redes/2026-08-19-pack-01-caja/feed-1080x1350.html` | Arte feed 4:5 (exportable) |
| `salidas/redes/2026-08-19-pack-01-caja/feed-1080x1350.png` | **La foto de Instagram** lista para subir |
| `salidas/redes/2026-08-19-pack-01-caja/story-1080x1920.html` | Variante Stories 9:16 |
| `salidas/redes/2026-08-19-pack-01-caja/story-1080x1920.png` | PNG Stories |
| `salidas/redes/2026-08-19-pack-01-caja/copy.md` | Caption, primer comentario, hashtags, texto del sticker de Stories, mensaje WA |
| `salidas/redes/2026-08-19-pack-01-caja/reel-guion-15s.md` | Guion de Reel (voz + texto en pantalla) para filmar en el local o en la demo |
| `salidas/redes/_plantilla-pack/` | HTML plantilla feed + stories para packs siguientes |
| `salidas/redes/filosofia-visual-redes.md` | Filosofía visual corta (canvas-design) para no caer en arte abstracto ni en plantilla fea |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `CLAUDE.md` | Listar `/contenido-redes` en Comandos; una línea en Estructura (`salidas/redes/`) |
| `contexto/estrategia.md` | Anotar canal Instagram → WhatsApp como palanca de adquisición local |
| `.claude/commands/iniciar.md` | No obligatorio; el comando nuevo se descubre vía CLAUDE.md |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Funnel único: Instagram → WhatsApp (no registro web).** El motion comercial vigente es visita + demo. El CTA de bio, Stories y caption es “Escribime por WhatsApp para una demo en tu local”. Link `wa.me/5492996587715`. No mandar a `/login` ni poner precios en la imagen.

2. **Audiencia: dueño/a de comercio físico, no consumidor final.** Rubros foco: ropa y despensa/kiosco (tier 1). Geo: Cinco Saltos, Allen, Cipolletti, General Roca, Neuquén capital (Alto Valle). Tono: vos/tu, oraciones cortas, mismo registro que el mensaje a Denisee. Cero jerga (SaaS, multi-tenant, RLS).

3. **Foto de feed 4:5 (1080×1350), no 1:1.** Ocupa más pantalla en el feed. Stories 9:16 (1080×1920) como companion del mismo concepto. Reels (guion, no video renderizado) porque **el alcance orgánico vive ahí**; la foto construye marca y sirve de ancla en el perfil.

4. **Hook Pack 01 cerrado: “¿Cerrás la caja y no te da?”** Dolor #1 validado en outreach. Subline: “Sabé si el día cerró — y si el mes dejó plata de verdad.” Prueba visual: recorte de `salidas/capturas/caja-preview-cierre.png` o `inicio-turnos.png`, no ilustración genérica de “tienda”. Marca: CValleTienda. Ubicación chica: Cinco Saltos · Río Negro. CTA en imagen: `Demo en tu local`.

5. **Cero social proof inventado.** Con 0 clientes no se dice “+100 comercios” ni se fabrican testimonios. Se vende el dolor + la pantalla real del producto.

6. **Sin precios en orgánicos de awareness.** Igual que el primer WhatsApp a Denisee. Precio ($45k / $120k) recién en visita, PDF o `/presentacion`.

7. **Producción: HTML a tamaño exacto + PNG.** Más control de marca, tipografía y screenshot que un generador de imagen libre. Fuentes: Inter o las de `canvas-fonts` (Outfit / Instrument Sans). Colores exactos del design system. Si el PNG sale “plantilla PowerPoint”, segundo pase con skill `canvas-design` + GenerateImage **usando el mismo hook y los mismos tokens**, no arte abstracto.

8. **4 pilares de contenido (rotar, no inventar cada vez):**
   - **Dolor** — caja, stock, “vendí mucho pero no sé si gané”
   - **Prueba** — screenshot de una pantalla que resuelve ese dolor
   - **Oficio local** — “sistema para tu local”, Alto Valle, visita en el mostrador
   - **Educación** — 1 tip operativo (ej. “el cierre de caja no es lo que cobraste”)

9. **Hashtags cortos y locales, no 30 genéricos.** Máx. 8–12. Ej.: `#CincoSaltos` `#AltoValle` `#RioNegro` `#ComerciosArgentinos` `#ControlDeCaja` `#Stock` `#Indumentaria` `#POS`. El alcance real viene de Reels + shares de dueños, no de hashtag stuffing.

10. **Frecuencia inicial (recomendación, no software):** 3 piezas/semana = 1 Reel + 1 feed + Stories diarias del mismo concepto. Pack 01 cubre la **primera semana** (1 feed + 1 story + 1 guion). El comando genera los siguientes.

### Alternativas Consideradas

| Enfoque | Por qué se rechazó |
|---------|-------------------|
| Solo una imagen suelta, sin sistema | No escala; la próxima sesión vuelve a improvisar |
| Carrusel de 8 slides con features | Demasiado “brochure”; el primer swipe tiene que ser un dolor, no un inventario |
| Publicar precios en la foto | Quema el lead antes de la visita; contradice el playbook Denisee |
| Arte canvas-design 90% abstracto | Bonito, ilegible en 1s, no captura dueños de kiosco |
| CTA a registro / landing | El cierre es presencial; WhatsApp es el canal que ya usa Santiago |
| TikTok / LinkedIn primero | El dueño de tienda local está en Instagram + WhatsApp; LinkedIn B2B no es el ICP |
| Ads pagos Meta en este plan | Primero pieza orgánica + bio + WhatsApp. Ads = fase 2 cuando haya creatividades testeadas |

### Preguntas Abiertas (si las hay)

No bloquean la implementación: el plan asume defaults. Santiago puede corregir en el “OK”:

1. **¿Existe ya una cuenta de Instagram?** Default: no hay handle documentado; el copy usa “CValleTienda” y el WA. Si hay @, se pone en bio y en el playbook.
2. **¿El primer hook es caja u otro?** Default: caja. Alternativas listas: stock (“Tu stock no se avisa solo”) o ganancia del mes.
3. **¿Incluir precio en la imagen?** Default: no.
4. **¿Generar 1 pieza o un pack de 3 feeds?** Default: 1 concepto (feed + story + reel script) para no diluir; el comando sirve para el resto.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Playbook de redes

Escribir `referencia/redes-sociales.md` completo (no placeholder). Debe incluir exactamente estas secciones:

1. **Objetivo:** leads de demo por WhatsApp, no vanity metrics. KPI de pack: (a) se publicó, (b) hubo 1+ conversación WA atribuible en 7 días.
2. **Audiencia:** dueño/a 25–55, local físico, Alto Valle. Qué le duele (caja que no cierra, stock a ojo, no sabe si ganó). Qué no le importa (stack técnico).
3. **Promesa:** “Control total del local, sin complicaciones” — tagline de `info-negocio.md`.
4. **Funnel:** Feed/Reel/Stories → perfil (bio con link wa.me) → WhatsApp con mensaje plantilla → visita / `/presentacion`.
5. **4 pilares** (dolor, prueba, oficio local, educación) con 2 ejemplos de hook cada uno.
6. **Formatos y tamaños:**
   - Feed: 1080×1350 (4:5)
   - Stories/Reels cover: 1080×1920 (9:16)
   - Texto en imagen: máximo **8 palabras** de hook + 1 subline de ≤12 palabras
7. **Identidad visual:** fondo `#0a0a09` o `#fafaf9`; acento `#65a30d` / `#84cc16`; texto blanco o `#0a0a09`; logo CloudValle/CValleTienda; screenshot real permitido; **prohibido** lime de Tailwind crudo distinto a tokens; **prohibido** mockups de iPhone genéricos de stock.
8. **Copy:** vos/tu; primera línea del caption = el hook (se ve antes de “más”); CTA al final: “Mandame WhatsApp y coordinamos una demo en tu local.” Mensaje WA sugerido distinto al del pitch (`vi el post de Instagram…`).
9. **Lo prohibido:** precios, “100 comercios usan…”, testimonios fake, “IA”, “SaaS”, copiar creatividades de Bepos/MiPOS, paredes de texto en la imagen, hashtags irrelevantes (`#fyp` spam).
10. **Cómo publicar (checklist de 8 pasos):** export PNG → recorte nativo IG → caption de `copy.md` → primer comentario con WA → Stories 24h con sticker “Demo” → bio con wa.me → responder DMs en <2h con el script Denisee adaptado.

**Archivos afectados:**

- `referencia/redes-sociales.md`

---

### Paso 2: Filosofía visual (para no caer en plantilla ni en arte opaco)

Crear `salidas/redes/filosofia-visual-redes.md` siguiendo el espíritu de `canvas-design` **pero con constraint de conversión**:

- Nombre del movimiento: p. ej. **“Mostrador Claro”**
- 4–6 párrafos: espacio (márgenes generosos, un solo bloque de tipo grande), color (carbón + lima como único acento), ritmo (una pregunta enorme, una prueba chica), jerarquía (hook → prueba → marca).
- Insistir: la pieza tiene que verse **labrada**, no generada; y el hook tiene que leerse a 1 metro del celular.
- Texto mínimo: marca + hook + CTA de 3 palabras.
- Esta filosofía se reusa en cada pack.

**Archivos afectados:**

- `salidas/redes/filosofia-visual-redes.md`

---

### Paso 3: Plantillas HTML reutilizables

Crear `salidas/redes/_plantilla-pack/feed-4x5.html` y `story-9x16.html`.

**Especificación feed (1080×1350 CSS px, `viewport` fijo):**

```
viewport: width=1080, height=1350
body: 1080×1350, overflow hidden, background #0a0a09
padding: 72px
top: logo 40px + wordmark "CValleTienda" (Outfit o Inter, weight 600, 22px, #a9a8a2)
centro-superior: hook en 64–78px, line-height 1.05, blanco, máximo 3 líneas
debajo: subline 28px, color #d7d6d2, máximo 2 líneas
bloque prueba: card 12px radius, borde #222, screenshot object-fit cover, max-height ~480px
bottom bar: izquierda "Cinco Saltos · Río Negro" 18px #5b5a54; derecha pill lima "#65a30d" texto "#0a0a09" "Demo en tu local"
```

**Especificación stories (1080×1920):** mismo sistema, hook más grande (88px), screenshot más alto, safe-zone: no poner texto en los 180px superiores ni 250px inferiores (UI de Instagram).

Variables a reemplazar en cada pack: `{{HOOK}}`, `{{SUB}}`, `{{SHOT_SRC}}`, `{{CTA}}`, `{{GEO}}`.

Usar el logo `salidas/logo-cloudvalle.png` con ruta relativa correcta (`../../../logo-cloudvalle.png` o copiar a `_plantilla-pack/assets/`).

**Archivos afectados:**

- `salidas/redes/_plantilla-pack/feed-4x5.html`
- `salidas/redes/_plantilla-pack/story-9x16.html`

---

### Paso 4: Pack 01 — brief + HTML instanciado

Carpeta `salidas/redes/2026-08-19-pack-01-caja/`.

**brief.md** debe fijar:

| Campo | Valor |
|-------|--------|
| Pilar | Dolor + prueba |
| Hook | ¿Cerrás la caja y no te da? |
| Sub | Sabé si el día cerró — y si el mes dejó plata. |
| Screenshot | Preferir `salidas/capturas/caja-preview-cierre.png`; fallback `inicio-turnos.png` |
| CTA imagen | Demo en tu local |
| CTA real | WhatsApp 299 658-7715 |
| No incluir | Precio, trial, “IA”, lista de 10 features |

Copiar plantillas a `feed-1080x1350.html` y `story-1080x1920.html` con los valores reemplazados y el `img src` apuntando al screenshot real.

**Archivos afectados:**

- `salidas/redes/2026-08-19-pack-01-caja/brief.md`
- `salidas/redes/2026-08-19-pack-01-caja/feed-1080x1350.html`
- `salidas/redes/2026-08-19-pack-01-caja/story-1080x1920.html`

---

### Paso 5: Exportar PNG (la “foto” de Instagram)

Generar `feed-1080x1350.png` y `story-1080x1920.png` a **tamaño exacto** (no escalar con bordes).

**Método A (preferido):** Playwright screenshot del HTML.

- Si `app/package.json` o el repo ya tiene Playwright (novedades PDF), reutilizarlo.
- Script one-shot aceptable: `scripts/export-pieza-redes.mjs` que reciba path HTML + width + height + path PNG.
- `deviceScaleFactor: 1` o `2` (si 2, el archivo será 2160×2700 — Instagram acepta y se ve nítido; documentarlo en el README).
- Verificar: sin scrollbars, sin recorte de texto, contraste AA del hook.

**Método B (si Playwright falla):** GenerateImage con prompt ultra-específico (dimensiones 4:5, colores hex, texto exacto del hook, estética “Mostrador Claro”, screenshot described not hallucinated UI). Luego recortar a 1080×1350. **No** inventar UI falsa del producto; si no hay screenshot limpio, usar solo tipografía + marca.

Validar visualmente: abrir el PNG, zoom 100%, el hook se lee en <1s, el logo no compite, el CTA pill no pega al borde.

**Archivos afectados:**

- `scripts/export-pieza-redes.mjs` (si Método A)
- `salidas/redes/2026-08-19-pack-01-caja/feed-1080x1350.png`
- `salidas/redes/2026-08-19-pack-01-caja/story-1080x1920.png`

---

### Paso 6: Copy listo para pegar

Crear `copy.md` del Pack 01 con bloques copiables:

**Caption (feed)** — estructura:

```
¿Cerrás la caja y no te da?

No es magia: es anotar mal, mezclar el efectivo con el QR y no ver si el mes dejó plata de verdad.

CValleTienda te muestra el día y el mes en un solo lugar — en tu local, sin vueltas raras.

Si tenés un comercio en el Alto Valle y querés verlo en tu mostrador, mandame WhatsApp y coordinamos una demo.

299 658-7715
```

**Primer comentario:** `Demo en el local · WhatsApp 299 658-7715` (el algoritmo a veces esconde el caption; el primer comentario refuerza el CTA).

**Hashtags (una línea, 8–12):** `#CincoSaltos #AltoValle #RioNegro #Neuquen #Comercios #Indumentaria #Despensa #ControlDeCaja #Stock #POS`

**Bio sugerida (si la cuenta es nueva):** `Sistema para tu local · Cinco Saltos` + link `https://wa.me/5492996587715?text=` + mensaje URL-encoded: `Hola, vi CValleTienda en Instagram y quiero una demo en el local.`

**Sticker Stories:** “Demo en tu local” → link o mención a DM.

**Respuesta a DM** (adaptar Denisee, 4 líneas máx.): no precios; ofrecer pasar por el local.

**Archivos afectados:**

- `salidas/redes/2026-08-19-pack-01-caja/copy.md`

---

### Paso 7: Guion de Reel 15s (alcance)

Crear `reel-guion-15s.md`. No renderizar video (Santiago filma con el celular). Estructura:

| Seg | En pantalla (texto grande) | Voz / acción |
|-----|----------------------------|--------------|
| 0–2 | ¿Cerrás la caja y no te da? | Hook hablado igual. Film: mostrador / billetes / cuaderno (sin cara obligatoria) |
| 3–7 | El cuaderno no te dice si ganaste | Corte a pantalla de Caja / turnos (grabar la demo en notebook) |
| 8–12 | El día y el mes, en un solo lugar | Scroll rápido del dashboard o cierre de caja |
| 13–15 | Demo en tu local · WA en bio | Logo + “CValleTienda · Cinco Saltos” |

Notas: subtítulos quemados (el 80% ve sin audio); primer frame = el hook (thumbnail); no música copyright; vertical 9:16.

**Archivos afectados:**

- `salidas/redes/2026-08-19-pack-01-caja/reel-guion-15s.md`

---

### Paso 8: Comando `/contenido-redes`

Crear `.claude/commands/contenido-redes.md` siguiendo el tono de `crear-plan.md`.

**Variables:** `brief` (pilar o frase del usuario). Default si vacío: siguiente pilar rotado según el último pack en `salidas/redes/`.

**El comando debe ordenar:**

1. Leer `referencia/redes-sociales.md` + último pack.
2. Elegir **un** pilar y **un** hook (máx. 8 palabras).
3. Elegir screenshot de `salidas/capturas/` que pruebe el claim (si no hay, no inventar UI).
4. Instanciar plantillas HTML en `salidas/redes/YYYY-MM-DD-pack-NN-{slug}/`.
5. Exportar PNG (script del Paso 5).
6. Escribir `brief.md` + `copy.md` + `reel-guion-15s.md`.
7. Reportar rutas de los PNG y el caption.

Skills a invocar en el comando: `canvas-design` (craft visual), `competitive-ads-extractor` solo si el usuario pide “inspiración de ads” (investigación, no copiar).

**Archivos afectados:**

- `.claude/commands/contenido-redes.md`

---

### Paso 9: README de salidas + docs de workspace

`salidas/redes/README.md`:

- Cómo está organizada la carpeta
- Cómo exportar (comando del script)
- Cómo publicar (link al playbook)
- Índice: Pack 01 caja

Actualizar `CLAUDE.md`:

- En el árbol: `salidas/redes/`
- En Comandos: sección `/contenido-redes`
- En skills de negocio: una línea “contenido Instagram → `referencia/redes-sociales.md`”

Actualizar `contexto/estrategia.md` al final de “Cómo Se Ve el Éxito” o en una viñeta nueva:

- Canal de adquisición: Instagram orgánico → WhatsApp. Playbook: `referencia/redes-sociales.md`. Primer pack: `salidas/redes/2026-08-19-pack-01-caja/`.

**Archivos afectados:**

- `salidas/redes/README.md`
- `CLAUDE.md`
- `contexto/estrategia.md`

---

### Paso 10: Validación visual y de copy

Antes de marcar el plan como Implementado:

- Abrir ambos PNG: dimensiones correctas, texto no recortado, contraste.
- Leer caption en voz alta: suena a Santiago (Denisee), no a agencia.
- Verificar que **no** hay precios, clientes inventados, ni “SaaS”.
- Verificar que el wa.me usa `5492996587715`.
- Verificar que el comando existe y CLAUDE.md lo lista.

**Archivos afectados:**

- (ninguno nuevo; checklist)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `contexto/estrategia.md` | Prioridad “primeros clientes” — este plan es un canal, no un reemplazo del pitch presencial |
| `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` | Tono y objeción de precio |
| `salidas/2026-08-08-pitch-visita-brief.md` | CTA WhatsApp canónico |
| `referencia/design-system-v2.md` | Color/tipo |
| `salidas/capturas/*` | Prueba de producto en las piezas |
| `CLAUDE.md` | Debe listar el comando nuevo |

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` — comando + carpeta
- `contexto/estrategia.md` — palanca Instagram
- Si cambia el WhatsApp o el precio, **no** hay que retocar las imágenes de awareness (no llevan precio); sí `copy.md` y el playbook

### Impacto en Flujos de Trabajo Existentes

- No cambia `/iniciar`, `/crear-plan`, `/implementar`.
- Agrega `/contenido-redes` para packs siguientes.
- No compite con `/presentacion` ni el PDF: redes abren la puerta; la visita cierra.
- No requiere deploy ni secrets.

---

## Lista de Validación

- [ ] Existe `referencia/redes-sociales.md` con funnel, 4 pilares, formatos, prohibiciones y checklist de publicación
- [ ] Existe `.claude/commands/contenido-redes.md` ejecutable como comando
- [ ] Existe `feed-1080x1350.png` del Pack 01 (foto Instagram) con hook de caja legible
- [ ] Existe `story-1080x1920.png` companion
- [ ] `copy.md` tiene caption + primer comentario + hashtags + bio + respuesta DM
- [ ] `reel-guion-15s.md` cubre 15 segundos con texto en pantalla
- [ ] PNG sin precios, sin social proof falso, con marca CValleTienda
- [ ] CTA apunta a WhatsApp 299 658-7715 / `5492996587715`
- [ ] `CLAUDE.md` lista `/contenido-redes` y `salidas/redes/`
- [ ] `contexto/estrategia.md` menciona el canal
- [ ] Ningún archivo de `app/` modificado

---

## Criterios de Éxito

La implementación está completa cuando:

1. Santiago puede abrir `salidas/redes/2026-08-19-pack-01-caja/feed-1080x1350.png` y subirla a Instagram **sin editar diseño**.
2. Puede copiar el caption y el primer comentario desde `copy.md` y el CTA llega a su WhatsApp.
3. Una sesión futura puede correr `/contenido-redes stock` (u otro pilar) y producir un pack nuevo siguiendo el playbook, sin reabrir este plan.

---

## Notas

- **Views vs clientes:** una foto estática rara vez “explota”. El Pack 01 es el **ancla de perfil** + Stories. El Reel del Paso 7 es lo que hay que filmar si el objetivo es alcance. No prometer virality.
- **Fase 2 (fuera de este plan):** 2 feeds más (stock, ganancia del mes), 3 Reels, y recién después ads de Meta con el creativo que haya tenido más saves/shares. Ads requieren pixel/WA Click y presupuesto; no mezclarlo acá.
- **Legal:** no usar fotos de locales ajenos ni UI de competidores. Screenshots propios de CValleTienda sí.
- **Handle:** cuando exista @ oficial, actualizar playbook y bio; no bloquear el pack.
- Skills en implementación: `canvas-design` (craft del PNG), tono del playbook alineado a outreach Denisee. `competitive-ads-extractor` opcional, no bloqueante (Ad Library de Meta puede no ser scrapeable desde acá).
