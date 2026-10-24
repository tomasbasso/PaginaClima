'use client'
// /dev/sky controls (UI-SPEC "/dev/sky"): forced state in the URL, three 390×844 frames (animated
// canvas, static frame, CSS fallback), presets and the fps / ms / quality reading. At most two
// WebGL contexts on the page (canvas + static; the fallback frame uses renderer 'off', T-03-15).
// The controls use ink, never the accent (UI-SPEC "Color").
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { PampaHorizon } from '@/components/PampaHorizon'
import { SkyBackdrop } from '@/components/client/SkyBackdrop'
import type { SkyFailReason, SkyStats } from '@/components/client/sky/renderer'
import { astroAt } from '@/lib/sky/astro'
import {
  parseSkyLabParams,
  SKY_LAB_CLIMAS,
  SKY_LAB_DIRS,
  SKY_LAB_ESCALAS,
  SKY_LAB_PRESETS,
  SKY_LAB_RANGES,
  SKY_LAB_WMO_CODES,
  type SkyLabState,
  toSkyAstro,
  toSkyLabQuery,
  toSkyState,
  weatherOfCode,
} from '@/lib/sky/devParams'
import { getSolarPhase } from '@/lib/sky/phase'
import { skyToken } from '@/lib/sky/state'
import { windSector } from '@/lib/weather/wind'

/** URL updates while dragging a slider are batched (each replace re-renders the server page). */
const URL_DEBOUNCE_MS = 250

const LABEL = 'text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink/75'
const BODY = 'text-[15px] leading-[1.6] text-ink/75 nums'
const BUTTON =
  'h-11 border border-ink/30 bg-transparent px-4 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-ink hover:bg-ink/8 focus-visible:border-ink aria-pressed:border-ink aria-pressed:bg-ink/12'
const SELECT =
  'h-11 border border-ink/30 bg-ground px-3 text-[15px] leading-[1.6] text-ink hover:border-ink focus-visible:border-ink'
const RANGE = 'h-11 w-56 max-w-full'
const INK = '#fbfbf2'

const CLIMA_LABEL: Record<(typeof SKY_LAB_CLIMAS)[number], string> = {
  despejado: 'DESPEJADO',
  cubierto: 'CUBIERTO',
  lluvia: 'LLUVIA',
  tormenta: 'TORMENTA',
  niebla: 'NIEBLA',
}

/** es-AR number: decimal comma, U+2212 minus. */
function fmt(n: number, decimals?: number): string {
  const s = decimals === undefined ? String(n) : n.toFixed(decimals)
  return s.replace('-', '−').replace('.', ',')
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className={`${LABEL} mb-2 p-0`}>{legend}</legend>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </fieldset>
  )
}

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={BUTTON}>
      {children}
    </button>
  )
}

function Frame({
  caption,
  token,
  windKmh,
  content,
  overlay,
  children,
}: {
  caption: string
  token: string
  windKmh: number
  content: ReactNode
  overlay?: ReactNode
  children: ReactNode
}) {
  return (
    <figure className="m-0 flex shrink-0 flex-col gap-4">
      <section
        aria-label={caption}
        data-sky={token}
        // Same box as /dev/estados: 844px tall, no tab bar, so the band keeps its 240px and the
        // horizon sits on the band bottom (--bar-h 0px). The band is a direct child marked
        // data-sky-band, measured by the renderer (never assumed).
        className="relative isolate flex h-[844px] w-[390px] shrink-0 flex-col overflow-hidden bg-ground [--band-h:240px] [--bar-h:0px]"
      >
        {children}
        <div className="flex flex-1 flex-col pt-[24px]">
          <div className="w-full px-6">{content}</div>
          <div className="min-h-16 flex-1" />
        </div>
        <div data-sky-band className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0">
            <PampaHorizon windKmh={windKmh} />
          </div>
        </div>
        {overlay ? (
          <p className={`${LABEL} absolute inset-x-6 top-4 z-10 m-0 text-center`}>{overlay}</p>
        ) : null}
      </section>
      <figcaption className={LABEL}>{caption}</figcaption>
    </figure>
  )
}

