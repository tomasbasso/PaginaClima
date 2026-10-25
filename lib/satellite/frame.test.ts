import { describe, expect, it } from 'vitest'
import { GIBS_BBOX_3857, LAT, LON, SATELLITE_SIDE_KM } from '@/lib/config'
import {
  gibsDomainsUrl,
  gibsWmsUrl,
  isoFromStamp,
  latestSlotFromDomains,
  markerPosition,
  parseStamp,
  satelliteView,
  stampFromIso,
} from './frame'

const NOW = Date.parse('2026-10-25T14:00:00Z')

describe('stamps', () => {
  it('converts ISO <-> stamp both ways', () => {
    expect(stampFromIso('2026-10-25T13:20:00Z')).toBe('20261025T1320Z')
    expect(isoFromStamp('20261025T1320Z')).toBe('2026-10-25T13:20:00Z')
  })
})

describe('parseStamp', () => {
  it('accepts a valid stamp inside the 24 h window', () => {
    expect(parseStamp('20261025T1320Z', NOW)).toBe('2026-10-25T13:20:00Z')
  })

  it('accepts the exact now − 24 h edge and now itself', () => {
    expect(parseStamp('20261024T1400Z', NOW)).toBe('2026-10-24T14:00:00Z')
    expect(parseStamp('20261025T1400Z', NOW)).toBe('2026-10-25T14:00:00Z')
  })

  it('rejects bad formats', () => {
    for (const s of ['abc', '20261025T1320', '20261025T1320Z.jpg', '2026-10-25T13:20Z', ' 20261025T1320Z']) {
      expect(parseStamp(s, NOW)).toBeNull()
    }
  })

  it('rejects minutes off the 10-min grid', () => {
    expect(parseStamp('20261025T1325Z', NOW)).toBeNull()
  })

  it('rejects invalid calendar dates', () => {
    expect(parseStamp('20261332T0000Z', NOW)).toBeNull()
    expect(parseStamp('20260230T0000Z', Date.parse('2026-02-28T12:00:00Z'))).toBeNull()
    expect(parseStamp('20261025T2500Z', NOW)).toBeNull()
  })

  it('rejects the future and anything older than 24 h', () => {
    expect(parseStamp('20261025T1410Z', NOW)).toBeNull()
    expect(parseStamp('20261024T1350Z', NOW)).toBeNull()
    expect(parseStamp('19990101T0000Z', NOW)).toBeNull()
  })
})

describe('markerPosition', () => {
  it('puts Winifreda at the center of the bbox', () => {
    const m = markerPosition(LAT, LON, GIBS_BBOX_3857)
    expect(Math.abs(m.x - 0.5)).toBeLessThan(0.002)
    expect(Math.abs(m.y - 0.5)).toBeLessThan(0.002)
  })

  it('y grows downward: a point to the north has y < 0.5', () => {
    expect(markerPosition(LAT + 1, LON, GIBS_BBOX_3857).y).toBeLessThan(0.5)
    expect(markerPosition(LAT, LON + 1, GIBS_BBOX_3857).x).toBeGreaterThan(0.5)
  })

  it('the bbox side is 800 km on the ground ± 1 %', () => {
    const [minx, , maxx] = GIBS_BBOX_3857
    const km = ((maxx - minx) * Math.cos((LAT * Math.PI) / 180)) / 1000
    expect(Math.abs(km - SATELLITE_SIDE_KM) / SATELLITE_SIDE_KM).toBeLessThan(0.01)
  })
})

describe('latestSlotFromDomains', () => {
  it('takes the end of a single range', () => {
    const xml = '<Domains><Domain>2026-10-25T11:00:00Z/2026-10-25T13:30:00Z/PT10M</Domain></Domains>'
    expect(latestSlotFromDomains(xml)).toBe('2026-10-25T13:30:00Z')
  })

  it('takes the end of the last range in a comma list', () => {
    const xml =
      '<Domain>2026-10-25T11:00:00Z/2026-10-25T12:00:00Z/PT10M,2026-10-25T12:30:00Z/2026-10-25T13:40:00Z/PT10M</Domain>'
    expect(latestSlotFromDomains(xml)).toBe('2026-10-25T13:40:00Z')
  })

  it('returns null on garbage or missing <Domain>', () => {
    expect(latestSlotFromDomains('garbage')).toBeNull()
    expect(latestSlotFromDomains('<Domains></Domains>')).toBeNull()
    expect(latestSlotFromDomains('<Domain>not-a-date</Domain>')).toBeNull()
  })
})

