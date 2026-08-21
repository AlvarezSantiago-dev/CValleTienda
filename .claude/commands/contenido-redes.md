# Contenido redes

Generá un pack de Instagram (feed 4:5, Stories 9:16, copy y guion de Reel) para CValleTienda, listo para publicar a mano.

## Variables

brief: $ARGUMENTS (pilar o frase — ej. `stock`, `dolor`, `el mes no es lo que cobraste`. Si vacío: rotar al siguiente pilar.)

---

## Instrucciones

**IMPORTANTE:** Estás generando un PACK de contenido, no modificando la app. No toques `app/`. No inventes precios, clientes ni UI.

### Skills

- Usá `canvas-design` para el craft visual, **restringido** por `salidas/redes/filosofia-visual-redes.md` (Mostrador Claro): conversión primero (hook legible a 1 m), no arte abstracto.
- Usá `competitive-ads-extractor` **solo** si el usuario pide inspiración de ads. Investigación, no copiar.

### Lectura previa (obligatoria)

1. `referencia/redes-sociales.md` — audiencia, 4 pilares, formatos, prohibiciones, funnel WhatsApp.
2. `salidas/redes/filosofia-visual-redes.md`
3. El último pack en `salidas/redes/` (mayor fecha / mayor `pack-NN`) para no repetir el mismo hook.
4. Screenshots disponibles en `salidas/capturas/`.

### Rotación de pilares (si brief vacío)

Orden: **dolor → prueba → oficio local → educación → dolor…**

El Pack 01 es dolor+prueba (caja). El siguiente vacío debería ser **oficio local** o **educación**, salvo que el brief pida otra cosa.

---

## Ejecutar

1. **Elegí un pilar y un hook** (máximo 8 palabras, máximo 3 líneas en imagen). Subline máximo 12 palabras. CTA imagen: 3 palabras (`Demo en tu local` salvo que el brief pida otro).
2. **Elegí un screenshot** de `salidas/capturas/` que pruebe el claim. Si no hay shot que lo pruebe, no inventes UI: pieza solo tipografía + marca.
3. **Carpeta:** `salidas/redes/YYYY-MM-DD-pack-NN-{slug}/`  
   - Fecha de hoy.  
   - `NN` = siguiente número (Pack 01 = 01).  
   - `slug` kebab-case corto (`stock`, `ganancia-mes`, `mostrador`).
4. **Instanciá** `salidas/redes/_plantilla-pack/feed-4x5.html` y `story-9x16.html`:
   - Reemplazá `{{HOOK}}` `{{SUB}}` `{{SHOT_SRC}}` `{{CTA}}` `{{GEO}}` `{{CATALOG}}`.
   - `{{GEO}}` default: `Cinco Saltos · Río Negro`.
   - `{{CATALOG}}` default: `NN · SLUG` en mayúsculas (ej. `02 · STOCK`).
   - El signo de pregunta del hook puede ir en `<span class="q">`.
   - `{{SHOT_SRC}}` relativo al pack: `../../capturas/archivo.png`.
5. **Exportá PNG** a tamaño exacto:

```
node scripts/export-pieza-redes.mjs salidas/redes/{pack}/feed-1080x1350.html salidas/redes/{pack}/feed-1080x1350.png 1080 1350
node scripts/export-pieza-redes.mjs salidas/redes/{pack}/story-1080x1920.html salidas/redes/{pack}/story-1080x1920.png 1080 1920
```

   Default del script: escala 2× (feed 2160×2700, stories 2160×3840). Instagram acepta. Documentado en `salidas/redes/README.md`.

6. **Escribí** en la carpeta del pack:
   - `brief.md` — tabla (pilar, hook, sub, shot, CTA, geo).
   - `copy.md` — caption (primera línea = hook), primer comentario, hashtags 8–12 del playbook, bio, sticker Stories, respuesta DM (sin precios).
   - `reel-guion-15s.md` — tabla 0–2 / 3–7 / 8–12 / 13–15 con texto en pantalla.
7. **Validá:** no hay precios, no hay “SaaS”/“IA”, no hay social proof falso, CTA WhatsApp `5492996587715`, hook legible, texto no recortado.
8. **Actualizá** el índice en `salidas/redes/README.md`.

### Prohibido

Precios, trial, testimonios inventados, copiar ads de competidores, mockups iPhone de stock, paredes de texto en la imagen, modificar `app/`.

---

## Reporte

Al terminar, listá:

1. Ruta de `feed-1080x1350.png` y `story-1080x1920.png`
2. Hook usado y pilar
3. Caption completo (para copiar)
4. Siguiente pilar sugerido
