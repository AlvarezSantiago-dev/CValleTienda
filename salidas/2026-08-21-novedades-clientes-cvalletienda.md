# Novedades CV-MiTienda — Julio y agosto 2026

Documento para clientes activos. Resumen de lo nuevo, lo que se corrigió y lo que se viene. No incluye las novedades de junio (gráficos, atajos, horario): ese PDF sigue valiendo.

**Generar PDF (recomendado):**

```bash
# Primera vez: instalar Playwright (solo el paquete npm, sin descargar Chromium)
npm install playwright

# Desde la raíz del repo
node scripts/generar-pdf-novedades.mjs --html salidas/2026-08-21-novedades-clientes-cvalletienda.html --out salidas/cv-mitienda-actualizaciones-agosto-2026.pdf --pages 9
```

Salida: `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf` (9 páginas A4)

Regenerar el PDF de **junio** (sin args): `node scripts/generar-pdf-novedades.mjs`

**Fallback manual (Chrome):**

1. Abrí `2026-08-21-novedades-clientes-cvalletienda.html` en Chrome (doble clic desde `salidas/`)
2. Ctrl+P → Destino: **Guardar como PDF**
3. Papel: **A4** · Márgenes: **Ninguno** · Escala: **100%**
4. **Desactivar** “Encabezados y pies de página”
5. **Activar** “Gráficos de fondo”

---

## Portada

**CV-MiTienda** — Actualización julio · agosto 2026

**Lo nuevo en tu sistema**

Mejoras, correcciones y lo que se viene.

Destacados:

- Cara nueva + caja que se entiende (montos, saldos, el cajero carga un egreso)
- Fotos, carga express (ropa) y descuentos por cantidad
- Correcciones de peso, devoluciones, menú en el celular y tickets
- Se viene: **catálogo para todos** y **caja con inteligencia artificial**

Pie: CV-MiTienda · Para imprimir o guardar en el teléfono

---

## 1. Se ve distinto. Es el mismo sistema, más claro.

**Nuevo**

Pantallas más simples, números más legibles, mismos menús.

**Dónde:** todo el sistema (no hay que activar nada).

- **Inicio** más limpio: los números del día se leen de un vistazo
- **POS y caja** con más aire: cobrar y cerrar el turno sin apretar tanto la vista
- **Celular y tablet** usables de verdad (menú, pantallas y botones)

**Tip:** si algo “no está donde era”, es el mismo ítem con otro diseño — el menú no cambió de nombre.

**Corregido:** el menú del teléfono que no navegaba **ya está arreglado**. Abrís, tocás y cerrás.

---

## 2. Cobrar y ver la plata, sin adivinar

**Nuevo / mejora**

**Dónde:** POS · Menú → **Caja** · **Inicio**

- Al tocar **Cobrar** se abre una **pantalla grande** de montos (método, recibido, vuelto). Cliente, descuento y notas siguen en el panel.
- El cajero puede **anotar un ingreso o un egreso** del turno (por ejemplo, pagar mercadería al proveedor). Editar o borrar un movimiento: solo el dueño, con la caja abierta. Se ve quién cargó cada uno.
- En Inicio y Caja ves tres números: **saldo al momento**, **por acreditar** y **proyectado**.
- Redondeo de efectivo a $100 visible en el ticket (si lo tenés activo).

**Tip:** “Por acreditar” es Mercado Pago / transferencia que todavía no impactó. El número grande es lo que ya debería estar en esa cuenta.

---

## 3. Productos: foto, carga rápida y stock que no frena

**Nuevo**

- **Fotos:** sacá la foto en el local o subí un archivo. No hace falta pegar un link. Se ven en el listado de productos y en la grilla de caja.
  - **Dónde:** Productos → alta o edición
- **Ropa — Carga express:** una pantalla para modelo, precios y stock distinto por talle y color. También pegá texto tipo `1 rojo XS, 2 rojos M`.
  - **Dónde:** Productos → Carga express *(si tu rubro es ropa)*
- **Despensa / carnicería — stock ilimitado:** marcá ∞ en lo que reponés siempre (pan, bebidas, fiambre). Se vende sin tope y no descuenta unidades.
- **Packs:** si escaneás un código nuevo, podés asociarlo a un producto que ya existe. Al completar N unidades sueltas, el POS aplica solo el precio del pack.

**Tip:** la foto que subas hoy es la que va a verse en el catálogo cuando se active.

---

## 4. Mayorista, fiado y un papel para cada cobro

**Nuevo** *(si tu rubro es…)*

