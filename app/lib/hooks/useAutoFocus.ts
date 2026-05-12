'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Enfoca el elemento referenciado al montar.
 * Si se pasan deps, refoca cuando cambian.
 *
 * @param ref Ref al input/textarea/elemento focalizable.
 * @param deps Dependencias adicionales que disparan refoco.
 * @param select Si true, selecciona el contenido tras enfocar (sólo en inputs).
 */
export function useAutoFocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: unknown[] = [],
  select = false
) {
  useEffect(() => {
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
  }, deps)
}
