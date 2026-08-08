import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/LegalDocument'
import { TERMINOS } from '@/lib/legal/content'
import { SITE_LEGAL } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: `Términos y condiciones · ${SITE_LEGAL.productName}`,
  description: `Términos y condiciones de uso de ${SITE_LEGAL.productName}.`,
}

export default function TerminosPage() {
  return <LegalDocument doc={TERMINOS} />
}
