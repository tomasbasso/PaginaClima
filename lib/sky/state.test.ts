import { describe, expect, it } from 'vitest'
import type { WeatherGroup } from '@/lib/weather/wmo'
import { resolveSkyState, skyFromSnapshot, skyToken } from './state'

// Instants proven in phase.test.ts for Winifreda (2026-10-23).
const DIA = new Date('2026-10-23T15:00:00Z')
const NOCHE = new Date('2026-10-23T03:00:00Z')
const AMANECER = new Date('2026-10-23T09:15:00Z')
const ATARDECER = new Date('2026-10-23T22:45:00Z')

describe('resolveSkyState', () => {
  it('mid-day clear sky is dia', () => {
    const s = resolveSkyState(DIA, 'despejado')
    expect(s.phase).toBe('dia')
    expect(s.weather).toBe('despejado')
    expect(s.sunAltitude).toBeGreaterThanOrEqual(6)
    expect(skyToken(s)).toBe('dia')
  })

  it('midnight with no data is noche / despejado', () => {
    const s = resolveSkyState(NOCHE, null)
    expect(s.phase).toBe('noche')
    expect(s.weather).toBe('despejado')
    expect(skyToken(s)).toBe('noche')
  })

  it('twilight instants give amanecer and atardecer', () => {
    expect(skyToken(resolveSkyState(AMANECER, 'despejado'))).toBe('amanecer')
    expect(skyToken(resolveSkyState(ATARDECER, 'despejado'))).toBe('atardecer')
  })

  it('tormenta wins at any hour', () => {
    expect(skyToken(resolveSkyState(DIA, 'tormenta'))).toBe('tormenta')
    expect(skyToken(resolveSkyState(NOCHE, 'tormenta'))).toBe('tormenta')
    expect(skyToken(resolveSkyState(AMANECER, 'tormenta'))).toBe('tormenta')
  })

  const overcastGroups: WeatherGroup[] = ['cubierto', 'lluvia', 'llovizna', 'niebla', 'nieve']
  it.each(overcastGroups)('%s is cubierto by day and noche at night', (g) => {
    expect(skyToken(resolveSkyState(DIA, g))).toBe('cubierto')
    expect(skyToken(resolveSkyState(ATARDECER, g))).toBe('cubierto')
    expect(skyToken(resolveSkyState(NOCHE, g))).toBe('noche')
  })

  it('maps weather groups onto the phase-3 SkyWeather enum', () => {
    expect(resolveSkyState(DIA, 'llovizna').weather).toBe('lluvia')
    expect(resolveSkyState(DIA, 'nieve').weather).toBe('cubierto')
    expect(resolveSkyState(DIA, 'niebla').weather).toBe('niebla')
    expect(resolveSkyState(DIA, 'lluvia').weather).toBe('lluvia')
    expect(resolveSkyState(DIA, 'cubierto').weather).toBe('cubierto')
    expect(resolveSkyState(DIA, null).weather).toBe('despejado')
  })

  const allGroups: (WeatherGroup | null)[] = [...overcastGroups, 'despejado', 'tormenta', null]
  it.each(allGroups)('feeding the SkyWeather back is idempotent (%s)', (g) => {
    for (const t of [DIA, NOCHE, AMANECER, ATARDECER]) {
      const s = resolveSkyState(t, g)
      expect(skyToken(resolveSkyState(t, s.weather))).toBe(skyToken(s))
    }
  })
})

describe('skyFromSnapshot', () => {
  it('uses the current weather code with the night flag from the solar phase', () => {
    expect(skyToken(skyFromSnapshot({ now: { weatherCode: 95 } }, DIA))).toBe('tormenta')
    expect(skyToken(skyFromSnapshot({ now: { weatherCode: 3 } }, DIA))).toBe('cubierto')
    expect(skyToken(skyFromSnapshot({ now: { weatherCode: 0 } }, NOCHE))).toBe('noche')
  })

  it('falls back to the solar phase without data', () => {
    expect(skyToken(skyFromSnapshot({ now: null }, DIA))).toBe('dia')
    expect(skyToken(skyFromSnapshot({ now: null }, ATARDECER))).toBe('atardecer')
  })
})
