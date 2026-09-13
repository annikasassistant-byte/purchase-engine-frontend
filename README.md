# Purchase Engine — Frontend

The buyer-facing UI for BuyBack's Purchase Engine: today's ranked, explainable
buy list, a live daily-budget control, and BUY / ADJUST / SKIP logging. Talks
to [`purchase_engine`](../purchase_engine) — a separate repo, deployed on
Render — over its HTTP API; never touches Postgres, never re-implements any
scoring or allocation logic.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · zod.

---

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in PURCHASE_ENGINE_API_KEY (see below)
npm run dev                        # http://localhost:3000
```

`PURCHASE_ENGINE_API_KEY` must match the backend's `API_KEY` exactly — get it
from `../purchase_engine/.env` (or wherever the deployed value lives once
that's the source of truth). `PURCHASE_ENGINE_API_URL` already defaults to
the deployed backend in `.env.example`, so a fresh clone points at real data
immediately.

```bash
npm run build && npm run start     # production build, locally
npm run lint                       # ESLint (flat config, next/core-web-vitals + TS)
npx tsc --noEmit                   # type-check only
```

---

## Where this came from

Not a generic dashboard — every UI decision below traces back to a specific
line in this project's own requirements docs (`../docs/`), not a template:

| Requirement | Source | Where it lives |
|---|---|---|
| Product, qty, current inventory, sales/30d, priority, score, reason(s) — verbatim field list | `Product Briefing.md`, "User Interface" | `recommendation-row.tsx` |
| "Available in JTL: 3 / Purchased·Still Incoming: 2 / Effective Stock Position: 5" — three numbers, never pre-merged | `Important Factors.md` | `stock-breakdown.tsx` |
| Purchase Score and Confidence "kept separate" — never combined | `Important Factors.md`; backend ADR 0003/0008 | `score-confidence.tsx` |
| CONFIRMED / TEMP_CALCULATED / PRÜFEN / UNAVAILABLE shown distinctly, never smoothed to "profitability: OK" | `conversations/Annika.md` | `profitability-badge.tsx` |
| "Clearly flag uncertainty rather than silently making assumptions" | `Important Factors.md` | `reasons-risks.tsx` (reasons + risks always render together) |
| Daily budget input, optimizing recommendations within it | `Product Briefing.md`, "Budget" | `budget-control.tsx` + live `/allocate` |
| "A refresh every 30-60 minutes is probably sufficient" | `Product Briefing.md`, "Real-Time Updates" | `auto-refresh.tsx` |

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx        root layout - fonts (next/font/google), metadata
│   ├── page.tsx           the dashboard - Server Component, fetches the
│   │                      latest run + BUY tier server-side
│   └── globals.css        design tokens (Tailwind v4 @theme), light/dark
├── components/
│   ├── ui/                 Button, Badge, Skeleton - small, hand-written,
│   │                       shadcn-style primitives (no external component
│   │                       library dependency)
│   ├── recommendation-list.tsx   the interactive core: budget + tabs +
│   │                             live re-allocation + the product list
│   ├── recommendation-row.tsx    one product - composes everything below
│   ├── stock-breakdown.tsx       Available / Incoming / Effective (3 numbers)
│   ├── score-confidence.tsx      score and confidence, never combined
│   ├── profitability-badge.tsx   the 4-state margin-reliability badge
│   ├── reasons-risks.tsx         reasons[] + risks[], always together
│   ├── action-buttons.tsx        BUY / ADJUST / SKIP -> logs to the backend
│   ├── budget-control.tsx        the daily-budget input (presentational)
│   ├── run-trigger-button.tsx    "Run engine" - the real backend run
│   ├── run-header.tsx            as-of date, counts, STALE_INPUTS banner
│   └── auto-refresh.tsx          `router.refresh()` every 30 min
└── lib/
    ├── env.ts             server-only deployment config (fails fast if unset)
    ├── schemas.ts         zod schemas mirroring the backend's API contract
    │                      exactly - every TS type is `z.infer`'d from one
    ├── backend-client.ts  the only module that knows the backend's URL,
    │                      API key, or JSON shapes
    ├── actions.ts          Server Actions ("use server") - the only way a
    │                       Client Component reaches the backend
    ├── format.ts           currency/number/date formatting
    └── cn.ts               clsx + tailwind-merge class combinator
```

