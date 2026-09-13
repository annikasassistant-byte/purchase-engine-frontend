# End-to-end tests

`npm run test:e2e` (or `npx playwright test`).

These drive a real browser against the real deployed backend
(`buyback-purchase-engine-api.onrender.com`, or whatever `.env.local` points
at) - no mocking, same philosophy as `purchase_engine`'s own
`tests/api/test_api.py`. That means:

- **They need `.env.local` configured** (see the repo README) - without a
  valid `PURCHASE_ENGINE_API_KEY`, the dashboard itself fails to render and
  every test fails on the first assertion, not with a helpful skip. This is
  a deliberate trade-off for a two-person internal tool, not an oversight -
  see `docs/adr/0002` for the equivalent trade-off on the schema side.
- **The BUY/ADJUST/SKIP test writes a real row** to the backend's
  `buyer_action` table against whatever the current latest run is. There's
  no delete endpoint on the backend to clean it up automatically from here -
  every run of this suite leaves one more `SKIP` row behind. Harmless (real,
  legitimate-looking action data, just not from an actual buyer) but worth
  knowing before assuming the actions log is buyer-only, and worth an
  occasional manual cleanup via direct DB access if the noise starts to
  matter for the Phase-4 backtest dataset.
- **First run is slow.** Render's free tier sleeps the backend after 15
  minutes idle; the first request in a while pays a 30-60s cold-start wake.
  `playwright.config.ts` sets a 45s per-test timeout for exactly this
  reason - if the backend was already asleep, the very first test may still
  need a retry.
