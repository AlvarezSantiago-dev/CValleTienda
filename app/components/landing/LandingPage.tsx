import Link from 'next/link'
import { LandingHeader } from './LandingHeader'
import { LandingFooter } from './LandingFooter'
import { AnimatedSection } from './ui/AnimatedSection'
import { FeatureCard } from './ui/FeatureCard'

// ─── SVG Icons (currentColor — hereda del wrapper) ───────────────────────────

function IconPOS() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01" />
    </svg>
  )
}

function IconStock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconCash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

function IconInvoice() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
}

function IconClients() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconReturn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </svg>
  )
}

function IconTruck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

// ─── Dashboard Illustration ───────────────────────────────────────────────────

function HeroDashboard() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto lg:mx-0">
      {/* Glow orbs behind the card */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-52 h-52 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 15%, transparent) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--warning) 20%, transparent) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 left-1/4 w-36 h-36 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--success) 12%, transparent) 0%, transparent 70%)' }}
      />

      {/* Main card */}
      <div className="relative bg-surface rounded-2xl border border-border-default/80 shadow-[0_24px_80px_rgba(0,0,0,0.13)] overflow-hidden">

        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border-default bg-surface-sunken/70">
          <div className="w-2.5 h-2.5 rounded-full bg-danger" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning" />
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="ml-3 text-[11px] text-fg-subtle font-medium tracking-tight">
            CValleTienda · Dashboard
          </span>
        </div>

        <div className="p-5">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="bg-primary-soft rounded-xl p-3">
              <p className="text-[9px] text-fg-brand font-semibold uppercase tracking-wider mb-1">
                Ventas hoy
              </p>
              <p className="text-[17px] font-bold text-fg leading-none">$48.200</p>
            </div>
            <div className="bg-success-soft rounded-xl p-3">
              <p className="text-[9px] text-success-soft-fg font-semibold uppercase tracking-wider mb-1">
                Tickets
              </p>
              <p className="text-[17px] font-bold text-fg leading-none">34</p>
            </div>
            <div className="bg-warning-soft rounded-xl p-3">
              <p className="text-[9px] text-warning-soft-fg font-semibold uppercase tracking-wider mb-1">
                Caja
              </p>
              <p className="text-[17px] font-bold text-fg leading-none">$12k</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-surface-sunken/80 rounded-xl p-3.5 mb-4">
            <p className="text-[9px] text-fg-muted font-medium mb-3">Ventas 7 días</p>
            <div className="flex items-end gap-1.5 h-14">
              <div className="flex-1 rounded-t bg-primary-soft" style={{ height: '45%' }} />
              <div className="flex-1 rounded-t bg-primary-soft" style={{ height: '68%' }} />
              <div className="flex-1 rounded-t bg-primary-soft" style={{ height: '52%' }} />
              <div className="flex-1 rounded-t bg-brand-200" style={{ height: '80%' }} />
              <div className="flex-1 rounded-t bg-primary-soft" style={{ height: '60%' }} />
              <div className="flex-1 rounded-t bg-primary" style={{ height: '95%' }} />
              <div className="flex-1 rounded-t bg-brand-200" style={{ height: '72%' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <span key={d} className="flex-1 text-center text-[8px] text-fg-subtle">{d}</span>
              ))}
            </div>
          </div>

          {/* Product list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-[11px] text-fg">Remera blanca — talle L</span>
              </div>
              <span className="text-[10px] font-semibold text-success-soft-fg bg-success-soft px-2 py-0.5 rounded-full">
                +12 vendidas
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-[11px] text-fg">Jean azul — talle 34</span>
              </div>
              <span className="text-[10px] font-semibold text-success-soft-fg bg-success-soft px-2 py-0.5 rounded-full">
                +8 vendidas
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-[11px] text-fg">Campera negra — S/M</span>
              </div>
              <span className="text-[10px] font-semibold text-warning-soft-fg bg-warning-soft px-2 py-0.5 rounded-full">
                ⚠ Stock bajo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge — invoice */}
      <div className="absolute -left-8 top-[30%] bg-surface border border-border-default shadow-[0_8px_24px_rgba(0,0,0,0.10)] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 hidden lg:flex">
        <div className="w-8 h-8 bg-success-soft rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="text-success" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-fg leading-none mb-0.5">
            Factura B emitida
          </p>
          <p className="text-[9px] text-fg-subtle">CAE obtenido · hace 2 min</p>
        </div>
      </div>

      {/* Floating badge — stock */}
      <div className="absolute -right-6 bottom-[25%] bg-surface border border-border-default shadow-[0_8px_24px_rgba(0,0,0,0.10)] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 hidden lg:flex">
        <div className="w-8 h-8 bg-primary-soft rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-fg leading-none mb-0.5">
            Stock actualizado
          </p>
          <p className="text-[9px] text-fg-subtle">+24 unidades ingresadas</p>
        </div>
      </div>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <IconPOS />,
    title: 'Punto de Venta',
    description: 'Vendé rápido usando el código de barras. El ticket se imprime automáticamente al cerrar la venta.',
    iconBg: 'bg-primary-soft',
    iconColor: 'text-fg-brand',
  },
  {
    icon: <IconStock />,
    title: 'Stock en tiempo real',
    description: 'Controlá el inventario por variante (talla, color, unidad). Alertas cuando el stock es bajo.',
    iconBg: 'bg-success-soft',
    iconColor: 'text-success-soft-fg',
  },
  {
    icon: <IconCash />,
    title: 'Caja y cierre',
    description: 'Apertura y cierre de caja con conciliación por método de pago. Sabés exactamente cuánto entraste.',
    iconBg: 'bg-warning-soft',
    iconColor: 'text-warning-soft-fg',
  },
  {
    icon: <IconInvoice />,
    title: 'Factura AFIP',
    description: 'Emitís facturas A, B o C validadas por ARCA desde el sistema. Sin software adicional.',
    iconBg: 'bg-primary-soft',
    iconColor: 'text-fg-brand',
  },
  {
    icon: <IconClients />,
    title: 'Clientes y CRM',
    description: 'Registrá tus clientes, consultá su historial de compras y llevá cuenta corriente.',
    iconBg: 'bg-primary-soft',
    iconColor: 'text-fg-brand',
  },
  {
    icon: <IconChart />,
    title: 'Dashboard con KPIs',
    description: 'Ganancia bruta, productos más vendidos, stock crítico y ventas del día. Todo en una pantalla.',
    iconBg: 'bg-success-soft',
    iconColor: 'text-success-soft-fg',
  },
  {
    icon: <IconReturn />,
    title: 'Devoluciones',
    description: 'Gestioná devoluciones totales o parciales con reintegro automático al stock.',
    iconBg: 'bg-warning-soft',
    iconColor: 'text-warning-soft-fg',
  },
  {
    icon: <IconTruck />,
    title: 'Remitos',
    description: 'Generá remitos profesionales en formato A4 para acompañar tus entregas o envíos.',
    iconBg: 'bg-surface-sunken',
    iconColor: 'text-fg-muted',
  },
]

