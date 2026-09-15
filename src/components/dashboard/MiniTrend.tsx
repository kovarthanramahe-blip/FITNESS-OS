export interface MiniTrendProps {
  values: number[]
  className?: string
  /** A Tailwind `stroke-*` utility class, e.g. `stroke-accent`. */
  strokeClassName?: string
}

export function MiniTrend({ values, className, strokeClassName = 'stroke-accent' }: MiniTrendProps) {
  if (values.length < 2) return null

  const width = 72
  const height = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
      />
    </svg>
  )
}
