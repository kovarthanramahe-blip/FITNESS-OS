import { expect, test } from '@playwright/test'

test.describe('Habits', () => {
  test('habits page loads with its major sections', async ({ page }) => {
    await page.goto('/habits')

    await expect(page.getByRole('heading', { name: 'Habits', exact: true, level: 1 })).toBeVisible()
    await expect(page.getByText("Today’s Habits")).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Water', exact: true })).toBeVisible()
    await expect(page.locator('[data-testid^="habit-card-"]').filter({ hasText: 'Complete workout' })).toBeVisible()
  })

  test('user can create a custom habit', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Name').fill('Read before bed')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.locator('[data-testid^="habit-card-"]').filter({ hasText: 'Read before bed' })).toBeVisible()
  })

  test('user can complete a habit', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Complete Me')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()

    const checkbox = page.getByRole('checkbox', { name: 'Mark Complete Me as done today' })
    await checkbox.click()

    await expect(page.getByRole('checkbox', { name: 'Mark Complete Me as not done today' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('user can undo a habit completion', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Undo Me')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()

    await page.getByRole('checkbox', { name: 'Mark Undo Me as done today' }).click()
    await page.getByRole('checkbox', { name: 'Mark Undo Me as not done today' }).click()

    await expect(page.getByRole('checkbox', { name: 'Mark Undo Me as done today' })).toHaveAttribute('aria-checked', 'false')
  })

  test('user can edit a habit', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Habit' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Edit Me')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('button', { name: 'Edit Edit Me' }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Edited Habit')
    await dialog.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.locator('[data-testid^="habit-card-"]').filter({ hasText: 'Edited Habit' })).toBeVisible()
    await expect(page.locator('[data-testid^="habit-card-"]').filter({ hasText: 'Edit Me' })).toHaveCount(0)
  })

  test('user can delete a habit', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Delete Me')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()
    const card = page.locator('[data-testid^="habit-card-"]').filter({ hasText: 'Delete Me' })
    await expect(card).toBeVisible()

    page.once('dialog', (confirmDialog) => confirmDialog.accept())
    await page.getByRole('button', { name: 'Delete Delete Me' }).click()

    await expect(card).toHaveCount(0)
  })

  test('user can create a habit with a weekly schedule', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Weekly Gym')
    await dialog.getByLabel('Frequency').selectOption('weekly')
    await dialog.getByLabel('Times per week').fill('4')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()
    await expect(dialog).not.toBeVisible()

    const card = page.locator('[data-testid^="habit-card-"]').filter({ hasText: 'Weekly Gym' })
    await expect(card).toBeVisible()
    // A weekly-target habit is "on" every day of the week, never unscheduled.
    await expect(card.getByLabel(/not scheduled/)).toHaveCount(0)
  })

  test('user can quick-add water', async ({ page }) => {
    await page.goto('/habits')

    const before = await page.getByTestId('water-total').innerText()
    const beforeValue = Number(before.split('/')[0]!.replace(/[^\d.]/g, ''))

    await page.getByRole('button', { name: '250 ml' }).click()

    await expect(page.getByTestId('water-total')).toContainText(String(Math.round((beforeValue + 0.25) * 10) / 10))
  })

  test('user can log a custom water amount', async ({ page }) => {
    await page.goto('/habits')

    const before = await page.getByTestId('water-total').innerText()
    const beforeValue = Number(before.split('/')[0]!.replace(/[^\d.]/g, ''))

    await page.getByLabel('Custom water amount').fill('0.6')
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    await expect(page.getByTestId('water-total')).toContainText(String(Math.round((beforeValue + 0.6) * 10) / 10))
  })

  test('user can edit the water goal', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Edit water goal' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Daily goal').fill('3')
    await dialog.getByRole('button', { name: 'Save Goal' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId('water-total')).toContainText('/ 3 L')
  })

  test('water total accumulates across multiple additions', async ({ page }) => {
    await page.goto('/habits')

    const before = await page.getByTestId('water-total').innerText()
    const beforeValue = Number(before.split('/')[0]!.replace(/[^\d.]/g, ''))

    await page.getByRole('button', { name: '500 ml' }).click()
    await page.getByRole('button', { name: '250 ml' }).click()

    await expect(page.getByTestId('water-total')).toContainText(String(Math.round((beforeValue + 0.75) * 10) / 10))
  })

  test('user can create a supplement reminder', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Reminder' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Add Reminder' })).toBeVisible()

    await dialog.getByLabel('Title').fill('Fish Oil')
    await dialog.getByLabel('Category').selectOption('supplements')
    await dialog.getByLabel('Reminder time').fill('09:00')
    await dialog.getByRole('button', { name: 'Add Reminder' }).click()

    await expect(dialog).not.toBeVisible()
    const card = page.locator('[data-testid^="reminder-card-"]').filter({ hasText: 'Fish Oil' })
    await expect(card).toBeVisible()
    await expect(card).toContainText('09:00')
  })

  test('user can edit a reminder', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Reminder' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill('Edit Reminder Me')
    await dialog.getByRole('button', { name: 'Add Reminder' }).click()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('button', { name: 'Edit Edit Reminder Me' }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill('Edited Reminder')
    await dialog.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.getByText('Edited Reminder')).toBeVisible()
  })

  test('user can deactivate a reminder', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Reminder' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill('Deactivate Me')
    await dialog.getByRole('button', { name: 'Add Reminder' }).click()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('button', { name: 'Deactivate Deactivate Me' }).click()

    const card = page.locator('[data-testid^="reminder-card-"]').filter({ hasText: 'Deactivate Me' })
    await expect(card).toContainText('Inactive')
    await expect(card.getByRole('checkbox')).toBeDisabled()
  })

  test('user can create a custom (non-supplement) reminder', async ({ page }) => {
    await page.goto('/habits')

    await page.getByRole('button', { name: 'Add Reminder' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill('Meal prep')
    await expect(dialog.getByLabel('Category')).toHaveValue('custom')
    await dialog.getByRole('button', { name: 'Add Reminder' }).click()

    await expect(page.getByText('Meal prep')).toBeVisible()
  })

  test('habit history shows metrics for a selected habit', async ({ page }) => {
    await page.goto('/habits')

    await page.getByLabel('Habit').selectOption({ label: 'Complete workout' })

    await expect(page.getByText('Completion Rate')).toBeVisible()
    await expect(page.getByTestId('habit-current-streak')).toBeVisible()
    await expect(page.getByTestId('habit-best-streak')).toBeVisible()

    await page.getByRole('tab', { name: '30D' }).click()
    await expect(page.getByRole('tab', { name: '30D' })).toHaveAttribute('aria-selected', 'true')
  })

  test('streak calculation reflects seeded completion history', async ({ page }) => {
    await page.goto('/habits')

    await page.getByLabel('Habit').selectOption({ label: 'Sleep 7+ hours' })

    // Seed data completes every scheduled day except every 6th, giving a
    // deterministic 5-day current/best streak for this daily habit.
    await expect(page.getByTestId('habit-current-streak')).toContainText('5')
    await expect(page.getByTestId('habit-best-streak')).toContainText('5')
  })

  test('dashboard shows today’s habit progress', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Daily Habits')).toBeVisible()
    const progressText = page.getByText(/\d+ of \d+ done today/)
    await expect(progressText).toBeVisible()
    const before = await progressText.innerText()
    const completedBefore = Number(before.match(/^(\d+)/)?.[1])

    // Completing a habit re-sorts it to the bottom of this "top pending"
    // card (and it can drop off entirely once there are more pending habits
    // than fit), so assert on the completed count rather than that one
    // checkbox's own post-click state.
    await page.getByRole('checkbox', { name: 'Mark Hit protein target as done' }).click()

    await expect(page.getByText(/\d+ of \d+ done today/)).toHaveText(`${completedBefore + 1} of ${before.match(/of (\d+)/)?.[1]} done today`)
  })

  test('dashboard shows water progress and updates on quick add', async ({ page }) => {
    await page.goto('/')

    const before = await page.getByTestId('dashboard-water-consumed').innerText()
    const beforeValue = Number(before.replace(/[^\d.]/g, ''))

    await page.getByRole('button', { name: 'Add 250 milliliters of water' }).click()

    await expect(page.getByTestId('dashboard-water-consumed')).toHaveText(String(Math.round((beforeValue + 0.25) * 10) / 10))
  })

  test('habits layout remains usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/habits')

    await expect(page.getByRole('heading', { name: 'Habits', exact: true, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Water', exact: true })).toBeVisible()

    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    expect(noOverflow).toBe(true)

    await expect(page.getByRole('link', { name: 'Habits' })).toBeVisible()
  })
})
