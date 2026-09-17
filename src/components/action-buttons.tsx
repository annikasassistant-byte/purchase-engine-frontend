"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { submitBuyerActionAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

/**
 * BUY / ADJUST / SKIP, logged against this run+product - the Phase-4
 * backtest dataset the plan calls for (purchase_engine ADR 0010): what a
 * buyer actually did with each recommendation. Optimistic-free on purpose -
 * this is a real decision a person is recording, not a toggle; wait for the
 * backend to actually persist it before showing it as done.
 */
export function ActionButtons({
  runId,
  produktId,
  suggestedQty,
}: {
  runId: string;
  produktId: string;
  suggestedQty: number;
}) {
  const [pending, startTransition] = useTransition();
  const [logged, setLogged] = useState<{ action: string; qty: number | null } | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [qty, setQty] = useState(suggestedQty);
  const [error, setError] = useState<string | null>(null);

  function submit(action: "BUY" | "ADJUST" | "SKIP", actionQty: number | null) {
    setError(null);
    startTransition(async () => {
      const result = await submitBuyerActionAction({
        runId,
        produktId,
        action,
        qty: actionQty ?? undefined,
      });
      if (result.ok) {
        setLogged({ action, qty: actionQty });
        setAdjusting(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (logged) {
    return (
      <div className="flex items-center gap-2 text-sm text-buy">
        <Check className="size-4" aria-hidden />
        Logged: {logged.action}
        {logged.qty !== null ? ` (${logged.qty})` : ""}
        <button
          type="button"
          onClick={() => setLogged(null)}
          className="text-muted underline decoration-dotted hover:text-ink"
        >
          change
        </button>
      </div>
    );
  }

  if (adjusting) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          Qty
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
            className="h-8 w-16 rounded-md border border-border bg-surface px-2 font-mono text-sm tabular-nums"
          />
        </label>
        <Button size="sm" variant="primary" disabled={pending} onClick={() => submit("ADJUST", qty)}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdjusting(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    );
  }

  // A budget-trimmed line can legitimately carry qty=0 (purchase_engine's
  // BudgetAllocator: "a low-confidence line keeps its budget and stays
  // visible" - the row and its reasons stay, only the funded quantity hits
  // zero). Logging "BUY, qty 0" isn't a real decision though - it's not
  // buyable today, and it would pollute the Phase-4 backtest dataset with a
  // zero-quantity purchase. Disable the one-click Buy in that case; Adjust
  // qty (override the budget) and Skip stay fully available either way.
  const canBuyAsSuggested = suggestedQty > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="buy"
          disabled={pending || !canBuyAsSuggested}
          title={canBuyAsSuggested ? undefined : "Not funded in today's budget - adjust the qty to buy it anyway"}
          onClick={() => submit("BUY", suggestedQty)}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : `Buy ${suggestedQty}`}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => setAdjusting(true)}>
          Adjust qty
        </Button>
        <Button size="sm" variant="skip" disabled={pending} onClick={() => submit("SKIP", null)}>
          Skip
        </Button>
      </div>
      {error && <p className="text-xs text-risk">{error}</p>}
    </div>
  );
}
