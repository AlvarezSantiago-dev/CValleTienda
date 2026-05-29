import { ean13Modules, code128Modules, EAN13_MODULES } from '@/lib/impresion/barcode-svg'
import { validateEAN13 } from '@/lib/barcode'

interface CodigoBarrasSVGProps {
  /** Código EAN-13 (13 dígitos con checksum). */
  code: string
  /** Ancho total del SVG en milímetros. */
  widthMm?: number
  /** Alto del área de barras en milímetros (sin contar el texto). */
  heightMm?: number
  /** Mostrar el código en texto debajo. Default: true. */
  showText?: boolean
}

/**
 * Renderiza un EAN-13 como SVG puro, sin dependencias.
 * Pensado para etiquetas (medido en mm). Las barras son `<rect>` en negro.
 */
export function CodigoBarrasSVG({
  code,
  widthMm = 38,
  heightMm = 14,
  showText = true,
}: CodigoBarrasSVGProps) {
  const isEAN13 = validateEAN13(code)
  const modules = isEAN13 ? ean13Modules(code) : code128Modules(code)

  // No hay módulos → no renderizar nada (el texto código se muestra aparte)
  if (!modules) return null

  // ── Code128 (no EAN-13) ──────────────────────────────────────────
  if (!isEAN13) {
    const mw = 1
    const totalW = modules.length * mw
    const barH = 50
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${totalW} ${barH}`}
        width={`${widthMm}mm`}
        height={`${heightMm}mm`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={{ display: 'block' }}
      >
        {modules.map((m, i) =>
          m === 1 ? (
            <rect key={i} x={i * mw} y={0} width={mw} height={barH} fill="#000" />
          ) : null
        )}
      </svg>
    )
  }

  // ── EAN-13 ───────────────────────────────────────────────────────
  const moduleWidth = 1
  const totalWidth = EAN13_MODULES * moduleWidth // 95
  const barHeight = 50
  const textHeight = showText ? 12 : 0
  const totalHeight = barHeight + textHeight

  // Texto: 1 + 6 + 6 = 13 dígitos, distribuidos: primero a la izq de las guardas,
  // luego 6 en el bloque izq (ocupa 42 módulos), 6 en el bloque der (ocupa 42 módulos).
  const firstDigit = code[0]
  const leftDigits = code.slice(1, 7)
  const rightDigits = code.slice(7, 13)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={`${widthMm}mm`}
      height={`${heightMm + (showText ? 4 : 0)}mm`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
    >
      {modules.map((m, i) =>
        m === 1 ? (
          <rect
            key={i}
            x={i * moduleWidth}
            y={0}
            width={moduleWidth}
            height={barHeight}
            fill="#000"
          />
        ) : null
      )}
      {showText && (
        <g fill="#000" fontFamily="monospace" fontSize="10" textAnchor="middle">
          <text x={-3} y={barHeight + 10}>{firstDigit}</text>
          <text x={3 + 21} y={barHeight + 10}>{leftDigits}</text>
          <text x={3 + 42 + 5 + 21} y={barHeight + 10}>{rightDigits}</text>
        </g>
      )}
    </svg>
  )
}
