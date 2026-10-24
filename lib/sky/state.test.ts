import { describe, expect, it } from 'vitest'
import type { WeatherGroup } from '@/lib/weather/wmo'
import { refreshSolar, resolveSkyState, type SkyState, skyFromSnapshot, skyToken } from './state'

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

describe('refreshSolar', () => {
  it('updates phase and sunAltitude for the new instant', () => {
    const s = refreshSolar(resolveSkyState(NOCHE, 'lluvia'), DIA)
    expect(s.phase).toBe('dia')
    expect(s.sunAltitude).toBe(resolveSkyState(DIA, null).sunAltitude)
    expect(s.weather).toBe('lluvia')
  })

  it('keeps any extra field of the server state (Pitfall 9)', () => {
    const withExtra = { ...resolveSkyState(DIA, 'tormenta'), intensity: 0.8 } as SkyState & { intensity: number }
    const s = refreshSolar(withExtra, ATARDECER) as SkyState & { intensity?: number }
    expect(s.intensity).toBe(0.8)
    expect(s.weather).toBe('tormenta')
    expect(s.phase).toBe('atardecer')
  })
})

describe('skyFromSnapshot weather fields (D-01, D-08)', () => {
  it('derives intensity and cloud cover from the code and keeps the wind', () => {
    const s = skyFromSnapshot(
      { now: { weatherCode: 63, precipMm: 2, windKmh: 25, windDirDeg: 270 } },
      DIA,
    )
    expect(s.weather).toBe('lluvia')
    expect(s.intensity).toBe(0.7)
    expect(s.cloudCover).toBe(90)
    expect(s.windKmh).toBe(25)
    expect(s.windDirDeg).toBe(270)
  })

  it.each([
    [0, 0],
    [1, 15],
    [2, 40],
    [3, 85],
    [45, 30],
    [95, 95],
  ])('code %s → cloudCover %s', (code, cover) => {
    expect(skyFromSnapshot({ now: { weatherCode: code } }, DIA).cloudCover).toBe(cover)
  })

  it('heavy precipitation raises the intensity', () => {
    expect(skyFromSnapshot({ now: { weatherCode: 61, precipMm: 6 } }, DIA).intensity).toBe(1)
  })

  it('without data the optional fields stay unset and the token does not change', () => {
    const s = skyFromSnapshot({ now: null }, DIA)
    expect(s.intensity).toBeUndefined()
    expect(s.cloudCover ?? null).toBeNull()
    expect(s.windKmh ?? null).toBeNull()
    expect(s.windDirDeg ?? null).toBeNull()
    expect(skyToken(s)).toBe('dia')
  })

  it('missing wind upstream stays null', () => {
    const s = skyFromSnapshot({ now: { weatherCode: 3, windKmh: null, windDirDeg: null } }, DIA)
    expect(s.windKmh).toBeNull()
    expect(s.windDirDeg).toBeNull()
  })

  it('refreshSolar keeps intensity, wind and cloud cover (Pitfall 9)', () => {
    const s = skyFromSnapshot(
      { now: { weatherCode: 95, precipMm: 0, windKmh: 40, windDirDeg: 90 } },
      DIA,
    )
    const r = refreshSolar(s, NOCHE)
    expect(r.phase).toBe('noche')
    expect(r.intensity).toBe(0.8)
    expect(r.windKmh).toBe(40)
    expect(r.windDirDeg).toBe(90)
    expect(r.cloudCover).toBe(95)
  })
})
