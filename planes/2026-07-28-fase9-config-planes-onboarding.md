# Plan: Fase 9 — Configuración, Planes y Onboarding (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Settings layout (nav lateral desktop / tabs mobile); Switch/Avatar; Planes pricing v2; Onboarding wizard brand; Superadmin paint. Sin tocar actions/queries.
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md` (Paso 10)

## Inventario
- configuracion: pages + TabsConfiguracion + forms/managers (Negocio, Ticket, Cobros, Equipo, Avanzado…)
- planes: page + UpgradeBanner, SolicitarUpgradeForm, Acceso*
- onboarding: OnboardingWizard
- superadmin: layout + SuperAdminPanel

## Cambios
1. ConfiguracionShell: nav lateral lg + Tabs mobile; PageHeader en páginas
2. Token sweep forms; Switch en redondeo; Avatar en equipo; opciones cobro tokenizadas
3. Planes: pricing cards v2 + trial banners
4. Onboarding: indigo → brand tokens
5. Superadmin: tokens mínimos

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

- Shell de settings con nav lateral desktop / tabs mobile.
- Forms y managers tokenizados; Switch + Avatar.
- Planes, onboarding y superadmin alineados a DS v2.
- Build OK.

### Desviaciones del Plan

- Onboarding sin RubroSelector (rubro ya definido en registro).
- Superadmin: paint mínimo, sin redesign de flujos.

### Problemas Encontrados

- UTF-8 roto en SuperAdminPanel por Set-Content PowerShell → restore + Node UTF-8.
