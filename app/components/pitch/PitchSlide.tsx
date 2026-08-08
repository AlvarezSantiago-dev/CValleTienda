'use client'

import type { PitchPoint } from './pitch-content'
import {
  PITCH_CLOSING,
  PITCH_CONTACT,
  PITCH_COVER,
  PITCH_PRICING,
  whatsappHref,
} from './pitch-content'
import { PitchIcon } from './pitch-icons'
import { VisualCoverPair, visualForPoint } from './PitchVisuals'

export function CoverSlide() {
  return (
    <section
      className="flex min-h-[100dvh] flex-col px-5 pb-28 pt-8 text-white sm:px-8 lg:px-12"
      style={{
        backgroundColor: '#0a0a09',
        backgroundImage:
          'radial-gradient(ellipse 70% 45% at 90% 10%, rgba(132,204,22,0.2), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(101,163,13,0.12), transparent 50%)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-cloudvalle.png"
          alt="CloudValle"
          width={44}
          height={44}
          className="rounded-[11px] object-contain"
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#84cc16' }}>
            {PITCH_COVER.eyebrow}
          </p>
          <p className="text-[15px] font-bold tracking-tight">{PITCH_COVER.brand}</p>
        </div>
      </div>

      <div className="mt-6 grid flex-1 grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <p
            className="mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ backgroundColor: '#84cc16', color: '#0a0a09' }}
          >
            {PITCH_COVER.planHint}
          </p>
          <h1 className="text-[30px] font-black leading-[1.05] tracking-[-0.04em] sm:text-[40px]">
            {PITCH_COVER.title}
          </h1>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/65 sm:text-[15px]">
            {PITCH_COVER.subtitle}
          </p>
          <ul className="mt-5 space-y-2 text-[13px] text-white/75">
            <li className="flex gap-2">
              <span style={{ color: '#84cc16' }}>✓</span>
              Ticket térmico con logo y datos de TEST TIENDA
            </li>
            <li className="flex gap-2">
              <span style={{ color: '#84cc16' }}>✓</span>
              Etiquetas personalizables (campos, tamaño, código)
            </li>
            <li className="flex gap-2">
              <span style={{ color: '#84cc16' }}>✓</span>
              Operación completa del local en un solo sistema
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-center">
          <VisualCoverPair />
          <p className="mt-3 text-center text-[11px] text-white/40">{PITCH_COVER.visualCaption}</p>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-white/40">Deslizá o tocá las flechas →</p>
    </section>
  )
}

export function PointSlide({ point }: { point: PitchPoint }) {
  return (
    <section className="flex min-h-[100dvh] flex-col bg-[#fafaf9] px-5 pb-28 pt-8 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[28px] font-black tracking-[-0.06em] sm:text-[36px]"
            style={{ color: 'rgba(10,10,9,0.15)' }}
          >
            {String(point.number).padStart(2, '0')}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ backgroundColor: '#ecfccb', color: '#3f6212' }}
          >
            Incluido
          </span>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[12px] sm:h-11 sm:w-11"
          style={{ backgroundColor: '#0a0a09', color: '#84cc16' }}
        >
          <PitchIcon name={point.iconKey} />
        </div>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-1 items-center gap-5 lg:grid-cols-2 lg:gap-10">
        <div>
          <h2 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#0a0a09] sm:text-[32px]">
            {point.title}
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#44433e] sm:text-[16px]">
            {point.body}
          </p>
          <ul className="mt-5 space-y-2">
            {point.highlights.map((h) => (
              <li
                key={h}
                className="flex items-center gap-2 rounded-xl border border-[#e9e8e5] bg-white px-3 py-2.5 text-[13px] font-medium text-[#0a0a09] shadow-sm"
              >
                <span className="text-[#65a30d]">✓</span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end">{visualForPoint(point.id)}</div>
      </div>
    </section>
  )
}

export function ClosingSlide() {
  return (
    <section className="flex min-h-[100dvh] flex-col bg-[#fafaf9] px-5 pb-28 pt-8 sm:px-8 lg:px-12">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-cloudvalle.png"
          alt="CloudValle"
          width={40}
          height={40}
          className="rounded-[10px] object-contain"
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4d7c0f]">
            {PITCH_CLOSING.eyebrow}
          </p>
          <p className="text-[13px] font-semibold text-[#0a0a09]">CValleTienda</p>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-[26px] font-extrabold tracking-[-0.035em] text-[#0a0a09] sm:text-[32px]">
          {PITCH_CLOSING.title}
        </h2>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#5b5a54]">
          {PITCH_CLOSING.subtitle}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-[16px] border p-5 text-white"
          style={{ backgroundColor: '#0a0a09', borderColor: '#0a0a09' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
            {PITCH_PRICING.planLabel}
          </p>
          <p className="mt-1 text-[32px] font-black tracking-tight" style={{ color: '#84cc16' }}>
            {PITCH_PRICING.planPrice}
            <span className="ml-1 text-[14px] font-semibold text-white/50">
              {PITCH_PRICING.planUnit}
            </span>
          </p>
          <p className="mt-2 text-[13px] text-white/60">
            Acceso completo: POS, caja, stock, clientes, remitos, devoluciones, reportes y etiquetas.
          </p>
        </div>

        <div className="rounded-[16px] border border-[#e9e8e5] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5b5a54]">
            {PITCH_PRICING.installLabel}
          </p>
          <p className="mt-1 text-[28px] font-black tracking-tight text-[#0a0a09]">
            {PITCH_PRICING.installPrice}
          </p>
          <p className="mt-1 text-[12px] text-[#44433e]">{PITCH_PRICING.installIncludes}</p>
          <p className="mt-3 border-t border-[#f5f5f3] pt-3 text-[12px] text-[#5b5a54]">
            {PITCH_PRICING.hardwareNote}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <a
          href={whatsappHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-[15px] font-semibold text-white"
          style={{ backgroundColor: '#65a30d' }}
        >
          {PITCH_CLOSING.ctaPrimary}
        </a>
        <a
          href={`mailto:${PITCH_CONTACT.email}`}
          className="text-center text-[13px] font-medium text-[#5b5a54] underline-offset-2 hover:underline"
        >
          {PITCH_CLOSING.ctaSecondary}
        </a>
        <p className="text-center text-[12px] text-[#a9a8a2]">
          WhatsApp {PITCH_CONTACT.whatsappDisplay}
        </p>
      </div>
    </section>
  )
}
