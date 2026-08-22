import { SITE_LEGAL } from './site'

export type LegalSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type LegalDoc = {
  title: string
  intro: string
  sections: LegalSection[]
  disclaimer: string
}

const { productName, operatorName, jurisdiction, locality, contactEmail, lastUpdated } =
  SITE_LEGAL

const disclaimer = `Este documento es orientativo y no constituye asesoramiento legal. Última actualización: ${lastUpdated}.`

export const TERMINOS: LegalDoc = {
  title: 'Términos y condiciones',
  intro: `Estos términos regulan el acceso y uso de ${productName}, un software como servicio (SaaS) de punto de venta y gestión comercial operado por ${operatorName}. Al crear una cuenta o usar el servicio, aceptás estos términos.`,
  sections: [
    {
      heading: '1. Objeto del servicio',
      paragraphs: [
        `${productName} ofrece herramientas web para comercios minoristas, incluyendo entre otras: punto de venta (POS), stock, caja, clientes, ventas, devoluciones, remitos, reportes, configuración multi-rubro e integraciones opcionales (por ejemplo facturación electrónica y pagos).`,
        'El servicio se presta bajo un modelo de suscripción por tienda (tenant). Las funcionalidades disponibles pueden variar según el plan contratado y el rubro configurado.',
      ],
    },
    {
      heading: '2. Cuenta y registro',
      paragraphs: [
        'Para usar el servicio debés registrarte con datos veraces (email, nombre, datos de la tienda). Sos responsable de mantener la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.',
        'Podés invitar usuarios a tu tienda según los roles que el sistema permita. El titular de la cuenta de la tienda es responsable del uso que hagan esos usuarios.',
      ],
    },
    {
      heading: '3. Planes, trial y pagos',
      paragraphs: [
        'Podemos ofrecer un período de prueba u otros beneficios promocionales. Al finalizar el trial o al contratar un plan de pago, aplican los precios y condiciones vigentes al momento de la contratación.',
        'Los pagos de suscripción pueden procesarse a través de terceros (por ejemplo MercadoPago). El incumplimiento de pago puede implicar la suspensión o limitación del acceso al servicio.',
      ],
    },
    {
      heading: '4. Obligaciones del comerciante',
      paragraphs: [
        'Sos responsable de la legalidad de tu actividad comercial, de la exactitud de productos, precios, stock, clientes y de cualquier documento fiscal o comercial que emitas mediante el sistema o integraciones.',
        'No debés usar el servicio para fines ilícitos, abusivos o que vulneren derechos de terceros. Tampoco debés intentar vulnerar la seguridad, la multitenencia u otros sistemas conectados.',
      ],
    },
    {
      heading: '5. Impresión local y software auxiliar',
      paragraphs: [
        'Algunas funciones (tickets, etiquetas) pueden requerir software local opcional (por ejemplo PrintBridge) instalado en equipos de tu comercio. Ese software opera en tu infraestructura; su correcta configuración e impresión son de tu responsabilidad.',
      ],
    },
    {
      heading: '6. Integraciones de terceros',
      paragraphs: [
        'El servicio puede integrarse con proveedores externos (infraestructura, autenticación, almacenamiento, pagos, facturación electrónica u otros). El uso de esas integraciones puede estar sujeto a los términos de cada proveedor (por ejemplo Supabase, MercadoPago, TusFacturasAPP / AFIP-ARCA).',
        'No controlamos ni garantizamos la continuidad de servicios de terceros. Una interrupción o cambio en esos proveedores puede afectar funciones del producto.',
      ],
    },
    {
      heading: '7. Disponibilidad y cambios',
      paragraphs: [
        'Procuramos mantener el servicio disponible de forma razonable, pero no garantizamos disponibilidad ininterrumpida. Podemos realizar mantenimientos, mejoras o cambios de funcionalidad.',
        'Podemos modificar estos términos publicando la versión actualizada en el sitio. El uso continuado tras la publicación implica aceptación de los cambios, salvo que la ley exija otra forma de consentimiento.',
      ],
    },
    {
      heading: '8. Propiedad intelectual',
      paragraphs: [
        `El software, la marca ${productName}, el diseño y los materiales del sitio son propiedad de ${operatorName} o de sus licenciantes. Se te otorga una licencia limitada, no exclusiva e intransferible para usar el servicio conforme a estos términos.`,
        'Los datos de tu negocio (productos, ventas, clientes, etc.) siguen siendo tuyos. Nos otorgás una licencia limitada para procesarlos solo en la medida necesaria para prestar el servicio.',
      ],
    },
    {
      heading: '9. Limitación de responsabilidad',
      paragraphs: [
        `En la máxima medida permitida por la ley aplicable, ${operatorName} no será responsable por daños indirectos, lucro cesante, pérdida de datos o interrupciones del negocio derivados del uso o la imposibilidad de uso del servicio.`,
        'Sin perjuicio de lo anterior, cualquier responsabilidad agregada relacionada con el servicio se limitará, en la medida legal posible, al monto efectivamente abonado por la suscripción en los tres (3) meses previos al reclamo.',
      ],
    },
    {
      heading: '10. Terminación',
      paragraphs: [
        'Podés dejar de usar el servicio en cualquier momento. Podemos suspender o cancelar el acceso ante incumplimiento de estos términos, falta de pago, riesgo de seguridad o requerimiento legal.',
        'Tras la terminación, el acceso a la cuenta puede cesar. Podremos conservar o eliminar datos según nuestra política de privacidad y obligaciones legales.',
      ],
    },
    {
      heading: '11. Ley aplicable',
      paragraphs: [
        `Estos términos se rigen por las leyes de la ${jurisdiction}. Para cualquier controversia, las partes se someten a los tribunales competentes de ${locality}, sin perjuicio de derechos imperativos del consumidor o usuario que pudieran corresponder.`,
        `Consultas: ${contactEmail}.`,
      ],
    },
  ],
  disclaimer,
}

