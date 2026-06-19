# Plan: Mensaje comercial WhatsApp — clienta Denisee (CValleTienda)

**Creado:** 2026-06-11
**Estado:** Implementado (ajustado 2026-06-11)
**Pedido:** Crear un mensaje con introducción personal para Denisee, que quiere empezar o conocer info del programa, partiendo de: *"Denisee disculpame recien llego a casa, mira el sistema que ofrezco es un sistema que te permite saber siempre:"*

---

## Descripción General

### Qué Logra Este Plan

Produce un **entregable listo para copiar/pegar en WhatsApp** (y variantes corta/larga) que retoma el tono informal del usuario, completa el gancho *"te permite saber siempre…"* con beneficios concretos de CValleTienda, y cierra con un llamado a la acción claro (demo, prueba 14 días o llamada). Incluye mensajes de seguimiento si no responde o si pide precio.

### Por Qué Importa

Denisee está en el momento de decisión (info o arranque). Un mensaje mal armado — genérico, muy largo o sin CTA — pierde la oportunidad. El producto ya tiene propuesta de valor sólida en `salidas/` y landing; falta **empaquetarla en lenguaje humano** para una conversación 1:1, respetando el estilo del fundador (cercano, local, directo).

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `contexto/info-negocio.md` | Tagline, módulos, mercado (Cinco Saltos / Río Negro) |
| `contexto/estrategia.md` | Objetivo Q2: primeros clientes pagos, pitch inicial |
| `contexto/info-personal.md` | Fundador único — ventas + desarrollo; tono ágil |
| `salidas/2026-06-04-propuesta-comercial-cvalletienda-pricing.md` | Pricing Base $89.900 / Pro $129.900, onboarding $180.000 |
| `salidas/brochure-cvalle.html` | Features, prueba 14 días, garantías, contacto |
| `salidas/presupuesto-cliente-cvalle-completo.html` | Valor de negocio, estructura comercial |
| `app/components/landing/LandingPage.tsx` | Copy validado: POS, stock, caja, dashboard, etc. |

### Brechas o Problemas que se Abordan

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | Intro incompleta — corta en *"te permite saber siempre:"* | No comunica valor; suena a frase a medias |
| B2 | No hay plantilla de outreach WhatsApp en `salidas/` | Cada lead se redacta desde cero |
| B3 | Pricing en materiales no unificado (brochure vs propuesta 2026-06) | Riesgo de cotizar mal en el chat |
| B4 | Rubro de Denisee desconocido | Mensaje genérico vs personalizado (ropa vs despensa) |

---

## Cambios Propuestos

### Resumen de Cambios

- Crear documento **`salidas/2026-06-11-mensaje-denisee-cvalletienda.md`** con mensajes listos para enviar
- Completar el gancho *"saber siempre"* con 4–6 bullets de valor (ventas, caja, stock, margen, cierre de mes)
- Tres versiones: **completa**, **corta** (si ya hubo charla previa), **solo info** (si pregunta precio primero)
- Bloque opcional de **precios + prueba 14 días** como segundo mensaje (no saturar el primero)
- Guía de tono y errores a evitar (mayúsculas, párrafos largos, jerga técnica)
- No modificar código ni CLAUDE.md (solo contenido comercial)

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` | Mensajes WhatsApp + variantes + follow-ups + notas de envío |
| `referencia/plantilla-mensaje-lead-whatsapp.md` | Plantilla reutilizable para futuras clientas (opcional, derivada del caso Denisee) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| Ninguno obligatorio | Opcional: nota en `contexto/estrategia.md` con link al template de outreach |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Mantener la apertura del usuario tal cual** (con corrección mínima de ortografía solo si el usuario lo pide): tono auténtico > redacción perfecta.

2. **Completar "saber siempre" con outcomes, no features:**  
   Ej.: *cuánto vendiste hoy*, *qué te quedó en caja*, *qué falta reponer*, *si el mes cierra con ganancia* — alineado con dashboard + reportes + gráficos recién implementados.

3. **Un mensaje principal + precio en segundo mensaje:** WhatsApp penaliza bloques largos; Denisee pidió "info o empezar" — primero valor, después números si pregunta.

4. **Pricing oficial para este outreach:** usar `salidas/2026-06-04-propuesta-comercial-cvalletienda-pricing.md` (Base $89.900, Pro $129.900, onboarding $180.000, TusFacturas aparte). Mencionar **prueba 14 días** del brochure como gancho de bajo riesgo.

5. **CTA concreta:** ofrecer 15 min por videollamada o visita + activar prueba; pedir rubro/tipo de local para personalizar demo.

6. **Formato WhatsApp:** párrafos de 1–2 líneas; emojis moderados (0–2); sin links largos en el primer mensaje salvo landing si hace falta.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Enviar PDF/brochure HTML directo | Pesado para primer contacto; mejor después de interés |
| Mensaje 100% formal | Rompe con "disculpame recién llego a casa" |
| Listar todos los módulos | Abruma; priorizar lo que duele al dueño de tienda |
| Incluir pricing en la primera burbuja | Puede asustar antes de entender valor |

### Preguntas Abiertas — Resueltas (2026-06-11)

| Pregunta | Respuesta del usuario |
|----------|------------------------|
| ¿Primera vez que hablan? | **Sí** — contacto nuevo, sin charla previa de precios |
| ¿Rubro de Denisee? | **Desconocido** — mensaje genérico; rubro se pregunta al coordinar visita |
| ¿Precios por WhatsApp? | **No** — propuesta y números en reunión presencial |
| CTA | **Visita con propuesta preparada** (brochure + propuesta comercial en mano) |

---

## Tareas Paso a Paso

### Paso 1: Definir el núcleo del gancho "saber siempre"

Redactar la continuación de la frase en **español rioplatense**, segunda persona (*vos/te*), máximo 5 ítems.

**Propuesta de contenido (base para el entregable):**

```
…te permite saber siempre:

