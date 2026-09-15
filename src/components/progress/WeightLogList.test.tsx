import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WeightLogList } from './WeightLogList'
import type { WeightLog } from '@/types/progress'

const logs: WeightLog[] = [
  { id: 'log-1', date: '2024-05-01', weightKg: 75 },
  { id: 'log-2', date: '2024-06-01', weightKg: 72.4, note: 'Morning' },
]

describe('WeightLogList', () => {
  it('renders an empty state when there are no entries', () => {
    render(<WeightLogList logs={[]} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('No weight entries yet')).toBeInTheDocument()
  })

  it('lists entries most recent first', () => {
    render(<WeightLogList logs={logs} onEdit={() => {}} onDelete={() => {}} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('72.4 kg')
    expect(items[1]).toHaveTextContent('75.0 kg')
  })

  it('calls onEdit with the selected entry', async () => {
    const user = userEvent.setup()
    const handleEdit = vi.fn()
    render(<WeightLogList logs={logs} onEdit={handleEdit} onDelete={() => {}} />)

    await user.click(screen.getAllByLabelText(/Edit weight entry/)[0]!)

    expect(handleEdit).toHaveBeenCalledWith(logs[1])
  })

  it('calls onDelete with the selected entry', async () => {
    const user = userEvent.setup()
    const handleDelete = vi.fn()
    render(<WeightLogList logs={logs} onEdit={() => {}} onDelete={handleDelete} />)

    await user.click(screen.getAllByLabelText(/Delete weight entry/)[0]!)

    expect(handleDelete).toHaveBeenCalledWith(logs[1])
  })
})
