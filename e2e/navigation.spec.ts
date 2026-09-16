import { expect, test } from '@playwright/test'

test.describe('Fitness OS navigation', () => {
  test('loads the dashboard by default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Guest/ })).toBeVisible()
  })

  test('navigates to every primary section', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Workout' }).first().click()
    await expect(page).toHaveURL(/\/workout$/)

    await page.getByRole('link', { name: 'Nutrition' }).first().click()
    await expect(page).toHaveURL(/\/nutrition$/)
    await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Progress' }).first().click()
    await expect(page).toHaveURL(/\/progress$/)
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })
})
