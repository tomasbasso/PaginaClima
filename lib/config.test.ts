import { describe, expect, it } from 'vitest'
import { DEFAULT_SITE_URL, DEFAULT_USER_AGENT, resolveSiteUrl, resolveUserAgent } from './config'

describe('resolveSiteUrl', () => {
  it('uses the default when the override is missing', () => {
    expect(resolveSiteUrl(undefined)).toBe('https://clima-winifreda.vercel.app')
    expect(DEFAULT_SITE_URL).toBe('https://clima-winifreda.vercel.app')
  })

  it('uses the default when the override is empty or whitespace', () => {
    expect(resolveSiteUrl('')).toBe(DEFAULT_SITE_URL)
    expect(resolveSiteUrl('  ')).toBe(DEFAULT_SITE_URL)
  })

  it('keeps a real override, trimmed and without trailing slashes', () => {
    expect(resolveSiteUrl(' https://clima.example.ar/ ')).toBe('https://clima.example.ar')
    expect(resolveSiteUrl('https://clima.example.ar//')).toBe('https://clima.example.ar')
  })
})

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
