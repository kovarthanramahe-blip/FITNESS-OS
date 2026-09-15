import { motion, useReducedMotion } from 'framer-motion'
import { Pause, Play, Plus, SkipForward, Timer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { clamp } from '@/utils/format'
import { formatElapsed } from '@/utils/workout'

export interface RestTimerProps {
  presets?: number[]
  defaultSeconds?: number
  /** Increment this from a parent (e.g. after completing a set) to (re)start the timer. */
  restartSignal?: number
  className?: string
}

const DEFAULT_PRESETS = [30, 60, 90, 120]

export function RestTimer({
  presets = DEFAULT_PRESETS,
  defaultSeconds = presets[1] ?? 60,
  restartSignal,
  className,
}: RestTimerProps) {
  const [duration, setDuration] = useState(defaultSeconds)
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const intervalRef = useRef<number | null>(null)
  const isFirstRender = useRef(true)
  const prefersReducedMotion = useReducedMotion()

  // Intentionally reacts only to restartSignal; picking up a `defaultSeconds`
  // change alone (e.g. navigating to an exercise with a different rest
  // duration) must not auto-start the timer.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setDuration(defaultSeconds)
    setSecondsLeft(defaultSeconds)
    setIsRunning(true)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [restartSignal])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setIsRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const isIdle = !isRunning && secondsLeft === duration
  const isDone = secondsLeft === 0
  const percent = clamp(((duration - secondsLeft) / duration) * 100, 0, 100)

  function start(seconds: number) {
    setDuration(seconds)
    setSecondsLeft(seconds)
    setIsRunning(true)
  }

  function startCustom() {
    const value = Math.round(Number(customInput))
    if (!Number.isFinite(value) || value <= 0) return
    start(value)
    setCustomInput('')
  }

  if (isIdle) {
    return (
      <div className={cn('rounded-[var(--radius-lg)] border border-border bg-surface p-4', className)}>
        <p className="mb-3 text-sm font-medium text-text-secondary">Start Rest Timer</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button key={preset} variant="secondary" size="sm" onClick={() => start(preset)}>
              {preset}s
            </Button>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Custom"
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              aria-label="Custom rest duration in seconds"
              className="h-9 w-24 rounded-[var(--radius-sm)] border border-border bg-surface-elevated px-2.5 text-sm text-text-primary [appearance:textfield] placeholder:text-text-muted focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button variant="ghost" size="sm" onClick={startCustom} disabled={!customInput}>
              Set
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4', className)}
      role="status"
      aria-label={isDone ? 'Rest complete' : `Resting, ${formatElapsed(secondsLeft)} remaining`}
    >
      <div className="relative flex size-14 shrink-0 items-center justify-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
          <circle cx="28" cy="28" r="24" strokeWidth="4" className="fill-none stroke-surface-elevated" />
          <motion.circle
            cx="28"
            cy="28"
            r="24"
            strokeWidth="4"
            strokeLinecap="round"
            className={cn('fill-none', isDone ? 'stroke-success' : 'stroke-secondary')}
            strokeDasharray={2 * Math.PI * 24}
            animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - percent / 100) }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
          />
        </svg>
        <Timer className="size-5 text-text-secondary" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">Rest</p>
        <p
          aria-live="off"
          className={cn('font-display text-2xl font-bold tabular-nums', isDone ? 'text-success' : 'text-text-primary')}
        >
          {isDone ? 'Ready!' : formatElapsed(secondsLeft)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {!isDone && (
          <Button variant="secondary" size="sm" onClick={() => setSecondsLeft((s) => s + 30)} aria-label="Add 30 seconds">
            <Plus className="size-3.5" aria-hidden="true" />
            30
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          aria-label={isRunning ? 'Pause rest timer' : 'Resume rest timer'}
          onClick={() => setIsRunning((current) => !current)}
          disabled={isDone}
        >
          {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        {!isDone && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Skip rest"
            onClick={() => {
              setIsRunning(false)
              setSecondsLeft(0)
            }}
          >
            <SkipForward className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
