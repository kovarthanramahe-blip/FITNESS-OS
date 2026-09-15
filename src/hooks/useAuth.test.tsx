import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'

function Consumer() {
  useAuth()
  return null
}

describe('useAuth', () => {
  it('throws a clear error when used outside an AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })
})