**The browser never holds the backend's API key.** Every request to
`purchase_engine`'s API happens server-side — Server Components (reads) or
Server Actions (mutations + the live budget re-allocation). See
[ADR 0001](docs/adr/0001-server-side-proxy-for-the-backend-api.md).

**Every backend response is validated with `zod` before anything touches
it**, not just cast to a TypeScript type. See
[ADR 0002](docs/adr/0002-zod-at-the-api-boundary.md).

Full decision record in [`docs/adr/`](docs/adr/).

---

## How a page load works

1. `app/page.tsx` (Server Component) calls `GET /runs/latest`, then
   `GET /runs/{id}/recommendations?label=BUY` — server-side, with the API key
   attached, `cache: "no-store"` (this is live operational data).
2. `RecommendationList` (Client Component) receives that as initial props,
   owns the budget/tab/allocation UI state, and lazy-loads CONSIDER/SKIP on
   first click (a Server Action, not a second page fetch) rather than
   shipping ~200 rows of nested payload nobody asked to see yet.
3. Typing a new budget debounces (450ms), then calls the backend's
   `POST /runs/{id}/allocate` — the fast, no-full-rerun path (backend
   ADR 0009) — and re-ranks the BUY tier's qty/funded status in place.
4. "Run engine" calls `POST /runs` for real (`triggerRunAction`) — the same
   code path as the backend's own CLI, ~17-99s depending on host load
   (backend ADR 0011) — then `revalidatePath("/")` so the page re-fetches
   with the new run automatically.
5. BUY / ADJUST / SKIP logs a decision against `(run_id, produkt_id)` via
   `POST /actions` — the dataset the backend's Phase-4 backtest needs.

---

## Deployment

Vercel is the natural target (Next.js's own platform, zero-config for this
app shape). Two things to get right:

- **Environment variables**: set `PURCHASE_ENGINE_API_URL` and
  `PURCHASE_ENGINE_API_KEY` in the Vercel project's Environment Variables —
  neither is prefixed `NEXT_PUBLIC_`, so neither is exposed to the browser.
- **Function duration**: `app/page.tsx` exports `maxDuration = 150` because
  triggering a real engine run can take up to ~99s. Confirm the Vercel
  plan/Fluid Compute setting in use actually allows that before relying on
  it in production — see [ADR 0001](docs/adr/0001-server-side-proxy-for-the-backend-api.md).

Once deployed, update the backend's `CORS_ORIGINS` if anything ever calls it
directly from a browser — this app itself doesn't need to be on that list,
since it only ever talks to the backend server-side (see ADR 0001).

---

## Known limitations (honest, not hidden)

- **No auth on this app itself yet.** Anyone with the URL can trigger a real
  engine run or log a buyer action. Fine for an internal tool behind
  Render's/Vercel's own access, not fine once this is reachable by more than
  the buying team. Neon Auth is the named upgrade path (backend ADR 0010) —
  not wired up here yet.
- **No manual light/dark toggle** — follows the OS theme only. See
  [ADR 0003](docs/adr/0003-design-system-and-no-theme-toggle-yet.md).
- **No automated tests yet.** `tsc --noEmit` and ESLint are the current
  correctness net. Component/e2e tests (Vitest + Testing Library, or
  Playwright for the budget-reallocation flow) are the natural next step,
  not done here for scope reasons.
- **`schemas.ts` is manually kept in sync** with the backend's Pydantic
  models — no generated client yet. See
  [ADR 0002](docs/adr/0002-zod-at-the-api-boundary.md) for when that's worth
  automating.

## License

Proprietary — © 2026 BuyBack.
