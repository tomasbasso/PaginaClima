import { describe, expect, it } from 'vitest'
import { describeWind, windSector } from './wind'

describe('windSector (8 sectors, SMN spelling)', () => {
  it.each([
    [0, 'N', 'norte'],
    [22.4, 'N', 'norte'],
    [22.5, 'NE', 'noreste'],
    [177, 'S', 'sur'],
    [225, 'SO', 'sudoeste'],
    [270, 'O', 'oeste'],
    [337.4, 'NO', 'noroeste'],
    [337.5, 'N', 'norte'],
    [360, 'N', 'norte'],
    [-10, 'N', 'norte'],
  ])('%s° → %s', (deg, short, long) => {
    expect(windSector(deg)).toEqual({ short, long })
  })

  it('covers E and SE', () => {
    expect(windSector(90).short).toBe('E')
    expect(windSector(135)).toEqual({ short: 'SE', long: 'sudeste' })
  })
})

describe('describeWind', () => {
  it('formats value and gust line', () => {
    expect(describeWind(18, 45, 32)).toEqual({
      value: '18 km/h NE',
      gustLine: 'Ráfagas de 32 km/h · viento del noreste',
    })
  })

  it('shows Calma below 2 km/h with no gust line', () => {
    expect(describeWind(1.9, 90, 5)).toEqual({ value: 'Calma', gustLine: null })
  })

  it('2 km/h is not calm', () => {
    expect(describeWind(2, 90, 5).value).toBe('2 km/h E')
  })
})
