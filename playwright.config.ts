import { defineConfig, devices } from "@playwright/test";

/**
 * These tests hit the real deployed backend (no mocking) - same philosophy
 * as purchase_engine's own `tests/api/test_api.py`. `workers: 1` on
 * purpose: Render's free tier is one small shared instance: several tests
 * opening `networkidle` waits against it at once is closer to a self
 * -inflicted load test than a smoke test. See tests/e2e/README.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 45_000,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
