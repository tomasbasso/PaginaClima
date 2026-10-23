import { describe, expect, it } from 'vitest'
import { getSolarPhase } from './phase'

// Instants verified with a one-off suncalc getPosition call for Winifreda (2026-10-23):
// 15:00Z ≈ +61.7°, 03:00Z ≈ −39.8°, 09:15Z ≈ −1.9° (sunrise 09:22Z), 22:45Z ≈ −1.3° (sunset 22:40Z).
describe('getSolarPhase', () => {
  it('mid-day is dia', () => {
    const r = getSolarPhase(new Date('2026-10-23T15:00:00Z'))
    expect(r.phase).toBe('dia')
    expect(r.sunAltitude).toBeGreaterThanOrEqual(6)
    expect(Math.abs(r.sunAltitude)).toBeLessThanOrEqual(90)
  })

  it('midnight is noche', () => {
    const r = getSolarPhase(new Date('2026-10-23T03:00:00Z'))
    expect(r.phase).toBe('noche')
    expect(r.sunAltitude).toBeLessThan(-6)
  })

  it('just before sunrise is amanecer', () => {
    const r = getSolarPhase(new Date('2026-10-23T09:15:00Z'))
    expect(r.phase).toBe('amanecer')
    expect(r.sunAltitude).toBeGreaterThanOrEqual(-6)
    expect(r.sunAltitude).toBeLessThan(6)
  })

  it('just after sunset is atardecer', () => {
    const r = getSolarPhase(new Date('2026-10-23T22:45:00Z'))
    expect(r.phase).toBe('atardecer')
    expect(r.sunAltitude).toBeGreaterThanOrEqual(-6)
    expect(r.sunAltitude).toBeLessThan(6)
  })
})
