# Tournament Stats Ticker — Design Spec

**Date:** 2026-06-15
**Status:** Approved

## Overview

A new scrolling ticker row that surfaces live tournament statistics — Golden Boot, Top Assists, Clean Sheets, Most Goals, Biggest Wins, and a total goals counter. Categories are embedded as styled headers inside a single continuous scroll track, so the content is self-labelling as it scrolls past.

---

## Structure

One new `<div class="stats-outer">` row added to `.tickers-rows` in `index.html`, positioned between the Polymarket odds ticker and the Kickoff Countdown ticker.

Left badge is static (e.g. `STATS` / `2026`). The rotating feel comes from the content itself:

```
▌ GOLDEN BOOT ▌ MBAPPE 5G · VINICIUS JR 4G · KANE 4G · SALAH 3G ▌ TOP ASSISTS ▌ DE BRUYNE 4A · BELLINGHAM 3A ▌ CLEAN SHEETS ▌ GER 3 · ENG 3 · USA 2 ▌ MOST GOALS ▌ BRA 14 · FRA 11 · ARG 10 ▌ BIGGEST WIN ▌ BRA 6-0 BOL · FRA 4-1 MEX ▌ 127 GOALS IN 44 GAMES · 2.9/GAME ▌
```

Content is duplicated (set 1 + set 2) for a seamless CSS loop — same pattern as the existing Polymarket and Kickoff tickers.

---

## Data Sources

### football-data.org (free tier, CORS-friendly, 10 req/min)

Provides:
- **Golden Boot**: `GET /v4/competitions/WC/scorers` — returns top scorers with goals
- **Top Assists**: same endpoint — returns assists per player

Requires a free API token stored in `js/config.js` as `FOOTBALL_DATA_TOKEN`. If the token is absent or the call fails, the ticker silently skips these two categories and shows only the matchData-derived stats.

### Existing `matchData` (no API, computed client-side)

- **Clean Sheets**: teams where goals conceded = 0, counted across played matches
- **Most Goals**: teams ranked by total goals scored
- **Biggest Wins**: top 3 matches by goal difference (winner and score)
- **Tournament Total**: sum of all goals scored and count of matches played → goals-per-game average

---

## Categories

| Label | Source | Format |
|-------|--------|--------|
| `GOLDEN BOOT` | football-data.org | `MBAPPE 5G · VINICIUS JR 4G · KANE 4G` |
| `TOP ASSISTS` | football-data.org | `DE BRUYNE 4A · BELLINGHAM 3A · PEDRI 3A` |
| `CLEAN SHEETS` | matchData | `GER 3 · ENG 3 · USA 2 · BRA 2` |
| `MOST GOALS` | matchData | `BRA 14 · FRA 11 · ARG 10 · ESP 9` |
| `BIGGEST WIN` | matchData | `BRA 6-0 BOL · FRA 4-1 MEX · ARG 4-0 CAN` |
| *(no label)* | matchData | `127 GOALS IN 44 GAMES · 2.9 PER GAME` |

Top 4–5 entries per category. Categories with no data (e.g. no matches played yet) are omitted.

---

## Code

### `js/config.js`
Add `FOOTBALL_DATA_TOKEN = ''` (empty string = disabled).

### `js/odds.js`
New `async function loadStatsTracker()`:

1. Compute matchData-derived stats synchronously (clean sheets, most goals, biggest wins, total)
2. If `FOOTBALL_DATA_TOKEN` is set, fetch scorers from football-data.org
3. Build a flat array of `{ label, items }` category objects
4. Render as one long HTML string with `<span class="st-section">` headers and `<span class="st-item">` entries
5. Duplicate the string for seamless loop, inject into `#statsTrack`, add `.scrolling` class

### `js/main.js`
Call `loadStatsTracker()` after `loadData()` resolves (same pattern as `loadOdds()`). Set `setInterval(loadStatsTracker, 5 * 60 * 1000)` for 5-minute refresh.

### `index.html`
- New `.stats-outer` / `.stats-wrap` / `.stats-track` HTML block
- CSS animation `stats-scroll` (duration ~35s — slightly slower than odds, more content)
- `.st-section` styled distinctly from `.st-item` (e.g. brighter colour, slightly different weight)

---

## Graceful Degradation

- No API token → shows Clean Sheets, Most Goals, Biggest Wins, Tournament Total only
- API call fails → same fallback, no error shown to user
- No matches played yet → ticker hidden (same pattern as Kickoff ticker when no upcoming matches)

---

## Out of Scope

- Live in-match scores (separate ticker, different complexity)
- Weather at venues
- Player photos or flags in the ticker
- Per-player prediction stats (leaderboard ticker is a separate idea)
