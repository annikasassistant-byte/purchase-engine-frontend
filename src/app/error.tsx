"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. The most common real cause, found by hitting
 * it during development, not guessed: Render's free tier sleeps the
 * backend after 15 minutes idle, and the first request after that pays a
 * 30-60s cold-start wake - `backend-client.ts` gives that a 45s ceiling,
 * but a slow morning can still exceed it. Framed as "try again", not a
 * stack trace, because that's the actionable, almost-always-correct fix.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-24 text-center">
      <TriangleAlert className="size-8 text-risk" aria-hidden />
      <div>
        <p className="font-medium text-ink">Couldn&apos;t reach the Purchase Engine backend</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          {error.message.includes("timed out")
            ? "The backend may have been asleep (it sleeps after 15 minutes idle on the free tier) and is now waking up. This usually resolves in under a minute."
            : error.message}
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        <RotateCw className="size-3.5" aria-hidden />
        Try again
      </Button>
    </main>
  );
}
