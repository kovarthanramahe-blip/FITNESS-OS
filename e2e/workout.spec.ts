import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Starting a workout now shows a selection step first when the program has
 * more than one kind of workout day (see WorkoutSelectionModal) — the user
 * is never forced into the scheduled day. Tests that only care about what
 * happens *during* a workout (set completion, rest timer, etc.) use this
 * helper to pick the originally-scheduled day (Push A) and get back to
 * exactly the same starting point they had before that change.
 */
async function startScheduledWorkout(page: Page) {
  await page.getByRole('button', { name: 'Start Workout' }).click()
  await page.getByRole('button', { name: /Push A/ }).click()
}

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
    await startScheduledWorkout(page)

    await expect(page.getByText('Active Workout')).toBeVisible()
    await expect(page.getByText(/\d+ \/ \d+ exercises/)).toBeVisible()
  })

  test('user can edit weight and reps for a set', async ({ page }) => {
    await page.goto('/workout')
    await startScheduledWorkout(page)

    const weightInput = page.getByLabel('Weight for set 1 in kilograms')
    await weightInput.fill('72.5')
    await expect(weightInput).toHaveValue('72.5')

    const repsInput = page.getByLabel('Reps for set 1')
    await repsInput.fill('6')
    await expect(repsInput).toHaveValue('6')
  })

  test('user can complete a set', async ({ page }) => {
    await page.goto('/workout')
    await startScheduledWorkout(page)

    const checkbox = page.getByRole('checkbox', { name: 'Mark set 1 as done' })
    await checkbox.click()

    await expect(page.getByRole('checkbox', { name: 'Mark set 1 as not done' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('rest timer starts', async ({ page }) => {
    await page.goto('/workout')
    await startScheduledWorkout(page)

    await page.getByRole('button', { name: '60s' }).click()

    await expect(page.getByText('1:00')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause rest timer' })).toBeVisible()
  })

  test('user can move between exercises', async ({ page }) => {
    await page.goto('/workout')
    await startScheduledWorkout(page)

    const firstExerciseHeading = await page.getByRole('heading', { level: 2 }).first().textContent()

    await page.getByRole('button', { name: 'Complete Exercise' }).click()

    const secondExerciseHeading = await page.getByRole('heading', { level: 2 }).first().textContent()
    expect(secondExerciseHeading).not.toBe(firstExerciseHeading)
  })

  test('workout summary appears after completion', async ({ page }) => {
    await page.goto('/workout')
    await startScheduledWorkout(page)

    await page.getByRole('button', { name: 'Finish Workout' }).click()

    await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible()
    await expect(page.getByText('Total Volume')).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: 'Workout Complete' })).not.toBeVisible()
  })
})

test.describe('Workout — choosing today’s workout', () => {
  test('user can choose Legs when Push is scheduled, and it starts Legs', async ({ page }) => {
    await page.goto('/workout')

    // Push A is the scheduled day (a fresh program starts at day 0).
    await expect(page.getByText('Push A')).toBeVisible()

    await page.getByRole('button', { name: 'Start Workout' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Today's Workout")).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Push A/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Pull A/ })).toBeVisible()

    await dialog.getByRole('button', { name: /Legs A/ }).click()

    await expect(page.getByText('Active Workout')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Legs A' })).toBeVisible()
  })

  test('completing a set after choosing a non-scheduled workout records history under that workout', async ({ page }) => {
    await page.goto('/workout')

    await page.getByRole('button', { name: 'Start Workout' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Legs A/ }).click()

    const checkbox = page.getByRole('checkbox', { name: 'Mark set 1 as done' }).first()
    await checkbox.click()
    await expect(page.getByRole('checkbox', { name: 'Mark set 1 as not done' }).first()).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await page.getByRole('button', { name: 'Finish Workout' }).click()
    await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()

    await page.getByRole('tab', { name: 'History' }).click()
    await expect(page.getByText('Legs A').first()).toBeVisible()
  })

  test('resuming an active workout skips the selection step entirely', async ({ page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: 'Start Workout' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Pull A/ }).click()
    await expect(page.getByText('Active Workout')).toBeVisible()

    // Navigate away and back — the in-progress session should reappear directly.
    await page.getByRole('link', { name: 'Dashboard' }).first().click()
    await page.getByRole('link', { name: 'Workout' }).first().click()

    await expect(page.getByText('Active Workout')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pull A' })).toBeVisible()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Workout' })).not.toBeVisible()
  })
})

test.describe('Workout — choosing an alternative workout does not advance the schedule', () => {
  test('completing Legs when Push is scheduled leaves Push scheduled for next time', async ({ page }) => {
    await page.goto('/workout')
    await expect(page.getByText('Push A')).toBeVisible()

    await page.getByRole('button', { name: 'Start Workout' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Legs A/ }).click()
    await expect(page.getByRole('heading', { name: 'Legs A' })).toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark set 1 as done' }).first().click()
    await page.getByRole('button', { name: 'Finish Workout' }).click()
    await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()

    // Back on the Today tab, Push A is still the scheduled day — training
    // Legs instead did not eat into the program's rotation.
    await expect(page.getByText('Push A')).toBeVisible()
  })

  test('completing the actual scheduled workout still advances to the next day, as before', async ({ page }) => {
    await page.goto('/workout')
    await expect(page.getByText('Push A')).toBeVisible()

    await page.getByRole('button', { name: 'Start Workout' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Push A/ }).click()
    await expect(page.getByRole('heading', { name: 'Push A' })).toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark set 1 as done' }).first().click()
    await page.getByRole('button', { name: 'Finish Workout' }).click()
    await page.getByRole('button', { name: 'Done' }).click()

    // The program moves on to the next scheduled day (Pull A).
    await expect(page.getByText('Pull A')).toBeVisible()
  })

  test('completing a custom workout leaves the scheduled program day untouched', async ({ page }) => {
    await page.goto('/workout')
    await expect(page.getByText('Push A')).toBeVisible()

    await page.getByRole('button', { name: 'Create' }).click()
    const builder = page.getByRole('dialog')
    await builder.getByLabel('Workout name').fill('Arm Day')
    await builder.getByRole('button', { name: 'Add' }).click()
    await builder.getByRole('button', { name: 'Save Workout' }).click()

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Arm Day' })).toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark set 1 as done' }).first().click()
    await page.getByRole('button', { name: 'Finish Workout' }).click()
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByText('Push A')).toBeVisible()
  })
})

