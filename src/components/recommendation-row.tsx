import { ChevronDown, PackageX, TriangleAlert } from "lucide-react";

import { ActionButtons } from "@/components/action-buttons";
import { ProfitabilityBadge } from "@/components/profitability-badge";
import { ReasonsRisks } from "@/components/reasons-risks";
import { ScoreConfidence } from "@/components/score-confidence";
import { StockBreakdown } from "@/components/stock-breakdown";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatEur, formatNumber } from "@/lib/format";
import type { Recommendation } from "@/lib/schemas";

const LABEL_TONE: Record<Recommendation["label"], BadgeTone> = {
  BUY: "buy",
  CONSIDER: "consider",
  SKIP: "skip",
};

const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  LOW_STOCK: "Low stock",
  RESERVED: "Reserved",
  OUT_OF_STOCK: "Out of stock",
  UNAVAILABLE_STOCK: "Stock unknown",
};

/**
 * One product. Fields mirror what Annika's own briefing spec'd verbatim
 * (docs/Product Briefing.md): product, recommended quantity, current
 * inventory, sales last 30 days, priority, score, reason(s) - plus what
 * purchase_engine's own richer output makes possible: confidence kept
 * separate from score, the three-way stock breakdown, and a profitability
 * status that's never silently presented as confirmed when it isn't.
 *
 * `qty`/`trimmed`/`gpPerEur` are accepted as explicit props rather than
 * read from `rec` directly - the parent overrides them with a live
 * `/allocate` result while the user has the budget field open, without
 * this component needing to know that happened.
 */
export function RecommendationRow({
  rec,
  qty,
  trimmed,
  gpPerEur,
}: {
  rec: Recommendation;
  qty: number;
  trimmed: boolean;
  gpPerEur: number | null;
}) {
  const { payload } = rec;
  const velocity30 = payload.features.units_30d;

  return (
    <details className="group rounded-xl border border-border bg-surface shadow-[var(--shadow-card)] open:shadow-none">
      <summary
        className="flex cursor-pointer list-none flex-col gap-3 rounded-xl p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <ChevronDown
            className="mt-1 size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={LABEL_TONE[rec.label]}>{rec.label}</Badge>
              <span className="truncate font-medium text-ink">{rec.name}</span>
              <span className="font-mono text-xs text-muted">{rec.produkt_id}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{rec.kategorie}</span>
              <span className="tabular-nums">{formatNumber(velocity30)} sold / 30d</span>
              <AvailabilityTag availability={rec.availability} />
              {trimmed && (
                <span className="inline-flex items-center gap-1 text-consider">
                  <TriangleAlert className="size-3.5" aria-hidden />
                  budget-trimmed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-5 pl-7 sm:pl-0">
          <ScoreConfidence score={rec.purchase_score} confidence={rec.confidence} />
          <div className="text-right">
            <div className="font-mono text-2xl font-semibold tabular-nums text-ink">{qty}</div>
            <div className="text-[11px] tracking-wide text-muted uppercase">Qty</div>
          </div>
        </div>
      </summary>

      <div className="flex flex-col gap-4 border-t border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StockBreakdown features={payload.features} />
          <div className="flex items-center gap-4 text-sm">
            <Economics label="Unit cost" value={formatEur(rec.est_unit_ek)} />
            <Economics
              label="GP / €"
              value={gpPerEur === null ? "—" : gpPerEur.toFixed(2)}
            />
            <ProfitabilityBadge status={payload.features.profitability.status} />
          </div>
        </div>

        <ReasonsRisks reasons={payload.reasons} risks={payload.risks} />

        <div className="pt-1">
          <ActionButtons runId={rec.run_id} produktId={rec.produkt_id} suggestedQty={qty} />
        </div>
      </div>
    </details>
  );
}

function Economics({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono tabular-nums text-ink">{value}</div>
      <div className="text-[11px] tracking-wide text-muted uppercase">{label}</div>
    </div>
  );
}

function AvailabilityTag({ availability }: { availability: string }) {
  if (availability === "OUT_OF_STOCK" || availability === "UNAVAILABLE_STOCK") {
    return (
      <span className="inline-flex items-center gap-1">
        <PackageX className="size-3.5" aria-hidden />
        {AVAILABILITY_LABEL[availability] ?? availability}
      </span>
    );
  }
  return <span>{AVAILABILITY_LABEL[availability] ?? availability}</span>;
}
