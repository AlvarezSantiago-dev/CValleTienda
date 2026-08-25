'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Enfoca el elemento referenciado al montar (o cuando deps/enabled cambian).
 */
export function useAutoFocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: unknown[] = [],
  select = false,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    el.focus()
    if (
      select &&
      'select' in el &&
      typeof (el as unknown as HTMLInputElement).select === 'function'
    ) {
      ;(el as unknown as HTMLInputElement).select()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])
}
