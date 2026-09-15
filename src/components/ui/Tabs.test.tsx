import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Tab, TabList, Tabs } from './Tabs'

function ControlledTabs() {
  const [value, setValue] = useState('overview')
  return (
    <Tabs value={value} onChange={setValue}>
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="history">History</Tab>
      </TabList>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('marks the active tab as selected', () => {
    render(<ControlledTabs />)
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'false')
  })

  it('switches the active tab on click', async () => {
    const user = userEvent.setup()
    render(<ControlledTabs />)

    await user.click(screen.getByRole('tab', { name: 'History' }))

    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false')
  })
})
