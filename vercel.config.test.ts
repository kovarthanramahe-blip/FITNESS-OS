import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Fitness OS is a Vite SPA using react-router-dom's BrowserRouter, which
 * relies on real (non-hash) URLs for every route — a hard refresh or
 * direct link to any non-root path (e.g. /workout) has no matching static
 * file on Vercel's CDN unless a rewrite sends it to index.html so the
 * client-side router can take over. This only checks that vercel.json is
 * present and structurally correct; it can't exercise Vercel's actual
 * routing/CDN behavior from a unit test — that requires hitting the real
 * deployment (see e2e/spa-routing.spec.ts's local-preview coverage, and
 * the manual post-deploy check called out in the PR/report).
 */
describe('vercel.json SPA fallback', () => {
  it('exists and rewrites every path to index.html so client-side routes survive a hard refresh', () => {
    const raw = readFileSync(join(process.cwd(), 'vercel.json'), 'utf-8')
    const config = JSON.parse(raw) as { rewrites?: { source: string; destination: string }[] }

    expect(Array.isArray(config.rewrites)).toBe(true)
    const catchAll = config.rewrites?.find((rule) => rule.destination === '/index.html')
    expect(catchAll).toBeTruthy()
    // Matches any path — Vercel only falls through to rewrites when no static
    // file matches first, so this never intercepts real assets (JS/CSS/images).
    expect(catchAll?.source).toBe('/(.*)')
  })
})