• cuánto vendiste hoy y cómo va el mes
• qué tenés en caja y si cierra bien al final del día
• qué productos se están quedando sin stock
• qué te dejó de ganancia (no solo lo que entró)
• qué vendió más y cómo te pagan (efectivo, transferencia, etc.)
```

**Acciones:**

- Validar que cada bullet mapea a un módulo real (POS, caja, stock, dashboard/reportes, gráficos).
- Evitar prometer lo que el rubro de Denisee no use (ej. remitos si no aplica).

**Archivos afectados:**

- `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` (sección "Núcleo de valor")

---

### Paso 2: Redactar Mensaje 1 — Versión completa (recomendada)

Estructura en 4 bloques copiables:

**Bloque A — Apertura (del usuario):**
```
Denisee, disculpame, recién llego a casa 🙏

Mirá, el sistema que ofrezco es un sistema que te permite saber siempre:
```

**Bloque B — Valor (bullets del Paso 1)**

**Bloque C — Qué es en una línea:**
```
Es CValleTienda: POS + stock + caja + clientes + reportes, todo en uno, desde el celular o la compu. Pensado para comercios acá en la zona, sin vueltas raras.
```

**Bloque D — CTA:**
```
Si querés te lo muestro en 15 minutos (videollamada o te paso por el local) y activamos 14 días de prueba gratis para que lo veas con tus productos.

¿Qué tipo de negocio tenés? Así te lo muestro con ejemplos que te sirvan de verdad.
```

**Acciones:**

- Unificar "recien" → "recién" solo si el usuario prefiere ortografía correcta (decisión documentada en el entregable).
- Longitud total: ~600–900 caracteres (cómodo en WhatsApp).

**Archivos afectados:**

- `salidas/2026-06-11-mensaje-denisee-cvalletienda.md`

---

### Paso 3: Redactar Mensaje 2 — Versión corta

Para reenvío o si ya explicó algo antes:

```
Denisee, te resumo: CValleTienda te deja ver en todo momento ventas, caja, stock y si el mes cierra bien — sin planillas.

Prueba 14 días gratis. ¿Te va un ratito esta semana y te lo muestro?
```

**Archivos afectados:**

- `salidas/2026-06-11-mensaje-denisee-cvalletienda.md`

---

### Paso 4: Redactar respuestas según reacción de Denisee

**4a — Si pregunta "¿cuánto sale?"**

```
La implementación inicial (alta, config y capacitación) es $180.000 único.

Después la mensualidad es desde $89.900 (operación completa) o $129.900 si querés facturación electrónica integrada y soporte prioritario.

Facturación AFIP/TusFacturas va aparte, directo con el proveedor, si la necesitás.

Lo bueno: 14 días de prueba gratis del plan completo, sin permanencia mínima.
```

**4b — Si dice "sí, quiero empezar"**

```
Genial 🙌

