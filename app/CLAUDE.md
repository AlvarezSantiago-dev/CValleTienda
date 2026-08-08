@AGENTS.md

# CValleTienda — contexto de agentes (app/)

## Design System v2 (obligatorio)

- Spec: `../referencia/design-system-v2.md`
- Tokens: `app/globals.css` (`@theme` + semánticos)
- Showcase: ruta dashboard `/design`
- Primitives: `components/ui/` — preferir siempre antes de clases ad-hoc

**Reglas:**

1. UI nueva → tokens semánticos + primitives (`Button`, `Input`, `Card`, `Tabs`, …).
2. No reintroducir `lime-*`, `indigo-*`, ni hex de marca fuera de tokens.
3. No modificar CSS/markup de impresión (`styles/print.css`, `components/impresion/**`, RemitoImprimible*, PDF de productos salvo wrappers).
4. Presentación only: no cambiar Server Actions, queries ni contratos de datos por un rediseño visual.
