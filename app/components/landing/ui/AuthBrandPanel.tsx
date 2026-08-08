'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Monitor, Package, FileText } from 'lucide-react'

const items = [
  {
    icon: Monitor,
    title: 'Punto de Venta rápido',
    desc: 'Código de barras, ticket automático al cerrar.',
  },
  {
    icon: Package,
    title: 'Stock en tiempo real',
    desc: 'Por variante, con alertas de stock bajo.',
  },
  {
    icon: FileText,
    title: 'Factura AFIP incluida',
    desc: 'Tipos A, B y C validadas por ARCA.',
  },
]

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-14 overflow-hidden bg-surface border-r border-border-subtle min-h-screen">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[10%] -left-[10%] w-[550px] h-[550px]"
          style={{
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute -bottom-[5%] -right-[5%] w-[400px] h-[400px]"
          style={{
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--warning-soft-fg) 10%, transparent) 0%, transparent 65%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/" className="flex items-center gap-3 w-fit">
          <div className="w-8 h-8 bg-fg rounded-[var(--radius-md)] flex items-center justify-center">
            <span className="text-white text-[13px] font-bold tracking-tight">C</span>
          </div>
          <span className="text-[15px] font-semibold text-fg tracking-tight">
            CValleTienda
          </span>
        </Link>
      </motion.div>

      <div className="space-y-12 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-[38px] font-bold tracking-[-0.028em] text-fg leading-[1.08] mb-4">
            El sistema que tu
            <br />
            <span className="bg-gradient-to-r from-brand-700 via-brand-500 to-brand-600 bg-clip-text text-transparent">
              negocio necesita.
            </span>
          </h2>
          <p className="text-[15px] text-fg-muted leading-relaxed">
            POS · Stock · Caja · CRM · Factura AFIP.
            <br />
            Todo en un sistema. Sin complicaciones.
          </p>
        </motion.div>

        <div className="space-y-6">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.22 + i * 0.09 }}
                className="flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-primary-soft flex items-center justify-center shrink-0 text-fg-brand">
                  <Icon size={17} strokeWidth={1.8} aria-hidden />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-fg mb-0.5">{item.title}</p>
                  <p className="text-[13px] text-fg-muted leading-snug">{item.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="relative space-y-2"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[12px] text-fg-subtle">
            Primer mes gratis · Sin tarjeta de crédito
          </p>
        </div>
        <p className="text-[11px] text-fg-subtle pl-3.5">
          <a href="/terminos" className="hover:text-fg-muted transition-colors">
            Términos
          </a>
          {' · '}
          <a href="/privacidad" className="hover:text-fg-muted transition-colors">
            Privacidad
          </a>
        </p>
      </motion.div>
    </div>
  )
}
