import { expect, test } from '@playwright/test'

test.describe('Progress', () => {
  test('progress page loads with the Weight tab active', async ({ page }) => {
    await page.goto('/progress')

    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Weight' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Current Weight')).toBeVisible()
    await expect(page.getByText('Target Weight')).toBeVisible()
  })

  test('user can add a weight entry', async ({ page }) => {
    await page.goto('/progress')

    await page.getByRole('button', { name: 'Add Weight' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel('Date').fill('2024-01-15')
    await page.getByLabel('Weight (kg)').fill('71')
    await page.getByRole('button', { name: 'Add Entry' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('71.0 kg')).toBeVisible()
  })

  test('user can edit a weight entry', async ({ page }) => {
    await page.goto('/progress')

    await page.getByRole('button', { name: /Edit weight entry/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel('Weight (kg)').fill('69.5')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('69.5 kg')).toBeVisible()
  })

  test('user can delete a weight entry', async ({ page }) => {
    await page.goto('/progress')

    const deleteButtons = page.getByRole('button', { name: /Delete weight entry/ })
    await deleteButtons.first().waitFor()
    const entriesBefore = await deleteButtons.count()
    page.once('dialog', (dialog) => dialog.accept())
    await deleteButtons.first().click()

    await expect(page.getByRole('button', { name: /Delete weight entry/ })).toHaveCount(entriesBefore - 1)
  })

  test('user can switch the weight chart time range', async ({ page }) => {
    await page.goto('/progress')

    const sevenDayTab = page.getByRole('tab', { name: '7D' })
    await sevenDayTab.click()
    await expect(sevenDayTab).toHaveAttribute('aria-selected', 'true')
  })

  test('user can update the weight goal', async ({ page }) => {
    await page.goto('/progress')

    await page.getByRole('button', { name: 'Edit weight goal' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel('Target weight (kg)').fill('65')
    await page.getByRole('button', { name: 'Save Goal' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('65.0').first()).toBeVisible()
  })

  test('user can add a body measurement', async ({ page }) => {
    await page.goto('/progress')
    await page.getByRole('tab', { name: 'Measurements' }).click()

    await page.getByRole('button', { name: 'Add Measurement' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Date').fill('2024-02-01')
    await dialog.getByLabel('Value').fill('83')
    await dialog.getByRole('button', { name: 'Add Measurement' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('measurements tab lets the user pick which measurement to view', async ({ page }) => {
    await page.goto('/progress')
    await page.getByRole('tab', { name: 'Measurements' }).click()

    await page.getByLabel('Measurement', { exact: true }).selectOption('Chest')
    await expect(page.getByLabel('Measurement', { exact: true })).toHaveValue('Chest')
  })

  test('strength tab shows an exercise selector and progress chart', async ({ page }) => {
    await page.goto('/progress')
    await page.getByRole('tab', { name: 'Strength' }).click()

    await expect(page.getByRole('heading', { name: 'Strength Progress' })).toBeVisible()
    await expect(page.getByLabel('Exercise')).toBeVisible()
    await expect(page.getByText('Est. One-Rep Max')).toBeVisible()
  })

  test('workouts tab shows analytics, weekly frequency and insights', async ({ page }) => {
    await page.goto('/progress')
    await page.getByRole('tab', { name: 'Workouts' }).click()

    await expect(page.getByText('Workout Analytics')).toBeVisible()
    await expect(page.getByText('Week Streak')).toBeVisible()
    await expect(page.getByText('This Week').first()).toBeVisible()
    await expect(page.getByText('Insights')).toBeVisible()
  })
})