export const PRIVACIDAD: LegalDoc = {
  title: 'Política de privacidad',
  intro: `Esta política describe cómo ${operatorName} trata datos personales en relación con ${productName}. Se aplica a titulares de cuentas, usuarios invitados y visitantes del sitio de marketing.`,
  sections: [
    {
      heading: '1. Responsable',
      paragraphs: [
        `El responsable del tratamiento es ${operatorName}, con operación referida a ${locality}, ${jurisdiction}. Contacto: ${contactEmail}.`,
      ],
    },
    {
      heading: '2. Datos que recolectamos',
      paragraphs: ['Podemos tratar, entre otros:'],
      bullets: [
        'Datos de cuenta: nombre, email, contraseña (almacenada de forma hasheada por el proveedor de autenticación).',
        'Datos de la tienda: nombre comercial, rubro, configuración, logo y datos fiscales que cargues.',
        'Datos operativos: productos, stock, ventas, clientes, caja, remitos, devoluciones y registros de uso necesarios para el servicio.',
        'Datos técnicos: dirección IP, tipo de dispositivo/navegador, logs de seguridad y métricas de uso agregadas.',
        'Datos de pago de suscripción: gestionados principalmente por el procesador de pagos (por ejemplo MercadoPago); nosotros podemos recibir estados de pago y referencias.',
      ],
    },
    {
      heading: '3. Finalidades',
      paragraphs: ['Tratamos los datos para:'],
      bullets: [
        'Prestar, mantener y mejorar el servicio SaaS.',
        'Autenticar usuarios y administrar multi-tenancy (aislamiento por tienda).',
        'Gestionar planes, trial, facturación de suscripción y soporte.',
        'Cumplir obligaciones legales y responder a requerimientos válidos.',
        'Proteger la seguridad del sistema y prevenir abusos.',
      ],
    },
    {
      heading: '4. Base del tratamiento',
      paragraphs: [
        'El tratamiento se basa en la ejecución del contrato de servicio (cuenta/suscripción), el consentimiento cuando corresponda (por ejemplo comunicaciones opcionales), e intereses legítimos de seguridad y mejora del producto, siempre dentro del marco de la Ley 25.326 de Protección de Datos Personales y normas complementarias de la República Argentina.',
      ],
    },
    {
      heading: '5. Encargados y terceros',
      paragraphs: [
        'Para operar el servicio utilizamos proveedores que actúan como encargados o destinatarios según el caso, por ejemplo:',
      ],
      bullets: [
        'Infraestructura, base de datos y autenticación (p. ej. Supabase).',
        'Hosting / despliegue (p. ej. Vercel).',
        'Pagos de suscripción (p. ej. MercadoPago).',
        'Facturación electrónica opcional (p. ej. TusFacturasAPP / AFIP-ARCA), cuando la activés.',
      ],
    },
    {
      heading: '6. Conservación',
      paragraphs: [
        'Conservamos los datos mientras la cuenta esté activa y el tiempo adicional necesario para fines legales, contables, de seguridad o resolución de disputas. Podés solicitar baja o eliminación conforme a la ley; algunas retenciones pueden ser obligatorias.',
        'Cuando uses PrintBridge u otra herramienta instalada en tu PC, el procesamiento local ocurre en tu entorno.',
      ],
    },
    {
      heading: '7. Derechos de los titulares',
      paragraphs: [
        `Podés ejercer derechos de acceso, rectificación, actualización y, cuando corresponda, supresión u oposición, según la Ley 25.326 y normativa aplicable. El titular de la tienda puede eliminar la cuenta y los datos del negocio desde Configuración → Avanzado (hay que confirmar el nombre de la tienda). Un usuario invitado puede eliminar su propio login desde la misma pantalla, o el dueño puede borrarlo en Equipo. También podés escribinos a ${contactEmail} desde el email asociado a tu cuenta.`,
        'También podés presentar reclamos ante la Agencia de Acceso a la Información Pública (AAIP) u organismo que corresponda en Argentina.',
      ],
    },
    {
      heading: '8. Seguridad',
      paragraphs: [
        `Aplicamos medidas técnicas y organizativas razonables (control de acceso, aislamiento por tienda, HTTPS, políticas en base de datos). Ningún sistema es 100% seguro; te pedimos proteger tus credenciales y reportar incidentes a ${contactEmail}.`,
      ],
    },
    {
      heading: '9. Menores',
      paragraphs: [
        'El servicio está dirigido a comercios y usuarios mayores de edad con capacidad para contratar. No recopilamos deliberadamente datos de menores.',
      ],
    },
    {
      heading: '10. Cambios',
      paragraphs: [
        'Podemos actualizar esta política publicando la versión vigente en el sitio. La fecha de última actualización figura al pie. Ante cambios sustanciales, procuraremos avisarte por medios razonables cuando corresponda.',
      ],
    },
  ],
  disclaimer,
}

