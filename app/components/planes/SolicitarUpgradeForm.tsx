'use client'

import { useState } from 'react'
import { solicitarUpgrade } from '@/app/actions/planes'

export function SolicitarUpgradeForm() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const mensaje = fd.get('mensaje') as string | null
    const res = await solicitarUpgrade(mensaje ?? undefined)
    setResult(res)
    setLoading(false)
  }

  if (result?.ok) {
    return (
      <div className="rounded-xl bg-lime-50 border border-lime-200 px-4 py-3 text-sm text-lime-800">
        ¡Solicitud enviada! El equipo de CValleTienda la procesará en menos de 24 hs.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {result?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {result.error}
        </div>
      )}
      <textarea
        name="mensaje"
        rows={3}
        placeholder="¿Algo que quieras contarnos? (opcional)"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#0A0A0A] hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold rounded-full transition-colors"
      >
        {loading ? 'Enviando...' : 'Solicitar upgrade a Pro'}
      </button>
    </form>
  )
}
