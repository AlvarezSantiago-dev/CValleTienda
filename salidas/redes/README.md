# Redes — CValleTienda

Packs de Instagram (no se publican solos). Playbook: [`referencia/redes-sociales.md`](../../referencia/redes-sociales.md). Filosofía: [`filosofia-visual-redes.md`](filosofia-visual-redes.md).

## Estructura

```
salidas/redes/
├── README.md
├── filosofia-visual-redes.md
├── _plantilla-pack/          feed-4x5.html · story-9x16.html
└── YYYY-MM-DD-pack-NN-slug/
    ├── brief.md
    ├── feed-1080x1350.html / .png
    ├── story-1080x1920.html / .png
    ├── copy.md
    └── reel-guion-15s.md
```

Siguiente pack: `/contenido-redes [pilar]`.

## Exportar PNG

Desde la raíz del repo. El script usa **Chrome o Edge del sistema** (no hace falta npm). Playwright en `scripts/` es opcional.

```
node scripts/export-pieza-redes.mjs salidas/redes/PACK/feed-1080x1350.html salidas/redes/PACK/feed-1080x1350.png 1080 1350
node scripts/export-pieza-redes.mjs salidas/redes/PACK/story-1080x1920.html salidas/redes/PACK/story-1080x1920.png 1080 1920
```

**Escala default 2×** → feed **2160×2700**, stories **2160×3840**. Instagram acepta y se ve nítido. Para 1×: pasá `1` como quinto argumento.

## Cómo publicar

Checklist de 8 pasos en el playbook. CTA WhatsApp `5492996587715`. Sin precios en la imagen.

## Índice

| Pack | Fecha | Pilar | Hook | PNG feed |
|------|-------|-------|------|----------|
| 01 caja | 2026-08-19 | Dolor + prueba | ¿Cerrás la caja y no te da? | `2026-08-19-pack-01-caja/feed-1080x1350.png` |
