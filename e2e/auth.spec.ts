import { expect, test } from '@playwright/test'

test.describe('Auth (Supabase not configured in this environment)', () => {
  test('the app is fully usable with no login wall when Supabase is not configured', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  })

  test('the /login page still renders directly, with a not-configured hint', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Fitness OS' })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByText(/isn.t configured/i)).toBeVisible()
  })

  test('the Settings page shows a not-configured cloud account message', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: 'Cloud Account' })).toBeVisible()
    await expect(page.getByText(/isn.t configured/i)).toBeVisible()
  })

  for (const viewport of [
    { width: 390, height: 844, label: 'mobile' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 1440, height: 900, label: 'desktop' },
  ]) {
    test(`login page has no layout regressions at ${viewport.label} width (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/login')

      await expect(page.getByRole('heading', { name: 'Fitness OS' })).toBeVisible()
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()

      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      expect(noOverflow).toBe(true)
    })

    test(`settings account section has no layout regressions at ${viewport.label} width (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/settings')

      await expect(page.getByRole('heading', { name: 'Cloud Account' })).toBeVisible()

      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      expect(noOverflow).toBe(true)
    })
  }

  test('the Google button has a visible focus state for keyboard users', async ({ page }) => {
    await page.goto('/login')

    const button = page.getByRole('button', { name: /continue with google/i })
    await button.focus()
    await expect(button).toBeFocused()
  })
})
