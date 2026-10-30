'use client'

import { useEffect, useRef, useState } from 'react'

/** Animates a number from its previous value to `target` (easeOutCubic). Respects reduced motion. */
export function useCountUp(target: number, enabled = true, duration = 1100) {
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const length = reduce ? 0 : duration
    const start = performance.now()
    const startValue = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = length === 0 ? 1 : Math.min(1, (now - start) / length)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(startValue + (target - startValue) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled, duration])

  return value
}
