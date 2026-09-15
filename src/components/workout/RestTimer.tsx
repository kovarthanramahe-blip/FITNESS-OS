import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface RestTimerProps {
  defaultSeconds?: number
  className?: string
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function RestTimer({ defaultSeconds = 90, className }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

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

  const isDone = secondsLeft === 0
  const percent = ((defaultSeconds - secondsLeft) / defaultSeconds) * 100

  return (
    <div className={cn('flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4', className)}>
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
            transition={{ duration: 0.3 }}
          />
        </svg>
        <Timer className="size-5 text-text-secondary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">Rest Timer</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={secondsLeft}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn('font-display text-xl font-bold tabular-nums', isDone ? 'text-success' : 'text-text-primary')}
          >
            {isDone ? 'Ready!' : formatTime(secondsLeft)}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label={isRunning ? 'Pause rest timer' : 'Start rest timer'}
          onClick={() => setIsRunning((current) => !current)}
          disabled={isDone}
        >
          {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Reset rest timer"
          onClick={() => {
            setIsRunning(false)
            setSecondsLeft(defaultSeconds)
          }}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  )
}