describe('GIBS URLs', () => {
  it('gibsWmsUrl carries the fixed layer, CRS, size, format and explicit TIME', () => {
    const url = new URL(gibsWmsUrl('2026-10-25T13:20:00Z'))
    expect(url.host).toBe('gibs.earthdata.nasa.gov')
    expect(url.searchParams.get('LAYERS')).toBe('GOES-East_ABI_Band13_Clean_Infrared')
    expect(url.searchParams.get('CRS')).toBe('EPSG:3857')
    expect(url.searchParams.get('WIDTH')).toBe('720')
    expect(url.searchParams.get('HEIGHT')).toBe('720')
    expect(url.searchParams.get('FORMAT')).toBe('image/jpeg')
    expect(url.searchParams.get('TIME')).toBe('2026-10-25T13:20:00Z')
    expect(url.searchParams.get('BBOX')).toBe(GIBS_BBOX_3857.join(','))
  })

  it('gibsDomainsUrl rounds the end to the 10-min bucket and starts 3 h before', () => {
    const a = gibsDomainsUrl(Date.parse('2026-10-25T13:51:10Z'))
    const b = gibsDomainsUrl(Date.parse('2026-10-25T13:59:59Z'))
    expect(a).toBe(b)
    expect(a).toContain('/all/2026-10-25T10:50:00Z--2026-10-25T13:50:00Z.xml')
    expect(a).toContain('GOES-East_ABI_Band13_Clean_Infrared/default/GoogleMapsCompatible_Level6')
  })
})

describe('satelliteView', () => {
  const now = new Date('2026-10-25T14:00:00Z') // 11:00 ART

  it('null → null', () => {
    expect(satelliteView(null, now)).toBeNull()
  })

  it('fresh pass: time in ART, own src, alt and centered marker', () => {
    const v = satelliteView({ stamp: '20261025T1320Z', timeISO: '2026-10-25T13:20:00Z' }, now)
    expect(v).not.toBeNull()
    expect(v!.src).toBe('/api/satelite/20261025T1320Z.jpg')
    expect(v!.timeText).toBe('Imagen infrarroja de las 10:20')
    expect(v!.stale).toBe(false)
    expect(v!.alt).toBe('Imagen satelital infrarroja de La Pampa de las 10:20, centrada en Winifreda')
    expect(Math.abs(v!.marker.x - 0.5)).toBeLessThan(0.002)
  })

  it('a pass from the previous ART day says "ayer a las"', () => {
    const v = satelliteView(
      { stamp: '20261026T0250Z', timeISO: '2026-10-26T02:50:00Z' },
      new Date('2026-10-26T03:30:00Z'), // 00:30 ART
    )
    expect(v!.timeText).toBe('Imagen infrarroja de ayer a las 23:50')
    expect(v!.stale).toBe(false)
  })

  it('older than 90 min → stale with "hace N min" or "hace N h"', () => {
    const v1 = satelliteView({ stamp: '20261025T1220Z', timeISO: '2026-10-25T12:20:00Z' }, new Date('2026-10-25T13:55:00Z'))
    expect(v1!.stale).toBe(true)
    expect(v1!.timeText).toBe('Imagen infrarroja de las 09:20 · hace 95 min')

    const v2 = satelliteView({ stamp: '20261025T1100Z', timeISO: '2026-10-25T11:00:00Z' }, now)
    expect(v2!.stale).toBe(true)
    expect(v2!.timeText).toBe('Imagen infrarroja de las 08:00 · hace 3 h')
  })

  it('exactly 90 min is not stale', () => {
    const v = satelliteView({ stamp: '20261025T1230Z', timeISO: '2026-10-25T12:30:00Z' }, now)
    expect(v!.stale).toBe(false)
  })
})
