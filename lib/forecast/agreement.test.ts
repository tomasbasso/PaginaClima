// Verdict thresholds (D-13, D-14). Every edge of AGREEMENT_C, plus the float trap (Pitfall 3).
import { describe, expect, it } from 'vitest'
import { AGREEMENT_C, verdictFor, type ModelVote } from './agreement'

const vote = (tMaxC: number, rainMm = 0, tMinC = 10): ModelVote => ({ tMaxC, tMinC, rainMm })

/** N dry votes whose maximums span exactly `spread`. */
const spreadVotes = (n: number, spread: number): ModelVote[] =>
  Array.from({ length: n }, (_, i) => vote(i === 0 ? 20 + spread : 20))

/** N votes on a flat 2 °C range, with `wet` of them reporting rain. */
const rainVotes = (n: number, wet: number, spread = 2): ModelVote[] =>
  Array.from({ length: n }, (_, i) => vote(i === 0 ? 20 + spread : 20, i < wet ? 5 : 0))

describe('AGREEMENT_C', () => {
  it('holds the calibrated pairs per number of voters', () => {
    expect(AGREEMENT_C[4]).toEqual([5, 9])
    expect(AGREEMENT_C[3]).toEqual([4, 7.5])
    expect(AGREEMENT_C[2]).toEqual([2.5, Infinity])
  })
})

describe('verdictFor()', () => {
  it('no voters give sinDato and one voter gives solo, never an agreement (D-14)', () => {
    expect(verdictFor([])).toBe('sinDato')
    expect(verdictFor([vote(20)])).toBe('solo')
  })

  it.each([
    [4, 5, 'coinciden'],
    [4, 5.1, 'dudan'],
    [4, 9, 'dudan'],
    [4, 9.1, 'desacuerdo'],
    [3, 4, 'coinciden'],
    [3, 4.1, 'dudan'],
    [3, 7.5, 'dudan'],
    [3, 7.6, 'desacuerdo'],
    [2, 2.5, 'coinciden'],
    [2, 2.6, 'dudan'],
    [2, 30, 'dudan'],
  ])('N=%i with a range of %f and unanimous rain is %s', (n, spread, expected) => {
    expect(verdictFor(spreadVotes(n, spread))).toBe(expected)
    const allWet = spreadVotes(n, spread).map((v) => ({ ...v, rainMm: 12 }))
    expect(verdictFor(allWet)).toBe(expected)
  })

  it('N=4: rain split 2 against 2 is desacuerdo, even with close temperatures', () => {
    expect(verdictFor(rainVotes(4, 2))).toBe('desacuerdo')
  })

  it('N=4: rain 3 against 1 with a range of 2 is dudan', () => {
    expect(verdictFor(rainVotes(4, 3))).toBe('dudan')
    expect(verdictFor(rainVotes(4, 1))).toBe('dudan')
  })

  it('N=3: rain 2 against 1 with a range of 2 is dudan', () => {
    expect(verdictFor(rainVotes(3, 2))).toBe('dudan')
    expect(verdictFor(rainVotes(3, 1))).toBe('dudan')
  })

  it('N=2: split rain with a range of 30 is dudan, never desacuerdo (D-14)', () => {
    expect(verdictFor(rainVotes(2, 1, 30))).toBe('dudan')
  })

  it('does not lose an edge to float drift (Pitfall 3)', () => {
    expect(16.1 - 12.1).toBeGreaterThan(4)
    expect(verdictFor([vote(16.1), vote(12.1), vote(14)])).toBe('coinciden')

    expect(19.1 - 10.1).not.toBe(9)
    expect(verdictFor([vote(19.1), vote(10.1), vote(15), vote(15)])).toBe('dudan')
  })

  it('the larger of the two ranges decides: a wide minimum counts like a wide maximum', () => {
    const wideMin = [vote(20, 0, 10), vote(20, 0, 15.1), vote(20, 0, 12), vote(20, 0, 12)]
    expect(verdictFor(wideMin)).toBe('dudan')

    const veryWideMin = [vote(20, 0, 2), vote(20, 0, 11.1), vote(20, 0, 5), vote(20, 0, 5)]
    expect(verdictFor(veryWideMin)).toBe('desacuerdo')

    const wideMax = [vote(25.1, 0, 10), vote(20, 0, 10), vote(22, 0, 10), vote(22, 0, 10)]
    expect(verdictFor(wideMax)).toBe('dudan')
  })

  it('exactly 1.0 mm counts as rain and 0.99 mm does not', () => {
    const atThreshold = (mm: number) => [vote(20, mm), vote(20, 5), vote(20, 5), vote(20, 5)]
    expect(verdictFor(atThreshold(1))).toBe('coinciden')
    expect(verdictFor(atThreshold(0.99))).toBe('dudan')
  })
})
