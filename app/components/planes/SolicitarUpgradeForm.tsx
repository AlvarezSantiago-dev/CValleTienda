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
      <div className="rounded-[var(--radius-lg)] bg-primary-soft border border-primary-border px-4 py-3 text-sm text-primary-soft-fg">
        ¡Solicitud enviada! El equipo de CValleTienda la procesará en menos de 24 hs.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {result?.error && (
        <div className="rounded-[var(--radius-lg)] bg-danger-soft border border-danger-border px-4 py-3 text-sm text-red-800">
          {result.error}
        </div>
      )}
      <textarea
        name="mensaje"
        rows={3}
        placeholder="¿Algo que quieras contarnos? (opcional)"
        className="w-full border border-border-default rounded-[var(--radius-lg)] px-4 py-3 text-sm text-fg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-fg hover:bg-fg-muted disabled:opacity-50 text-white text-sm font-semibold rounded-[var(--radius-full)] transition-colors"
      >
        {loading ? 'Enviando...' : 'Solicitar upgrade a Pro'}
      </button>
    </form>
  )
}
