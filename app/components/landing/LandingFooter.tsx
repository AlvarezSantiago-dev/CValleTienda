import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-[6px] bg-[#0A0A0A] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">CV</span>
              </div>
              <span className="text-[#0A0A0A] font-semibold text-[14px] tracking-tight">
                CValleTienda
              </span>
            </div>
            <p className="text-[13px] text-gray-400 leading-relaxed max-w-[200px]">
              Sistema POS/CRM para comercios minoristas argentinos.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-4">
              Acceso
            </p>
            <nav className="space-y-2.5">
              <div>
                <Link
                  href="/login"
                  className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Ingresar
                </Link>
              </div>
              <div>
                <Link
                  href="/registro"
                  className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Crear cuenta gratis
                </Link>
              </div>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-4">
              Empresa
            </p>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              Argentina · Facturación electrónica AFIP/ARCA mediante TusFacturasAPP.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row
                        items-center justify-between gap-2">
          <p className="text-[12px] text-gray-400">
            © {new Date().getFullYear()} CValleTienda · Todos los derechos reservados
          </p>
          <p className="text-[12px] text-gray-300">Hecho en Argentina 🇦🇷</p>
        </div>
      </div>
    </footer>
  )
}

