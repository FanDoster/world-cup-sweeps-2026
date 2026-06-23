---
name: knockout-bracket-prediction
description: Per-round bracket prediction view showing all 6 players' projected knockout stage lineups derived from group stage predictions, transitioning to real fixtures as the tournament progresses
metadata:
  type: project
---

# Knockout Bracket Prediction View — Design Spec

## Overview

A new "Bracket" tab showing what each player's group stage predictions imply for the knockout bracket. For each R32 slot (and subsequent rounds), all 6 players' projected teams are shown side by side. As real knockout fixtures are confirmed in the DB, projections are replaced with actual teams.

---

## Section 1: Data & Calculation

### FIFA Rankings (hardcoded)

A `FIFA_RANK` lookup object added to `js/config.js` alongside existing lookups:

```js
const FIFA_RANK = {
  Argentina: 1, France: 2, Spain: 3, England: 4, Brazil: 5, Morocco: 6,
  Netherlands: 7, Germany: 8, Portugal: 9, Belgium: 10, Mexico: 11,
  Colombia: 12, 'United States': 13, Croatia: 15, Japan: 16, Senegal: 17,
  Switzerland: 18, Uruguay: 19, Austria: 21, Iran: 22, 'South Korea': 23,
  Australia: 25, Egypt: 26, Norway: 27, Canada: 28, Algeria: 29,
  Ecuador: 30, 'Ivory Coast': 31, Turkey: 32, Sweden: 36, Paraguay: 37,
  Panama: 40, Scotland: 41, 'DR Congo': 43, 'Czech Republic': 44,
  Uzbekistan: 54, Qatar: 57, Tunisia: 58, 'Saudi Arabia': 59, Iraq: 60,
  'South Africa': 61, 'Cape Verde': 63, 'Bosnia & Herzegovina': 64,
  Ghana: 65, Jordan: 68, 'Curaçao': 81, 'New Zealand': 84, Haiti: 87,
};
```

Rankings are from the official June 2026 FIFA rankings, frozen for the tournament.

### Three calculation functions (all in `js/render-bracket.js`)

**`calcProjectedStandings(playerName)`**

For each of the 12 groups (A–L), simulates the final group table by applying match results in this priority order:
- Actual score for completed matches (regardless of what the player predicted)
- Player's predicted score for incomplete matches where a prediction exists
- 0-0 for incomplete matches with no prediction

Tiebreakers applied in order (per 2026 FIFA regulations Article 13):
1. H2H points (between tied teams only)
2. H2H goal difference (between tied teams only)
3. H2H goals scored (between tied teams only)
4. Overall goal difference (all group matches)
5. Overall goals scored (all group matches)
6. `FIFA_RANK` (lower number = better rank; proxy for steps 6-7 since card data is unavailable)

Returns `{ A: [{team, pts, gd, gf, pos}, ...], B: [...], ... }` for all 12 groups, sorted by final standing.

**`calcProjectedQualifiers(playerName)`**

Extracts from `calcProjectedStandings`:
- `winners`: `{ A: 'Spain', B: 'Canada', ... }` — group position 1
- `runners`: `{ A: 'Uruguay', B: 'Switzerland', ... }` — group position 2
- `thirds`: `['Morocco', 'Colombia', ...]` — all 12 third-placed teams, sorted by pts → GD → GF → FIFA_RANK; top 8 advance

**`calcProjectedBracket(playerName)`**

Maps each R32 slot to a `{ home, away }` team pair:
- Fixed slots (e.g. Match 84: `1H vs 2J`) resolved directly from `winners`/`runners`
- Third-placed slots use `THIRD_PLACE_ANNEX` (see Section 2) to determine which qualifying third fills each slot based on which groups they came from

Returns an object keyed by match number: `{ 73: { home: 'Spain', away: 'England' }, ... }`.

In Phase 2, this function is extended to also project R16+ slots by chasing winner references through `KNOCKOUT_BRACKET`, using actual R32 results (or player predictions on R32 matches) to determine who advances.

---

## Section 2: Bracket Data Structure

All constants hardcoded in `js/render-bracket.js`.

### `R32_SLOTS`

16 fixed match definitions from the FIFA-published bracket:

```js
const R32_SLOTS = [
  { match: 73, date: '2026-06-28', home: '2A', away: '2B' },
  { match: 74, date: '2026-06-29', home: '1E', away: '3rd', thirdPool: ['A','B','C','D','F'] },
  { match: 75, date: '2026-06-29', home: '1F', away: '2C' },
  { match: 76, date: '2026-06-29', home: '1C', away: '2F' },
  { match: 77, date: '2026-06-30', home: '1I', away: '3rd', thirdPool: ['C','D','F','G','H'] },
  { match: 78, date: '2026-06-30', home: '2E', away: '2I' },
  { match: 79, date: '2026-06-30', home: '1A', away: '3rd', thirdPool: ['C','E','F','H','I'] },
  { match: 80, date: '2026-07-01', home: '1L', away: '3rd', thirdPool: ['E','H','I','J','K'] },
  { match: 81, date: '2026-07-01', home: '1D', away: '3rd', thirdPool: ['B','E','F','I','J'] },
  { match: 82, date: '2026-07-01', home: '1G', away: '3rd', thirdPool: ['A','E','H','I','J'] },
  { match: 83, date: '2026-07-02', home: '2K', away: '2L' },
  { match: 84, date: '2026-07-02', home: '1H', away: '2J' },
  { match: 85, date: '2026-07-02', home: '1B', away: '3rd', thirdPool: ['E','F','G','I','J'] },
  { match: 86, date: '2026-07-03', home: '1K', away: '3rd', thirdPool: ['D','E','I','J','L'] },
  { match: 87, date: '2026-07-03', home: '1J', away: '2H' },
  { match: 88, date: '2026-07-03', home: '2D', away: '2G' },
];
```

