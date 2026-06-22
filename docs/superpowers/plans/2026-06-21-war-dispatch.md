# War Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Polymarket odds + tournament stats tickers with a static "War Dispatch" newspaper card showing territory control changes from the last 5 completed matches.

**Architecture:** Remove `js/odds.js` and `css/tickers.css` entirely. Add a `calcTerritoryControlForTerritory()` helper (extracted from `calcTerritoryControl()`) that accepts an exclusion set of match keys, enabling before/after diffs. `calcBattleMapUpdates()` uses this to detect changes and `renderWarDispatch()` builds the card HTML. No network calls, no intervals.

**Tech Stack:** Vanilla JS globals, innerHTML rendering, CSS custom properties already in `css/tokens.css`.

## Global Constraints

- No build step, no modules — all JS runs in global scope, loaded via `<script src>` in `index.html`
- No test framework — verification is manual browser console checks
- `calcPredPoints(home, away, actual1, actual2)` is defined in `render-leaderboard.js` and must not be duplicated
- `PLAYERS`, `ownerHexColors`, `TERRITORY_DATA`, `VENUE_DATA` are globals from `js/config.js`
- `matchData`, `matchByKey`, `matchIdByTeamDate`, `predLookup` are globals from `js/data.js`
- Player names in `ownerHexColors` are title-case (e.g. `'Steven'`, not `'STEVEN'`)
- Match keys use the format `"team1|team2|date"` (e.g. `"Portugal|Morocco|2026-06-15"`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/odds.js` | **Delete** | Polymarket fetch, broadcast clock, stats ticker — all gone |
| `css/tickers.css` | **Delete** | All ticker/clock/chip styles |
| `css/dispatch.css` | **Create** | War Dispatch card styles |
| `js/render-leaderboard.js` | **Modify** | Add `calcTerritoryControlForTerritory()`, `calcBattleMapUpdates()`, `renderWarDispatch()` |
| `js/main.js` | **Modify** | Remove `loadOdds`/`loadStatsTracker` calls + intervals; add `renderWarDispatch()` call |
| `index.html` | **Modify** | Swap stylesheet link, swap script tag, swap `.tickers-container` for `#warDispatch` |

---

### Task 1: Remove the tickers — HTML, CSS, JS

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Delete: `js/odds.js`
- Delete: `css/tickers.css`

**Interfaces:**
- Produces: a page that loads without errors and without the Polymarket/stats rows or broadcast clock

- [ ] **Step 1: Remove the tickers-container block from index.html**

Find and delete the entire `.tickers-container` div (lines ~195–235). Replace it with a placeholder div that will hold the dispatch card:

```html
<div id="warDispatch" class="war-dispatch"></div>
```

It goes in exactly the same position — between the header/auth section and the `.tab-bar`.

- [ ] **Step 2: Swap the tickers stylesheet link in index.html**

Replace:
```html
<link rel="stylesheet" href="css/tickers.css">
```
With:
```html
<link rel="stylesheet" href="css/dispatch.css">
```

- [ ] **Step 3: Remove the odds.js script tag from index.html**

Delete:
```html
<script src="js/odds.js"></script>
```

- [ ] **Step 4: Remove odds/stats calls from main.js**

In `js/main.js`, the `restoreSession().then(...)` block currently reads:
```js
return loadData().then(() => {
  loadOdds(); loadStatsTracker(); checkTeamResults();
  handleProfileRoute();
});
```

Change it to:
```js
return loadData().then(() => {
  checkTeamResults();
  handleProfileRoute();
});
```

Also remove these two lines from the bottom of `js/main.js`:
```js
setInterval(loadOdds, 600000);
setInterval(loadStatsTracker, 300000);
```

- [ ] **Step 5: Delete js/odds.js**

```bash
rm /Users/stevenfrostwick/Documents/world-cup-sweeps-2026/js/odds.js
```

- [ ] **Step 6: Delete css/tickers.css**

```bash
rm /Users/stevenfrostwick/Documents/world-cup-sweeps-2026/css/tickers.css
```

- [ ] **Step 7: Verify in browser**

Open `index.html` in a browser. Check:
- No JS console errors (especially no `loadOdds is not defined` or `tcTime is not defined`)
- The Polymarket row, stats row, and broadcast clock are gone
- The tab bar still appears in the correct position
- An empty `#warDispatch` div exists in the DOM (check with DevTools)

- [ ] **Step 8: Commit**

```bash
git add index.html js/main.js
git rm js/odds.js css/tickers.css
git commit -m "feat: remove Polymarket/stats tickers, scaffold war dispatch"
```

---

### Task 2: Create css/dispatch.css

**Files:**
- Create: `css/dispatch.css`

**Interfaces:**
- Produces: `.war-dispatch`, `.wd-masthead`, `.wd-masthead-title`, `.wd-masthead-sub`, `.wd-stories`, `.wd-story`, `.wd-headline`, `.wd-territory`, `.wd-subline`, `.wd-empty` selectors used by `renderWarDispatch()`

- [ ] **Step 1: Create the stylesheet**

Create `/Users/stevenfrostwick/Documents/world-cup-sweeps-2026/css/dispatch.css`:

```css
/* ── WAR DISPATCH ── */
.war-dispatch {
  background: rgba(0,0,0,0.35);
  border-top: 1px solid var(--border-alpha);
  border-bottom: 1px solid var(--border-alpha);
}

.wd-masthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-alpha);
}

.wd-masthead-title {
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.9);
}

.wd-masthead-sub {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
}

.wd-stories {
  padding: 0 16px;
}

.wd-story {
  padding: 8px 0;
  border-top: 1px solid var(--border-alpha);
}

.wd-story:first-child {
  border-top: none;
}

.wd-headline {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #fff;
  line-height: 1.3;
}

.wd-territory {
  color: rgba(255,255,255,0.65);
}

.wd-subline {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.4);
  margin-top: 2px;
  letter-spacing: 0.03em;
}

.wd-empty {
  padding: 10px 0;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 2: Verify in browser**

Reload `index.html`. The `#warDispatch` div should now have a faint dark background with top/bottom borders visible between the auth bar and tab bar. It will be empty until Task 4.

- [ ] **Step 3: Commit**

```bash
git add css/dispatch.css
git commit -m "feat: add war dispatch CSS"
```

---

### Task 3: Add calcTerritoryControlForTerritory() and calcBattleMapUpdates()

**Files:**
- Modify: `js/render-leaderboard.js` — add two new functions after `calcTerritoryControl()` (around line 253)

**Interfaces:**
- Consumes: `TERRITORY_DATA`, `VENUE_DATA`, `matchByKey`, `matchIdByTeamDate`, `predLookup`, `PLAYERS`, `calcPredPoints()` — all globals available at call time
- Produces:
  - `calcTerritoryControlForTerritory(territory, excludeKeys)` → `{ controller: string|null, contested: bool, contestedPlayers: string[], totalPts: {[player]: number}, matchesPlayed: number, totalMatches: number }`
  - `calcBattleMapUpdates()` → `Array<{ type: string, territory: string, player: string|null, displaced: string|null, contestedPlayers: string[], margin: number, triggerMatch: string, matchesRemaining: number }>`

- [ ] **Step 1: Verify calcTerritoryControl() still works before touching it**

In the browser console (on the Leaderboard tab or Battle Map tab after data loads):
```js
calcTerritoryControl(); console.log(territoryControl);
```
Expected: array of 6 territory objects, some with `controller` set, some null.

- [ ] **Step 2: Add calcTerritoryControlForTerritory() to render-leaderboard.js**

Insert immediately after the closing `}` of `calcTerritoryControl()` (after line 253):

```js
function calcTerritoryControlForTerritory(territory, excludeKeys) {
  const totalMatches = territory.venues.reduce((n, v) => n + (VENUE_DATA[v]?.matches.length || 0), 0);
  let matchesPlayed = 0;
  const totals = Object.fromEntries(PLAYERS.map(p => [p, 0]));

  for (const venueName of territory.venues) {
    const venue = VENUE_DATA[venueName];
    if (!venue) continue;
    for (const key of venue.matches) {
      if (excludeKeys && excludeKeys.has(key)) continue;
      const m = matchByKey[key];
      if (!m || !m.isComplete) continue;
      matchesPlayed++;
      const matchId = matchIdByTeamDate[key];
      if (!matchId) continue;
      const preds = predLookup[matchId] || [];
      for (const player of PLAYERS) {
        const pred = preds.find(p => p.player_name === player);
        if (pred && pred.home !== null && pred.home !== undefined) {
          totals[player] += calcPredPoints(pred.home, pred.away, m.score1, m.score2);
        }
      }
    }
  }

  if (matchesPlayed === 0) {
    return { controller: null, contested: false, contestedPlayers: [], totalPts: {}, matchesPlayed: 0, totalMatches };
  }

  const maxPts = Math.max(...Object.values(totals));
  const leaders = PLAYERS.filter(p => totals[p] === maxPts);

  return {
    controller: leaders.length === 1 ? leaders[0] : null,
    contested: leaders.length > 1,
    contestedPlayers: leaders.length > 1 ? leaders : [],
    totalPts: { ...totals },
    matchesPlayed,
    totalMatches,
  };
}
```

- [ ] **Step 3: Verify calcTerritoryControlForTerritory() in browser console**

```js
// Should match the first element of territoryControl (Mesoamerica, no exclusions)
calcTerritoryControlForTerritory(TERRITORY_DATA[0], new Set())
```
Expected: same `controller`/`contested`/`totalPts` as `territoryControl[0]`.

- [ ] **Step 4: Add calcBattleMapUpdates() to render-leaderboard.js**

Insert immediately after `calcTerritoryControlForTerritory()`:

```js
function calcBattleMapUpdates() {
  const completed = matchData
    .filter(m => m.isComplete)
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '00:00'}`);
      const db = new Date(`${b.date}T${b.time || '00:00'}`);
      return db - da;
    });
  const recent5 = completed.slice(0, 5);
  if (!recent5.length) return [];

  const recentKeys = new Set(recent5.map(m => `${m.team1}|${m.team2}|${m.date}`));

  const stories = [];

  for (const territory of TERRITORY_DATA) {
    const allTerritoryKeys = territory.venues.flatMap(v => VENUE_DATA[v]?.matches || []);
    const hasRecentMatch = allTerritoryKeys.some(k => recentKeys.has(k));
    if (!hasRecentMatch) continue;

    const territoryRecentKeys = new Set(allTerritoryKeys.filter(k => recentKeys.has(k)));

    const after = calcTerritoryControlForTerritory(territory, new Set());
    const before = calcTerritoryControlForTerritory(territory, territoryRecentKeys);

    const triggerKey = allTerritoryKeys.find(k => recentKeys.has(k));
    const triggerMatch = triggerKey ? triggerKey.split('|').slice(0, 2).join(' vs ') : '';

    const afterController = after.controller;
    const beforeController = before.controller;
    const afterContested = after.contested;
    const beforeContested = before.contested;

    const sortedAfter = Object.entries(after.totalPts).sort((a, b) => b[1] - a[1]);
    const afterMargin = sortedAfter[0] ? sortedAfter[0][1] - (sortedAfter[1]?.[1] ?? 0) : 0;

    let type, player, displaced, contestedPlayers, margin;

    if (afterController && !beforeController && !beforeContested) {
      type = 'seized';
      player = afterController;
      displaced = null;
      margin = afterMargin;
    } else if (afterController && !beforeController && beforeContested) {
      type = 'broke-deadlock';
      player = afterController;
      displaced = null;
      margin = afterMargin;
    } else if (afterController && beforeController && afterController !== beforeController) {
      type = 'wrested';
      player = afterController;
      displaced = beforeController;
      margin = afterMargin;
    } else if (afterContested && beforeController) {
      type = 'contested';
      player = null;
      displaced = beforeController;
      contestedPlayers = after.contestedPlayers;
      margin = 0;
    } else if (afterController && beforeController && afterController === beforeController) {
      const sortedBefore = Object.entries(before.totalPts).sort((a, b) => b[1] - a[1]);
      const beforeMargin = sortedBefore[0] ? sortedBefore[0][1] - (sortedBefore[1]?.[1] ?? 0) : 0;
      if (afterMargin <= beforeMargin) continue;
      type = 'extended';
      player = afterController;
      displaced = null;
      margin = afterMargin;
    } else {
      continue;
    }

    const matchesRemaining = after.totalMatches - after.matchesPlayed;

    stories.push({
      type,
      territory: territory.name,
      player,
      displaced,
      contestedPlayers: contestedPlayers || [],
      margin,
      triggerMatch,
      matchesRemaining,
    });
  }

  const order = { wrested: 0, seized: 1, 'broke-deadlock': 2, contested: 3, extended: 4 };
  stories.sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5));

  return stories;
}
```

- [ ] **Step 5: Verify calcBattleMapUpdates() in browser console**

```js
console.log(calcBattleMapUpdates());
```
Expected: an array of story objects (may be empty if the last 5 matches didn't shift any territory). Each object has `type`, `territory`, `player`, `displaced`, `margin`, `triggerMatch`, `matchesRemaining`. No errors.

- [ ] **Step 6: Commit**

```bash
git add js/render-leaderboard.js
git commit -m "feat: add calcTerritoryControlForTerritory and calcBattleMapUpdates"
```

---

### Task 4: Add renderWarDispatch() and wire it up

**Files:**
- Modify: `js/render-leaderboard.js` — add `renderWarDispatch()` after `calcBattleMapUpdates()`
- Modify: `js/main.js` — call `renderWarDispatch()` after data loads

**Interfaces:**
- Consumes: `calcBattleMapUpdates()`, `ownerHexColors` (global from `config.js`), `escapeHtml()` (global from `utils.js`)
- Consumes: `#warDispatch` DOM element (added in Task 1)
- Produces: fully rendered War Dispatch card visible on page load

