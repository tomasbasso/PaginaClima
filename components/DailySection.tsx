// Daily list under the horizon, with its 32 px from the silhouette. Server-safe composition shared
// by /pronostico and /dev/estados: the blocks that go above the rows are added here, not in the island.
import { DailyList } from '@/components/client/DailyList'
import { Despacho } from '@/components/Despacho'
import { Notice } from '@/components/Notice'
import { buildCredit, type DailyRow } from '@/lib/forecast/daily'
import { buildDespacho } from '@/lib/forecast/despacho'

export function DailySection({
  rows,
  notice,
  initialExpanded,
}: {
  rows: DailyRow[]
  /** Copy from confidenceNotice: at most one per screen, 24 px above whatever follows. */
  notice?: string | null
  initialExpanded?: boolean
}) {
  // Always the first 7 rows, so the phrase does not change when the list expands (D-15).
  const despacho = rows[0]
    ? buildDespacho(rows.slice(0, 7).map((r) => ({ date: r.key, verdict: r.verdict })), rows[0].key)
    : null

  return (
    <div className="pt-8">
      {notice ? (
        <div className="mb-6">
          <Notice role="status">{notice}</Notice>
        </div>
      ) : null}
      {despacho ? (
        <div className="mb-6">
          <Despacho text={despacho.text} tone={despacho.tone} />
        </div>
      ) : null}
      <DailyList rows={rows} credit={buildCredit(rows)} initialExpanded={initialExpanded} />
    </div>
  )
}
