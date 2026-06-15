# Countdown Ticker Design

**Date:** 2026-06-15
**Feature:** Scrolling countdown ticker showing the next 4 upcoming/live games

## Overview

Add a third scrolling ticker row to the existing tickers block, showing countdowns to the next 4 upcoming games. Live games display "LIVE" with a green highlight. Countdowns refresh every 30 seconds automatically.

## Structure & Placement

A third row inside `.tickers-rows`, added below the existing Polymarket odds ticker. Uses the identical DOM pattern as the other two rows:

- Label panel on the left (black background, matching sponsors label style)
- Masked scrolling track on the right

The broadcast clock sits outside `.tickers-rows` and spans all rows by height — no structural changes needed there.

**Label text:**
- Top: `KICK OFF` (small caps)
- Bottom: `UPCOMING` (tiny)

## Content & Data

Reads from the `matchData` global (populated by `loadData()`). Picks the next 4 games sorted by kickoff time that are either upcoming or currently live.

**Item format:**

```
[flag1] TEAM1  vs  TEAM2 [flag2]  ·  countdown
```

- Left team flag is to the left of the team name
- Right team flag is to the right of the team name
- Flags use `flagUrl(teamIso[teamName])` — same `flagcdn.com` SVGs used elsewhere in the app, ~18px tall
- Countdown text uses the existing `getCountdown()` from `utils.js`
- Live games show `LIVE` in green
- Items are duplicated in the DOM for seamless CSS scroll loop (same technique as sponsors ticker)

## Updates

A `buildCountdownTicker()` function added to `js/odds.js`.

- Called once from `main.js` after `loadData()` resolves, alongside the existing `loadOdds()` call
- Then called every 30 seconds via `setInterval` to refresh countdown text and detect newly-live games

## CSS

New classes: `.kickoff-outer`, `.kickoff-label`, `.kickoff-wrap`, `.kickoff-track`, `.kickoff-item`, `.kickoff-divider`

- `.kickoff-item` is `display: inline-flex; align-items: center; gap: 8px`
- Flag images: `height: 18px; width: auto`
- Countdown text in a `.ki-cd` span; `.ki-live` variant in green (`#4ade80`) for LIVE state
- Scroll animation: `kickoff-scroll` keyframe, ~60s duration
- Mobile: hide the entire row on `≤700px` (`.kickoff-outer { display: none }`) — consistent with how `.ticker-clock` is hidden on mobile, keeps the ticker block from getting too tall on small screens

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `.kickoff-*` CSS classes; add `#kickoffTrack` HTML row inside `.tickers-rows` |
| `js/odds.js` | Add `buildCountdownTicker()` function |
| `js/main.js` | Call `buildCountdownTicker()` after `loadData()` resolves; add 30s interval |
