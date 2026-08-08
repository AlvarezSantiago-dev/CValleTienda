interface ChartEmptyProps {
  message?: string
}

export function ChartEmpty({ message = 'Sin datos en el período seleccionado.' }: ChartEmptyProps) {
  return (
    <p className="text-sm text-fg-muted py-12 text-center">{message}</p>
  )
}
