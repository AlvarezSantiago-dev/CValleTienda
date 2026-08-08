import Link from 'next/link'
import { SITE_LEGAL } from '@/lib/legal/site'

export function LandingFooter() {
  return (
    <footer className="bg-surface border-t border-border-default">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-[6px] bg-fg flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">CV</span>
              </div>
              <span className="text-fg font-semibold text-[14px] tracking-tight">
                {SITE_LEGAL.productName}
              </span>
            </div>
            <p className="text-[13px] text-fg-subtle leading-relaxed max-w-[200px]">
              Sistema POS/CRM para comercios minoristas argentinos.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle mb-4">
              Acceso
            </p>
            <nav className="space-y-2.5">
              <div>
                <Link
                  href="/login"
                  className="text-[13px] text-fg-muted hover:text-fg transition-colors"
                >
                  Ingresar
                </Link>
              </div>
              <div>
                <Link
                  href="/registro"
                  className="text-[13px] text-fg-muted hover:text-fg transition-colors"
                >
                  Crear cuenta gratis
                </Link>
              </div>
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle mb-4">
              Legal
            </p>
            <nav className="space-y-2.5">
              <div>
                <Link
                  href="/terminos"
                  className="text-[13px] text-fg-muted hover:text-fg transition-colors"
                >
                  Términos y condiciones
                </Link>
              </div>
              <div>
                <Link
                  href="/privacidad"
                  className="text-[13px] text-fg-muted hover:text-fg transition-colors"
                >
                  Política de privacidad
                </Link>
              </div>
              <div>
                <Link
                  href="/aviso-legal"
                  className="text-[13px] text-fg-muted hover:text-fg transition-colors"
                >
                  Aviso legal
                </Link>
              </div>
            </nav>
          </div>
        </div>

        <div
          className="mt-10 pt-6 border-t border-border-default flex flex-col sm:flex-row
                        items-center justify-between gap-2"
        >
          <p className="text-[12px] text-fg-subtle">
            © {new Date().getFullYear()} {SITE_LEGAL.productName} · Todos los derechos reservados
          </p>
          <p className="text-[12px] text-fg-subtle">
            {SITE_LEGAL.locality} · {SITE_LEGAL.jurisdiction}
          </p>
        </div>
      </div>
    </footer>
  )
}
