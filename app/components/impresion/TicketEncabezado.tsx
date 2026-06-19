import type { TiendaPayload } from '@/lib/impresion/types'

interface Props {
  tienda: TiendaPayload
  /** Mostrar teléfono en cabecera (default true) */
  mostrarTelefono?: boolean
  /** Mostrar texto_encabezado configurable (default true) */
  mostrarEncabezado?: boolean
}

export function TicketEncabezado({
  tienda,
  mostrarTelefono = true,
  mostrarEncabezado = true,
}: Props) {
  const showLogo =
    tienda.mostrar_logo !== false && Boolean(tienda.logo_url?.trim())
  const maxHeight = (tienda.ancho_mm ?? 80) <= 58 ? 40 : 52
  const direccion = tienda.direccion_legal || tienda.direccion

  return (
    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tienda.logo_url!}
          alt=""
          width={maxHeight}
          height={maxHeight}
          style={{
            display: 'block',
            margin: '0 auto 4px',
            objectFit: 'contain',
            maxWidth: '90%',
          }}
        />
      )}
      <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
        {tienda.razon_social || tienda.nombre}
      </div>
      {tienda.cuit && <div>CUIT: {tienda.cuit}</div>}
      {tienda.condicion_iva && <div>{tienda.condicion_iva}</div>}
      {direccion && <div>{direccion}</div>}
      {mostrarTelefono && tienda.telefono && <div>Tel: {tienda.telefono}</div>}
      {mostrarEncabezado && tienda.texto_encabezado && (
        <div style={{ whiteSpace: 'pre-line', marginTop: '2px' }}>{tienda.texto_encabezado}</div>
      )}
    </div>
  )
}
