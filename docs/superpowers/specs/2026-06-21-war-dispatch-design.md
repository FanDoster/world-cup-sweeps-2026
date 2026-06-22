# War Dispatch — Design Spec

**Date:** 2026-06-21
**Feature:** Battle map news update panel replacing Polymarket/stats tickers

---

## Overview

Remove the Polymarket odds ticker and tournament stats ticker rows entirely. Replace the `.tickers-container` with a full-width "War Dispatch" newspaper-style card that shows recent territory control changes derived from the last 5 completed matches. Static — no animation, no auto-rotation.

---

## Removals

- **`js/odds.js`** — delete entirely (Polymarket fetch, clock logic, stats ticker render)
- **`index.html`** — remove the entire `.tickers-container` block (odds row, stats row, broadcast clock)
- **`css/tickers.css`** — delete entirely (all ticker/clock/chip styles)
- Remove `<script src="js/odds.js">` from `index.html`
- Remove `<link rel="stylesheet" href="css/tickers.css">` from `index.html`
- Remove `setInterval` calls in `js/main.js` that drove the clock or stats ticker refresh

---

## New: War Dispatch Panel

### Position

Full-width, sits between the auth bar / header and the tab bar — the same slot the `.tickers-container` occupied.

### Visual design

```
┌─────────────────────────────────────────────────────────────┐
│  THE WAR DISPATCH          after last 5 results             │
├─────────────────────────────────────────────────────────────┤
│  STEVEN SEIZES EMPIRE                                       │
│  Overtook Dan by 4 pts · Portugal vs Morocco                │
│  ─────────────────────────────────────────────────────────  │
│  MESOAMERICA CONTESTED                                      │
│  Chris ties Steven · 2 matches remaining                    │
│  ─────────────────────────────────────────────────────────  │
│  LAURIE EXTENDS GRIP ON EL PACÍFICO                        │
│  8 pt lead · exact score sealed it                          │
└─────────────────────────────────────────────────────────────┘
```

- Dark background (`rgba(0,0,0,0.35)` matching old tickers)
- Masthead row: "THE WAR DISPATCH" left-aligned in small-caps/uppercase label style; "after last 5 results" right-aligned in muted text; separated from stories by a 1px border
- Each story: headline line (player name in their `ownerHexColors` colour, territory name in white) + subline (grey, smaller — margin detail and triggering match)
- Thin divider between stories
- No player name in headlines for contested/hold events — territory name leads

### Story types

| Event | Headline | Subline |
|-------|----------|---------|
| Sole controller gained (from null) | `STEVEN SEIZES EMPIRE` | `Leads by N pts · after Team1 vs Team2` |
| Controller changed hands | `DAN WRESTS DIXIE FROM ANTON` | `Overtook by N pts · after Team1 vs Team2` |
| Sole controller → contested | `EMPIRE NOW CONTESTED` | `Chris ties Steven · X matches remaining` |
| Contested → sole controller | `LAURIE BREAKS DEADLOCK IN EL PACÍFICO` | `Pulls N pts clear · after Team1 vs Team2` |
| Same controller, margin widened | `STEVEN EXTENDS EMPIRE LEAD` | `N pts clear of Dan · after Team1 vs Team2` |

Territories with no matches in the last 5 completed matches are omitted silently.

### Edge cases

- No territory-affecting matches in last 5 → single line: "No territory changes from last 5 results"
- Tournament not yet started / no completed matches → "No results yet"
- Multiple matches triggered the same territory change → subline names the most recent match only

---

## Data logic — `calcBattleMapUpdates()`

New function added to `js/render-leaderboard.js`.

### Algorithm

1. Filter `matchData` to completed matches (`m.isComplete === true`), sort by date+time descending
2. Take the first 5 — these are the "recent 5"
3. Build a set of match keys from those 5: `recentKeys = new Set([m.team1+'|'+m.team2+'|'+m.date, ...])`
4. For each territory in `TERRITORY_DATA`:
   a. Collect all match keys that belong to this territory's venues (via `VENUE_DATA`)
   b. If none of those keys are in `recentKeys` → skip this territory
   c. Compute **before state**: run `calcTerritoryControlForKeys(allKeys - recentKeys ∩ territoryKeys)` — i.e. territory control using only matches *not* in the recent 5 that belong to this territory
   d. Compute **after state**: run the same for all keys (current state)
   e. Diff before vs after → emit one story object
5. Return array of story objects sorted by story "drama" (control change > contested > extends lead)

### Helper: `calcTerritoryControlForKeys(territory, excludeKeys)`

Extracted/adapted from `calcTerritoryControl()`. Takes a territory object and a set of match keys to exclude. Returns `{ controller, contested, contestedPlayers, totalPts, matchesPlayed }` for that one territory.

This avoids duplicating the scoring logic — `calcPredPoints` is reused unchanged.

### Story object shape

```js
{
  type: 'seized' | 'wrested' | 'contested' | 'broke-deadlock' | 'extended' | 'unchanged',
  territory: 'EMPIRE',
  player: 'Steven',           // new controller (null if contested)
  displaced: 'Dan',           // previous controller (null if was uncontrolled)
  contestedPlayers: [],       // for 'contested' type
  margin: 4,                  // pt gap between leader and closest rival
  triggerMatch: 'Portugal vs Morocco',
  matchesRemaining: 2,
}
```

---

## Rendering — `renderWarDispatch()`

New function in `js/render-leaderboard.js`.

- Targets `<div id="warDispatch">` in `index.html`
- Calls `calcBattleMapUpdates()` then builds innerHTML
- Called once after `loadData()` resolves (alongside `renderLeaderboard()`)
- No interval refresh needed — called again whenever `loadData()` is re-called

---

## CSS — `css/dispatch.css`

New stylesheet, replaces `css/tickers.css`. Link added to `index.html` in the same position.

Key selectors:
- `.war-dispatch` — outer container, dark bg, border top/bottom
- `.wd-masthead` — top row, flex, space-between
- `.wd-masthead-title` — "THE WAR DISPATCH" in label style
- `.wd-masthead-sub` — "after last 5 results" muted right
- `.wd-stories` — container for story items
- `.wd-story` — individual story block with top-border divider (except first)
- `.wd-headline` — bold, uppercase, larger
- `.wd-subline` — smaller, muted grey
- `.wd-empty` — single-line fallback state

---

## File changes summary

| File | Action |
|------|--------|
| `js/odds.js` | Delete |
| `css/tickers.css` | Delete |
| `css/dispatch.css` | Create |
| `js/render-leaderboard.js` | Add `calcBattleMapUpdates()`, `calcTerritoryControlForKeys()`, `renderWarDispatch()` |
| `index.html` | Remove tickers-container block, add `#warDispatch` div, swap stylesheet/script links |
| `js/main.js` | Remove clock/stats setInterval calls, call `renderWarDispatch()` after data load |
