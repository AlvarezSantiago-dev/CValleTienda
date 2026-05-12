'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

function IconPOS() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01" />
    </svg>
  )
}

function IconStock() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconAFIP() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
}

const items = [
  {
    icon: <IconPOS />,
    title: 'Punto de Venta rápido',
    desc: 'Código de barras, ticket automático al cerrar.',
  },
  {
    icon: <IconStock />,
    title: 'Stock en tiempo real',
    desc: 'Por variante, con alertas de stock bajo.',
  },
  {
    icon: <IconAFIP />,
    title: 'Factura AFIP incluida',
    desc: 'Tipos A, B y C validadas por ARCA.',
  },
]

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-14 overflow-hidden bg-white border-r border-gray-100 min-h-screen">
      {/* Gradient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            top: '-10%',
            left: '-10%',
            width: '550px',
            height: '550px',
            background: 'radial-gradient(ellipse at center, rgba(101,163,13,0.09) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-5%',
            right: '-5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/" className="flex items-center gap-3 w-fit">
          <div className="w-8 h-8 bg-[#0A0A0A] rounded-lg flex items-center justify-center">
            <span className="text-white text-[13px] font-bold tracking-tight">C</span>
          </div>
          <span className="text-[15px] font-semibold text-[#0A0A0A] tracking-tight">
            CValleTienda
          </span>
        </Link>
      </motion.div>

      {/* Main content */}
      <div className="space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-[38px] font-bold tracking-[-0.028em] text-[#0A0A0A] leading-[1.08] mb-4">
            El sistema que tu
            <br />
            <span className="bg-gradient-to-r from-lime-700 via-lime-500 to-lime-600 bg-clip-text text-transparent">
              negocio necesita.
            </span>
          </h2>
          <p className="text-[15px] text-gray-500 leading-relaxed">
            POS · Stock · Caja · CRM · Factura AFIP.
            <br />
            Todo en un sistema. Sin complicaciones.
          </p>
        </motion.div>

        <div className="space-y-6">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.22 + i * 0.09 }}
              className="flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-lime-50 flex items-center justify-center flex-shrink-0 text-lime-700">
                {item.icon}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#0A0A0A] mb-0.5">{item.title}</p>
                <p className="text-[13px] text-gray-500 leading-snug">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
        <p className="text-[12px] text-gray-400">
          Primer mes gratis · Sin tarjeta de crédito
        </p>
      </motion.div>
    </div>
  )
}
