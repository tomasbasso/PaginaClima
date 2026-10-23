import { describe, expect, it } from 'vitest'
import { formatFreshness, isOutdated, shouldAutoRefresh } from './freshness'

const MIN = 60_000
const H = 60 * MIN
const at = new Date('2026-10-24T02:59:00Z') // 23/10 23:59 in Argentina

describe('formatFreshness', () => {
  it('says RECIÉN under one minute', () => {
    expect(formatFreshness(0, at)).toBe('ACTUALIZADO RECIÉN')
    expect(formatFreshness(59_999, at)).toBe('ACTUALIZADO RECIÉN')
  })

  it('treats negative ages (clock skew) as RECIÉN', () => {
    expect(formatFreshness(-5 * MIN, at)).toBe('ACTUALIZADO RECIÉN')
  })

  it('counts whole minutes', () => {
    expect(formatFreshness(60_000, at)).toBe('ACTUALIZADO HACE 1 MIN')
    expect(formatFreshness(119_999, at)).toBe('ACTUALIZADO HACE 1 MIN')
    expect(formatFreshness(120_000, at)).toBe('ACTUALIZADO HACE 2 MIN')
    expect(formatFreshness(59 * MIN + 59_000, at)).toBe('ACTUALIZADO HACE 59 MIN')
  })

  it('counts whole hours from 60 min to 23 h', () => {
    expect(formatFreshness(H, at)).toBe('ACTUALIZADO HACE 1 H')
    expect(formatFreshness(23 * H + 59 * MIN, at)).toBe('ACTUALIZADO HACE 23 H')
  })

  it('uses the Argentina date and time from 24 h on', () => {
    expect(formatFreshness(24 * H, at)).toBe('ACTUALIZADO EL 23/10 A LAS 23:59')
  })
})

describe('thresholds', () => {
  it('isOutdated after 30 min', () => {
    expect(isOutdated(30 * MIN)).toBe(false)
    expect(isOutdated(30 * MIN + 1)).toBe(true)
  })

  it('shouldAutoRefresh after 15 min', () => {
    expect(shouldAutoRefresh(15 * MIN)).toBe(false)
    expect(shouldAutoRefresh(15 * MIN + 1)).toBe(true)
  })
})