test.describe('Workout — custom workout exercise selection (keyboard/focus)', () => {
  test('numeric sets/reps fields keep their value and stay usable across repeated edits', async ({ page }) => {
    await page.goto('/workout')

    await page.getByRole('button', { name: 'Create' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Workout name').fill('Focus QA Day')
    await dialog.getByRole('button', { name: 'Add' }).click()
    await dialog.getByRole('button', { name: 'Add' }).click()

    const setsInputs = dialog.getByLabel(/Sets for/)
    const repsInputs = dialog.getByLabel(/Reps for/)

    await setsInputs.first().fill('5')
    await expect(setsInputs.first()).toHaveValue('5')
    await expect(setsInputs.first()).toBeFocused()

    await repsInputs.first().fill('12')
    await expect(repsInputs.first()).toHaveValue('12')
    await expect(repsInputs.first()).toBeFocused()

    await setsInputs.nth(1).fill('3')
    await expect(setsInputs.nth(1)).toHaveValue('3')
    await expect(setsInputs.nth(1)).toBeFocused()

    await dialog.getByRole('button', { name: 'Save Workout' }).click()
    await expect(page.getByText('Focus QA Day')).toBeVisible()
  })
})

test.describe('Workout — mobile viewport', () => {
  test('workout selection modal and custom exercise fields remain usable at 390px with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/workout')

    await page.getByRole('button', { name: 'Start Workout' }).click()
    const selectionDialog = page.getByRole('dialog')
    await expect(selectionDialog).toBeVisible()
    await expect(selectionDialog.getByRole('button', { name: /Legs A/ })).toBeVisible()

    let noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    expect(noOverflow).toBe(true)

    await selectionDialog.getByRole('button', { name: 'Custom Workout' }).click()
    const builderDialog = page.getByRole('dialog')
    await builderDialog.getByRole('button', { name: 'Add' }).click()

    const setsInput = builderDialog.getByLabel(/Sets for/).first()
    await setsInput.fill('4')
    await expect(setsInput).toHaveValue('4')
    await expect(setsInput).toBeFocused()

    noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    expect(noOverflow).toBe(true)
  })
})
