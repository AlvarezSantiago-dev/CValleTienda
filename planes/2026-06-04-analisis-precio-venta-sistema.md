# Plan: Analisis de Precio Mensual Rentable para CValleTienda

**Creado:** 2026-06-04
**Estado:** Borrador
**Pedido:** Analizar cuanto cobrar mensualmente por el sistema considerando costos reales (IA, Supabase, monotributo y operacion) y definir un precio rentable para clientes.

---

## Descripcion General

### Que Logra Este Plan

Este plan define un metodo financiero simple y accionable para calcular el precio mensual del sistema con rentabilidad real, incluyendo costos fijos, costos variables, impuestos y tiempo de soporte. Tambien establece una propuesta de precios concreta para salir a vender de inmediato sin cobrar por debajo del valor entregado.

### Por Que Importa

El objetivo estrategico actual del proyecto es conseguir clientes pagos y generar ingresos recurrentes. Sin un precio correctamente calculado, el producto puede tener adopcion inicial pero quedar inviabilizado economicamente al escalar soporte, infraestructura y carga operativa.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Relevancia |
|------|------------|
| `contexto/info-negocio.md` | Define el producto SaaS POS/CRM multi-rubro y su mercado objetivo |
| `contexto/estrategia.md` | Prioriza conseguir primeros clientes pagos y validar precio mensual |
| `contexto/proyectos.md` | Confirma alcance funcional actual del MVP y modulos ya implementados |
| `planes/` | Convencion para documentar planes ejecutables por `/implementar` |

### Brechas o Problemas que se Abordan

- No existe un modelo formal de costos mensuales (fijos y variables) consolidado.
- No hay precio objetivo basado en margen minimo y punto de equilibrio.
- No esta definido un esquema comercial (precio de lanzamiento vs precio lista).
- Riesgo de cobrar demasiado bajo por un sistema que resuelve operacion completa del comercio.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear un entregable financiero con estructura de costos realista para operacion en Argentina.
- Definir formula de precio minimo rentable por cliente segun cantidad de tiendas activas.
- Proponer grilla comercial concreta: onboarding, plan mensual base, plan premium y add-ons.
- Establecer regla de actualizacion mensual del precio (indexacion por IPC o dolar MEP).
- Dejar guion de validacion comercial con 5-10 clientes potenciales.

### Nuevos Archivos a Crear

| Ruta del Archivo | Proposito |
| ---------------- | --------- |
| `salidas/2026-06-04-analisis-pricing-cvalletienda.md` | Documento final con costos, escenarios y recomendacion de precios |
| `salidas/2026-06-04-unit-economics-cvalletienda.csv` | Tabla editable con supuestos y sensibilidad por cantidad de clientes |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `contexto/estrategia.md` | Registrar decision de pricing elegida y objetivo de clientes para punto de equilibrio |

### Archivos a Eliminar (si aplica)

No aplica.

---

## Decisiones de Diseno

### Decisiones Clave Tomadas

1. **Precio con ancla de valor + control de costos**: No fijar precio solo por costo tecnico; combinar valor economico para el comercio (control de stock, caja, devoluciones, remitos, CRM) con un piso financiero sostenible.
2. **Separar onboarding de suscripcion mensual**: Cobrar una implementacion inicial evita subsidiar horas de puesta en marcha con la cuota mensual.
3. **Modelo de 3 escenarios (conservador/base/agresivo)**: Permite tomar decisiones aun con incertidumbre de costos y volumen de clientes inicial.
4. **Indexacion explicita del abono**: En contexto inflacionario, precio fijo sin actualizacion mensual destruye margen rapidamente.
5. **Incluir costo de IA como costo operativo real**: Las suscripciones y consumo de herramientas IA son costo directo de produccion y mantenimiento, no un extra opcional.

### Alternativas Consideradas

- **Precio unico muy bajo para acelerar ventas (descartado)**: mejora conversion inicial, pero vuelve inviable soporte y evolutivo.
- **Cobro 100% por uso/transaccion (descartado por ahora)**: agrega complejidad comercial y friccion para primeras ventas.
- **Solo plan premium sin entrada economica (descartado)**: reduce adopcion de comercios pequenos en etapa MVP.

### Preguntas Abiertas (si las hay)

- Cual es el ingreso mensual objetivo personal minimo a cubrir con el SaaS en los proximos 6 meses.
- Cuantas horas promedio de soporte por cliente se estan observando en piloto.
- Si se cobrara por transferencia/debito automatico para reducir morosidad.

---

## Tareas Paso a Paso

Ejecutar estas tareas en orden durante la implementacion.

### Paso 1: Levantar costos reales del negocio

Consolidar costos fijos y variables mensuales que impactan la rentabilidad de cada cliente activo.

**Acciones:**

- Relevar costo de infraestructura: Supabase, Vercel, dominio, correo transaccional, monitoreo, backups.
- Relevar costo de produccion: suscripciones IA (editor, LLMs, herramientas auxiliares).
- Relevar costo administrativo: monotributo, contador, comisiones de cobro, gastos bancarios.
- Definir costo/hora propio para soporte y evolutivo.

**Archivos afectados:**

- `salidas/2026-06-04-analisis-pricing-cvalletienda.md`
- `salidas/2026-06-04-unit-economics-cvalletienda.csv`

---

### Paso 2: Construir unit economics por cliente