const stats = [
  { value: '+500', label: 'Ventas procesadas' },
  { value: '99.9%', label: 'Uptime garantizado' },
  { value: '5 min', label: 'Tiempo de setup' },
]

const rubros = [
  '👗 Indumentaria',
  '🔧 Ferretería',
  '🏗️ Corralón',
  '🛒 Almacén',
  '📚 Librería',
  '🥩 Carnicería',
  '💊 Farmacia',
  '🥦 Verdulería',
  '🚚 Distribuidora',
]

const afipItems = [
  'Facturas A, B y C',
  'Código QR AFIP en el ticket',
  'CAE automático por venta',
  'PDF descargable al instante',
]

// ─── Component ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background antialiased">
      <LandingHeader />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-20 px-5 sm:px-8 overflow-hidden">
        {/* Gradient mesh background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Verde — centro arriba */}
          <div
            className="absolute"
            style={{
              top: '-10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '800px',
              height: '600px',
              background: 'radial-gradient(ellipse at center, color-mix(in oklab, var(--primary) 8%, transparent) 0%, transparent 65%)',
            }}
          />
          {/* Amber — derecha arriba */}
          <div
            className="absolute"
            style={{
              top: '-5%',
              right: '-5%',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(ellipse at center, color-mix(in oklab, var(--warning) 9%, transparent) 0%, transparent 65%)',
            }}
          />
          {/* Emerald — izquierda abajo */}
          <div
            className="absolute"
            style={{
              bottom: '0%',
              left: '-5%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(ellipse at center, color-mix(in oklab, var(--success) 7%, transparent) 0%, transparent 65%)',
            }}
          />
        </div>

        {/* Content grid */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* Left: text */}
            <div className="text-center lg:text-left">
              <AnimatedSection delay={0}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                                bg-surface border border-border-default shadow-sm
                                text-[12px] font-medium text-fg-muted tracking-wide uppercase mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Facturación electrónica AFIP incluida
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.1}>
                <h1 className="text-[40px] sm:text-[56px] lg:text-[60px] font-bold
                               tracking-[-0.03em] leading-[1.06] text-fg mb-6">
                  El sistema que tu
                  <br />
                  <span className="bg-gradient-to-r from-brand-700 via-brand-500 to-brand-600 bg-clip-text text-transparent">
                    negocio necesita.
                  </span>
                </h1>
              </AnimatedSection>

              <AnimatedSection delay={0.18}>
                <p className="text-[17px] sm:text-[18px] text-fg-muted leading-[1.65]
                              max-w-lg mx-auto lg:mx-0 mb-10">
                  POS · Stock · Caja · CRM · Factura AFIP.
                  <br />
                  Todo en un sistema. Sin complicaciones.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={0.26} className="relative z-10">
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                  <Link
                    href="/registro"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-full
                               bg-fg hover:bg-fg-muted text-fg-inverse text-[15px] font-semibold
                               transition-all duration-150 shadow-sm hover:shadow-md
                               active:scale-[0.98]"
                  >
                    Empezar gratis →
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-full
                               border border-border-default bg-surface hover:bg-surface-sunken text-fg
                               text-[15px] font-medium transition-all duration-150"
                  >
                    Ya tengo cuenta
                  </Link>
                </div>
                <p className="text-[13px] text-fg-subtle">
                  Sin tarjeta de crédito · Primer mes gratis · Configuración en 5 minutos
                </p>
              </AnimatedSection>
            </div>

            {/* Right: illustration */}
            <AnimatedSection delay={0.3} className="hidden lg:block">
              <HeroDashboard />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 px-5 sm:px-8 border-t border-b border-border-default">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 divide-x divide-border-default">
            {stats.map((s, i) => (
              <AnimatedSection key={s.label} delay={i * 0.08} className="text-center px-6">
                <div className="text-[28px] sm:text-[36px] font-bold text-fg tracking-tight leading-none mb-1">
                  {s.value}
                </div>
                <div className="text-[13px] text-fg-subtle">{s.label}</div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle mb-4">
              Funcionalidades
            </p>
            <h2 className="text-[32px] sm:text-[40px] font-bold text-fg tracking-[-0.02em] mb-4">
              Todo lo que tu negocio necesita
            </h2>
            <p className="text-[16px] text-fg-muted max-w-lg mx-auto leading-relaxed">
              Un sistema completo para comercios minoristas argentinos. Sin configuraciones complejas.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FeatureCard
                key={f.title}
                index={i}
                icon={f.icon}
                title={f.title}
                description={f.description}
                iconBg={f.iconBg}
                iconColor={f.iconColor}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── AFIP Highlight ── */}
      <section className="py-20 px-5 sm:px-8 bg-surface-sunken">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="rounded-3xl border border-border-default bg-surface p-10 sm:p-14
                            flex flex-col sm:flex-row gap-10 items-start">
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-brand mb-4">
                  Facturación electrónica
                </p>
                <h2 className="text-[26px] sm:text-[32px] font-bold text-fg
                               tracking-[-0.02em] mb-4 leading-tight">
                  Factura electrónica AFIP
                  <br />
                  lista el primer día.
                </h2>
                <p className="text-[15px] text-fg-muted leading-relaxed max-w-sm">
                  Integramos TusFacturasAPP para que emitas facturas A, B o C validadas por ARCA
                  directo desde el sistema. Sin instalar nada extra.
                </p>
              </div>

              <div className="flex-shrink-0 space-y-3 sm:pt-14">
                {afipItems.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-success-soft text-success flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-[14px] text-fg font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Rubros ── */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle mb-4">
              Multi-rubro
            </p>
            <h2 className="text-[26px] sm:text-[32px] font-bold text-fg tracking-[-0.02em] mb-3">
              Adaptado a tu negocio
            </h2>
            <p className="text-[15px] text-fg-muted mb-10">
              No importa qué vendés. CValleTienda se adapta al rubro de tu comercio.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {rubros.map((r) => (
                <span
                  key={r}
                  className="px-4 py-2 rounded-full border border-border-default bg-surface
                             text-[13px] text-fg-muted font-medium cursor-default
                             hover:border-primary-border hover:text-fg-brand transition-colors duration-150"
                >
                  {r}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative py-28 px-5 sm:px-8 overflow-hidden">
        {/* Gradient mesh */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in oklab, var(--primary) 6%, transparent) 0%, transparent 100%)',
            }}
          />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-[32px] sm:text-[42px] font-bold text-fg
                           tracking-[-0.025em] leading-tight mb-5">
              Empezá hoy.
              <br />
              <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                Es gratis el primer mes.
              </span>
            </h2>
            <p className="text-[16px] text-fg-muted mb-10">
              Creá tu cuenta y tenés el sistema funcionando en minutos.
            </p>
            <Link
              href="/registro"
              className="relative z-10 inline-flex items-center justify-center h-12 px-10 rounded-full
                         bg-fg hover:bg-fg-muted text-fg-inverse text-[15px] font-semibold
                         transition-all duration-150 shadow-sm hover:shadow-md
                         active:scale-[0.98]"
            >
              Crear cuenta gratis →
            </Link>
            <p className="text-[13px] text-fg-subtle mt-5">
              ¿Tenés dudas?{' '}
              <a
                href="https://wa.me/5492984000000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
              >
                Escribinos por WhatsApp
              </a>
            </p>
          </AnimatedSection>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
