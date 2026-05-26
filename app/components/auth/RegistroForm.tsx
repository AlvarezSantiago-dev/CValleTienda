'use client'

import { useRef, useState } from 'react'
import { registroAction } from '@/app/actions/auth'
import { RubroSelector } from '@/components/ui/RubroSelector'
import { PasswordInput } from '@/components/ui/PasswordInput'

export function RegistroForm({ error }: { error?: string }) {
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [matchError, setMatchError] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const pw = passwordRef.current?.value ?? ''
    const confirm = confirmRef.current?.value ?? ''

    if (pw !== confirm) {
      e.preventDefault()
      setMatchError(true)
      confirmRef.current?.focus()
      return
    }

    setMatchError(false)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px] ' +
    'focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 ' +
    'transition-all duration-150 placeholder:text-gray-300'

  const inputErrorClass =
    'w-full px-4 py-3 rounded-xl border border-red-300 text-[15px] bg-red-50/40 ' +
    'focus:outline-none focus:ring-2 focus:ring-red-300/60 focus:border-red-400 ' +
    'transition-all duration-150 placeholder:text-gray-300'

  return (
    <form action={registroAction} onSubmit={handleSubmit} className="space-y-4">
      {(error || matchError) && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          {matchError ? 'Las contraseñas no coinciden' : error}
        </div>
      )}

      <div>
        <label htmlFor="nombre_tienda" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Nombre de la tienda
        </label>
        <input
          id="nombre_tienda"
          name="nombre_tienda"
          type="text"
          required
          placeholder="Ej: Moda Centro"
          className={inputClass}
        />
      </div>

      <RubroSelector />

      <div>
        <label htmlFor="nombre" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Tu nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          placeholder="Ej: Martina"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Contraseña
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className={inputClass}
          ref={passwordRef}
          onChange={() => setMatchError(false)}
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Repetir contraseña
        </label>
        <PasswordInput
          id="confirm_password"
          name="confirm_password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Repetí la contraseña"
          className={matchError ? inputErrorClass : inputClass}
          ref={confirmRef}
          onChange={() => setMatchError(false)}
        />
        {matchError && (
          <p className="mt-1.5 text-[12px] text-red-600">Las contraseñas no coinciden</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full h-12 rounded-full bg-[#0A0A0A] hover:bg-gray-800
                   text-white text-[15px] font-semibold
                   transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] mt-2"
      >
        Crear cuenta gratis →
      </button>
    </form>
  )
}
