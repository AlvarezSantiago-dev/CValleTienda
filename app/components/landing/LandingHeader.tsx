'use client'

import Link from 'next/link'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useState } from 'react'

export function LandingHeader() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none"
      style={{
        backgroundColor: scrolled ? 'color-mix(in oklab, var(--surface) 85%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled
          ? '1px solid color-mix(in oklab, var(--border-default) 80%, transparent)'
          : '1px solid transparent',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between pointer-events-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-7 h-7 rounded-[8px] bg-fg flex items-center justify-center
                          group-hover:opacity-80 transition-opacity"
          >
            <span className="text-fg-inverse text-[11px] font-bold tracking-tight">CV</span>
          </div>
          <span className="text-fg font-semibold text-[15px] tracking-tight">CValleTienda</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/login"
            className="text-[14px] text-fg-muted hover:text-fg font-medium px-4 py-2
                       rounded-full hover:bg-surface-sunken transition-colors duration-150"
          >
            Ingresar
          </Link>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center text-[14px] text-fg-inverse font-medium
                       h-10 px-5 rounded-full bg-fg hover:bg-fg-muted transition-colors duration-150
                       shadow-sm active:scale-[0.98]"
          >
            Empezar gratis
          </Link>
        </nav>
      </div>
    </motion.header>
  )
}