export function SkyLab({
  initial,
  contentDay,
  contentNight,
}: {
  initial: SkyLabState
  contentDay: ReactNode
  contentNight: ReactNode
}) {
  const router = useRouter()
  const [lab, setLab] = useState<SkyLabState>(initial)
  const [paused, setPaused] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const [stats, setStats] = useState<SkyStats | null>(null)
  const [status, setStatus] = useState<{ s: 'ok' | SkyFailReason; message?: string } | null>(null)

  const query = toSkyLabQuery(lab)
  useEffect(() => {
    const id = window.setTimeout(() => {
      router.replace('?' + query, { scroll: false })
    }, URL_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query, router])

  const set = (over: Partial<SkyLabState>) => setLab((cur) => ({ ...cur, ...over }))
  const sky = toSkyState(lab)
  const astro = toSkyAstro(lab)
  const token = skyToken(sky)
  const content = showContent ? (sky.phase === 'noche' ? contentNight : contentDay) : null

  const ahoraReal = () => {
    const now = new Date()
    const { sunAltitude } = getSolarPhase(now)
    set({
      // Same validation as the query (clamp + 0,5° step).
      alt: parseSkyLabParams({ alt: String(sunAltitude) }).alt,
      lado: astroAt(now).morning ? 'mañana' : 'tarde',
    })
  }

  const setClima = (clima: SkyLabState['clima']) =>
    setLab((cur) => ({
      ...cur,
      clima,
      // A code of another weather would contradict the forced weather: drop it.
      wmo: cur.wmo !== null && weatherOfCode(cur.wmo) !== clima ? null : cur.wmo,
    }))

  const setWmo = (raw: string) => {
    const wmo = parseSkyLabParams({ wmo: raw }).wmo
    setLab((cur) => ({ ...cur, wmo, clima: wmo === null ? cur.clima : (weatherOfCode(wmo) ?? cur.clima) }))
  }

  const canvasOverlay =
    status?.s === 'no-webgl'
      ? 'ESTE NAVEGADOR NO TIENE WEBGL. SE VE EL FALLBACK.'
      : status && status.s !== 'ok'
        ? `EL CIELO FALLÓ: ${status.message ?? status.s}. SE VE EL FALLBACK.`
        : undefined

  const reading = stats
    ? `${stats.fps} FPS · ${fmt(stats.cpuMs, 1)} MS POR FRAME · CALIDAD ${stats.quality}`
    : '— FPS · — MS POR FRAME · CALIDAD —'

  const { alt: rAlt, i: rI, viento: rViento, nubes: rNubes } = SKY_LAB_RANGES

  return (
    <main className="min-h-svh bg-ground p-6 pb-40 text-ink">
      <h1 className={`${LABEL} m-0`}>CIELO · /dev/sky</h1>

      <div className="mt-8 flex max-w-[560px] flex-col gap-4">
        <Group legend="ALTURA DEL SOL">
          <input
            type="range"
            aria-label="ALTURA DEL SOL"
            min={rAlt.min}
            max={rAlt.max}
            step={rAlt.step}
            value={lab.alt}
            onChange={(e) => set({ alt: parseSkyLabParams({ alt: e.target.value }).alt })}
            className={RANGE}
            style={{ accentColor: INK }}
          />
          <span className={`${BODY} w-16`}>{fmt(lab.alt)}°</span>
          <Toggle pressed={lab.lado === 'mañana'} onClick={() => set({ lado: 'mañana' })}>
            MAÑANA
          </Toggle>
          <Toggle pressed={lab.lado === 'tarde'} onClick={() => set({ lado: 'tarde' })}>
            TARDE
          </Toggle>
        </Group>

        <Group legend="ATAJOS">
          <button type="button" className={BUTTON} onClick={() => set({ alt: -30 })}>
            NOCHE
          </button>
          <button type="button" className={BUTTON} onClick={() => set({ alt: -2, lado: 'mañana' })}>
            AMANECER
          </button>
          <button type="button" className={BUTTON} onClick={() => set({ alt: 40 })}>
            DÍA
          </button>
          <button type="button" className={BUTTON} onClick={() => set({ alt: 2, lado: 'tarde' })}>
            ATARDECER
          </button>
          <button type="button" className={BUTTON} onClick={ahoraReal}>
            AHORA REAL
          </button>
        </Group>

        <Group legend="CLIMA">
          {SKY_LAB_CLIMAS.map((c) => (
            <Toggle key={c} pressed={lab.clima === c} onClick={() => setClima(c)}>
              {CLIMA_LABEL[c]}
            </Toggle>
          ))}
        </Group>

        <Group legend="CÓDIGO WMO">
          <select
            aria-label="CÓDIGO WMO"
            value={lab.wmo ?? ''}
            onChange={(e) => setWmo(e.target.value)}
            className={SELECT}
          >
            <option value="">—</option>
            {SKY_LAB_WMO_CODES.map(({ code, label }) => (
              <option key={code} value={code}>
                {`${code} · ${label}`}
              </option>
            ))}
          </select>
        </Group>

        <Group legend="INTENSIDAD">
          <input
            type="range"
            aria-label="INTENSIDAD"
            min={rI.min}
            max={rI.max}
            step={rI.step}
            value={sky.intensity ?? 0}
            onChange={(e) => set({ i: parseSkyLabParams({ i: e.target.value }).i })}
            className={RANGE}
            style={{ accentColor: INK }}
          />
          <span className={`${BODY} w-16`}>{fmt(sky.intensity ?? 0)}</span>
          <Toggle pressed={lab.i === null} onClick={() => set({ i: null })}>
            SEGÚN CÓDIGO
          </Toggle>
        </Group>

        <Group legend="VIENTO">
          <input
            type="range"
            aria-label="VIENTO"
            min={rViento.min}
            max={rViento.max}
            step={rViento.step}
            value={lab.viento}
            onChange={(e) => set({ viento: parseSkyLabParams({ viento: e.target.value }).viento })}
            className={RANGE}
            style={{ accentColor: INK }}
          />
          <span className={`${BODY} w-20`}>{fmt(lab.viento)} km/h</span>
          <label className="flex items-center gap-2">
            <span className={LABEL}>DIRECCIÓN</span>
            <select
              value={lab.dir ?? ''}
              onChange={(e) => set({ dir: parseSkyLabParams({ dir: e.target.value }).dir })}
              className={SELECT}
            >
              <option value="">—</option>
              {SKY_LAB_DIRS.map((d) => (
                <option key={d} value={d}>
                  {`${windSector(d).short} · ${d}°`}
                </option>
              ))}
            </select>
          </label>
        </Group>

        <Group legend="NUBES">
          <input
            type="range"
            aria-label="NUBES"
            min={rNubes.min}
            max={rNubes.max}
            step={rNubes.step}
            value={sky.cloudCover ?? 0}
            onChange={(e) => set({ nubes: parseSkyLabParams({ nubes: e.target.value }).nubes })}
            className={RANGE}
            style={{ accentColor: INK }}
          />
          <span className={`${BODY} w-16`}>{fmt(sky.cloudCover ?? 0)} %</span>
          <Toggle pressed={lab.nubes === null} onClick={() => set({ nubes: null })}>
            SEGÚN CÓDIGO
          </Toggle>
        </Group>

        <Group legend="ESCALA">
          {SKY_LAB_ESCALAS.map((e) => (
            <Toggle key={e} pressed={lab.escala === e} onClick={() => set({ escala: e })}>
              {`${fmt(e)}×`}
            </Toggle>
          ))}
        </Group>

        <div className="flex flex-wrap items-center gap-2">
          <Toggle pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? 'REANUDAR CIELO' : 'PAUSAR CIELO'}
          </Toggle>
          <Toggle pressed={showContent} onClick={() => setShowContent((v) => !v)}>
            MOSTRAR CONTENIDO
          </Toggle>
        </div>

        <p className={`${BODY} m-0`} aria-live="off">
          {reading}
        </p>
      </div>

      <div className="mt-8 flex gap-8 overflow-x-auto pb-4">
        <Frame
          caption="CANVAS"
          token={token}
          windKmh={lab.viento}
          content={content}
          overlay={canvasOverlay}
        >
          <SkyBackdrop
            state={sky}
            astro={astro}
            renderer="auto"
            paused={paused}
            bufferScale={lab.escala}
            onStats={setStats}
            onStatus={(s, message) => setStatus({ s, message })}
          />
        </Frame>
        <Frame
          caption="ESTÁTICO (REDUCIR MOVIMIENTO)"
          token={token}
          windKmh={lab.viento}
          content={content}
        >
          <SkyBackdrop state={sky} astro={astro} renderer="static" bufferScale={lab.escala} />
        </Frame>
        <Frame
          caption={`FALLBACK CSS · DATA-SKY ${token}`}
          token={token}
          windKmh={lab.viento}
          content={content}
        >
          <SkyBackdrop state={sky} renderer="off" />
        </Frame>
      </div>

      <section className="mt-12" aria-labelledby="presets">
        <h2 id="presets" className={`${LABEL} m-0 mb-4`}>
          PRESETS
        </h2>
        <div className="grid max-w-[1234px] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {SKY_LAB_PRESETS.map((p) => {
            const state = { ...p.state, escala: lab.escala }
            return (
              <Toggle
                key={p.name}
                pressed={toSkyLabQuery(state) === query}
                onClick={() => setLab(state)}
              >
                {p.name}
              </Toggle>
            )
          })}
        </div>
      </section>
    </main>
  )
}
