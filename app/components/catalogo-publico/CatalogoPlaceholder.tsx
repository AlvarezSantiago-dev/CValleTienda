export function CatalogoPlaceholder({ nombre }: { nombre: string }) {
  const inicial = (nombre.trim().slice(0, 1) || '?').toUpperCase()
  return (
    <div className="w-full h-full bg-surface-sunken flex items-center justify-center text-fg-subtle">
      <span className="text-3xl font-semibold select-none">{inicial}</span>
    </div>
  )
}
