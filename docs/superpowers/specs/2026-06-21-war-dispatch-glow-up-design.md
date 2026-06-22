# War Dispatch Glow-Up — Design Spec

**Date:** 2026-06-21
**Feature:** Visual redesign of the War Dispatch card — military tactical briefing aesthetic

---

## Overview

Restyle the existing `#warDispatch` card and `renderWarDispatch()` output. No structural or data changes — same story types, same logic. Goals:

1. Add `margin-bottom: 16px` to `.war-dispatch` (the original gap request)
2. Full monospace tactical briefing aesthetic throughout
3. Coloured left stripe per story (player's colour; red for contested)
4. Amber status labels (`SEIZED`, `CONTESTED`, etc.)
5. Varied phrase pools per story type, seeded by territory name for consistency across renders

---

## Visual Design

### Container

- Background: `var(--card)` (`#131d2a`)
- Border top/bottom: `1px solid var(--border-alpha)`
- `margin-bottom: 16px`
- All text: `var(--font-mono)`

### Masthead

```
  BATTLE MAP  [ SITREP ]          AFTER LAST 5 RESULTS
```

- `"BATTLE MAP"` — small (`0.55rem`), dim (`var(--text-muted)`), uppercase, tracked
- `"[ SITREP ]"` — amber (`var(--gold)`), weight 900, same size, inline with BATTLE MAP
- `"AFTER LAST 5 RESULTS"` — right-aligned, muted, `0.55rem`
- Masthead separated from stories by `1px dashed var(--border-alpha-mid)`

### Stories

Each story:

```
  ┃  SEIZED
  ┃  STEVEN SEIZES EMPIRE
  ┃  Leads Dan by 4 pts · after Portugal vs Morocco
```

- Left stripe: `3px solid` in the story player's `ownerHexColors[player]` colour
  - For `contested` type: `var(--live)` (#ef4444) — no single owner
- Padding: `10px 14px`
- Top divider between stories: `1px dashed var(--border-alpha)` (not on first story)
- Status label (`.wd-status`): `0.6rem`, amber (`var(--gold)`), weight 700, uppercase, tracked, block element above headline
- Headline (`.wd-headline`): `0.85rem`, white, weight 700, uppercase, line-height 1.3
- Subline (`.wd-subline`): `0.68rem`, `var(--text-secondary)`, normal weight, margin-top 3px

### Empty state

```
  BATTLE MAP  [ SITREP ]          AFTER LAST 5 RESULTS
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  NO TERRITORY CHANGES FROM LAST 5 RESULTS
```

Same masthead, single muted line below.

---

## Phrase Pools

Phrases are selected via `territory.name.charCodeAt(0) % phrases.length` so the same territory always gets the same phrasing across renders.

### seized (new sole controller, was uncontrolled)

Headlines (verb only — appended with territory name):
```js
['SEIZES', 'CAPTURES', 'CLAIMS', 'TAKES CONTROL OF']
```
Example: `STEVEN SEIZES EMPIRE`

Sublines:
```js
['Leads {2nd} by {pts} · after {match}', '{pts} clear of {2nd} · after {match}', 'Takes the lead by {pts} · after {match}']
```

### wrested (control changed hands)

Full headline templates:
```js
[
  '{P} WRESTS {T} FROM {D}',
  '{P} OVERTHROWS {D} IN {T}',
  '{P} TAKES {T} FROM {D}',
  '{P} DEFEATS {D} FOR {T}',
]
```

Sublines:
```js
['Overtook {D} by {pts} · after {match}', 'Took the lead by {pts} · after {match}', '{pts} ahead of {D} · after {match}']
```

### contested (sole controller → disputed)

Full headline templates (`{D}` = displaced former controller, `{C}` = challenger):
```js
[
  '{C} BREAKS {D}\'S GRIP ON {T}',
  '{C} CHALLENGES {D} FOR {T}',
  '{D}\'S HOLD ON {T} UNDER THREAT',
  '{C} TIES {D} IN {T}',
]
```

Sublines (always name the former controller explicitly):
```js
[
  '{C} and {D} level · {D} had sole control · {rem} match{es} remaining',
  'Disputed — {C} pulls level with {D} · {rem} match{es} left',
  '{D}\'s sole control broken by {C} · {rem} match{es} remaining',
]
```

Left stripe colour: `var(--live)` (red) — no single owner.

### broke-deadlock (contested → sole controller)

Headlines (verb phrase — appended with territory name):
```js
['BREAKS DEADLOCK IN', 'PULLS CLEAR IN', 'ENDS STALEMATE IN', 'EMERGES FROM CHAOS IN']
```
Example: `STEVEN BREAKS DEADLOCK IN EL PACÍFICO`

Sublines:
```js
['{pts} clear · after {match}', 'Pulls {pts} ahead · after {match}', 'Decisive move — {pts} pts clear · after {match}']
```

### extended (same controller, wider margin)

Headlines (verb phrase — appended with territory name):
```js
['TIGHTENS HOLD ON', 'EXTENDS GRIP ON', 'STRENGTHENS LEAD IN', 'PULLS FURTHER AHEAD IN']
```
Example: `STEVEN TIGHTENS HOLD ON EMPIRE`

Sublines:
```js
['{pts} clear of {2nd} · after {match}', 'Lead extended to {pts} pts over {2nd} · after {match}', '{pts} pts ahead of {2nd} · after {match}']
```

---

## Template variable reference

| Token | Value |
|-------|-------|
| `{P}` | story.player (title-case, styled with ownerHexColors) |
| `{D}` | story.displaced (title-case, styled) |
| `{C}` | `story.contestedPlayers.find(p => p !== story.displaced)` — the challenger (the one who wasn't sole leader before) |
| `{T}` | story.territory (e.g. "EMPIRE") |
| `{pts}` | `story.margin + " pt" + (story.margin !== 1 ? "s" : "")` |
| `{2nd}` | second-highest scorer in the territory (from story.totalPts — need to pass to render) |
| `{match}` | story.triggerMatch |
| `{rem}` | story.matchesRemaining |
| `{es}` | `story.matchesRemaining !== 1 ? "es" : ""` |

**Note on `{2nd}`:** The render function currently doesn't receive runner-up name. `calcBattleMapUpdates()` must add a `runnerUp` field to each story object (the player with the second-highest `totalPts` in `after.totalPts`).

---

## Changes Required

### `js/render-leaderboard.js`

**`calcBattleMapUpdates()`** — add `runnerUp` to each story object:
```js
const sortedAfter = Object.entries(after.totalPts).sort((a, b) => b[1] - a[1]);
const runnerUp = sortedAfter[1]?.[0] ?? null; // second highest scorer
// add to all story push() calls:
stories.push({ ..., runnerUp });
```

Also fix the `triggerMatch` to pick the **newest** recent match in the territory (iterate `recent5` instead of `allTerritoryKeys`):
```js
const triggerKey = recent5.map(m => `${m.team1}|${m.team2}|${m.date}`).find(k => territoryRecentKeys.has(k));
```

**`renderWarDispatch()`** — full rewrite of HTML generation:
- Masthead uses new structure
- Each story block gets `.wd-story` with inline `border-left` style in player colour
- Status label added as `.wd-status` element
- Phrase pools defined as constants at top of function (or module-level)
- Phrase selected via `territory.name.charCodeAt(0) % pool.length`
- Template variables interpolated inline

### `css/dispatch.css`

Full rewrite:
- Add `margin-bottom: 16px` to `.war-dispatch`
- Add `.wd-masthead-label`, `.wd-sitrep` for the two masthead elements
- Rewrite `.wd-story` with `border-left` and dashed top divider
- Add `.wd-status` (amber label)
- Update `.wd-headline` and `.wd-subline` sizes/weights
- `.wd-empty` padding and style

---

## Files Changed

| File | Action |
|------|--------|
| `css/dispatch.css` | Rewrite — new masthead structure, story stripe layout, status label, monospace throughout |
| `js/render-leaderboard.js` | Modify `calcBattleMapUpdates()` (add `runnerUp`, fix `triggerMatch`), rewrite `renderWarDispatch()` HTML |
