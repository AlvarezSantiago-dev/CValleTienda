# Plan: Landing polish + páginas legales

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Pulir landing con tokens DS v2; Términos, Privacidad y Aviso legal; links footer/registro.

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

- Config central `app/lib/legal/site.ts` + contenido en `content.ts`.
- Rutas `/terminos`, `/privacidad`, `/aviso-legal` con layout `(public)`.
- Landing Header/Footer/FeatureCard/LandingPage tokenizados; footer con columna Legal.
- Checkbox de aceptación en `RegistroForm`; links legales en AuthBrandPanel.

### Desviaciones del Plan

- Ninguna material.

### Problemas Encontrados

- Ninguno.
