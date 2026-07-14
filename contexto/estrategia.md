# Estrategia

> Este archivo describe las prioridades estratégicas actuales — anuales, trimestrales o por proyecto. Claude lo lee para entender hacia dónde apuntás y actuar como socio de pensamiento alineado con tus objetivos.

---

## Período de Enfoque Actual

Q2 2026 — Abril a Junio

## Prioridades Estratégicas

1. **Completar el MVP de CValleTienda** — Tener el sistema funcional con los módulos core: POS con scanner, tickets, etiquetas y stock
2. **Conseguir los primeros clientes pagos** — Empezar con tiendas locales de Cinco Saltos / Río Negro
3. **Generar ingresos recurrentes** — Activar el modelo de suscripción SaaS y cobrar los primeros tenants
4. **Validar el producto con uso real** — Obtener feedback concreto de las primeras tiendas para iterar

## Cómo Se Ve el Éxito

- Al menos 2-3 tiendas de ropa usando el sistema activamente y pagando
- El sistema corriendo en producción con los módulos principales estables
- Flujo de ingresos mensual recurrente iniciado (aunque sea pequeño)

## Decisiones Clave (cerradas jun 2026)

### Pricing (benchmark mercado, no costos internos)

| Concepto | Lanzamiento | Estable (post ~12 clientes) |
|----------|-------------|----------------------------|
| Plan Operativo (Básico) | $39.900/mes | $44.900/mes |
| Plan Completo (Pro) | $59.900/mes | $69.900/mes |
| Onboarding | $120.000 | $150.000 |

- **Mismo precio para todos los rubros** (9 rubros soportados).
- **Factura AFIP:** integración TusFacturas en Pro; abono TusFacturas (~$33k/mes) aparte del comercio.
- **Posicionamiento:** entre Autogestión ($35k) y Bepos Consolida ($79k). No competir en “AFIP incluida” vs Bepos $49k.
- **Documentos:** `salidas/2026-06-23-analisis-competencia-pricing-mercado.md`, `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md`

### Rubros foco comercial junio 2026

- **Tier 1:** ropa, despensa/kiosco
- **Tier 2:** ferretería, librería
- **Tier 3 (piloto):** carnicería, verdulería, corralón, farmacia

### Cobranza mensual (jul 2026)

- Campo `tiendas.acceso_hasta`: derecho a usar el sistema.
- Superadmin renueva con `+30d` / `+60d` / `+90d` tras cobrar (transferencia / link).
- Sin acceso (y sin trial) → pantalla de bloqueo total.
- Plan = features; acceso_hasta = pago al día.

## Preguntas Abiertas

- ¿Promoción explícita primeros clientes (15% off 6 meses vs onboarding bonificado)?
- ¿Cuándo subir a precio “estable”?
- Definir `NEXT_PUBLIC_WHATSAPP_SOPORTE` para el CTA de la pantalla vencida

---

_Actualizá al inicio de cada período de enfoque nuevo. La estrategia desactualizada genera asistencia desalineada._
