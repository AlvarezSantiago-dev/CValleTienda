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

### Pricing (oferta comercial vigente, ago 2026)

| Concepto | Precio | Notas |
|----------|--------|-------|
| Plan **Pro** (único) | **$45.000/mes** | Acceso completo a módulos. Por ahora no se ofrece plan Básico. |
| Onboarding | **$120.000** (único) | Alta, config, **3×1h** capacitación, **20 productos**, arranque. |

- **Comunicación vigente:** PDF `salidas/2026-08-08-presentacion-comercial-cvalletienda.pdf`. Hardware/máquinas aparte.
- **Pitch de primera visita:** link público `/presentacion` (deck de 16 puntos + CTA demo). Brief: `salidas/2026-08-08-pitch-visita-brief.md`. Flujo: visita → pitch → agendar demo → enviar PDF.
- **Factura AFIP:** integración incluida en Pro; abono TusFacturas aparte del comercio.
- Código UI: `app/lib/planes/config.ts` → `PRECIOS` / `PRECIO_ONBOARDING` / `OFERTA_COMERCIAL`
- El gating técnico Básico/Pro en producto sigue existiendo; la **venta** actual es solo Pro a $45k.

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
