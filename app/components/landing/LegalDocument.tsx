import { SITE_LEGAL } from '@/lib/legal/site'
import type { LegalDoc } from '@/lib/legal/content'

interface Props {
  doc: LegalDoc
}

export function LegalDocument({ doc }: Props) {
  return (
    <article className="mx-auto max-w-2xl px-5 sm:px-8 py-28 sm:py-32">
      <header className="mb-10 pb-8 border-b border-border-default">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle mb-3">
          Legal
        </p>
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.025em] text-fg leading-tight mb-3">
          {doc.title}
        </h1>
        <p className="text-[13px] text-fg-muted">
          {SITE_LEGAL.productName} · Actualizado {SITE_LEGAL.lastUpdated}
        </p>
      </header>

      <p className="text-[15px] text-fg-muted leading-relaxed mb-10">{doc.intro}</p>

      <div className="space-y-9">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[17px] font-semibold text-fg tracking-tight mb-3">
              {section.heading}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((p, i) => (
                <p key={i} className="text-[14px] text-fg-muted leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-2 text-[14px] text-fg-muted leading-relaxed">
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 pt-6 border-t border-border-default text-[12px] text-fg-subtle leading-relaxed">
        {doc.disclaimer}
      </p>
    </article>
  )
}
