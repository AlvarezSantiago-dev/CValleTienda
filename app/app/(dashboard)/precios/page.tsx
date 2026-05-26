import { BuscadorPrecios } from '@/components/precios/BuscadorPrecios'

export default function PreciosPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Lista de precios</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Escaneá o buscá un producto para ver su precio.
        </p>
      </div>

      <div className="max-w-xl">
        <BuscadorPrecios />
      </div>
    </div>
  )
}
