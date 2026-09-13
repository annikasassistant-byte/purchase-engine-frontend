import { TriangleAlert } from "lucide-react";

import { formatDate, formatRelativeTime } from "@/lib/format";
import type { RunSummary } from "@/lib/schemas";

/** Static run metadata - as-of date, when it ran, and the
 * `STALE_INPUTS` flag surfaced exactly as the backend names it
 * (purchase_engine's `DataFreshness`), not smoothed over. */
export function RunHeader({ run }: { run: RunSummary }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>
          As of <span className="font-medium text-ink">{formatDate(run.as_of)}</span>
        </span>
        <span>Run {formatRelativeTime(run.generated_at)}</span>
        <span className="font-mono text-xs">config {run.config_hash}</span>
        <span className="font-mono text-xs tabular-nums">
          {run.counts.scored} scored · {run.counts.buy} buy ({run.counts.buy_funded} funded) ·{" "}
          {run.counts.consider} consider · {run.counts.skip} skip
        </span>
      </div>
      {run.stale && (
        <div className="flex items-start gap-2 rounded-lg border border-consider/30 bg-consider-soft px-3 py-2 text-sm text-consider">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{run.freshness.note || "Sales data is older than expected. List still produced."}</span>
        </div>
      )}
    </div>
  );
}
