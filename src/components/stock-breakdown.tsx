import { formatInt } from "@/lib/format";
import type { RecommendationPayload } from "@/lib/schemas";

/**
 * The three numbers Annika's brief is explicit about never merging:
 * "Available in JTL: 3 / Purchased/Still Incoming: 2 / Effective Stock
 * Position: 5 ... I don't want the engine to simply display '5 units'
 * without showing us that 3 are physically available and 2 are assumed to
 * still be incoming." (docs/Important Factors.md)
 */
export function StockBreakdown({ features }: { features: RecommendationPayload["features"] }) {
  const incoming = features.purchased_today + features.older_incoming;
  const noInventoryRow = !features.inventory_joined;

  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <Stat
        label="Available in JTL"
        value={noInventoryRow ? "unknown" : formatInt(features.current_sellable)}
        hint={noInventoryRow ? "no inventory row joined" : undefined}
      />
      <Stat
        label="Purchased · incoming"
        value={formatInt(incoming)}
        hint={
          features.purchased_today > 0
            ? `${features.purchased_today} today`
            : undefined
        }
      />
      <Stat label="Effective stock" value={formatInt(features.effective_stock)} emphasize />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div
        className={
          emphasize
            ? "font-mono text-base font-semibold tabular-nums text-ink"
            : "font-mono text-base tabular-nums text-ink"
        }
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
