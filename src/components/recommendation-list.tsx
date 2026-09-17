"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { BudgetControl } from "@/components/budget-control";
import { RecommendationRow } from "@/components/recommendation-row";
import { RunTriggerButton } from "@/components/run-trigger-button";
import { Skeleton } from "@/components/ui/skeleton";
import { allocateBudgetAction, loadRecommendationsTabAction } from "@/lib/actions";
import type { AllocationLine, Recommendation, RecommendationLabel, RunCounts } from "@/lib/schemas";

const TABS: { label: RecommendationLabel; title: string }[] = [
  { label: "BUY", title: "Buy" },
  { label: "CONSIDER", title: "Consider" },
  { label: "SKIP", title: "Skip" },
];

const DEBOUNCE_MS = 450;

/**
 * The interactive core of the dashboard: budget + tabs + the product list,
 * all in one component because they share one piece of state (budget) that
 * both the live `/allocate` re-ranking and the "Run engine" trigger read
 * from - splitting them across siblings would mean lifting that state
 * somewhere else anyway. `key={runId}` at the call site (see app/page.tsx)
 * remounts this whole component - and its budget/tab/allocation state -
 * when a new run replaces the current one.
 */
export function RecommendationList({
  runId,
  initialBudget,
  initialBuy,
  counts,
}: {
  runId: string;
  initialBudget: number;
  initialBuy: Recommendation[];
  counts: RunCounts;
}) {
  const [activeTab, setActiveTab] = useState<RecommendationLabel>("BUY");
  const [tabs, setTabs] = useState<Record<RecommendationLabel, Recommendation[] | null>>({
    BUY: initialBuy,
    CONSIDER: null,
    SKIP: null,
  });
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [budget, setBudget] = useState(initialBudget);
  const [allocation, setAllocation] = useState<Record<string, AllocationLine> | null>(null);
  const [allocating, setAllocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAllocation = useCallback(
    (value: number) => {
      setAllocating(true);
      void allocateBudgetAction(runId, value).then((result) => {
        setAllocating(false);
        if (result.ok) {
          const byId: Record<string, AllocationLine> = {};
          for (const line of result.data.lines) byId[line.produkt_id] = line;
          setAllocation(byId);
        }
      });
    },
    [runId],
  );

  function handleBudgetChange(value: number) {
    setBudget(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runAllocation(value), DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Roving tabindex + arrow-key movement per the WAI-ARIA APG tabs pattern
  // (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) - manual activation, not
  // automatic: arrow keys only move focus between tabs, since actually
  // selecting one triggers a real network fetch (see selectTab) that
  // shouldn't fire on every arrow press while a user is just browsing tabs.
  function handleTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((tab) => tab.label === activeTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      tabRefs.current[nextIndex]?.focus();
    }
  }

  async function selectTab(label: RecommendationLabel) {
    setActiveTab(label);
    if (tabs[label] !== null) return;
    setTabLoading(true);
    setTabError(null);
    const result = await loadRecommendationsTabAction(runId, label);
    setTabLoading(false);
    if (result.ok) {
      setTabs((prev) => ({ ...prev, [label]: result.data }));
    } else {
      setTabError(result.error);
    }
  }

  const spent = useMemo(() => {
    if (!allocation) return null;
    return Object.values(allocation).reduce((sum, line) => sum + (line.total_cost ?? 0), 0);
  }, [allocation]);

  const activeList = tabs[activeTab];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BudgetControl
          budget={budget}
          onChange={handleBudgetChange}
          spent={spent}
          isAllocating={allocating}
        />
        <RunTriggerButton budget={budget} />
      </div>

      <div
        role="tablist"
        aria-label="Recommendation tier"
        className="flex gap-1 border-b border-border"
        onKeyDown={handleTablistKeyDown}
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.label}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`tab-${tab.label}`}
            role="tab"
            aria-selected={activeTab === tab.label}
            aria-controls={`panel-${tab.label}`}
            tabIndex={activeTab === tab.label ? 0 : -1}
            onClick={() => void selectTab(tab.label)}
            className={
              "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
              (activeTab === tab.label
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink")
            }
          >
            {tab.title}
            <span className="font-mono text-xs tabular-nums text-muted">
              {countFor(tab.label, counts)}
            </span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="flex flex-col gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {tabLoading && (
          <div className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {tabError && <p className="text-sm text-risk">{tabError}</p>}

        {!tabLoading && activeList && activeList.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            Nothing in this tier for the current run.
          </p>
        )}

        {!tabLoading && activeList && activeList.length > 0 && (
          <div className="flex flex-col gap-3">
            {activeList.map((rec) => {
              const live = activeTab === "BUY" ? allocation?.[rec.produkt_id] : undefined;
              return (
                <RecommendationRow
                  key={rec.produkt_id}
                  rec={rec}
                  qty={live ? live.final_qty : rec.recommended_qty}
                  trimmed={live ? live.trimmed : rec.budget_trimmed}
                  gpPerEur={live ? live.gp_per_eur : rec.est_gross_profit_per_eur}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function countFor(label: RecommendationLabel, counts: RunCounts): number {
  if (label === "BUY") return counts.buy;
  if (label === "CONSIDER") return counts.consider;
  return counts.skip;
}
