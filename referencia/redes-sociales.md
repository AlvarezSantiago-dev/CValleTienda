# Playbook de redes — CValleTienda

> Fuente de verdad para Instagram (y packs futuros). Ejecutar packs con `/contenido-redes`.
> Identidad visual: `salidas/redes/filosofia-visual-redes.md` · plantillas: `salidas/redes/_plantilla-pack/`

---

## 1. Objetivo

**Meta:** leads de demo por WhatsApp, no vanity metrics (likes, views sueltos).

Una pieza “funcionó” si:

1. **Se publicó** (feed y/o Stories; Reel si hay guion filmado).
2. **Hubo 1+ conversación de WhatsApp atribuible en 7 días** (“vi el post”, “vi Instagram”, o llegó por el link de la bio).

No optimizar para alcance vacío. El Reel sirve para que te vean; el CTA sirve para que te escriban.

**Contacto canónico**

| Canal | Valor |
|-------|--------|
| WhatsApp display | 299 658-7715 |
| WhatsApp dígitos | `5492996587715` |
| Link | `https://wa.me/5492996587715?text=` + mensaje URL-encoded de Instagram (abajo) |
| Email |  santiagoalvarezz.dev@gmail.com |

---

## 2. Audiencia

**Quién:** dueño/a de comercio físico, 25–55 años, Alto Valle (Cinco Saltos, Allen, Cipolletti, General Roca, Neuquén capital). Rubros foco: **ropa** y **despensa/kiosco**; después ferretería/librería.

**Qué le duele**

- Cierra la caja y no da (efectivo vs QR vs “lo que me acuerdo”).
- Stock a ojo: se queda sin talle / se vence / no sabe qué se vende.
- Vendió “bien” el mes y no sabe si **dejó plata**.

**Qué no le importa**

- Stack técnico (Next.js, SaaS, multi-tenant, RLS).
- Comparativas de features vs Bepos/MiPOS en jerga de software.
- Registro self-serve en la web. Quiere que alguien se lo muestre en el mostrador.

**Tono:** vos/tu, oraciones cortas, mismo registro que `salidas/2026-06-11-mensaje-denisee-cvalletienda.md`. Cercano, no agencia.

---

## 3. Promesa

> El sistema que tu negocio necesita — **control total, sin complicaciones.**

En redes se traduce a una sola idea por pieza: *vas a saber si el día y el mes cerraron*. No listar 16 módulos.

---

## 4. Funnel

```
Feed / Reel / Stories
        ↓
Perfil (bio + link wa.me)
        ↓
WhatsApp (mensaje plantilla Instagram)
        ↓
Visita en el local  ·  /presentacion  ·  PDF comercial
```

- **No** mandar a `/login` ni a registro.
- **No** poner precios en la imagen ni en el caption de awareness.
- Precio ($45.000/mes Pro + $120.000 onboarding) recién en visita, PDF o `/presentacion`.

**Mensaje WA (Instagram)** — distinto al del pitch:

```
Hola, vi CValleTienda en Instagram y quiero una demo en el local.
```

URL lista:

`https://wa.me/5492996587715?text=Hola%2C%20vi%20CValleTienda%20en%20Instagram%20y%20quiero%20una%20demo%20en%20el%20local.`

---

## 5. Cuatro pilares

Rotar. Un pack = **un** pilar dominante + como máximo una prueba visual. No mezclar cuatro ideas en un feed.

### Dolor

Pregunta que el dueño ya se hizo hoy.

| Hook (≤8 palabras) | Idea |
|--------------------|------|
| ¿Cerrás la caja y no te da? | Efectivo vs lo cobrado |
| Tu stock no se avisa solo | Quedarse sin producto |

### Prueba

La pantalla real que resuelve ese dolor. Screenshot de `salidas/capturas/` — **nunca** UI inventada.

| Hook (≤8 palabras) | Shot sugerido |
|--------------------|----------------|
| Diferencia: cero. El día cerró. | `caja-preview-cierre.png` |
| El mes, en un solo lugar | `graficos-finanzas.png` / `inicio-turnos.png` |

### Oficio local

Somos del valle; la demo es en el mostrador.

| Hook (≤8 palabras) | Idea |
|--------------------|------|
| Demo en tu local, Alto Valle | Visita, no zoom eterno |
| Sistema para tu mostrador | Cinco Saltos / RN |

### Educación

Un tip operativo. Enseña, no vendas features.

| Hook (≤8 palabras) | Idea |
|--------------------|------|
| El cierre no es lo cobrado | Caja ≠ ventas del día |
| Vendiste ≠ ganaste | El mes vs lo que entró |

