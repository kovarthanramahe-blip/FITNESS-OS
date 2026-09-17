import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TimeRangeSelector } from './TimeRangeSelector'

describe('TimeRangeSelector — layout', () => {
  it('centers the control within its container', () => {
    const { container } = render(<TimeRangeSelector value="3M" onChange={vi.fn()} />)

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('justify-center')
  })

  it('caps the tablist width to its container and scrolls internally instead of overflowing', () => {
    render(<TimeRangeSelector value="3M" onChange={vi.fn()} />)

    const tablist = screen.getByRole('tablist')
    expect(tablist.className).toContain('max-w-full')
    expect(tablist.className).toContain('overflow-x-auto')
  })

  it('merges a caller-provided className onto the centering wrapper, not the tablist', () => {
    const { container } = render(<TimeRangeSelector value="3M" onChange={vi.fn()} className="mb-4" />)

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('mb-4')
    expect(wrapper.className).toContain('justify-center')
  })

  it('gives every option the same fixed width, regardless of label length ("30D"/"ALL" vs "7D"/"3M"/"6M"/"1Y")', () => {
    render(<TimeRangeSelector value="3M" onChange={vi.fn()} />)

    const widthClasses = screen.getAllByRole('tab').map((tab) => {
      const match = tab.className.match(/(?:^|\s)w-\S+/)
      return match?.[0].trim()
    })

    expect(widthClasses.every((cls) => cls !== undefined)).toBe(true)
    expect(new Set(widthClasses).size).toBe(1)
  })
})

describe('TimeRangeSelector — behavior (unchanged by the layout fix)', () => {
  it('renders all six range options in order', () => {
    render(<TimeRangeSelector value="3M" onChange={vi.fn()} />)

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['7D', '30D', '3M', '6M', '1Y', 'ALL'])
  })

  it('marks the selected range with aria-selected and calls onChange for another', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TimeRangeSelector value="3M" onChange={onChange} />)

    expect(screen.getByRole('tab', { name: '3M' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '7D' })).toHaveAttribute('aria-selected', 'false')

    await user.click(screen.getByRole('tab', { name: '1Y' }))
    expect(onChange).toHaveBeenCalledWith('1Y')
  })

  it('every option remains a reachable, accessible button even when scrollable', () => {
    render(<TimeRangeSelector value="ALL" onChange={vi.fn()} />)

    for (const label of ['7D', '30D', '3M', '6M', '1Y', 'ALL']) {
      expect(screen.getByRole('tab', { name: label })).toBeVisible()
    }
  })
})
