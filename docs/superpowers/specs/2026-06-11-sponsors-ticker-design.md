# Sponsors Ticker — Design Spec

## Overview

Add a horizontally auto-scrolling sponsor ticker between the `<header>` and `<div class="tab-bar">` in `index.html`. Displays fake-but-real-looking official World Cup sponsors with logos and taglines, styled like a broadcast sponsorship banner.

## Sponsors

| Brand | Tagline |
|-------|---------|
| Greggs | Official Sausage Roll Provider of the FIFA World Cup 2026 |
| Lynx Africa | Official scent of the away end. |
| Strongbow Dark Fruits | As drunk by Chris Lee. |
| Lambrini | For the girls. Official partner of the 2026 FIFA World Cup. |
| Frosty Jack's | 3 litres. £3.49. |
| Wonga | They shut us down. Now you have Polymarket. |
| Sports Direct | Changing rooms are at the back. |

## Placement

Inserted in `index.html` directly after `</header>` and before `<div class="tab-bar">`.

## Logos

- Source and download colour PNG/SVG logos for each brand into a `/sponsors/` directory in the repo
- Confirm `/sponsors/` is not caught by `.surgeignore` (it must be publicly deployed)
- Render greyscale via CSS `filter: grayscale(1)` — no image pre-processing needed
- Target height: ~32px, width auto, within each card

## Ticker Behaviour

- Pure CSS infinite scroll — `@keyframes` + `transform: translateX` on a duplicated strip, no JS
- The inner strip contains all 7 sponsor cards twice (duplicate for seamless loop)
- Scroll speed: slow enough to read (~30–40s per loop)
- No pause on hover (keeps it broadcast-like)
- On mobile (≤700px): same behaviour, logos/text slightly smaller

## Card Layout

Each card: `[logo] [tagline]` inline, separated from next card by a `·` divider. Cards are non-interactive (no click behaviour).

## Styles

- Ticker strip: subtle top/bottom border to separate from header and tab bar, low-contrast background (matches the app's dark theme)
- Text: small (~0.7rem), muted colour (`var(--text-muted)` or similar)
- Logo images: `filter: grayscale(1) opacity(0.6)` for a restrained broadcast feel
- Left/right fade edges via `mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent)`