**Pack 01 (agosto 2026):** Dolor + prueba · caja.

---

## 6. Formatos y tamaños

| Pieza | Tamaño | Uso |
|-------|--------|-----|
| Feed | **1080×1350** (4:5) | Post del perfil. Más pantalla que 1:1. |
| Stories / cover Reel | **1080×1920** (9:16) | Companion 24h; safe-zone: nada crítico en 180px superiores ni 250px inferiores. |
| Reel | 9:16, ~15s | Alcance. Se filma; no se renderiza en este workspace. |

**Texto en imagen**

- Hook: máximo **8 palabras**, máximo 3 líneas.
- Subline: máximo **12 palabras**, máximo 2 líneas.
- CTA en imagen: 3 palabras (`Demo en tu local`).
- Nada más. El caption lleva el resto.

Export: `node scripts/export-pieza-redes.mjs <html> <png> <width> <height>`. Escala 2× documentada en `salidas/redes/README.md` (2160×2700 / 2160×3840). Instagram acepta y se ve nítido.

---

## 7. Identidad visual

Filosofía: **Mostrador Claro** (`salidas/redes/filosofia-visual-redes.md`).

| Token | Hex | Uso |
|-------|-----|-----|
| Fondo oscuro | `#0a0a09` | Feed/Stories default |
| Fondo claro | `#fafaf9` | Alternar si el shot es muy oscuro |
| Lima | `#65a30d` | Pill CTA, acento |
| Lima highlight | `#84cc16` | Detalles, signo de pregunta, filete |
| Texto | `#ffffff` / `#0a0a09` | Según fondo |
| Muted | `#a9a8a2` / `#d7d6d2` / `#5b5a54` | Wordmark, sub, geo |

- Logo: `salidas/logo-cloudvalle.png` + wordmark **CValleTienda**.
- **Puesto de caja:** monitor PC con screenshot real + scanner USB + impresora térmica (`_plantilla-pack/assets/`). No mockup de iPhone.
- Tipografía: Outfit (wordmark/UI) + Instrument Sans (hook). Archivos en `.claude/skills/canvas-design/canvas-fonts/`.
- **Prohibido:** `lime-500` de Tailwind u otros hex de marca; mockups stock de celular; paredes de texto; arte abstracto ilegible a 1 metro.

---

## 8. Copy

- Primera línea del caption = **el hook** (se ve antes de “más”).
- Vos/tu. Párrafos cortos. Una idea.
- Cierre: “Mandame WhatsApp y coordinamos una demo en tu local.” + número.
- Primer comentario: CTA + WhatsApp (el algoritmo a veces esconde el caption).
- Hashtags: **8–12**, locales + oficio. Nada de `#fyp` / `#viral` / `#parati`.

Set base:

`#CincoSaltos #AltoValle #RioNegro #Neuquen #Comercios #Indumentaria #Despensa #ControlDeCaja #Stock #POS`

---

## 9. Lo prohibido

- Precios ($45.000, onboarding, trial) en imagen o caption de awareness.
- Social proof inventado: “+100 comercios”, “el POS más usado”, testimonios fake.
- Palabras: “IA”, “SaaS”, “multi-tenant”, “cloud-native”.
- Copiar creatividades de Bepos, MiPOS, Autogestión u otros.
- Paredes de texto en la pieza.
- Hashtags irrelevantes o spam.
- UI inventada del producto. Si no hay screenshot que pruebe el claim, la pieza es solo tipografía + marca.

---

## 10. Cómo publicar (checklist)

1. Exportar PNG desde el HTML del pack (`scripts/export-pieza-redes.mjs`) o usar el PNG ya generado.
2. Subir a Instagram; recorte nativo 4:5 (feed) / 9:16 (Stories). No estirar.
3. Pegar el **caption** de `copy.md` (primera línea = hook).
4. Publicar y **inmediatamente** dejar el **primer comentario** con WhatsApp.
5. Subir la Stories companion (24h) con sticker “Demo en tu local” → DM o link wa.me.
6. Bio: `Sistema para tu local · Cinco Saltos` + link wa.me de Instagram.
7. Responder DMs **en menos de 2 horas** con el script Denisee adaptado (no precios; ofrecer pasar por el local).
8. Anotar en 7 días si hubo WA atribuible. Si no, el siguiente pack cambia de pilar (no de “más features”).

---

## Handle

No hay @ documentado. Cuando exista, actualizar esta sección, la bio y `copy.md` de packs nuevos. No retrasa la publicación: el CTA es WhatsApp.
