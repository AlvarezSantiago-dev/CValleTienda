'use client'

interface PosAtajosHelpProps {
  open: boolean
  onClose: () => void
  modoGuiado?: boolean
}

const ATAJOS_CLASICO = [
  { tecla: 'F2', accion: 'Cobrar (tarjeta/MP) o cargar efectivo' },
  { tecla: 'Ctrl + Enter', accion: 'Igual que F2' },
  { tecla: 'Enter', accion: 'Cobrar desde monto / cerrar impresión' },
  { tecla: '↑ ↓', accion: 'Navegar resultados del buscador' },
  { tecla: 'Esc', accion: 'Volver al buscador' },
  { tecla: '?', accion: 'Mostrar esta ayuda' },
] as const

const ATAJOS_GUIADO = [
  { tecla: 'F2', accion: 'Abrir asistente de cobro paso a paso' },
  { tecla: 'Ctrl + Enter', accion: 'Igual que F2' },
  { tecla: 'Enter', accion: 'Siguiente paso / confirmar venta en el último paso' },
  { tecla: 'Esc', accion: 'Cerrar asistente o volver al buscador' },
  { tecla: '↑ ↓', accion: 'Navegar resultados del buscador' },
  { tecla: '?', accion: 'Mostrar esta ayuda' },
] as const

export function PosAtajosHelp({ open, onClose, modoGuiado = false }: PosAtajosHelpProps) {
  if (!open) return null

  const atajos = modoGuiado ? ATAJOS_GUIADO : ATAJOS_CLASICO

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-atajos-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="pos-atajos-title" className="text-[15px] font-bold text-gray-900">
            Atajos de teclado
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <ul className="space-y-2">
          {atajos.map(({ tecla, accion }) => (
            <li key={tecla} className="flex items-center justify-between gap-4 text-[13px]">
              <kbd className="font-mono text-[12px] bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-800 shrink-0">
                {tecla}
              </kbd>
              <span className="text-gray-600 text-right">{accion}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-gray-400">
          {modoGuiado
            ? 'En el asistente, Enter avanza entre pasos. En el último paso confirma la venta.'
            : 'Los atajos no funcionan mientras escribís en un campo de texto.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-10 rounded-full bg-[#0A0A0A] text-white text-sm font-semibold hover:bg-gray-800"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
