# Propuesta Comercial CValleTienda

> **Reemplazada por:** `salidas/2026-06-23-presupuesto-derivado-mercado-junio.md` (pricing derivado de benchmark de mercado, jun 2026).

Fecha: 2026-06-04  
Cliente: Comercio minorista (1 sucursal)

---

## 1) Respuesta directa: TusFacturas se paga aparte?

Si. La facturacion electronica por API de TusFacturas es un servicio tercero y su suscripcion se contrata aparte, a nombre del cliente.

En CValleTienda hacemos la integracion tecnica para que factures desde el POS, pero el abono de TusFacturas no esta incluido dentro del precio base del sistema.

Motivo:

- Es un costo externo regulado por volumen de comprobantes y plan de API.
- Cada negocio tiene necesidades distintas de facturacion.
- Se evita sobrecargar a clientes que no necesitan facturacion electronica en una etapa inicial.

Referencia publica vista hoy (puede cambiar): en TusFacturas aparecen planes API para programadores, por ejemplo uno de 1.000 requests/comprobantes en ARS 80.000 final IVA incluido.

---

## 2) Que problema resolvemos y por que este precio tiene sentido

CValleTienda no es solo un "sistema para cobrar". Es una plataforma operativa completa:

- POS rapido con scanner y flujo de caja diario.
- Stock y variantes (talle/color) con control real.
- Devoluciones y remitos con trazabilidad.
- Clientes, cuenta corriente y seguimiento comercial.
- Dashboard de gestion para decidir con datos.
- Impresion automatica (tickets y etiquetas) en punto de venta.

Resultado para el negocio:

- Menos errores de caja y de stock.
- Menos tiempo administrativo manual.
- Mas control sobre margen, reposicion y ventas.
- Menor dependencia de planillas sueltas y procesos informales.

Esto impacta en plata real: menos perdidas invisibles, mejor control y mas velocidad de atencion.

---

## 3) Estructura de precios propuesta

### Onboarding (pago unico)

ARS 180.000

Incluye:

- Alta y configuracion de tienda.
- Carga inicial de parametros clave.
- Puesta en marcha de caja y operacion.
- Capacitacion inicial del equipo.
- Acompanamiento de arranque.

Por que existe este cargo?

Porque la implementacion consume horas reales y evita que la cuota mensual subsidie el trabajo inicial.

### Plan Base mensual

ARS 89.900 / mes

Incluye:

- Operacion completa del sistema para 1 sucursal.
- Modulos core (POS, stock, caja, clientes, dashboard, impresion).
- Soporte operativo estandar.
- Mantenimiento y mejoras continuas del sistema.

### Plan Pro mensual

ARS 129.900 / mes

Incluye todo lo del Base, mas:

- Integraciones avanzadas (incluida integracion con API de facturacion electronica).
- Prioridad de soporte.
- Alcance funcional ampliado para comercios mas exigentes.

Importante:

- El abono de TusFacturas API se paga aparte, directo al proveedor.

---

## 4) Justificacion financiera de estos valores

Para que un SaaS sea sostenible, el precio mensual debe cubrir:

- Infraestructura (hosting, base de datos, storage, backups, monitoreo).
- Desarrollo continuo y correccion de incidencias.
- Soporte y acompanamiento al cliente.
- Costos administrativos e impositivos (incluido monotributo).
- Herramientas de productividad y desarrollo con IA.

Supuesto base de trabajo (estimado realista para etapa inicial):

- Costos fijos operativos mensuales: ARS 550.000
- Costo variable por cliente activo: ARS 12.000
- Objetivo de margen: 35%
- Escenario de 10 clientes activos

Calculo:

- Precio minimo tecnico = (550.000 / 10) + 12.000 = ARS 67.000
- Precio objetivo con margen = 67.000 / (1 - 0,35) = ARS 103.077

Lectura comercial:

- ARS 89.900 (Base) funciona como precio de entrada competitivo en etapa de validacion.
- ARS 129.900 (Pro) captura el valor adicional de operacion avanzada y mayor exigencia de soporte.
- No bajar de ARS 79.900 salvo promociones con fecha de finalizacion.

---

## 5) Cuanto termina pagando el cliente por mes

Escenario A - Sin facturacion electronica API:

- Plan Base: ARS 89.900 / mes
- Plan Pro: ARS 129.900 / mes

Escenario B - Con facturacion electronica via TusFacturas API:

- Plan Pro CValleTienda: ARS 129.900 / mes
- TusFacturas API: segun plan contratado por el cliente (referencia publica observada: desde ARS 80.000 final para un plan API de entrada)
- Total estimado inicial: ARS 209.900 / mes (tomando esa referencia)

Nota: el precio exacto final depende del plan TusFacturas vigente al momento de contratar.

---

## 6) Como lo venderia en una frase

"No te vendo solo un software: te vendo control total del negocio, menos errores de caja/stock y una operacion profesional que te ahorra tiempo todos los dias."

---

## 7) Recomendacion final de decision

Si queres validar mercado rapido sin perder rentabilidad:

- Mantener onboarding en ARS 180.000.
- Ofrecer Base en ARS 89.900 para entrada.
- Posicionar Pro en ARS 129.900 como plan recomendado para negocios que quieren escalar.
- Dejar explicitado en propuesta comercial que TusFacturas API es un costo externo del cliente.
- Revisar y ajustar precio todos los meses por inflacion/costos.

Con esta estructura, el negocio puede crecer con margen y sin regalar valor.