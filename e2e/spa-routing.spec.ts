import { expect, test } from '@playwright/test'

/**
 * Regression coverage for the Vercel 404 on hard refresh (Issue 3): every
 * client-side route must render correctly when loaded directly, not just
 * when reached by clicking an in-app link.
 *
 * Caveat: this runs against `vite preview`, which has its own built-in SPA
 * fallback independent of vercel.json. So a pass here proves the app itself
 * has no route that breaks on a fresh load, but it does NOT exercise
 * Vercel's CDN/rewrite behavior — that can only be confirmed by hitting the
 * real deployment post-deploy (see vercel.config.test.ts for the config
 * shape check, and the manual smoke-test checklist for the live check).
 */
test.describe('SPA routes survive a direct/hard-refresh navigation', () => {
  const routes: { path: string; heading: string | RegExp }[] = [
    { path: '/', heading: /Good (morning|afternoon|evening), Guest/ },
    { path: '/workout', heading: 'Workout' },
    { path: '/nutrition', heading: 'Nutrition' },
    { path: '/progress', heading: 'Progress' },
    { path: '/habits', heading: 'Habits' },
    { path: '/achievements', heading: 'Achievements' },
    { path: '/settings', heading: 'Settings' },
  ]

  for (const { path, heading } of routes) {
    test(`direct navigation to ${path} renders without a 404`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBeLessThan(400)
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
    })
  }
})
