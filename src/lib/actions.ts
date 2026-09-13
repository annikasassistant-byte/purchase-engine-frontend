"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  allocateBudget,
  BackendError,
  getRecommendations,
  submitBuyerAction,
  triggerRun,
} from "./backend-client";
import type { AllocateResponse, ActionOut, Recommendation, RunSummary } from "./schemas";
import { buyerActionTypeSchema } from "./schemas";

/**
 * Server Actions - the only way a Client Component reaches the backend.
 * Every export here is a real POST endpoint reachable by anyone who can
 * send the same request (Next's own docs are explicit about this), so
 * every input is validated with zod before it goes anywhere near
 * `backend-client.ts` - never just trusted because the UI happens to send
 * well-formed data. See docs/adr/0001.
 *
 * Return a discriminated union instead of throwing: a bad budget number is
 * an expected, displayable outcome for this UI, not an exceptional one -
 * see the Server Actions guide's "constrain return values" guidance.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof BackendError) return { ok: false, error: err.message };
  return { ok: false, error: "Something went wrong talking to the backend. Try again." };
}

const triggerRunInput = z.object({
  budgetEur: z.number().min(0).nullable(),
  // YYYY-MM-DD, matching the <input type="date"> that produces it and the
  // backend's own `date | None` for RunRequest.as_of.
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .nullable(),
});

export async function triggerRunAction(
  budgetEur: number | null,
  asOf: string | null = null,
): Promise<ActionResult<RunSummary>> {
  const parsed = triggerRunInput.safeParse({ budgetEur, asOf });
  if (!parsed.success) return { ok: false, error: "Invalid budget or date." };

  try {
    const run = await triggerRun({
      budgetEur: parsed.data.budgetEur ?? undefined,
      asOf: parsed.data.asOf ?? undefined,
    });
    // Read-your-own-write: the dashboard should show this run immediately,
    // not the previous one, without the caller needing a manual refresh.
    revalidatePath("/");
    return { ok: true, data: run };
  } catch (err) {
    return fail(err);
  }
}

const allocateInput = z.object({
  runId: z.string().min(1),
  budgetEur: z.number().min(0),
});

export async function allocateBudgetAction(
  runId: string,
  budgetEur: number,
): Promise<ActionResult<AllocateResponse>> {
  const parsed = allocateInput.safeParse({ runId, budgetEur });
  if (!parsed.success) return { ok: false, error: "Invalid budget." };

  try {
    const result = await allocateBudget(parsed.data.runId, parsed.data.budgetEur);
    // No revalidatePath here on purpose: this fires on every keystroke of a
    // debounced input, and the caller already gets the fresh numbers back
    // as the return value. Forcing a full route re-render per call would
    // fight the exact "instant, no full re-run" property this endpoint
    // exists for (backend ADR 0009).
    return { ok: true, data: result };
  } catch (err) {
    return fail(err);
  }
}

const loadTabInput = z.object({
  runId: z.string().min(1),
  label: z.enum(["BUY", "CONSIDER", "SKIP"]),
});

/** Lazy tab loading: only the BUY tier is fetched on the initial page
 * render (it's the answer to "what should we buy right now"); CONSIDER and
 * SKIP (up to ~200 more rows with their full nested payload each) load on
 * first click instead of on every page view. */
export async function loadRecommendationsTabAction(
  runId: string,
  label: "BUY" | "CONSIDER" | "SKIP",
): Promise<ActionResult<Recommendation[]>> {
  const parsed = loadTabInput.safeParse({ runId, label });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const recs = await getRecommendations(parsed.data.runId, parsed.data.label);
    return { ok: true, data: recs };
  } catch (err) {
    return fail(err);
  }
}

const submitActionInput = z.object({
  runId: z.string().min(1),
  produktId: z.string().min(1),
  action: buyerActionTypeSchema,
  qty: z.number().int().min(0).nullable(),
  note: z.string().max(2000).nullable(),
});

export async function submitBuyerActionAction(input: {
  runId: string;
  produktId: string;
  action: "BUY" | "ADJUST" | "SKIP";
  qty?: number | null;
  note?: string | null;
}): Promise<ActionResult<ActionOut>> {
  const parsed = submitActionInput.safeParse({
    runId: input.runId,
    produktId: input.produktId,
    action: input.action,
    qty: input.qty ?? null,
    note: input.note ?? null,
  });
  if (!parsed.success) return { ok: false, error: "Invalid action." };

  try {
    const result = await submitBuyerAction({
      runId: parsed.data.runId,
      produktId: parsed.data.produktId,
      action: parsed.data.action,
      qty: parsed.data.qty ?? undefined,
      note: parsed.data.note ?? undefined,
    });
    return { ok: true, data: result };
  } catch (err) {
    return fail(err);
  }
}
