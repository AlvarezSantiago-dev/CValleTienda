import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/LegalDocument'
import { PRIVACIDAD } from '@/lib/legal/content'
import { SITE_LEGAL } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: `Política de privacidad · ${SITE_LEGAL.productName}`,
  description: `Política de privacidad de ${SITE_LEGAL.productName}.`,
}

export default function PrivacidadPage() {
  return <LegalDocument doc={PRIVACIDAD} />
}
