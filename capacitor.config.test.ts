import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('capacitor.config.ts', () => {
  it('uses the intended production application id, display name, and web build output', async () => {
    const config = (await import('./capacitor.config')).default

    expect(config.appId).toBe('com.fitnessos.app')
    expect(config.appName).toBe('Fitness OS')
    expect(config.webDir).toBe('dist')
  })
})

describe('android/app/src/main/AndroidManifest.xml', () => {
  it('registers an intent-filter for the OAuth deep-link callback matching AuthProvider.tsx', () => {
    const manifest = readFileSync(join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf-8')

    expect(manifest).toContain('android:scheme="com.fitnessos.app"')
    expect(manifest).toContain('android:host="login-callback"')
    expect(manifest).toContain('android.intent.category.BROWSABLE')
  })

  it('applicationId in build.gradle matches capacitor.config.ts appId', () => {
    const buildGradle = readFileSync(join(process.cwd(), 'android/app/build.gradle'), 'utf-8')

    expect(buildGradle).toContain('applicationId "com.fitnessos.app"')
  })
})