Para arrancar necesito:
1) Nombre del negocio y rubro (ropa, despensa, etc.)
2) Si facturás con AFIP o no por ahora
3) Un horario esta semana para configurarlo juntos (1–2 hs)

Con eso te activo la prueba y empezamos.
```

**4c — Si no responde en 48 hs**

```
Denisee, te escribo de nuevo por si se perdió el mensaje. Sin compromiso: si querés te muestro el sistema en 15 min y ves si te sirve para el negocio. Abrazo.
```

**Archivos afectados:**

- `salidas/2026-06-11-mensaje-denisee-cvalletienda.md`

---

### Paso 5: Checklist de tono y formato antes de enviar

**Acciones:**

- [ ] Leer en voz alta — suena como Santiago, no como brochure
- [ ] Máximo 2 emojis en mensaje principal
- [ ] Sin "SaaS", "multi-tenant", "KPI" en el primer mensaje
- [ ] CTA con pregunta abierta al final (facilita respuesta)
- [ ] Confirmar precios con `2026-06-04-propuesta-comercial` antes de enviar bloque 4a

**Archivos afectados:**

- `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` (sección "Checklist pre-envío")

---

### Paso 6 (opcional): Plantilla reutilizable

Extraer estructura A+B+C+D a `referencia/plantilla-mensaje-lead-whatsapp.md` con placeholders:

- `{NOMBRE}`, `{RUBRO}`, `{GANCHO_PERSONALIZADO}`, `{CTA}`

**Archivos afectados:**

- `referencia/plantilla-mensaje-lead-whatsapp.md` (nuevo, opcional)

---

### Paso 7: Validación

**Acciones:**

- Revisar que ningún bullet prometa funcionalidad inexistente
- Comparar con landing y propuesta comercial — coherencia
- Simular lectura en pantalla de celular (375px — párrafos cortos)

**Archivos afectados:**

- Entregable en `salidas/`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `contexto/estrategia.md` | Adquisición primeros clientes |
| `salidas/brochure-cvalle.html` | Prueba 14 días, módulos |
| `salidas/2026-06-04-propuesta-comercial-cvalletienda-pricing.md` | Precios a citar |
| Módulo `/reportes` + `/graficos` | Refuerza "saber siempre" / cierre de mes |

### Actualizaciones Necesarias para Consistencia

- Alinear brochure HTML ($63.900) con propuesta 2026-06 — **fuera de scope de este plan**, pero anotar en entregable "precio vigente = propuesta 2026-06-04"
- Opcional: agregar en `contexto/estrategia.md` una línea "Template outreach: `referencia/plantilla-mensaje-lead-whatsapp.md`"

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Ventas WhatsApp | Nuevo asset copiable |
| `/crear-plan` futuro leads | Reutilizar plantilla |
| Código / producto | Ninguno |

---

## Lista de Validación

- [ ] Existe `salidas/2026-06-11-mensaje-denisee-cvalletienda.md` con mensaje completo
- [ ] La intro del usuario está integrada y el gancho "saber siempre" está completado
- [ ] Hay versión corta + respuestas a "precio" / "quiero empezar" / follow-up
- [ ] Precios citados coinciden con propuesta comercial 2026-06-04
- [ ] CTA claro con prueba 14 días
- [ ] Tono cercano, párrafos WhatsApp-friendly
- [ ] Preguntas abiertas documentadas si falta rubro de Denisee

---

## Criterios de Éxito

1. Santiago puede **copiar y enviar el Mensaje 1 en menos de 1 minuto** sin editar nada crítico (salvo personalización de rubro si la conoce).
2. Denisee entiende **en una lectura** qué problema resuelve el sistema (control del negocio, no "un programa").
3. El mensaje invita a **responder** (pregunta final) y ofrece **prueba sin riesgo** (14 días).
4. Follow-ups cubren las 3 reacciones más probables: precio, sí quiero, silencio.

---

## Notas

- Este plan es **contenido comercial**, no código. `/implementar` produce el markdown en `salidas/` listo para usar.
- Si Denisee es tienda de **ropa**, mencionar talle/color y etiquetas. Si es **despensa/ferretería**, mencionar scanner, remitos o balanza según corresponda — personalizar en implementación según respuesta del Paso 1 (preguntas abiertas).
- Tagline oficial del negocio: *"El sistema que tu negocio necesita — control total, sin complicaciones."* — usable como cierre alternativo.
- Ejecutar con: `/implementar planes/2026-06-11-mensaje-outreach-clienta-denisee.md`
