import { describe, expect, it } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'
import { ForecastDto } from '@/lib/sources/openMeteoForecast.schema'
import { normalizeForecast } from '@/lib/weather/normalize'
import type { HourlyPoint } from '@/lib/weather/types'
import { makeDaily, makeHourly } from './__fixtures__/build'
import { buildHeadline, MAX_CHARS, MAX_WORDS } from './headline'

type Over = (i: number, hour: number) => Partial<HourlyPoint>

/** Snapshot whose 48 points start at the local hour of `localStart` ('YYYY-MM-DDTHH'). */
function snap(localStart: string, over?: Over, n = 48) {
  return { hourly48: makeHourly(`${localStart}:00:00-03:00`, n, over) }
}

const at = (local: string) => new Date(`${local}-03:00`)

function withinLimits(h: string) {
  expect(h.split(/\s+/).length).toBeLessThanOrEqual(MAX_WORDS)
  expect(h.length).toBeLessThanOrEqual(MAX_CHARS)
  expect(h).not.toContain('!')
  expect(h.endsWith('.')).toBe(false)
}

describe('buildHeadline (NOW-03, D-13..D-16) under TZ=UTC', () => {
  it('runs in UTC like Vercel', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })

  const cases: Array<[string, { hourly48: HourlyPoint[] }, Date, string]> = [
    [
      'cool morning + afternoon rain',
      snap('2026-10-23T09', (i, h) => ({
        ...(i < 24 && (h === 9 || h === 10) ? { tempC: 4 } : {}),
        ...(i < 24 && (h === 15 || h === 16) ? { precipMm: 1.5, weatherCode: 63 } : {}),
      })),
      new Date('2026-10-23T12:00:00Z'),
      'Mañana fresca, lluvia a la tarde',
    ],
    [
      'heat + night storm',
      snap('2026-10-23T10', (i, h) => ({
        ...(i < 14 && h === 15 ? { tempC: 33 } : {}),
        ...(i < 14 && (h === 21 || h === 22) ? { weatherCode: 95 } : {}),
      })),
      at('2026-10-23T10:00:00'),
      'Día de calor, tormentas a la noche',
    ],
    [
      'strong heat + night storm (34 chars)',
      snap('2026-10-23T10', (i, h) => ({
        ...(i < 14 && h === 15 ? { tempC: 36 } : {}),
        ...(i < 14 && h === 21 ? { weatherCode: 95 } : {}),
      })),
      at('2026-10-23T10:00:00'),
      'Calor fuerte, tormentas a la noche',
    ],
    [
      'frost + clear day',
      snap('2026-10-23T05', (i, h) => (i < 19 && h === 6 ? { tempC: -1 } : {})),
      new Date('2026-10-23T08:00:00Z'),
      'Helada y día despejado',
    ],
    [
      '21:00 → tomorrow storm in the afternoon',
      snap('2026-10-23T21', (i, h) => (i >= 3 && i < 27 && h === 15 ? { weatherCode: 95 } : {})),
      new Date('2026-10-24T00:00:00Z'),
      'Mañana: tormentas a la tarde',
    ],
    [
      '22:00 → tomorrow cool start, never "mañana fresca" after the prefix',
      snap('2026-10-23T22', (i, h) => (i >= 2 && i < 26 && h === 7 ? { tempC: 4 } : {})),
      at('2026-10-23T22:00:00'),
      'Mañana: arranque fresco',
    ],
    [
      'overcast afternoon',
      snap('2026-10-23T13', () => ({ weatherCode: 3 })),
      at('2026-10-23T13:00:00'),
      'Tarde nublada',
    ],
    [
      'strong north wind',
      snap('2026-10-23T10', () => ({ windKmh: 45, windDirDeg: 0 })),
      at('2026-10-23T10:00:00'),
      'Viento fuerte del norte',
    ],
    [
      'strong wind changing sector',
      snap('2026-10-23T10', (i) => ({ windKmh: 45, windDirDeg: i % 2 === 0 ? 0 : 180 })),
      at('2026-10-23T10:00:00'),
      'Viento fuerte',
    ],
    [
      'rain at the current hour',
      snap('2026-10-23T10', (i) => (i === 0 ? { precipMm: 1.2, weatherCode: 63 } : {})),
      at('2026-10-23T10:00:00'),
      'Llueve ahora',
    ],
    [
      'storm at the current hour',
      snap('2026-10-23T10', (i) => (i === 0 ? { weatherCode: 95 } : {})),
      at('2026-10-23T10:20:00'),
      'Tormenta ahora',
    ],
    [
      'drizzle only',
      snap('2026-10-23T10', (i, h) =>
        i < 14 && (h === 7 || h === 8 || h === 16 || h === 17) ? { precipMm: 0.6, weatherCode: 53 } : {},
      ),
      at('2026-10-23T10:00:00'),
      'Llovizna a la tarde',
    ],
    [
      'showers (codes 80–82)',
      snap('2026-10-23T10', (i, h) => (i < 14 && h === 12 ? { precipMm: 3, weatherCode: 81 } : {})),
      at('2026-10-23T10:00:00'),
      'Chaparrones al mediodía',
    ],
    [
      'rain over ≥ 3 day parts',
      snap('2026-10-23T09', (i, h) =>
        i < 15 && (h === 10 || h === 15 || h === 21) ? { precipMm: 2, weatherCode: 63 } : {},
      ),
      at('2026-10-23T09:00:00'),
      'Lluvia todo el día',
    ],
    [
      'cold day',
      snap('2026-10-23T10', () => ({ tempC: 9 })),
      at('2026-10-23T10:00:00'),
      'Día frío',
    ],
    [
      'mostly code 2 at night',
      snap('2026-10-23T20', () => ({ weatherCode: 2 })),
      at('2026-10-23T20:00:00'),
      'Noche con algo de nubes',
    ],
    [
      'fog dominant from the morning',
      snap('2026-10-23T06', (i, h) => (i < 18 && h <= 15 ? { weatherCode: 45 } : { weatherCode: 3 })),
      at('2026-10-23T06:00:00'),
      'Niebla a la mañana',
    ],
    [
      'overcast dominant over morning fog',
      snap('2026-10-23T06', (i, h) => (i < 18 && h <= 11 ? { weatherCode: 45 } : { weatherCode: 3 })),
      at('2026-10-23T06:00:00'),
      'Día nublado',
    ],
  ]

  it.each(cases)('%s', (_name, s, now, expected) => {
    const h = buildHeadline(s, now)
    expect(h).toBe(expected)
    withinLimits(h!)
  })

  describe('window boundaries (D-14)', () => {
    it('20:59 summarises the rest of today, no prefix', () => {
      const s = snap('2026-10-23T20', (i) => (i === 2 ? { weatherCode: 95 } : {}))
      expect(buildHeadline(s, new Date('2026-10-23T23:59:00Z'))).toBe('Tormentas a la noche')
    })

    it('21:00 summarises tomorrow with the prefix', () => {
      const s = snap('2026-10-23T21', (i, h) => (i >= 3 && i < 27 && h === 21 ? { weatherCode: 95 } : {}))
      expect(buildHeadline(s, new Date('2026-10-24T00:00:00Z'))).toBe('Mañana: tormentas a la noche')
    })

    it('04:59 summarises the current calendar day, no prefix', () => {
      const s = snap('2026-10-24T04', (i, h) => (i < 20 && h === 15 ? { weatherCode: 95 } : {}))
      expect(buildHeadline(s, new Date('2026-10-24T07:59:00Z'))).toBe('Tormentas a la tarde')
    })

    it('02:00 summarises the current calendar day, no prefix', () => {
      const s = snap('2026-10-24T02', (i, h) => (i < 22 && h === 15 ? { weatherCode: 95 } : {}))
      expect(buildHeadline(s, new Date('2026-10-24T05:00:00Z'))).toBe('Tormentas a la tarde')
    })

    it('05:00 summarises the rest of today', () => {
      const s = snap('2026-10-24T05', (i, h) => (i < 19 && h === 18 ? { weatherCode: 95 } : {}))
      expect(buildHeadline(s, new Date('2026-10-24T08:00:00Z'))).toBe('Tormentas a la tarde')
    })
  })

  it('ignores a storm that only happened in past hours of a stale snapshot', () => {
    // Points start at 10:00, now is 15:00: the 11–12 h storm is history.
    const s = snap('2026-10-23T10', (i) => (i === 1 || i === 2 ? { weatherCode: 95 } : {}))
    const h = buildHeadline(s, at('2026-10-23T15:00:00'))
    expect(h).toBe('Tarde despejada')
  })

  describe('null cases (D-13)', () => {
    it('empty hourly48', () => {
      expect(buildHeadline({ hourly48: [] }, at('2026-10-23T10:00:00'))).toBeNull()
    })

    it('fewer than 3 window points', () => {
      expect(buildHeadline(snap('2026-10-23T10', undefined, 2), at('2026-10-23T10:00:00'))).toBeNull()
    })

    it('21:00 without points for tomorrow', () => {
      expect(buildHeadline(snap('2026-10-23T21', undefined, 3), at('2026-10-23T21:00:00'))).toBeNull()
    })

    it('all fields null', () => {
      const s = snap('2026-10-23T10', () => ({
        tempC: null,
        precipMm: null,
        weatherCode: null,
        windKmh: null,
        gustKmh: null,
        windDirDeg: null,
      }))
      expect(buildHeadline(s, at('2026-10-23T10:00:00'))).toBeNull()
    })
  })

  describe('sweep: every local hour × every fixture stays within D-16 limits', () => {
    const fixtures: Record<string, Over> = {
      dry: () => ({}),
      rain: (_i, h) => (h % 5 === 0 ? { precipMm: 2, weatherCode: 81 } : {}),
      storm: (_i, h) => (h === 4 || h === 17 ? { weatherCode: 95, precipMm: 8 } : {}),
      frost: (_i, h) => (h <= 8 ? { tempC: -5, weatherCode: 45 } : { weatherCode: 2 }),
      heat: (_i, h) => ({ tempC: h >= 12 && h <= 18 ? 38 : 26, weatherCode: 1 }),
      wind: (i) => ({ windKmh: 50, gustKmh: 75, windDirDeg: (i * 40) % 360, tempC: -4 }),
      nulls: (i) => (i % 2 === 0 ? { tempC: null, weatherCode: null, precipMm: null } : {}),
    }
    for (const [name, over] of Object.entries(fixtures)) {
      it(name, () => {
        for (let h = 0; h < 24; h++) {
          const hh = String(h).padStart(2, '0')
          const s = snap(`2026-10-23T${hh}`, over)
          const out = buildHeadline(s, at(`2026-10-23T${hh}:30:00`))
          if (out !== null) withinLimits(out)
          if (h >= 21) {
            if (out !== null) expect(out.startsWith('Mañana: ')).toBe(true)
          } else if (out !== null) {
            expect(out.startsWith('Mañana: ')).toBe(false)
          }
        }
      })
    }
  })

  it('real Open-Meteo fixture at 2026-10-23T17:30Z → non-null and within limits', () => {
    const { hourly48 } = normalizeForecast(ForecastDto.parse(fixture))
    const h = buildHeadline({ hourly48 }, new Date('2026-10-23T17:30:00Z'))
    expect(h).not.toBeNull()
    withinLimits(h!)
  })

  it('judges the day max with the daily max, not only the remaining hours (WR-02)', () => {
    // 20:00 on a warm day: the evening hours are 10°, but the day reached 24°.
    const s = { ...snap('2026-10-23T20', () => ({ tempC: 10 })), daily: makeDaily('2026-10-23', 3) }
    s.daily[0].tMaxC = 24
    expect(buildHeadline(s, at('2026-10-23T20:00'))).not.toMatch(/frío/i)
    expect(buildHeadline({ hourly48: s.hourly48 }, at('2026-10-23T20:00'))).toMatch(/frío/i)
  })
})
