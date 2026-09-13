# 3. One design system, system dark mode only, no manual toggle yet

Date: 2026-09-13

## Status

Accepted

## Context

This is a small internal tool with one realistic audience (BuyBack's own
buying team) and one realistic viewing context (a work laptop, whatever
theme its OS is already set to). It needed a considered visual identity
either way - "Beautiful Frontend" was an explicit ask - but not the full
theming infrastructure (a toggle, persisted preference, `data-theme`
attribute wiring) a public-facing product would warrant on day one.

## Decision

- **Design tokens continue the visual language already established** for
  BuyBack's Purchase Engine tooling - the internal status dashboard built
  alongside the backend used IBM Plex Sans (UI), IBM Plex Mono (anything
  numeric), and a deep teal accent. `src/app/globals.css` carries the same
  three choices forward, for brand continuity across this project's own
  tools rather than a fresh palette invented per artifact.
- **Semantic colors (`buy` / `consider` / `skip` / `risk`) are a distinct
  hue family from the accent.** They encode the engine's own vocabulary
  (the BUY/CONSIDER/SKIP tiers, a risk flag), which needs to read as signal
  independent of brand decoration - conflating them would make "this is
  BUY-tier" and "this is a clickable accent element" visually ambiguous.
- **Dark mode via `prefers-color-scheme` only** - both palettes are
  fully specified as tokens (`:root` for light, a media-query block for
  dark), so the app already respects a laptop's OS-level theme setting with
  no missing colors either direction. No manual light/dark switch, no
  `localStorage` persistence, no `data-theme` attribute.

## Consequences

- Someone whose OS is light but who wants this one app dark (or vice versa)
  has no way to do that today. Cheap to add later - the token structure
  (`:root` + a `prefers-color-scheme` media query) is already exactly the
  shape a `data-theme="dark"` override block would slot into; this ADR is
  the record of why it wasn't done now, not a claim that it shouldn't be.
- No component hardcodes a color outside the token set - every `bg-*` /
  `text-*` / `border-*` class used in `src/components/**` resolves through
  a `--color-*` custom property in `globals.css`'s `@theme inline` block,
  so both themes stay correct by construction rather than by remembering to
  test both.
