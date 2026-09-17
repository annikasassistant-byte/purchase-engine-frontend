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

// See docs/adr/0004 - the tier tabs follow the WAI-ARIA APG tabs pattern
// with manual activation: arrow keys move focus between tabs without
// selecting them (selecting fires a real fetch), Enter/Space selects.
test("tier tabs support ARIA APG keyboard navigation (arrow keys move focus, Enter selects)", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const buyTab = page.getByRole("tab", { name: /Buy/ });
  const considerTab = page.getByRole("tab", { name: /Consider/ });
  const skipTab = page.getByRole("tab", { name: /Skip/ });

  await expect(buyTab).toHaveAttribute("aria-selected", "true");
  await expect(buyTab).toHaveAttribute("tabindex", "0");
  await expect(considerTab).toHaveAttribute("tabindex", "-1");

  // aria-controls / aria-labelledby wire each tab to a real tabpanel.
  const panelId = await buyTab.getAttribute("aria-controls");
  const panel = page.locator(`#${panelId}`);
  await expect(panel).toHaveAttribute("role", "tabpanel");
  await expect(panel).toHaveAttribute("aria-labelledby", (await buyTab.getAttribute("id")) ?? "");

  await buyTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(considerTab).toBeFocused();
  // Moving focus must not select - a stray arrow press shouldn't fire a fetch.
  await expect(buyTab).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("End");
  await expect(skipTab).toBeFocused();

  await page.keyboard.press("Home");
  await expect(buyTab).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expect(skipTab).toBeFocused(); // wraps around
  await expect(buyTab).toHaveAttribute("aria-selected", "true"); // still not selected

  await page.keyboard.press("Enter");
  await expect(skipTab).toHaveAttribute("aria-selected", "true", { timeout: 10_000 });
});
