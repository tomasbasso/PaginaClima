#!/usr/bin/env node
// One-shot ERA5 1991–2020 daily rain climatology for Winifreda (D-10, RAIN-02).
// Plain Node ESM, node: modules only. NOT wired to package.json or `next build`.
//
// Usage (run by hand ONCE; the output is committed):
//   node scripts/climatology.mjs
//
// Cost: a single archive request, but 30 years count as ~783 Open-Meteo calls of quota
// (open-meteo.com/en/pricing, fractional per 2 weeks). Do not re-run it unless the method
// changes; never call it from tests, build or runtime.
//
// Method (RESEARCH Patrón 2):
//   1. Mean per MM-DD on a 365-day calendar; 29/02 is dropped (adds ~0.02 mm/year).
//   2. Centered circular moving average of 31 days (keeps the annual total).
//   3. Rounded to 3 decimals → lib/rain/climatology-1991-2020.json
//
// LAT/LON/TZ duplicate lib/config.ts on purpose: this script does not import TypeScript.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const LAT = -36.23
const LON = -64.23
const TZ = 'America/Argentina/Buenos_Aires'
const WINDOW = 31
const OUT = fileURLToPath(new URL('../lib/rain/climatology-1991-2020.json', import.meta.url))

const url = `https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({
  latitude: String(LAT),
  longitude: String(LON),
  start_date: '1991-01-01',
  end_date: '2020-12-31',
  daily: 'precipitation_sum',
  models: 'era5',
  timezone: TZ,
}).toString()}`

function fail(msg) {
  console.error(`climatology: ${msg}`)
  process.exit(1)
}

// Non-leap day of year (0..364) of a 'MM-DD' string; null for 02-29.
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function doy(mmdd) {
  const m = Number(mmdd.slice(0, 2))
  const d = Number(mmdd.slice(3, 5))
  if (m === 2 && d === 29) return null
  let n = 0
  for (let i = 0; i < m - 1; i++) n += MONTH_DAYS[i]
  return n + d - 1
}

let body
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) fail(`HTTP ${res.status}`)
  body = await res.json()
} catch (err) {
  fail(String(err))
}

const time = body?.daily?.time
const mm = body?.daily?.precipitation_sum
if (!Array.isArray(time) || !Array.isArray(mm) || time.length !== mm.length) fail('unexpected shape')
if (time.length < 10_950) fail(`only ${time.length} days`)

const sums = new Array(365).fill(0)
const counts = new Array(365).fill(0)
for (let i = 0; i < time.length; i++) {
  const v = mm[i]
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) fail(`bad value on ${time[i]}: ${v}`)
  const k = doy(time[i].slice(5, 10))
  if (k === null) continue
  sums[k] += v
  counts[k]++
}
if (counts.some((c) => c !== 30)) fail('every MM-DD must have 30 years')
const mean = sums.map((s, i) => s / counts[i])

const half = (WINDOW - 1) / 2
const smooth = mean.map((_, i) => {
  let s = 0
  for (let j = -half; j <= half; j++) s += mean[(i + j + 365) % 365]
  return s / WINDOW
})
const daily = smooth.map((v) => Math.round(v * 1000) / 1000)
const annualMm = Math.round(daily.reduce((a, b) => a + b, 0) * 10) / 10

const out = {
  source: 'Open-Meteo archive ERA5',
  lat: LAT,
  lon: LON,
  period: '1991-2020',
  smoothing: 'circular-31d',
  annualMm,
  daily,
}
await writeFile(OUT, `${JSON.stringify(out)}\n`)

console.log(`annualMm: ${annualMm}`)
let start = 0
const names = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
for (let m = 0; m < 12; m++) {
  const total = daily.slice(start, start + MONTH_DAYS[m]).reduce((a, b) => a + b, 0)
  console.log(`${names[m]}: ${total.toFixed(1)}`)
  start += MONTH_DAYS[m]
}
