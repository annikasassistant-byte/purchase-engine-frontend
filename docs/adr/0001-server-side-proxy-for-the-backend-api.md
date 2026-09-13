# 1. Every backend call goes through the server - the browser never holds the API key

Date: 2026-09-13

## Status

Accepted

## Context

`purchase_engine`'s API (a separate repo, deployed on Render) is protected by
a single shared-secret `X-API-Key` header (see purchase_engine
ADR 0010/0011). This frontend is that API's one intended caller. Two ways to
wire that up:

1. The browser calls the backend directly, with the API key shipped in the
   client bundle (`NEXT_PUBLIC_*`, or just inlined).
2. The browser only ever talks to this Next.js app's own server; that
   server holds the key and calls the backend on the browser's behalf.

## Decision

**(2), unconditionally.** `PURCHASE_ENGINE_API_KEY` and `PURCHASE_ENGINE_API_URL`
are read only in `src/lib/env.ts`, which imports the `server-only` package
specifically so an accidental import from a Client Component is a build
error, not a silent bug. `src/lib/backend-client.ts` is the *only* module
that constructs a request to the backend; every Server Component and every
Server Action in `src/lib/actions.ts` goes through it. Nothing under
`src/components/**/*.tsx` marked `"use client"` imports either file.

Two more small consequences fall out of this cleanly:

- **CORS is mostly moot.** The backend's `CORS_ORIGINS` allow-list exists
  for a browser calling it directly - since this frontend never does that,
  the browser-to-backend leg simply doesn't exist. (The backend still needs
  *a* value there in case something else ever calls it, but this app isn't
  why.)
- **One retry/timeout policy, in one place.** `backendFetch` in
  `backend-client.ts` sets `cache: "no-store"` (this is live operational
  data - a five-minute-old recommendation list is a bug, not an
  optimization) and an explicit `AbortSignal.timeout`, longer for
  `triggerRun` (150s) than everything else (20s) - see the file for why:
  purchase_engine ADR 0011 measured a real run at up to ~99s on Render's
  free tier.

## Consequences

- **Deployed function duration must cover ~99s, not the ~17s a dedicated
  machine gets.** `POST /runs` (triggered by `triggerRunAction`) runs as a
  POST against the page that calls it (Next.js's own Server Actions model),
  so `src/app/page.tsx` exports `maxDuration = 150`. On Vercel, confirm the
  hosting plan actually honors that - Fluid Compute's default ceiling
  covers it as of writing, but this is exactly the kind of assumption worth
  re-checking against Vercel's current docs before a real deploy, not
  trusting this comment indefinitely.
- Every mutation-shaped action (`triggerRunAction`, `allocateBudgetAction`,
  `submitBuyerActionAction`) validates its input with `zod` before it
  reaches `backend-client.ts` - a Server Action is a public POST endpoint
  reachable by anyone who can send the same request, not just by this UI's
  own buttons (Next.js's own Server Actions guide is explicit about this).
- No API key ever appears in a browser DevTools network tab, a client
  bundle, or a `NEXT_PUBLIC_*` variable. The only thing that can leak it is
  a bug in this file itself - a small, auditable surface by design.
