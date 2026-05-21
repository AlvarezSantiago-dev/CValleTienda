import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('[email] RESEND_API_KEY no configurada — emails deshabilitados')
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null