### `THIRD_PLACE_ANNEX`

A hardcoded lookup mapping the sorted string of 8 qualifying third-placed team groups (e.g. `'ABCDEFGH'`) to which group's third fills each of the 8 third-placed slots. FIFA published all 495 combinations in Annex C of the tournament regulations. This is the only complex constant but is purely a lookup table.

### `KNOCKOUT_BRACKET`

Subsequent round pairings as winner references:

```js
// R16 (matches 89–96)
{ match: 89, home: 'W73', away: 'W75' },
{ match: 90, home: 'W74', away: 'W77' },
{ match: 91, home: 'W76', away: 'W78' },
{ match: 92, home: 'W79', away: 'W80' },
{ match: 93, home: 'W83', away: 'W84' },
{ match: 94, home: 'W81', away: 'W82' },
{ match: 95, home: 'W86', away: 'W88' },
{ match: 96, home: 'W85', away: 'W87' },
// QF (matches 97–100)
{ match: 97, home: 'W89', away: 'W90' },
{ match: 98, home: 'W93', away: 'W94' },
{ match: 99, home: 'W91', away: 'W92' },
{ match: 100, home: 'W95', away: 'W96' },
// SF (matches 101–102)
{ match: 101, home: 'W97', away: 'W98' },
{ match: 102, home: 'W99', away: 'W100' },
// Third place (match 103)
{ match: 103, home: 'L101', away: 'L102' },
// Final (match 104)
{ match: 104, home: 'W101', away: 'W102' },
```

For Phase 1 (projected), knockout round slots beyond R32 are not shown — we can only project R32 from group predictions. R16 onwards requires knockout predictions (Phase 2).

---

## Section 3: UI Layout

### New "Bracket" tab

Added to the nav bar, visible to all users (projections are interesting without sign-in).

### Round selector

A strip of buttons at the top of the tab: `R32 | R16 | QF | SF | Final`. Default: R32. Inactive rounds (Phase 1: everything beyond R32) are greyed out until real knockout fixtures exist for that round.

### Match cards

One card per match in the active round, displayed in a single column:

```
Match 73 · Sun 28 Jun                    [Projected]
─────────────────────────────────────────
2A vs 2B

Anton   🇪🇸 Spain       vs  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
Chris   🇪🇸 Spain       vs  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
Dan     🇺🇾 Uruguay     vs  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
Laurie  🇪🇸 Spain       vs  🇭🇷 Croatia
Pat     🇪🇸 Spain       vs  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
Steven  🇪🇸 Spain       vs  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
─────────────────────────────────────────
```

- Player name rendered with existing `.owner-*` colour class
- Teams owned by that player are bolded
- If all 6 players agree on both teams: collapse to a single "All: 🇪🇸 Spain vs 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England" row
- "Projected" badge shown while group stage is running; removed once real fixture is in DB
- Each card uses existing `.card-base` class

### New files

- `js/render-bracket.js` — all calculation functions + `renderBracket()` + constants
- `css/bracket.css` — bracket tab and card styles

### Mobile

Cards stack full-width. Round selector scrolls horizontally if needed.

---

## Section 4: Phase Transition

### Phase 1 — Group stage (now through June 30)

All R32 slots show projections from `calcProjectedBracket(playerName)`. "Projected" badge on each card. Only R32 is active in the round selector.

### Phase 2 — Knockout fixtures confirmed (from July 4)

Real knockout matches are inserted into the `matches` table with `group_letter = null` and a new `round TEXT` column (`R32`, `R16`, `QF`, `SF`, `3P`, `F`).

Required DB migration (one SQL statement):
```sql
ALTER TABLE matches ADD COLUMN round TEXT;
```

The bracket renderer checks: if a real match exists in `matchData` for a given slot (detected by `match.round` being set), it shows the real fixture and drops the "Projected" badge. Otherwise it falls back to the projection.

Once real knockout matches are in the DB, players can make predictions on them through the **existing prediction UI** — no new prediction machinery needed. The prediction system already handles any match by ID.

For Phase 2, `calcProjectedBracket` for R16+ would use actual R32 results (or player predictions on R32 matches) to project subsequent rounds — the same logic as group stage projection but applied to knockout match predictions.

---

## Out of Scope

- Bracket tree / visual diagram (not worth the complexity at 6-player scale)
- Fair play tiebreaker (no card data in DB; FIFA_RANK used as final tiebreaker instead)
- Automatic population of knockout fixtures (manual Supabase entry, same as group stage scores)
