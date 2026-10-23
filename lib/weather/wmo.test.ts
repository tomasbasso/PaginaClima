import { describe, expect, it } from 'vitest'
import { describeWeather } from './wmo'

const TABLE: [number[], string, string][] = [
  [[0], 'Despejado', 'despejado'],
  [[1], 'Casi despejado', 'despejado'],
  [[2], 'Algo nublado', 'despejado'],
  [[3], 'Cubierto', 'cubierto'],
  [[45, 48], 'Niebla', 'niebla'],
  [[51, 53], 'Llovizna', 'llovizna'],
  [[55], 'Llovizna intensa', 'llovizna'],
  [[56, 57], 'Llovizna helada', 'llovizna'],
  [[61], 'Lluvia débil', 'lluvia'],
  [[63], 'Lluvia', 'lluvia'],
  [[65], 'Lluvia fuerte', 'lluvia'],
  [[66, 67], 'Lluvia helada', 'lluvia'],
  [[71, 73, 77], 'Nevadas débiles', 'nieve'],
  [[75], 'Nevada', 'nieve'],
  [[80, 81], 'Chaparrones', 'lluvia'],
  [[82], 'Chaparrones fuertes', 'lluvia'],
  [[85, 86], 'Chaparrones de nieve', 'nieve'],
  [[95], 'Tormenta', 'tormenta'],
  [[96, 99], 'Tormenta con granizo', 'tormenta'],
]

describe('describeWeather (UI-SPEC NOW-02 table)', () => {
  for (const [codes, label, group] of TABLE) {
    for (const code of codes) {
      it(`${code} → ${label} / ${group}`, () => {
        expect(describeWeather(code, { night: false })).toEqual({ label, group })
      })
    }
  }

  it('codes 0 and 1 at night read "Noche despejada"', () => {
    expect(describeWeather(0, { night: true })).toEqual({ label: 'Noche despejada', group: 'despejado' })
    expect(describeWeather(1, { night: true })).toEqual({ label: 'Noche despejada', group: 'despejado' })
  })

  it('code 2 at night stays "Algo nublado"', () => {
    expect(describeWeather(2, { night: true }).label).toBe('Algo nublado')
  })

  it('unknown and null codes hide the label', () => {
    expect(describeWeather(42, { night: false })).toEqual({ label: null, group: null })
    expect(describeWeather(null, { night: true })).toEqual({ label: null, group: null })
  })
})
