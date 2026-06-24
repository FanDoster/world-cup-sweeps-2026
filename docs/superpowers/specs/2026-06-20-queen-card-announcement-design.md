# Queen Card Announcement Banner — Design Spec

**Date:** 2026-06-20  
**Status:** Approved

---

## What

A permanent, static card-style announcement panel inserted between the site header and the `.tickers-container`. It announces the Queen Card feature as a real, fully-designed product addition.

---

## Placement

In `index.html`, between `</header>` (line 79) and `<div class="tickers-container">` (line 81).

---

## Visual Design

- Uses `.card-base` as the base class
- Gold border: `border: 1px solid var(--gold)`
- Subtle gold glow: `box-shadow: 0 0 24px rgba(245,158,11,0.10), inset 0 0 0 1px rgba(245,158,11,0.08)`
- Warm gold tint background: `background: rgba(245,158,11,0.04)` on top of `.card-base`
- Padding: `16px 20px`
- Margin: `16px 0` (sits comfortably between header and tickers)

### Layout (single row, flex)

```
[ 🂽 ]  [ QUEEN CARD  NEW ]          [ > rule < > rule < > rule < ... ]
         [ flavour text         ]
```

- **Left:** Queen of Hearts card character `🂽` in gold, ~`2.5rem`, `flex-shrink: 0` — renders as a playing card face with Q and ♥
- **Center:** 
  - Headline: `QUEEN CARD` — bold, tracked uppercase, `var(--gold)`, `~1rem`
  - "NEW" pill badge inline with headline — gold background, dark text, rounded
  - Subtitle: the activation/swap description in `var(--text-secondary)`, `0.82rem`
- **Right:** Rules list — each rule wrapped in `> … <` chevrons (pointing inward toward the text), `var(--text-muted)`, `font-size: 0.78rem`, `font-family: var(--font-mono)`, displayed as a wrapping flex row of chips

### Rules (chevron-wrapped, pointing inward)

```
> One card per player <
> Swap up to 3 group stage predictions with any one rival <
> Play within 48 hours of the final group stage fixture <
> Jokers are not transferable <
> Cannot swap identical predictions <
> Expires at Round of 32 kickoff <
```

---

## Copy

**Subtitle text:**  
> Play your Queen Card in the 48 hours after the group stage ends. Pick a rival and swap up to 3 of your predictions with theirs — jokers stay put, scores update immediately. One card. One chance. Use it wisely.

---

## Implementation

All styles inline in `index.html` via a `<style>` block (no new CSS file needed for a one-off component), or appended to `css/tokens.css` as a `.queen-card-banner` rule.

Prefer a `<style>` block at the bottom of `<head>` to keep it self-contained and easy to remove when/if the feature ships for real.

No JavaScript. No interactivity. Static HTML only.

---

## Responsiveness

On mobile (≤700px): stack the card icon + headline above the rules chips. Rules wrap naturally as a flex row with `flex-wrap: wrap`.

---

## Out of scope

- No dismiss/close button
- No animation
- No link or CTA
- No actual feature implementation
