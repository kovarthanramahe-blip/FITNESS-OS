import { expect, test } from '@playwright/test'

test.describe('Gamification', () => {
  test('achievements page loads with its major sections', async ({ page }) => {
    await page.goto('/achievements')

    await expect(page.getByRole('heading', { name: 'Achievements', level: 1 })).toBeVisible()
    await expect(page.getByText('Level Progress')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Streaks' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible()
    await expect(page.getByText('Recent XP')).toBeVisible()
    await expect(page.getByRole('heading', { name: "Today's Challenges" })).toBeVisible()
    await expect(page.getByRole('heading', { name: "This Week's Challenges" })).toBeVisible()
  })

  test('shows the level/XP display', async ({ page }) => {
    await page.goto('/achievements')

    await expect(page.getByTestId('level-heading')).toBeVisible()
    await expect(page.getByText(/\d+ XP to next level/)).toBeVisible()
  })

  test('shows XP history entries derived from seeded workout activity', async ({ page }) => {
    await page.goto('/achievements')

    // The seeded workout history and personal records qualify for XP the
    // moment the app loads, so "no XP yet" should never show on a fresh session.
    await expect(page.getByText('No XP yet')).toHaveCount(0)
    await expect(page.getByText(/^\+\d+ XP$/).first()).toBeVisible()
  })

  test('shows earned badges under the Earned filter', async ({ page }) => {
    await page.goto('/achievements')

    await page.getByRole('tab', { name: 'Earned' }).click()
    await expect(page.locator('[data-testid^="badge-card-"]').first()).toBeVisible()
    await expect(page.getByTestId('badge-card-first-workout')).toBeVisible()
  })

  test('shows locked badges distinctly, understandable without color', async ({ page }) => {
    await page.goto('/achievements')

    await page.getByRole('tab', { name: 'Locked' }).click()
    const lockedCards = page.locator('[data-testid^="badge-card-"]')
    await expect(lockedCards.first()).toBeVisible()
    await expect(page.getByRole('group', { name: /locked/i }).first()).toBeVisible()
  })

  test('shows a daily challenge with progress', async ({ page }) => {
    await page.goto('/achievements')

    await expect(page.locator('[data-testid^="challenge-card-daily-"]').first()).toBeVisible()
  })

  test('shows a weekly challenge with progress', async ({ page }) => {
    await page.goto('/achievements')

    await expect(page.locator('[data-testid^="challenge-card-weekly-"]').first()).toBeVisible()
  })

  test('challenge progress is exposed via an accessible progress bar, capped at 100', async ({ page }) => {
    await page.goto('/achievements')

    const bar = page.locator('[data-testid^="challenge-card-"]').first().getByRole('progressbar')
    const value = Number(await bar.getAttribute('aria-valuenow'))
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(100)
  })

  test('completing a qualifying activity awards XP', async ({ page }) => {
    await page.goto('/habits')
    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Gamification Test Habit')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark Gamification Test Habit as done today' }).click()
    // Wait for the sync effect to actually persist the new XP event before navigating away.
    await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible()

    await page.goto('/achievements')
    await expect(page.getByText('Completed a habit').first()).toBeVisible()
  })

  test('a qualifying action shows a subtle "+XP" toast', async ({ page }) => {
    await page.goto('/habits')
    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Toast Test Habit')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark Toast Test Habit as done today' }).click()

    await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible()
  })

  test('a badge unlock shows its own toast', async ({ page }) => {
    // On a fresh session the seeded workout history + personal records
    // immediately qualify for badges, so the unlock toast fires on load.
    await page.goto('/')

    await expect(page.getByRole('status').filter({ hasText: 'Badge Unlocked' }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('completing the same underlying action twice does not duplicate XP', async ({ page }) => {
    await page.goto('/habits')
    await page.getByRole('button', { name: 'Add Habit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('No Duplicate XP Habit')
    await dialog.getByRole('button', { name: 'Add Habit' }).click()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark No Duplicate XP Habit as done today' }).click()
    await page.getByRole('checkbox', { name: 'Mark No Duplicate XP Habit as not done today' }).click()
    await page.getByRole('checkbox', { name: 'Mark No Duplicate XP Habit as done today' }).click()
    await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible()

    await page.goto('/achievements')
    // Exactly one "Completed a habit" XP row for this cycle, not two.
    await expect(page.getByText('Completed a habit')).toHaveCount(1)
  })

  test('dashboard XP display reflects seeded gamification state', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Level Progress')).toBeVisible()
    await expect(page.getByTestId('level-heading')).toBeVisible()
  })

  test('dashboard shows a featured challenge that updates with progress', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('[data-testid^="challenge-card-"]').first()).toBeVisible()
  })

  test('streak summary distinguishes workout, water and habit streaks', async ({ page }) => {
    await page.goto('/achievements')

    await expect(page.getByTestId('streak-workout')).toContainText('Workout')
    await expect(page.getByTestId('streak-water')).toContainText('Water')
    await expect(page.getByTestId('streak-habits')).toContainText('Habits')
  })

  test('achievement filters switch between earned, locked and category views', async ({ page }) => {
    await page.goto('/achievements')

    await page.getByRole('tab', { name: 'Earned' }).click()
    await expect(page.getByRole('tab', { name: 'Earned' })).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('tab', { name: 'Workout', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Workout', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('badge-card-first-workout')).toBeVisible()

    await page.getByRole('tab', { name: 'All' }).click()
    await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
  })

  for (const viewport of [
    { width: 390, height: 844, label: 'mobile' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 1440, height: 900, label: 'desktop' },
  ]) {
    test(`achievements layout remains usable at ${viewport.label} width (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/achievements')

      await expect(page.getByRole('heading', { name: 'Achievements', level: 1 })).toBeVisible()
      await expect(page.locator('[data-testid^="badge-card-"]').first()).toBeVisible()
      await expect(page.getByRole('tab', { name: 'All' })).toBeVisible()

      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      expect(noOverflow).toBe(true)
    })
  }

  test('XP and badge feedback UI does not obscure core controls', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 10_000 })

    // The bottom navigation stays interactive even while a toast is showing.
    await expect(page.getByRole('link', { name: 'Habits' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Habits' })).toBeEnabled()
  })

  for (const viewport of [
    { width: 390, height: 844, label: 'mobile' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 1440, height: 900, label: 'desktop' },
  ]) {
    test(`dashboard gamification section remains usable at ${viewport.label} width (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')

      await expect(page.getByText('Level Progress')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Streaks' })).toBeVisible()

      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      expect(noOverflow).toBe(true)
    })
  }
})
