// Weekly confidence phrase (UI-SPEC 'Despacho', D-15). Pure: callers pass today's key. Every word comes
// from this file, so no upstream text reaches the page (T-04-18). Solo and sinDato days never count as
// agreement or as doubt (T-04-19), except in rule 1, which exists to say so.
import { addDaysToKey, weekdayLong } from '@/lib/time'
import type { Verdict } from './agreement'

export type DespachoTone = 'azure' | 'sun' | 'ember' | 'neutral'

/** The longest phrase is rule 2 with 'El miércoles'. */
export const MAX_DESPACHO_CHARS = 82

// Below this many days with a verdict there is no week to summarise (rule 0).
const MIN_DAYS_WITH_VERDICT = 3
const FEW_MODELS_DAYS = 4
const HARD_WEEK_DOUBTS = 5
const FULL_WEEK = 7

const SATURDAY = 'sábado'
const SUNDAY = 'domingo'

type Day = { date: string; verdict: Verdict }
type Despacho = { text: string; tone: DespachoTone }

const FEW_MODELS: Despacho = { text: 'Esta semana hay pocos modelos para comparar.', tone: 'neutral' }

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function buildDespacho(days: Day[], todayKey: string): Despacho | null {
  const tomorrowKey = addDaysToKey(todayKey, 1)
  const dayName = (key: string) =>
    key === todayKey ? 'hoy' : key === tomorrowKey ? 'mañana' : `el ${weekdayLong(key)}`

  /** 'Hoy los modelos …' · 'Hasta mañana los modelos …' · 'Hasta el jueves los modelos …' */
  const upTo = (key: string) => (key === todayKey ? 'Hoy' : `Hasta ${dayName(key)}`)

  const dates = (verdict: Verdict) => days.filter((d) => d.verdict === verdict).map((d) => d.date)
  const agree = dates('coinciden')
  const doubt = dates('dudan')
  const clash = dates('desacuerdo')
  const solo = dates('solo')
  const missing = dates('sinDato')

  // Rule 0.
  if (days.length - missing.length < MIN_DAYS_WITH_VERDICT) return null
  // Rule 1, and the same words when no day can be compared at all: rule 7b would claim an agreement.
  if (solo.length >= FEW_MODELS_DAYS || agree.length + doubt.length + clash.length === 0) return FEW_MODELS

  // Rules 2 to 6.
  if (clash.length === 1) {
    const text = `${sentence(dayName(clash[0]))} los modelos no se ponen de acuerdo.`
    const restAgrees = agree.length === days.length - 1
    return { text: restAgrees ? `${text} El resto de la semana, coinciden.` : text, tone: 'ember' }
  }
  if (clash.length > 1) {
    const first = clash[0]
    const last = clash[clash.length - 1]
    const inARow = clash.every((date, i) => date === addDaysToKey(first, i))
    if (inARow && clash.length === 2) {
      return { text: `Para ${dayName(first)} y ${dayName(last)} no hay acuerdo entre los modelos.`, tone: 'ember' }
    }
    if (inARow) {
      const from = first === todayKey || first === tomorrowKey ? `De ${dayName(first)}` : `Del ${weekdayLong(first)}`
      return { text: `${from} al ${weekdayLong(last)} no hay acuerdo entre los modelos.`, tone: 'ember' }
    }
    return { text: 'Esta semana los modelos no se ponen de acuerdo en varios días.', tone: 'ember' }
  }

  const gaps = solo.length + missing.length

  // Rules 7 and 7b.
  if (doubt.length === 0) {
    if (gaps > 0) return { text: 'Los días que se pueden comparar, los modelos coinciden.', tone: 'neutral' }
    if (days.length >= FULL_WEEK) return { text: 'Toda la semana los modelos coinciden.', tone: 'azure' }
    return { text: `${upTo(agree[agree.length - 1])} los modelos coinciden.`, tone: 'azure' }
  }

  // Rules 8 to 10 name a stretch of days, and a gap inside it would count as agreement or doubt.
  if (gaps === 0) {
    const firstDoubt = days.findIndex((d) => d.verdict === 'dudan')
    const firstAgree = days.findIndex((d) => d.verdict === 'coinciden')
    const doubtInARow = doubt.every((date, i) => date === days[firstDoubt + i]?.date)
    const agreeInARow = agree.every((date, i) => date === days[firstAgree + i]?.date)

    const isWeekend =
      doubt.length === 2 && weekdayLong(doubt[0]) === SATURDAY && weekdayLong(doubt[1]) === SUNDAY
    if (firstAgree === 0 && doubtInARow && isWeekend) {
      return { text: `${upTo(days[firstDoubt - 1].date)} los modelos coinciden. El fin de semana, dudan.`, tone: 'sun' }
    }

    if (agree.length > 0 && doubtInARow && agreeInARow) {
      if (firstAgree === 0) {
        return { text: `${upTo(agree[agree.length - 1])} los modelos coinciden. Después, dudan.`, tone: 'sun' }
      }
      const lastDoubt = doubt[doubt.length - 1]
      const doubters =
        lastDoubt === todayKey ? 'Hoy' : lastDoubt === tomorrowKey ? 'Hoy y mañana' : `Hasta ${dayName(lastDoubt)}`
      return { text: `${doubters} los modelos dudan. Desde ${dayName(agree[0])} se acomodan.`, tone: 'sun' }
    }
  }

  // Rules 11 and 12.
  if (doubt.length >= HARD_WEEK_DOUBTS) {
    return { text: 'Semana difícil de leer: los modelos dudan casi todos los días.', tone: 'sun' }
  }
  // Rule 12 says some days agree, and here none did. Mirrors rule 7b; out of the approved copy table.
  if (agree.length === 0) return { text: 'Los días que se pueden comparar, los modelos dudan.', tone: 'sun' }
  return { text: 'Los modelos coinciden algunos días y dudan otros.', tone: 'sun' }
}
