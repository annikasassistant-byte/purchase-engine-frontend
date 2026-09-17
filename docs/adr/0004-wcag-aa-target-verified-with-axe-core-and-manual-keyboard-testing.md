# 4. WCAG 2.1 AA as the accessibility target, verified with axe-core and manual keyboard testing

Date: 2026-09-17

## Status

Accepted

## Context

The EU's European Accessibility Act (enforced since June 2025) requires
WCAG 2.1 AA conformance for digital products sold to EU consumers, with
fines up to 5% of annual EU revenue for non-compliance - relevant here even
though this is a two-person internal tool, since BuyBack is a German
company. Separately from the legal driver, getting this right also just
makes the tool better for the buying team it's actually built for. No prior
ADR names an explicit target or how it gets checked.

## Decision

- **Target: WCAG 2.1 Level AA.**
- **Automated verification:** `@axe-core/playwright` scans in
  `tests/e2e/accessibility.spec.ts` and ad-hoc during development, run
  across theme (light/dark) x viewport (desktop/375px mobile) x
  interaction-state (tab expanded, a tier tab open, the budget-adjust input
  open) combinations - a static pass alone under-tests a page whose content
  changes shape on click.
- **Manual keyboard verification for what axe-core structurally cannot
  catch:**
  - Focus-visible rings are checked by *computed style*
    (`outline-style`/`width`/`color`), not just by confirming a
    `focus-visible:outline-*` class is present in the DOM - a class being
    applied is not proof it's taking visible effect (see Consequences).
  - Composite widgets (anything with `role="tablist"`/`"tab"`) follow the
    WAI-ARIA Authoring Practices Guide tabs pattern: `aria-controls` /
    `aria-labelledby` linking each tab to its panel, roving `tabindex`
    (active tab `0`, others `-1`), and arrow-key/Home/End navigation. See
    `src/components/recommendation-list.tsx`. Activation is **manual**, not
    automatic - arrow keys only move focus, Enter/Space (native `<button>`
    behavior) selects - because selecting a tier tab triggers a real
    network fetch (`loadRecommendationsTabAction`), which shouldn't fire on
    every arrow press while someone is just browsing tabs.

## Consequences

- **A real, non-obvious Tailwind v4 bug this caught:** a bare `outline-none`
  unconditionally sets Tailwind's internal `--tw-outline-style` custom
  property to `none`. Any later `focus-visible:outline-*` utility only
  *reads* that property (`outline-style: var(--tw-outline-style)`) - it
  never restores it. So `outline-none focus-visible:outline-2 ...` looks
  correct in the DOM (all the right classes are there) while the computed
  `outline-style` stays `none` forever. The fix is to not use `outline-none`
  at all when a `focus-visible:outline-*` ring is meant to show later - the
  property's own initial value (`solid`, per Tailwind's `@property`
  registration) is already correct once nothing has poisoned it. Every
  focus ring in this codebase (`Button`, `Input`, `RecommendationRow`'s
  `<summary>`, `RecommendationList`'s `tabpanel`) now follows that pattern
  deliberately, not by accident.
- **axe-core will not tell you a composite widget's keyboard behavior is
  missing** - it flagged 0 violations on the tabs before arrow-key
  navigation existed, because "a `role="tab"` button that only responds to
  Tab and Enter" isn't a static DOM defect, just an incomplete interaction
  pattern. That gap has to be closed by deliberately testing against the
  ARIA APG for every composite widget added, not by trusting a clean axe-core
  run to mean "done."
- This ADR doesn't re-list every contrast value or scan result - that
  detail lives in `globals.css`'s inline comments and the git history for
  `tests/e2e/accessibility.spec.ts`, not here.
