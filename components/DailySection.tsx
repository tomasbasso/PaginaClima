// Daily list under the horizon, with its 32 px from the silhouette. Server-safe composition shared
// by /pronostico and /dev/estados: the blocks that go above the rows are added here, not in the island.
import { DailyList } from '@/components/client/DailyList'
import type { DailyRow } from '@/lib/forecast/daily'

export function DailySection({ rows, initialExpanded }: { rows: DailyRow[]; initialExpanded?: boolean }) {
  return (
    <div className="pt-8">
      <DailyList rows={rows} initialExpanded={initialExpanded} />
    </div>
  )
}
