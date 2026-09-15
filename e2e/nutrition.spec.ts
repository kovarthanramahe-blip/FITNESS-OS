import { expect, test } from '@playwright/test'

test.describe('Nutrition', () => {
  test('nutrition page loads with its major sections', async ({ page }) => {
    await page.goto('/nutrition')

    await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible()
    await expect(page.getByTestId('calories-total')).toBeVisible()
    await expect(page.getByTestId('meal-section-breakfast')).toBeVisible()
    await expect(page.getByTestId('meal-section-lunch')).toBeVisible()
    await expect(page.getByTestId('meal-section-dinner')).toBeVisible()
    await expect(page.getByTestId('meal-section-snacks')).toBeVisible()
  })

  test('user can add a breakfast food and it appears under breakfast', async ({ page }) => {
    await page.goto('/nutrition')

    const breakfastSection = page.getByTestId('meal-section-breakfast')
    await breakfastSection.getByRole('button', { name: 'Add Food' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Custom food name').fill('Test Pancakes')
    await dialog.getByLabel('Calories').fill('300')
    await dialog.getByRole('button', { name: 'Add Food' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(breakfastSection.getByText('Test Pancakes')).toBeVisible()
  })

  test('daily calories update after logging food', async ({ page }) => {
    await page.goto('/nutrition')

    const caloriesBefore = await page.getByTestId('calories-total').innerText()
    const before = Number(caloriesBefore.split('/')[0]!.trim())

    const lunchSection = page.getByTestId('meal-section-lunch')
    await lunchSection.getByRole('button', { name: 'Add Food' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Custom food name').fill('Calorie Check Meal')
    await dialog.getByLabel('Calories').fill('250')
    await dialog.getByRole('button', { name: 'Add Food' }).click()

    await expect(page.getByTestId('calories-total')).toContainText(String(before + 250))
  })

  test('protein total updates after logging food with protein', async ({ page }) => {
    await page.goto('/nutrition')

    const proteinBefore = await page.getByTestId('protein-total').innerText()

    const snackSection = page.getByTestId('meal-section-snacks')
    await snackSection.getByRole('button', { name: 'Add Food' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Custom food name').fill('Protein Check Snack')
    await dialog.getByLabel('Calories').fill('100')
    await dialog.getByLabel('Protein (g)').fill('20')
    await dialog.getByRole('button', { name: 'Add Food' }).click()

    await expect(page.getByTestId('protein-total')).not.toHaveText(proteinBefore)
  })

  test('user can edit a logged food entry', async ({ page }) => {
    await page.goto('/nutrition')

    const dinnerSection = page.getByTestId('meal-section-dinner')
    await dinnerSection.getByRole('button', { name: 'Add Food' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Custom food name').fill('Editable Dinner')
    await dialog.getByLabel('Calories').fill('400')
    await dialog.getByRole('button', { name: 'Add Food' }).click()
    await expect(dialog).not.toBeVisible()

    await dinnerSection.getByRole('button', { name: 'Edit Editable Dinner' }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByLabel('Calories').fill('550')
    await dialog.getByRole('button', { name: 'Save Changes' }).click()

    await expect(dinnerSection.getByText('550 kcal', { exact: true }).first()).toBeVisible()
  })

  test('user can delete a logged food entry', async ({ page }) => {
    await page.goto('/nutrition')

    const snackSection = page.getByTestId('meal-section-snacks')
    await snackSection.getByRole('button', { name: 'Add Food' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Custom food name').fill('Deletable Snack')
    await dialog.getByLabel('Calories').fill('120')
    await dialog.getByRole('button', { name: 'Add Food' }).click()
    await expect(snackSection.getByText('Deletable Snack')).toBeVisible()

    page.once('dialog', (confirmDialog) => confirmDialog.accept())
    await snackSection.getByRole('button', { name: 'Delete Deletable Snack' }).click()

    await expect(snackSection.getByText('Deletable Snack')).not.toBeVisible()
  })

  test('user can change nutrition goals', async ({ page }) => {
    await page.goto('/nutrition')

    await page.getByRole('button', { name: 'Nutrition Goals' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Daily calories').fill('2500')
    await dialog.getByRole('button', { name: 'Save Goals' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId('calories-total')).toContainText('2500')
  })

  test('user can switch between dates', async ({ page }) => {
    await page.goto('/nutrition')

    const dateInput = page.getByLabel('Nutrition date')
    const initialDate = await dateInput.inputValue()

    await page.getByRole('button', { name: 'Previous day' }).click()

    await expect(dateInput).not.toHaveValue(initialDate)
  })

  test('shows an empty state for a date with no logged food', async ({ page }) => {
    await page.goto('/nutrition')

    await page.getByLabel('Nutrition date').fill('2020-01-01')

    await expect(page.getByText('No breakfast logged yet')).toBeVisible()
  })

  test("today's weight displays on the nutrition page", async ({ page }) => {
    await page.goto('/nutrition')

    await expect(page.getByText('Today’s Weight')).toBeVisible()
    await expect(page.getByRole('button', { name: /Log Weight/ })).toBeVisible()
  })

  test('user can log weight from the nutrition page using the existing weight modal', async ({ page }) => {
    await page.goto('/nutrition')

    await page.getByRole('button', { name: /Log Weight/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Add Weight Entry' })).toBeVisible()

    await dialog.getByLabel('Weight (kg)').fill('71.2')
    await dialog.getByRole('button', { name: 'Add Entry' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('71.2 kg').first()).toBeVisible()
  })

  test('weight logged from nutrition is reflected on the Progress page (progressStore)', async ({ page }) => {
    await page.goto('/nutrition')

    await page.getByRole('button', { name: /Log Weight/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Weight (kg)').fill('69.3')
    await dialog.getByRole('button', { name: 'Add Entry' }).click()
    await expect(dialog).not.toBeVisible()

    await page.goto('/progress')
    await expect(page.getByText('69.3 kg').first()).toBeVisible()
  })

  test('dashboard reflects nutrition totals logged from the nutrition page', async ({ page }) => {
    await page.goto('/nutrition')

    const caloriesBefore = await page.getByTestId('calories-total').innerText()
    const before = Number(caloriesBefore.split('/')[0]!.replace(/[^\d.]/g, ''))

    const lunchSection = page.getByTestId('meal-section-lunch')
    await lunchSection.getByRole('button', { name: 'Add Food' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Custom food name').fill('Dashboard Check Meal')
    await dialog.getByLabel('Calories').fill('321')
    await dialog.getByRole('button', { name: 'Add Food' }).click()
    await expect(dialog).not.toBeVisible()

    await page.goto('/')
    const dashboardConsumedText = await page.getByTestId('nutrient-calories').getByTestId('nutrient-consumed').innerText()
    const dashboardConsumed = Number(dashboardConsumedText.replace(/[^\d.]/g, ''))
    expect(dashboardConsumed).toBe(before + 321)
  })

  test('dashboard weight remains correct after a nutrition-page weight log', async ({ page }) => {
    await page.goto('/nutrition')

    await page.getByRole('button', { name: /Log Weight/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Weight (kg)').fill('77.7')
    await dialog.getByRole('button', { name: 'Add Entry' }).click()
    await expect(dialog).not.toBeVisible()

    await page.goto('/')
    await expect(page.getByText('77.7 kg').first()).toBeVisible()
  })

  test('nutrition layout remains usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/nutrition')

    await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible()
    await expect(page.getByTestId('meal-section-breakfast')).toBeVisible()

    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    expect(bodyOverflow).toBe(true)

    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible()
  })
})
