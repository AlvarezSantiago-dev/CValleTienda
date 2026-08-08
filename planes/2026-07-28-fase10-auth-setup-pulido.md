# Plan: Fase 10 — Auth, Setup y Pulido Final (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** AuthBrandPanel v2, auth pages, setup indigo→marca, barrido lime/indigo remanente, docs cierre (Paso 12).
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md` (Pasos 11–12)

## Cambios
1. AuthBrandPanel + layout/auth pages + RegistroForm → tokens/lucide
2. setup/page.tsx indigo → brand
3. Barrido `lime-`/`indigo-` remanentes en app/ (excepto print/impresion)
4. CLAUDE.md + app/CLAUDE.md + design-system-v2 + proyectos.md; plan maestro → Implementado

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

- AuthBrandPanel + páginas auth/setup con tokens semánticos y lucide.
- Barrido global + fix `bg-primary-soft0`.
- Documentación de cierre DS v2; proyecto Fable movido a Completados.
- Plan maestro → Implementado.

### Desviaciones del Plan

- Lighthouse / QA responsive integral de 55 rutas no ejecutado aquí (manual).
- PDF productos e impresión conservan hex propios.

### Problemas Encontrados

- Orden de replace `bg-lime-50` antes de `bg-lime-500` → `bg-primary-soft0`; corregido.