- **Tramos:** en el producto, “desde 6 unidades, 10 %”. El POS aplica el descuento solo. Si no cargás tramos, el precio no cambia.
  - **Dónde:** Productos → tramos de cantidad
- **Distribuidora:** en el POS elegís Contado o A cuenta, con recargo de cuenta por producto, remito solo y saldo en la ficha del cliente.
  - **Dónde:** POS + Clientes
- **Recibo de cobro:** cada seña o pago a cuenta imprime un ticket. El remito muestra Total / Pagado / Pendiente.

**Tip:** si tu tienda no es distribuidora, los tramos igual sirven para “llevate 3 y te hago precio”.

---

## 5. Lo que corregimos

Bugs reales de caja y de pantalla. Ya están en el sistema. Si viste alguno, actualizá la página (o reabrí el sistema) y ya no debería pasar.

**Corregido**

1. **Peso con coma.** En kilo o gramo, `1,350` funciona. El total de pantalla coincide con el ticket. Los códigos de balanza en gramos se interpretan bien.
2. **Cambios y saldo a favor.** Ya no inflan el cierre de caja del turno. En ventas se entiende si se pagó con crédito. Preferí **Cambio de producto** cuando el cliente cambia talle o color.
3. **Montos grandes.** Los importes (millones) ya no se recortan al cobrar.
4. **Menú en el celular.** El menú que no respondía ahora abre, navega y cierra.
5. **Tickets térmicos.** Un solo “gracias”, sin caracteres raros, vale de cambio con texto corto. Si el programita de impresión lo pide, actualizalo.
6. **Un remito, no dos.** Al confirmar un pedido a cuenta o envío, sale un remito solo.
7. **Saldos de cuentas.** Restan comisión y se distingue “ya está” vs “por acreditar”.

---

## 6. Próxima actualización: catálogo para todos

**Próximamente · próxima actualización**

**Tu vidriera en un link — para todos**

En la **próxima actualización** cada comercio va a poder compartir un catálogo con el nombre del local. El cliente no se registra ni paga online.

- Vas a tener un **link** con el nombre de tu negocio, para Instagram, WhatsApp o el estado.
- El cliente va a ver **fotos y precios** y va a armar el pedido (retiro o envío).
- Te va a llegar el **WhatsApp** y el pedido va a entrar al sistema (campana + lista).
- Vos elegís **qué** productos se muestran: nada se publica solo.
- El stock se va a descontar cuando **confirmés** el pedido, no cuando te escriban.

**Tip:** ir subiendo fotos ahora (página de productos) para que el día 1 el catálogo no esté vacío.

Todavía no está en el menú para todos. Te avisamos cuando se active.

---

## 7. Pronto: inteligencia artificial en tu caja

**Próximamente**

**Hablale a la caja. La inteligencia artificial cobra por vos.**

Pronto CV-MiTienda deja de ser solo teclado y scanner. Le hablás como le hablás al cajero, y el sistema arma la venta, te dice el total y el vuelto **en voz**, y cobra cuando vos decís que sí.

> “Cobrame 3 Coca de 3 litros, 359 gramos de paleta y un aceite de girasol, me dieron 20 mil.”

Tres cosas del mostrador, hablando:

1. **Vender** varios ítems en una frase, con vuelto.
2. **Cargar** un producto nuevo (nombre, costo, venta, código).
3. **Cambiar un precio** sin entrar a editar la ficha.

**Control:** nada se registra hasta que confirmás (voz o un toque). Si hay dos “Coca”, pregunta cuál — no adivina.

La primera versión cubre el mostrador del día a día: vender de contado, dar de alta y ajustar precio. El resto del sistema sigue como lo conocés.

Va a estar incluido en tu sistema. Te avisamos cuando se active.

---

## 8. Cierre y contacto

**Seguimos del lado de tu caja**

Este PDF cubre julio y agosto. El de junio (gráficos, atajos, horario) sigue valiendo.

**Próxima entrega:** catálogo para todos + inteligencia artificial en caja.

- WhatsApp: **+54 299 658-7715**
- Email: **santiagoalvarezc5@gmail.com**

---

## Mensaje sugerido para WhatsApp

```
Hola! Te paso el resumen de lo nuevo en CV-MiTienda (julio y agosto): caja, productos, correcciones, y lo que se viene (catálogo + inteligencia artificial en caja). Cualquier duda, escribime.
```

Adjuntar: `salidas/cv-mitienda-actualizaciones-agosto-2026.pdf`

Este envío va **sin capturas**.
