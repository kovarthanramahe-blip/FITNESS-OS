import { expect, test } from '@playwright/test'

test.describe('Workout', () => {
  test('workout page loads with today’s plan', async ({ page }) => {
    await page.goto('/workout')

    await expect(page.getByRole('heading', { name: 'Workout', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Workout' })).toBeVisible()
  })

  test('exercise library is accessible', async ({ page }) => {
    await page.goto('/workout')

    await page.getByRole('tab', { name: 'Exercises' }).click()
    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible()

    await page.getByRole('button', { name: 'View', exact: true }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('How to')).toBeVisible()
  })

  test('user can start today’s workout', async ({ page }) => {
    await page.goto('/workout')

    await page.getByRole('button', { name: 'Start Workout' }).click()

    await expect(page.getByText('Active Workout')).toBeVisible()
    await expect(page.getByText(/\d+ \/ \d+ exercises/)).toBeVisible()
  })

  test('user can edit weight and reps for a set', async ({ page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: 'Start Workout' }).click()

    const weightInput = page.getByLabel('Weight for set 1 in kilograms')
    await weightInput.fill('72.5')
    await expect(weightInput).toHaveValue('72.5')

    const repsInput = page.getByLabel('Reps for set 1')
    await repsInput.fill('6')
    await expect(repsInput).toHaveValue('6')
  })

  test('user can complete a set', async ({ page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: 'Start Workout' }).click()

    const checkbox = page.getByRole('checkbox', { name: 'Mark set 1 as done' })
    await checkbox.click()

    await expect(page.getByRole('checkbox', { name: 'Mark set 1 as not done' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('rest timer starts', async ({ page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: 'Start Workout' }).click()

    await page.getByRole('button', { name: '60s' }).click()

    await expect(page.getByText('1:00')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause rest timer' })).toBeVisible()
  })

  test('user can move between exercises', async ({ page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: 'Start Workout' }).click()

    const firstExerciseHeading = await page.getByRole('heading', { level: 2 }).first().textContent()

    await page.getByRole('button', { name: 'Complete Exercise' }).click()

    const secondExerciseHeading = await page.getByRole('heading', { level: 2 }).first().textContent()
    expect(secondExerciseHeading).not.toBe(firstExerciseHeading)
  })

  test('workout summary appears after completion', async ({ page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: 'Start Workout' }).click()

    await page.getByRole('button', { name: 'Finish Workout' }).click()

    await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible()
    await expect(page.getByText('Total Volume')).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: 'Workout Complete' })).not.toBeVisible()
  })
})
