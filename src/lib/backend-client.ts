import "server-only";

import { z } from "zod";

import { env } from "./env";
import {
  actionListSchema,
  actionOutSchema,
  allocateResponseSchema,
  recommendationListSchema,
  runSummarySchema,
  type ActionOut,
  type AllocateResponse,
  type BuyerActionType,
  type Recommendation,
  type RecommendationLabel,
  type RunSummary,
} from "./schemas";

/**
 * The only place in this codebase that knows the backend's base URL, its
 * `X-API-Key`, or its JSON shapes - every Server Component and Server
 * Action goes through here, never `fetch()` directly against
 * `PURCHASE_ENGINE_API_URL`. See docs/adr/0001.
 */

/** Mirrors a backend `HTTPException` - `status` maps directly to the HTTP
 * status FastAPI returned, `detail` to its `{"detail": "..."}` body. */
export class BackendError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "BackendError";
    this.status = status;
  }
}

type FetchOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Default 45s - found by hitting this for real, not guessed: Render's
   * free tier sleeps the backend after 15 minutes idle, and the *next*
   * request (any of them, including a plain `GET /runs/latest`) pays a
   * 30-60s cold-start wake before the app even starts handling it
   * (purchase_engine ADR 0011 / Render's own docs). A 20s ceiling failed a
   * completely healthy backend that just happened to be asleep. The engine
   * trigger needs far longer still - see `triggerRun`'s override. */
  timeoutMs?: number;
};

async function backendFetch(path: string, options: FetchOptions = {}): Promise<unknown> {
  const { method = "GET", body, timeoutMs = 45_000 } = options;

  let res: Response;
  try {
    res = await fetch(`${env.backendUrl}${path}`, {
      method,
      headers: {
        "X-API-Key": env.backendApiKey,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Always fresh - every response here is live operational data (a
      // recommendation list, a run trigger), never something Next.js should
      // reuse from its own fetch cache across requests.
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "TimeoutError") {
      throw new BackendError(504, `Backend request to ${path} timed out after ${timeoutMs}ms`);
    }
    throw new BackendError(502, `Could not reach the backend: ${String(cause)}`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // body wasn't JSON (or was empty) - keep statusText
    }
    throw new BackendError(res.status, detail);
  }

  if (res.status === 204) return undefined;
  return res.json();
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Backend response didn't match the expected shape: ${result.error.message}`,
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------- //
// Runs                                                                    //
// ---------------------------------------------------------------------- //

/** `POST /runs` - runs the real engine. Backend ADR 0011 measured ~99s on
 * Render's free tier; 150s gives real margin without hanging indefinitely
 * on a genuinely stuck backend. See docs/adr/0001 for the platform-side
 * (Vercel function duration) half of this. */
export async function triggerRun(input: {
  budgetEur?: number;
  asOf?: string;
}): Promise<RunSummary> {
  const data = await backendFetch("/runs", {
    method: "POST",
    body: {
      budget_eur: input.budgetEur ?? null,
      as_of: input.asOf ?? null,
    },
    timeoutMs: 150_000,
  });
  return parse(runSummarySchema, data);
}

export async function getLatestRun(): Promise<RunSummary | null> {
  try {
    const data = await backendFetch("/runs/latest");
    return parse(runSummarySchema, data);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export async function getRun(runId: string): Promise<RunSummary | null> {
  try {
    const data = await backendFetch(`/runs/${encodeURIComponent(runId)}`);
    return parse(runSummarySchema, data);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export async function getRecommendations(
  runId: string,
  label?: RecommendationLabel,
): Promise<Recommendation[]> {
  const query = label ? `?label=${label}` : "";
  const data = await backendFetch(
    `/runs/${encodeURIComponent(runId)}/recommendations${query}`,
  );
  return parse(recommendationListSchema, data);
}

/** `POST /runs/{id}/allocate` - the live budget path (backend ADR 0009):
 * re-ranks the already-computed BUY tier for a new budget in milliseconds,
 * without re-running the pipeline. What the budget field calls on every
 * change. */
export async function allocateBudget(
  runId: string,
  budgetEur: number,
): Promise<AllocateResponse> {
  const data = await backendFetch(`/runs/${encodeURIComponent(runId)}/allocate`, {
    method: "POST",
    body: { budget_eur: budgetEur },
  });
  return parse(allocateResponseSchema, data);
}

// ---------------------------------------------------------------------- //
// Actions (buyer BUY/ADJUST/SKIP log)                                     //
// ---------------------------------------------------------------------- //

export async function submitBuyerAction(input: {
  runId: string;
  produktId: string;
  action: BuyerActionType;
  qty?: number;
  note?: string;
  actor?: string;
}): Promise<ActionOut> {
  const data = await backendFetch("/actions", {
    method: "POST",
    body: {
      run_id: input.runId,
      produkt_id: input.produktId,
      action: input.action,
      qty: input.qty ?? null,
      note: input.note ?? null,
      actor: input.actor ?? null,
    },
  });
  return parse(actionOutSchema, data);
}

export async function listBuyerActions(runId?: string): Promise<ActionOut[]> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const data = await backendFetch(`/actions${query}`);
  return parse(actionListSchema, data);
}
