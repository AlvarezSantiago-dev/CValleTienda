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
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-[8px] bg-[#0A0A0A] flex items-center justify-center
                          group-hover:opacity-80 transition-opacity">
            <span className="text-white text-[11px] font-bold tracking-tight">CV</span>
          </div>
          <span className="text-[#0A0A0A] font-semibold text-[15px] tracking-tight">
            CValleTienda
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/login"
            className="text-[14px] text-gray-500 hover:text-gray-900 font-medium px-4 py-2
                       rounded-full hover:bg-black/5 transition-colors duration-150"
          >
            Ingresar
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/registro"
              className="text-[14px] text-white font-medium px-5 py-2 rounded-full
                         bg-[#0A0A0A] hover:bg-gray-800 transition-colors duration-150
                         shadow-sm"
            >
              Empezar gratis
            </Link>
          </motion.div>
        </nav>
      </div>
    </motion.header>
  )
}
