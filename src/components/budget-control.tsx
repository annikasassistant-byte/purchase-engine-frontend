"use client";

import { Loader2 } from "lucide-react";

import { formatEur } from "@/lib/format";

/**
 * "The user should enter the available purchasing budget for the day...
 * Budget: €15,000. The engine should recommend products that maximize
 * expected sales performance within the available budget." (Product
 * Briefing.md) - a controlled number input; the parent owns the debounce
 * and the live `/allocate` call (purchase_engine ADR 0009), this component
 * only renders the control and the running total it's being checked against.
 */
export function BudgetControl({
  budget,
  onChange,
  spent,
  isAllocating,
}: {
  budget: number;
  onChange: (value: number) => void;
  spent: number | null;
  isAllocating: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
      <label htmlFor="daily-budget" className="text-sm font-medium text-ink">
        Daily budget
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted">
          €
        </span>
        <input
          id="daily-budget"
          type="number"
          min={0}
          step={50}
          value={budget}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="h-9 w-32 rounded-md border border-border bg-paper py-1 pr-2 pl-6 font-mono text-sm tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        {isAllocating ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : spent !== null ? (
          <span>
            <span className="font-mono tabular-nums text-ink">{formatEur(spent, true)}</span>{" "}
            allocated
          </span>
        ) : null}
      </div>
    </div>
  );
}
