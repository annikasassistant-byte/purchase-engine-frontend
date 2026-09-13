"use client";

import { Play } from "lucide-react";
import { useState, useTransition } from "react";

import { triggerRunAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

/**
 * "Run Engine" - the same code path as `python -m purchase_engine --budget
 * ...` on the backend (purchase_engine ADR 0010), just reachable by click
 * instead of a terminal. Runs ~17-99s depending on the backend's host load
 * (measured in purchase_engine ADR 0011) - the pending state says so
 * explicitly rather than leaving a spinner to imply "any second now".
 */
export function RunTriggerButton({ budget }: { budget: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await triggerRunAction(budget);
      if (!result.ok) setError(result.error);
      // On success, triggerRunAction already called revalidatePath("/") -
      // the page's Server Components re-fetch with the new run_id, and
      // RecommendationList remounts (keyed by run_id) with fresh data.
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="primary" onClick={run} disabled={pending}>
        <Play className="size-3.5" aria-hidden />
        {pending ? "Running… (up to ~2 min)" : "Run engine"}
      </Button>
      {error && <p className="text-xs text-risk">{error}</p>}
    </div>
  );
}
