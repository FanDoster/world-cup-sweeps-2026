# Ticker → Static Chips Design

**Date:** 2026-06-20  
**Scope:** Replace both scrolling ticker rows (Polymarket odds + tournament stats) with static chip-grid rows. No scrolling, no rotation, no animation.

---

## What changes

The two horizontal auto-scrolling ticker rows between the header and tab bar are replaced with static flex-wrap chip rows. The broadcast clock on the right is unchanged.

---

## Row 1 — Polymarket Odds

**Label badge:** unchanged — `LIVE ODDS / POLYMARKET / PREDICTION MARKET`

**Content:** Inline chips showing:
- Top 4 World Cup winner odds (always shown, sorted by probability descending)
- Today's match odds if Polymarket markets exist for them

**Chip format:** `FLAG? · TEAM NAME · 62%` — team name in white, percentage in amber (`#f90`), separated by a middot.

**Removed:** Volume wagered (`$12M WAGERED`) — too much detail without scrolling room.

**Overflow:** Chips wrap to a second line if they don't fit. No horizontal scroll, no gradient mask.

---

## Row 2 — Tournament Stats

**Label badge:** unchanged — `LIVE / [category] / STATS`

**Content:** Single best-available category, top 5 entries as chips:
1. **Golden Boot** (top scorers) — if `FOOTBALL_DATA_TOKEN` is set and API returns data
2. **Most Goals** (by team) — fallback if no scorer data

**Chip format:** `FLAG · RANK · NAME · 3G` — rank dimmed, name in white, stat in amber.

**Removed:** Category rotation (`showStatsCategory`, rotation timer, `_statsCategories`, `_statsCatIndex`, `_statsGeneration`). No auto-advance, no fade transition between categories.

**Overflow:** Same as row 1 — wraps to second line, no scroll.

---

## JS changes (`js/odds.js`)

- `loadOdds()`: build individual `<span class="odds-chip">` elements instead of doubled track HTML. Remove animation setup (`oddsDur`, `track.style.animation`, `scrolling` class).
- `loadStatsTracker()`: pick one category (scorers → goals fallback), render chips directly into `#statsTrack`. Remove `showStatsCategory()`, `_statsCategories`, `_statsCatIndex`, `_statsGeneration`.

---

## CSS changes (`css/tickers.css`)

- `.odds-wrap` / `.stats-wrap`: remove `overflow: hidden` and gradient `mask-image`. Add `flex-wrap: wrap`.
- `.odds-track` / `.stats-track`: repurposed in place (same element, same ID, same class). Remove `width: max-content`, `white-space: nowrap`, `will-change: transform`. Change to `display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 6px 12px;`
- New `.odds-chip` / `.stats-chip`: small inline badge rendered by JS into `#oddsTrack` / `#statsTrack` respectively. Uses existing colour tokens: name in `#fff`, stat in `#f90`.
- Remove `@keyframes odds-scroll` and `@keyframes stats-scroll`.
- Remove `.odds-track.scrolling` and hover pause rules.

---

## What stays the same

- `.tickers-container` outer structure and border
- `.odds-outer` / `.stats-outer` background colours
- `.odds-label` / `.stats-label` badge styling and content
- `.ticker-clock` (broadcast clock, right side)
- HTML element IDs `oddsTrack` and `statsTrack` (JS still targets them)
- `loadOdds()` and `loadStatsTracker()` called from `main.js` after `loadData()`

---

## Out of scope

- Removing or relocating the tickers section
- Changing the broadcast clock
- Adding interactivity (click to expand, category tabs)
- Changing what data is fetched from Polymarket or football-data.org