export const AVISO_LEGAL: LegalDoc = {
  title: 'Aviso legal',
  intro: `Información identificatoria y condiciones generales de uso del sitio público de ${productName}.`,
  sections: [
    {
      heading: '1. Identificación del servicio',
      paragraphs: [
        `Denominación comercial: ${productName}.`,
        `Operador: ${operatorName}.`,
        `Ámbito geográfico de referencia: ${locality}, ${jurisdiction}.`,
        `Contacto: ${contactEmail}.`,
      ],
    },
    {
      heading: '2. Objeto del sitio',
      paragraphs: [
        'El sitio de marketing presenta el producto, permite el acceso a registro e inicio de sesión, y publica información legal. El uso del software tras autenticarse se rige además por los Términos y condiciones y la Política de privacidad.',
      ],
    },
    {
      heading: '3. Propiedad intelectual',
      paragraphs: [
        `Los contenidos del sitio (textos, marcas, logotipos, diseño e ilustraciones), salvo indicación en contrario, pertenecen a ${operatorName} o a terceros que han autorizado su uso. Queda prohibida la reproducción no autorizada con fines comerciales.`,
      ],
    },
    {
      heading: '4. Enlaces',
      paragraphs: [
        'El sitio puede incluir enlaces a sitios de terceros. No somos responsables del contenido ni de las políticas de esos sitios.',
      ],
    },
    {
      heading: '5. Documentos relacionados',
      paragraphs: [
        'Para el uso del servicio, consultá también los Términos y condiciones y la Política de privacidad, disponibles en este mismo sitio.',
      ],
    },
  ],
  disclaimer,
}
