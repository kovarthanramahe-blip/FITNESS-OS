import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BodyMeasurementsList } from './BodyMeasurementsList'
import type { BodyMeasurement } from '@/types/progress'

const measurements: BodyMeasurement[] = [
  { id: 'm-1', type: 'Waist', date: '2024-05-01', value: 86, unit: 'cm' },
  { id: 'm-2', type: 'Waist', date: '2024-06-01', value: 84, unit: 'cm', note: 'After cut' },
]

describe('BodyMeasurementsList', () => {
  it('renders an empty state when there are no measurements', () => {
    render(<BodyMeasurementsList measurements={[]} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('No measurements logged')).toBeInTheDocument()
  })

  it('lists measurements most recent first', () => {
    render(<BodyMeasurementsList measurements={measurements} onEdit={() => {}} onDelete={() => {}} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('84 cm')
    expect(items[1]).toHaveTextContent('86 cm')
  })

  it('calls onEdit with the selected measurement', async () => {
    const user = userEvent.setup()
    const handleEdit = vi.fn()
    render(<BodyMeasurementsList measurements={measurements} onEdit={handleEdit} onDelete={() => {}} />)

    await user.click(screen.getAllByLabelText(/Edit Waist measurement/)[0]!)

    expect(handleEdit).toHaveBeenCalledWith(measurements[1])
  })

  it('calls onDelete with the selected measurement', async () => {
    const user = userEvent.setup()
    const handleDelete = vi.fn()
    render(<BodyMeasurementsList measurements={measurements} onEdit={() => {}} onDelete={handleDelete} />)

    await user.click(screen.getAllByLabelText(/Delete Waist measurement/)[0]!)

    expect(handleDelete).toHaveBeenCalledWith(measurements[1])
  })
})
