#!/usr/bin/env node
// Smoke runner for Clima Winifreda (plain Node ESM, no dependencies).
//
// Usage:
//   node scripts/smoke.mjs <baseUrl> [--start] [--expect-region gru1]
//                          [--expect-commit <sha7>] [--expect-404 /path]...
//
//   --start            spawn `npx next start -p <port>` (port from baseUrl) and stop it at the end
//   --expect-region    /api/weather `region` must equal this value
//   --expect-commit    poll /api/weather every 10 s (max 300 s) until `commit` equals this value
//   --expect-404       this path must return 404 (repeatable)
//
// Reused by plans 01-02 (first deploy) and 01-07 (phase close).
import { spawn, spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const baseArg = args.find((a) => !a.startsWith('--') && !isFlagValue(a))
if (!baseArg) usage('missing <baseUrl>')

function isFlagValue(a) {
  const i = args.indexOf(a)
  return i > 0 && ['--expect-region', '--expect-commit', '--expect-404'].includes(args[i - 1])
}

function usage(msg) {
  console.error(`smoke: ${msg}`)
  console.error(
    'usage: node scripts/smoke.mjs <baseUrl> [--start] [--expect-region gru1] [--expect-commit <sha7>] [--expect-404 /path]...',
  )
  process.exit(2)
}

function flagValue(name) {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  const v = args[i + 1]
  if (!v || v.startsWith('--')) usage(`${name} needs a value`)
  return v
}

function flagValues(name) {
  const out = []
  args.forEach((a, i) => {
    if (a === name) {
      const v = args[i + 1]
      if (!v || v.startsWith('--')) usage(`${name} needs a value`)
      out.push(v)
    }
  })
  return out
}

const base = new URL(baseArg)
const startServer = args.includes('--start')
const expectRegion = flagValue('--expect-region')
const expectCommit = flagValue('--expect-commit')
const expect404 = flagValues('--expect-404')
for (const p of expect404) {
  // Git Bash rewrites "/path" into "C:/Program Files/Git/path"; prefix with MSYS_NO_PATHCONV=1.
  if (!p.startsWith('/')) {
    usage(`--expect-404 path must start with "/" (got ${p}); in Git Bash run with MSYS_NO_PATHCONV=1`)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const url = (path) => new URL(path, base).toString()

let child
let failed = false

function fail(msg) {
  failed = true
  console.error(`FAIL  ${msg}`)
}
function pass(msg) {
  console.log(`ok    ${msg}`)
}
function warn(msg) {
  console.warn(`warn  ${msg}`)
}

async function get(path) {
  const res = await fetch(url(path), {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  return { status: res.status, text }
}

async function getJson(path) {
  const r = await get(path)
  let json = null
  try {
    json = JSON.parse(r.text)
  } catch {
    // leave null
  }
  return { ...r, json }
}

async function startNext() {
  const port = base.port || (base.protocol === 'https:' ? '443' : '80')
  console.log(`smoke: starting next start -p ${port}`)
  if (!/^\d+$/.test(port)) usage(`invalid port ${port}`)
  const opts = { stdio: ['ignore', 'pipe', 'pipe'], env: process.env }
  // Windows needs a shell to run npx.cmd; pass one command string (port is digits only).
  child =
    process.platform === 'win32'
      ? spawn(`npx next start -p ${port}`, { ...opts, shell: true })
      : spawn('npx', ['next', 'start', '-p', port], opts)
  child.stdout.on('data', (d) => process.stdout.write(`[next] ${d}`))
  child.stderr.on('data', (d) => process.stderr.write(`[next] ${d}`))

  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const r = await get('/api/weather')
      if (r.status === 200) return
    } catch {
      // not up yet
    }
    await sleep(1000)
  }
  throw new Error('server did not answer 200 on /api/weather within 60 s')
}

function stopNext() {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    child.kill('SIGTERM')
  }
}

async function main() {
  if (startServer) await startNext()

  // 1. Home page renders with the place name.
  const home = await get('/')
  if (home.status !== 200) fail(`GET / -> ${home.status} (expected 200)`)
  else if (!home.text.includes('Winifreda')) fail('GET / -> 200 but HTML does not contain "Winifreda"')
  else pass('GET / -> 200 with "Winifreda"')

  // 2. Optional: wait for a specific deployment to go live.
  if (expectCommit) {
    const deadline = Date.now() + 300_000
    let seen
    for (;;) {
      const r = await getJson('/api/weather').catch(() => null)
      seen = r?.json?.commit
      if (seen === expectCommit) break
      if (Date.now() > deadline) break
      console.log(`smoke: commit is ${seen ?? '?'}, waiting for ${expectCommit}...`)
      await sleep(10_000)
    }
    if (seen === expectCommit) pass(`commit = ${expectCommit}`)
    else fail(`commit = ${seen ?? '?'} after 300 s (expected ${expectCommit})`)
  }

  // 3. /api/weather twice: same fetchedAt (served from the server cache, DATA-01).
  const a = await getJson('/api/weather')
  await sleep(2000)
  const b = await getJson('/api/weather')
  if (a.status !== 200 || b.status !== 200 || !a.json || !b.json) {
    fail(`GET /api/weather -> ${a.status}/${b.status} (expected 200 JSON twice)`)
  } else {
    const sa = a.json.sources?.[0]
    const sb = b.json.sources?.[0]
    if (!sa || sa.id !== 'open-meteo') fail('sources[0] is not open-meteo')
    if (sa?.fetchedAt !== sb?.fetchedAt) {
      fail(`sources[0].fetchedAt changed between requests (${sa?.fetchedAt} -> ${sb?.fetchedAt})`)
    } else {
      pass(`sources[0].fetchedAt stable across requests (${sa?.fetchedAt})`)
    }
    if (typeof a.json.now?.tempC === 'number') pass(`now.tempC = ${a.json.now.tempC}`)
    else if (sa?.status === 'error') warn(`open-meteo status=error (${sa.errorCode ?? '?'}), now is null`)
    else fail('now.tempC is not a number and source status is not error')

    if (expectRegion) {
      if (a.json.region === expectRegion) pass(`region = ${expectRegion}`)
      else fail(`region = ${a.json.region} (expected ${expectRegion})`)
    }
  }

  // 4. Paths that must not exist.
  for (const p of expect404) {
    const r = await get(p)
    if (r.status === 404) pass(`GET ${p} -> 404`)
    else fail(`GET ${p} -> ${r.status} (expected 404)`)
  }
}

main()
  .catch((err) => fail(err instanceof Error ? err.message : String(err)))
  .finally(() => {
    stopNext()
    if (failed) {
      console.error('smoke: FAILED')
      process.exit(1)
    }
    console.log('smoke: all checks passed')
    process.exit(0)
  })