Transformar costos en un modelo por cliente para calcular punto de equilibrio y margen objetivo.

**Acciones:**

- Separar costos en: `fijos_mensuales`, `variables_por_cliente`, `impuestos_sobre_facturacion`.
- Usar formula: `precio_minimo = (fijos_mensuales / clientes_activos_esperados) + variables_por_cliente`.
- Usar formula con margen: `precio_objetivo = precio_minimo / (1 - margen_deseado)`.
- Correr sensibilidad para 3, 5, 10, 20 clientes.

**Archivos afectados:**

- `salidas/2026-06-04-unit-economics-cvalletienda.csv`

---

### Paso 3: Definir propuesta comercial concreta

Traducir los numeros a una oferta vendible para comercios minoristas en etapa de validacion.

**Acciones:**

- Definir fee de onboarding (implementacion inicial y capacitacion).
- Definir plan mensual base (operacion completa para 1 caja y 1 sucursal).
- Definir plan premium (incluye prioridad, automatizaciones o integraciones extras).
- Definir descuentos: anual prepago y piloto por tiempo limitado.

**Archivos afectados:**

- `salidas/2026-06-04-analisis-pricing-cvalletienda.md`

---

### Paso 4: Validar precio en campo con potenciales clientes

Evitar decidir precio solo en escritorio; validar disposicion de pago real y objeciones frecuentes.

**Acciones:**

- Entrevistar 5-10 comercios del segmento objetivo actual (indumentaria y rubros cercanos).
- Testear dos precios mensuales (A/B de propuesta comercial) con mismo alcance.
- Registrar objeciones sobre costo, valor percibido y riesgo de cambio.
- Ajustar mensaje de venta enfocado en ahorro de tiempo, control y reduccion de errores.

**Archivos afectados:**

- `salidas/2026-06-04-analisis-pricing-cvalletienda.md`

---

### Paso 5: Cerrar decision final e incorporar a estrategia

Documentar precio definitivo para ejecucion comercial inmediata y seguimiento mensual.

**Acciones:**

- Elegir precio final base y premium con fecha de vigencia.
- Definir regla de ajuste: mensual por IPC o por banda dolar MEP.
- Registrar meta de clientes para break-even y para rentabilidad objetivo.
- Actualizar estrategia para seguimiento quincenal de conversion y margen.

**Archivos afectados:**

- `contexto/estrategia.md`
- `salidas/2026-06-04-analisis-pricing-cvalletienda.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Area

- `contexto/estrategia.md` (prioridad de primeros clientes pagos y pregunta de precio optimo).
- `contexto/info-negocio.md` (mercado objetivo y propuesta de valor del sistema).
- `contexto/proyectos.md` (alcance funcional que justifica precio de software integral).

### Actualizaciones Necesarias para Consistencia

- Mantener actualizado el analisis de costos cada mes para no perder margen por inflacion.
- Alinear el precio elegido con los mensajes de venta y materiales comerciales en `salidas/`.

### Impacto en Flujos de Trabajo Existentes

- Permite usar `/implementar` para ejecutar un proceso de pricing repetible, no decisiones ad-hoc.
- Reduce riesgo de ventas no rentables al formalizar piso de precio y ajustes.

---

## Lista de Validacion

Como verificar que la implementacion esta completa y correcta:

- [ ] Costos fijos y variables reales documentados con fecha y fuente.
- [ ] Tabla de unit economics calculada para 3, 5, 10 y 20 clientes.
- [ ] Precio mensual base y premium definidos con margen explicito.
- [ ] Fee de onboarding definido para no subsidiar implementacion.
- [ ] Regla de ajuste mensual de precio documentada.
- [ ] Objetivo de break-even y objetivo de rentabilidad cargados en estrategia.

---

## Criterios de Exito

La implementacion esta completa cuando:

1. Existe una propuesta de precio mensual defendible por costos y por valor percibido.
2. Se conoce con claridad cuantas tiendas activas se necesitan para break-even.
3. El esquema comercial (onboarding + mensual + ajuste) puede ejecutarse inmediatamente con clientes reales.

---

## Notas

### Propuesta inicial recomendada (para salir a vender hoy)

Supuestos base de calculo (ajustables en la implementacion):

- Costos fijos mensuales operativos estimados: ARS 550000
- Costo variable mensual por cliente (soporte + uso incremental): ARS 12000
- Margen objetivo sobre precio neto: 35%
- Clientes objetivo en etapa inicial validada: 10

Formulas:

- `precio_minimo = (550000 / 10) + 12000 = ARS 67000`
- `precio_objetivo = 67000 / (1 - 0.35) = ARS 103077`

Recomendacion comercial:

- **Onboarding (unico): ARS 180000**
- **Plan Base mensual recomendado: ARS 89900** (precio de entrada validable en mercado)
- **Plan Pro mensual recomendado: ARS 129900** (prioridad soporte + mejoras avanzadas)
- **Precio de lista objetivo a 60-90 dias:** mover Base a ARS 99900 cuando haya 5+ casos de exito.

Regla practica de rentabilidad:

- No aceptar clientes nuevos por debajo de ARS 79900/mes salvo promo limitada con fecha de fin.
- Mantener fee de onboarding para cubrir alta, capacitacion y configuracion inicial.
- Ajustar cuota mensualmente por indice elegido para proteger margen.