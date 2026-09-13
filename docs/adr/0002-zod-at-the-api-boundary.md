# 2. Every backend response is parsed through a zod schema, not just typed

Date: 2026-09-13

## Status

Accepted

## Context

TypeScript types are compile-time only - `fetch(...).json() as RunSummary`
happily compiles and then lies at runtime the moment the backend's actual
response doesn't match. `purchase_engine` is a genuinely separate repo with
its own release cadence (own CI, own Render deploy) - there's no shared
package, no generated client, nothing that fails this frontend's build when
that repo's `api/schemas.py` changes shape.

## Decision

`src/lib/schemas.ts` defines a `zod` schema for every backend response
shape, mirroring `purchase_engine/src/purchase_engine/api/schemas.py`
field-for-field, including the full nested `payload` object
(`RecommendationOut.payload`, produced by the backend's own
`to_jsonable(Recommendation)` - see that repo's `domain/models.py`). Every
TypeScript type in this codebase is `z.infer`'d from one of these schemas,
never hand-written separately - one definition, not two that can drift.

`backend-client.ts` runs every successful response through `schema.safeParse`
before returning it. A shape mismatch throws a clear "didn't match the
expected shape" error naming the actual `zod` diff, at the fetch call site -
not a `Cannot read properties of undefined` three components deep with no
indication which field was missing or why.

## Consequences

- A backend change that adds a field is free (zod ignores unknown keys by
  default). A backend change that **removes or renames** a field this
  frontend reads breaks loudly, at the boundary, the first time that
  endpoint is called after deploying - not silently in production as a
  blank cell somewhere in the recommendation list.
- Keeping `schemas.ts` in sync with the backend repo is a manual step today
  - there's no generated-client pipeline connecting the two repos. Worth
  automating (e.g., generating this file from the backend's OpenAPI schema
  at `/openapi.json` when `ENABLE_DOCS` is on) if the contract starts
  changing often enough that manual sync becomes the actual bottleneck;
  premature before then.
- `ProfitabilityStatus` is a `zod` enum, not a bare `string` - matches
  Annika's own explicit ask (docs/conversations/Annika.md) that the four
  values (`CONFIRMED` / `TEMP_CALCULATED` / `PRÜFEN` / `UNAVAILABLE`) stay a
  closed, named set the UI switches on, never a loosely-typed string that
  could silently accept a typo'd fifth value.
