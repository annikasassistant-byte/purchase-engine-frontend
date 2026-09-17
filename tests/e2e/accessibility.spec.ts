import { expect, test } from "@playwright/test";

// See tests/e2e/README.md - these hit the real deployed backend.
//
// Regression coverage for two bugs found in a manual accessibility/
// responsiveness pass (2026-09-17):
//
// 1. Keyboard focus on a row's <summary> computed outline-style: none even
//    though focus-visible:outline-2/-outline-accent were applied, because a
//    bare `outline-none` unconditionally set Tailwind v4's internal
//    `--tw-outline-style` custom property to "none" - and
//    `focus-visible:outline-2` only *reads* that property
//    (`outline-style: var(--tw-outline-style)`), it never restores it. The
//    fix was to drop the redundant `outline-none` rather than try to
//    "re-enable" it under focus-visible.
// 2. The primary Buy button was clickable for SKIP-tier rows (and any
//    budget-trimmed BUY row), letting a buyer log a semantically meaningless
//    "BUY 0 units" action.

test("keyboard focus on a recommendation row shows a real (non-none) outline", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const firstSummary = page.locator("details summary").first();
  await firstSummary.focus();

  const outline = await firstSummary.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: cs.outlineWidth };
  });

  expect(outline.style).toBe("solid");
  expect(outline.width).toBe("2px");
});

test("Buy button is disabled for a SKIP-tier row (qty is always 0)", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: /Skip/ }).click();

  const firstRow = page.locator("details").first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.locator("summary").click();

  const buyButton = firstRow.getByRole("button", { name: /^Buy \d+$/ });
  await expect(buyButton).toBeDisabled();
});
