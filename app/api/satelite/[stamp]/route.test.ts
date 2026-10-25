// /api/satelite/[stamp] (D-07, T-05-11..16): invalid stamps never reach the adapter.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getSatelliteFrame = vi.fn()
vi.mock('@/lib/sources/gibs', () => ({ getSatelliteFrame }))

const NOW = Date.parse('2026-10-25T17:45:00Z')
const BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9])

async function call(stamp: string) {
  const { GET } = await import('./route')
  return GET(new Request(`http://localhost/api/satelite/${stamp}`), { params: Promise.resolve({ stamp }) })
}

describe('GET /api/satelite/[stamp]', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    getSatelliteFrame.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(['abc', '20261025T1325Z.jpg', '20261025T1800Z.jpg', '19990101T0000Z.jpg'])(
    '404 no-store for %s without calling the adapter',
    async (stamp) => {
      const res = await call(stamp)
      expect(res.status).toBe(404)
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(getSatelliteFrame).not.toHaveBeenCalled()
    },
  )

  it('serves the frame bytes as an immutable JPEG', async () => {
    getSatelliteFrame.mockResolvedValue({
      data: { b64: BYTES.toString('base64'), stamp: '20261025T1720Z' },
      fetchedAt: new Date(NOW).toISOString(),
    })
    const res = await call('20261025T1720Z.jpg')
    expect(res.status).toBe(200)
    expect(getSatelliteFrame).toHaveBeenCalledWith('20261025T1720Z')
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(res.headers.get('cache-control')).toBe('public, max-age=86400, s-maxage=31536000, immutable')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(Buffer.from(await res.arrayBuffer()).equals(BYTES)).toBe(true)
  })

  it('502 no-store with an empty body when the adapter throws', async () => {
    getSatelliteFrame.mockRejectedValue(new Error('blank'))
    const res = await call('20261025T1720Z.jpg')
    expect(res.status).toBe(502)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('')
  })
})
