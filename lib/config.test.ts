import { describe, expect, it } from 'vitest'
import { DEFAULT_USER_AGENT, resolveUserAgent } from './config'

describe('resolveUserAgent (WR-02)', () => {
  it('uses the default when the override is missing', () => {
    expect(resolveUserAgent(undefined)).toBe(DEFAULT_USER_AGENT)
  })

  it('uses the default when the override is empty or whitespace', () => {
    expect(resolveUserAgent('')).toBe(DEFAULT_USER_AGENT)
    expect(resolveUserAgent('   ')).toBe(DEFAULT_USER_AGENT)
  })

  it('keeps a real override, trimmed', () => {
    expect(resolveUserAgent('  MyApp/2.0 example.org  ')).toBe('MyApp/2.0 example.org')
  })
})
