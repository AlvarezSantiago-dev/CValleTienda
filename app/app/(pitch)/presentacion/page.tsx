import type { Metadata } from 'next'
import { PitchDeck } from '@/components/pitch/PitchDeck'

export const metadata: Metadata = {
  title: 'CValleTienda — Presentación rápida',
  description:
    'Presentación rápida de capacidades del sistema POS/CRM para comercios. Ideal para la primera visita al local.',
  robots: { index: false, follow: false },
}

export default function PresentacionPage() {
  return <PitchDeck />
}
