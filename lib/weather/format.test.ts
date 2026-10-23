import { describe, expect, it } from 'vitest'
import { formatInt, formatTemp } from './format'

describe('formatTemp', () => {
  it('rounds', () => expect(formatTemp(23.6)).toBe('24'))
  it('uses U+2212 for negatives', () => expect(formatTemp(-3.2)).toBe('−3'))
  it('renders −0 as 0', () => {
    expect(formatTemp(-0.4)).toBe('0')
    expect(formatTemp(0)).toBe('0')
  })
})

describe('formatInt', () => {
  it('rounds to an integer string', () => expect(formatInt(1014.9)).toBe('1015'))
})
