"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** "Multiple employees may purchase products simultaneously... A refresh
 * every 30-60 minutes is probably sufficient for the MVP." (Product
 * Briefing.md) `router.refresh()` re-runs the page's Server Components
 * in place - no full reload, no client-side polling of raw data. */
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
