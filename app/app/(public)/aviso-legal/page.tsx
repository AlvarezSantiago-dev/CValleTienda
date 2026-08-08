import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/LegalDocument'
import { AVISO_LEGAL } from '@/lib/legal/content'
import { SITE_LEGAL } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: `Aviso legal · ${SITE_LEGAL.productName}`,
  description: `Aviso legal de ${SITE_LEGAL.productName}.`,
}

export default function AvisoLegalPage() {
  return <LegalDocument doc={AVISO_LEGAL} />
}
