import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

export interface UseCountUpOptions {
  duration?: number
  /** Skip the 0 -> target animation (e.g. inside a modal that reopens). */
  disabled?: boolean
}

/** Animates a number from 0 up to `target`, respecting prefers-reduced-motion. */
export function useCountUp(target: number, { duration = 1.1, disabled = false }: UseCountUpOptions = {}): number {
  const prefersReducedMotion = useReducedMotion()
  const skipAnimation = Boolean(prefersReducedMotion) || disabled
  const [animatedValue, setAnimatedValue] = useState(target)

  useEffect(() => {
    if (skipAnimation) return

    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setAnimatedValue,
    })

    return () => controls.stop()
  }, [target, duration, skipAnimation])

  return skipAnimation ? target : animatedValue
}
