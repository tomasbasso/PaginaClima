// Daily list under the horizon, with its 32 px from the silhouette. Server-safe composition shared
// by /pronostico and /dev/estados: the blocks that go above the rows are added here, not in the island.
import { DailyList } from '@/components/client/DailyList'
import { Notice } from '@/components/Notice'
import type { DailyRow } from '@/lib/forecast/daily'

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
  return (
    <div className="pt-8">
      {notice ? (
        <div className="mb-6">
          <Notice role="status">{notice}</Notice>
        </div>
      ) : null}
      <DailyList rows={rows} initialExpanded={initialExpanded} />
    </div>
  )
}
