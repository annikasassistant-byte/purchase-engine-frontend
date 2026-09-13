import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/empty-state";
import { RecommendationList } from "@/components/recommendation-list";
import { RunHeader } from "@/components/run-header";
import { getLatestRun, getRecommendations } from "@/lib/backend-client";

// `triggerRunAction` (invoked from this page) can take up to ~150s on a
// slow day (purchase_engine ADR 0011 measured ~99s on Render's free tier) -
// Server Actions run as a POST against the page that calls them, so this
// route segment config is what actually governs the deployed function's
// timeout, not just documentation. Confirm your hosting plan's ceiling
// covers this - see docs/adr/0001.
export const maxDuration = 150;

// Always render this page per-request, never attempt to prerender it at
// build time. It's always-fresh operational data (every fetch already sets
// `cache: "no-store"` in backend-client.ts) - `next build` would otherwise
// try a static-generation pass anyway, find the uncacheable fetch, and bail
// with a real error, because backend-client.ts's own try/catch swallows
// the internal signal Next.js uses to recover from that automatically.
// Declaring this upfront skips that whole dance.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const run = await getLatestRun();
  const buyRecs = run ? await getRecommendations(run.run_id, "BUY") : [];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AutoRefresh />

      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Purchase Engine</h1>
        <p className="text-sm text-muted">
          BuyBack&apos;s daily buy list - ranked, explainable, budget-aware.
        </p>
      </header>

      {run ? (
        <>
          <RunHeader run={run} />
          <RecommendationList
            key={run.run_id}
            runId={run.run_id}
            initialBudget={run.budget_eur ?? 1500}
            initialBuy={buyRecs}
            counts={run.counts}
          />
        </>
      ) : (
        <EmptyState />
      )}
    </main>
  );
}
