import { expect, test } from '@playwright/test'

test.describe('Dashboard', () => {
  test('loads successfully with its major sections', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Kovarthan/ })).toBeVisible()
    await expect(page.getByText("Today's Workout")).toBeVisible()
    await expect(page.getByText('Daily Fitness Score')).toBeVisible()
    await expect(page.getByText('Daily Habits')).toBeVisible()
    await expect(page.getByText('Level Progress')).toBeVisible()
    await expect(page.getByText('Current Weight')).toBeVisible()
    await expect(page.getByText(/day streak/)).toBeVisible()
    await expect(page.getByText('Recent Personal Records')).toBeVisible()
    await expect(page.getByText('Weekly Activity')).toBeVisible()
  })

  test('Start Workout navigates to /workout', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /start workout/i }).click()
    await expect(page).toHaveURL(/\/workout$/)
  })

  test('adding 250 ml of water updates the displayed amount', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('2.1', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Add 250 milliliters of water' }).click()

    await expect(page.getByText('2.4', { exact: true })).toBeVisible()
    await expect(page.getByText('2.1', { exact: true })).toHaveCount(0)
  })
})
