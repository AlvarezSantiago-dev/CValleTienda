'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildDeckSlides } from './pitch-content'
import { ClosingSlide, CoverSlide, PointSlide } from './PitchSlide'

export function PitchDeck() {
  const slides = useMemo(() => buildDeckSlides(), [])
  const total = slides.length
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)))
    },
    [total]
  )

  const prev = useCallback(() => go(index - 1), [go, index])
  const next = useCallback(() => go(index + 1), [go, index])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Home') {
        go(0)
      } else if (e.key === 'End') {
        go(total - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, next, prev, total])

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null
    touchStartY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null || touchStartY.current == null) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current
    const dx = endX - touchStartX.current
    const dy = endY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) next()
    else prev()
  }

  const slide = slides[index]
  const progress = ((index + 1) / total) * 100

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden bg-[#fafaf9]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Presentación rápida CValleTienda"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute left-0 right-0 top-0 z-30 h-1.5 bg-[#e9e8e5]">
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%`, backgroundColor: '#84cc16' }}
        />
      </div>

      <div className="relative min-h-[100dvh] w-full" aria-live="polite">
        {slide?.kind === 'cover' && <CoverSlide />}
        {slide?.kind === 'point' && <PointSlide point={slide.point} />}
        {slide?.kind === 'closing' && <ClosingSlide />}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[max(12px,env(safe-area-inset-bottom))] pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Anterior"
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[#e9e8e5] bg-white text-[#0a0a09] shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft />
          </button>

          <div className="flex flex-1 flex-col items-center gap-2">
            <p className="rounded-full bg-white/90 px-3 py-1 font-mono text-[12px] tabular-nums text-[#5b5a54] shadow-sm">
              {index + 1} / {total}
            </p>
          </div>

          <button
            type="button"
            onClick={next}
            disabled={index === total - 1}
            aria-label="Siguiente"
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[#e9e8e5] bg-white text-[#0a0a09] shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
