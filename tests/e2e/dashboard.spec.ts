import { expect, test } from "@playwright/test";

// See tests/e2e/README.md - these hit the real deployed backend.

test("dashboard renders a real run with the expected structure", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page).toHaveTitle("Purchase Engine");
  await expect(page.getByText("As of", { exact: false })).toBeVisible();
  await expect(page.locator("#daily-budget")).toBeVisible();
  await expect(page.getByRole("tab", { name: /Buy/ })).toBeVisible();

  // At least one row rendered, and it carries the fields Annika's own
  // briefing spec's verbatim (docs/Product Briefing.md): score, confidence
  // (kept separate - Important Factors.md), and the three-way stock
  // breakdown (also Important Factors.md).
  const firstRow = page.locator("details").first();
  await expect(firstRow).toBeVisible();
  await firstRow.locator("summary").click();
  await expect(firstRow.getByText("SCORE")).toBeVisible();
  await expect(firstRow.getByText("CONFIDENCE")).toBeVisible();
  await expect(firstRow.getByText("Available in JTL")).toBeVisible();
  await expect(firstRow.getByText("Effective stock")).toBeVisible();
});

test("changing the budget live-reallocates without a full engine re-run", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const budgetInput = page.locator("#daily-budget");
  await budgetInput.fill("200");

  // Debounced (450ms) then a real POST /runs/{id}/allocate - backend ADR
  // 0009's whole point is that this is fast (~0.5s measured), not a full
  // ~17-99s engine run (ADR 0011); this wait is generous network margin,
  // not evidence it needs to be slow.
  await expect(page.getByText("allocated", { exact: false })).toBeVisible({ timeout: 10_000 });
});

test("switching tabs lazy-loads Consider, and a Skip action logs successfully", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: /Consider/ }).click();
  // Lazy-loaded on first click (README: "no reason to ship ~200 rows of
  // nested payload nobody asked to see yet") - a real network round trip,
  // not instant.
  await expect(async () => {
    expect(await page.locator("details").count()).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });

  await page.getByRole("tab", { name: /Buy/ }).click();
  const firstRow = page.locator("details").first();
  await firstRow.locator("summary").click();
  await firstRow.getByRole("button", { name: "Skip" }).click();

  await expect(firstRow.getByText("Logged: SKIP")).toBeVisible({ timeout: 10_000 });
});
