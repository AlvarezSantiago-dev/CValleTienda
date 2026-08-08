'use client'

import Link from 'next/link'
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
    'w-full px-4 py-3 rounded-[var(--radius-lg)] border border-border-default text-[15px] ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ' +
    'transition-all duration-150 placeholder:text-fg-subtle'

  const inputErrorClass =
    'w-full px-4 py-3 rounded-[var(--radius-lg)] border border-danger-border text-[15px] bg-danger-soft/40 ' +
    'focus:outline-none focus:ring-2 focus:ring-danger/40 focus:border-danger-border ' +
    'transition-all duration-150 placeholder:text-fg-subtle'

  return (
    <form action={registroAction} onSubmit={handleSubmit} className="space-y-4">
      {(error || matchError) && (
        <div className="px-4 py-3 rounded-[var(--radius-lg)] bg-danger-soft border border-danger-border text-[13px] text-danger-soft-fg">
          {matchError ? 'Las contraseñas no coinciden' : error}
        </div>
      )}

      <div>
        <label htmlFor="nombre_tienda" className="block text-[13px] font-medium text-fg mb-1.5">
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
        <label htmlFor="nombre" className="block text-[13px] font-medium text-fg mb-1.5">
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
        <label htmlFor="email" className="block text-[13px] font-medium text-fg mb-1.5">
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
        <label htmlFor="password" className="block text-[13px] font-medium text-fg mb-1.5">
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
        <label htmlFor="confirm_password" className="block text-[13px] font-medium text-fg mb-1.5">
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
          <p className="mt-1.5 text-[12px] text-danger-soft-fg">Las contraseñas no coinciden</p>
        )}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer pt-1">
        <input
          type="checkbox"
          name="acepta_terminos"
          value="1"
          required
          className="mt-1 h-4 w-4 rounded border-border-default text-primary
                     focus:ring-2 focus:ring-primary/40 accent-[var(--primary)]"
        />
        <span className="text-[12px] text-fg-muted leading-relaxed">
          Acepto los{' '}
          <Link href="/terminos" target="_blank" className="text-fg-brand hover:underline font-medium">
            Términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" target="_blank" className="text-fg-brand hover:underline font-medium">
            Política de privacidad
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        className="w-full h-12 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted
                   text-white text-[15px] font-semibold
                   transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] mt-2"
      >
        Crear cuenta gratis →
      </button>
    </form>
  )
}
