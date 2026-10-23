import { describe, expect, it } from 'vitest'
import { isActiveSection } from './sections'

describe('isActiveSection (WR-07)', () => {
  it('matches "/" only on the home route', () => {
    expect(isActiveSection('/', '/')).toBe(true)
    expect(isActiveSection('/pronostico', '/')).toBe(false)
    expect(isActiveSection('/dev/estados', '/')).toBe(false)
    expect(isActiveSection('/no-existe', '/')).toBe(false)
  })

  it('matches a section and its sub-routes, tolerating a trailing slash', () => {
    expect(isActiveSection('/pronostico', '/pronostico')).toBe(true)
    expect(isActiveSection('/pronostico/', '/pronostico')).toBe(true)
    expect(isActiveSection('/pronostico/7d', '/pronostico')).toBe(true)
  })

  it('does not match a sibling route that only shares the prefix', () => {
    expect(isActiveSection('/pronosticos', '/pronostico')).toBe(false)
    expect(isActiveSection('/', '/pronostico')).toBe(false)
  })

  it('has no active tab without a pathname', () => {
    expect(isActiveSection(null, '/')).toBe(false)
  })
})
