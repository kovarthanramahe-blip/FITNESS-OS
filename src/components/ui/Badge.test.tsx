import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>7 day streak</Badge>)
    expect(screen.getByText('7 day streak')).toBeInTheDocument()
  })

  it('applies the accent variant styling by default only when requested', () => {
    render(<Badge variant="accent">Level 7</Badge>)
    expect(screen.getByText('Level 7')).toHaveClass('text-accent')
  })
})
