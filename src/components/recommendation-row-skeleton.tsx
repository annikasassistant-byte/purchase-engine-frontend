import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors RecommendationRow's collapsed layout (badge, name, meta line on
 * the left; score/confidence + qty on the right) so the tab-switch loading
 * state reads as "rows are forming," not a handful of unrelated gray boxes.
 * Rendered a few times while `tabLoading` is true in RecommendationList.
 */
export function RecommendationRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Skeleton className="mt-1 size-4 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5 pl-7 sm:pl-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-start gap-1">
            <Skeleton className="h-6 w-8 rounded" />
            <Skeleton className="h-2.5 w-10 rounded" />
          </div>
          <div className="h-8 w-px bg-border" aria-hidden />
          <div className="flex flex-col items-start gap-1">
            <Skeleton className="h-6 w-10 rounded" />
            <Skeleton className="h-2.5 w-14 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-2.5 w-7 rounded" />
        </div>
      </div>
    </div>
  );
}