- [ ] **Step 1: Add renderWarDispatch() to render-leaderboard.js**

Insert immediately after `calcBattleMapUpdates()`:

```js
function renderWarDispatch() {
  const el = document.getElementById('warDispatch');
  if (!el) return;

  const stories = calcBattleMapUpdates();

  const playerSpan = (name) =>
    `<span style="color:${ownerHexColors[name]}">${escapeHtml(name.toUpperCase())}</span>`;
  const territorySpan = (name) =>
    `<span class="wd-territory">${escapeHtml(name.toUpperCase())}</span>`;

  const masthead = `
    <div class="wd-masthead">
      <span class="wd-masthead-title">THE WAR DISPATCH</span>
      <span class="wd-masthead-sub">after last 5 results</span>
    </div>`;

  if (!stories.length) {
    el.innerHTML = masthead +
      `<div class="wd-stories"><div class="wd-empty">No territory changes from last 5 results</div></div>`;
    return;
  }

  const storyHtml = stories.map(s => {
    let headline, subline;
    const pts = s.margin;
    const ptStr = `${pts} pt${pts !== 1 ? 's' : ''}`;

    if (s.type === 'seized') {
      headline = `${playerSpan(s.player)} SEIZES ${territorySpan(s.territory)}`;
      subline = `Leads by ${ptStr} · ${escapeHtml(s.triggerMatch)}`;
    } else if (s.type === 'broke-deadlock') {
      headline = `${playerSpan(s.player)} BREAKS DEADLOCK IN ${territorySpan(s.territory)}`;
      subline = `${ptStr} clear · ${escapeHtml(s.triggerMatch)}`;
    } else if (s.type === 'wrested') {
      headline = `${playerSpan(s.player)} WRESTS ${territorySpan(s.territory)} FROM ${playerSpan(s.displaced)}`;
      subline = `Overtook by ${ptStr} · ${escapeHtml(s.triggerMatch)}`;
    } else if (s.type === 'contested') {
      const names = s.contestedPlayers.map(playerSpan).join(' and ');
      headline = `${territorySpan(s.territory)} NOW CONTESTED`;
      subline = `${names} level · ${s.matchesRemaining} match${s.matchesRemaining !== 1 ? 'es' : ''} remaining`;
    } else {
      headline = `${playerSpan(s.player)} EXTENDS GRIP ON ${territorySpan(s.territory)}`;
      subline = `${ptStr} clear · ${escapeHtml(s.triggerMatch)}`;
    }

    return `<div class="wd-story">
      <div class="wd-headline">${headline}</div>
      <div class="wd-subline">${subline}</div>
    </div>`;
  }).join('');

  el.innerHTML = masthead + `<div class="wd-stories">${storyHtml}</div>`;
}
```

- [ ] **Step 2: Wire up renderWarDispatch() in main.js**

Change the `loadData().then(...)` block in `js/main.js` from:
```js
return loadData().then(() => {
  checkTeamResults();
  handleProfileRoute();
});
```
To:
```js
return loadData().then(() => {
  renderWarDispatch();
  checkTeamResults();
  handleProfileRoute();
});
```

- [ ] **Step 3: Verify in browser — happy path**

Reload `index.html`. Between the header and the tab bar, the War Dispatch card should appear with:
- "THE WAR DISPATCH" masthead on the left, "after last 5 results" muted on the right
- Story headlines in all-caps with player names in their player colours
- Sublines in grey with margin and trigger match
- If the last 5 results didn't shift any territory: "No territory changes from last 5 results"

- [ ] **Step 4: Verify in browser — data integrity**

In the browser console:
```js
// Confirm story types match visible output
calcBattleMapUpdates().forEach(s => console.log(s.type, s.territory, s.player, s.margin));
```
Cross-check one story manually: go to Battle Map tab, find the territory named in the story, confirm the controller matches `s.player`.

- [ ] **Step 5: Commit**

```bash
git add js/render-leaderboard.js js/main.js
git commit -m "feat: render War Dispatch panel with territory change stories"
```
