# War Dispatch Glow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the War Dispatch card with a military tactical briefing aesthetic — monospace throughout, amber status labels, coloured left stripe per story, phrase variety — plus fix two minor data bugs.

**Architecture:** Two changes. Task 1 fixes `calcBattleMapUpdates()` to pick the newest triggering match and expose a `runnerUp` field. Task 2 rewrites `renderWarDispatch()` and `css/dispatch.css` together (they are inseparable — the CSS classes are defined for the exact HTML structure the renderer produces).

**Tech Stack:** Vanilla JS globals, innerHTML rendering, CSS custom properties from `css/tokens.css`.

## Global Constraints

- No build step, no modules — all JS runs in global scope
- All fonts in the dispatch card must use `var(--font-mono)`
- Design tokens only — no hardcoded colours except inline `style=` for player-specific stripes drawn from `ownerHexColors`
- `escapeHtml()` must wrap every string sourced from data (team names, player names used as plain text, match strings)
- Player names in `ownerHexColors` are title-case (`'Steven'`, `'Anton'`, `'Chris'`, `'Dan'`, `'Laurie'`, `'Pat'`)
- `var(--live)` (`#ef4444`) is used for the contested stripe — no other red
- `var(--gold)` (`#f59e0b`) is used for status labels and the `[ SITREP ]` badge
- Phrase selection: `territory.name.charCodeAt(0) % pool.length` — same territory always gets same phrase

---

## File Map

| File | Action |
|------|--------|
| `js/render-leaderboard.js` | Modify `calcBattleMapUpdates()` (2 fixes) + full rewrite of `renderWarDispatch()` |
| `css/dispatch.css` | Full rewrite |

---

### Task 1: Fix calcBattleMapUpdates() — add runnerUp, fix triggerMatch order

**Files:**
- Modify: `js/render-leaderboard.js` — `calcBattleMapUpdates()` only (lines 297–386)

**Interfaces:**
- Produces: story objects now include `runnerUp: string|null` (second-highest scorer in the territory's `after.totalPts`)
- Produces: `triggerMatch` now names the most recent (not oldest) match from the last 5 that belongs to this territory

- [ ] **Step 1: Verify the current bugs in browser console**

Open `index.html`. In the console:
```js
calcBattleMapUpdates().forEach(s => console.log(s.territory, s.triggerMatch, 'runnerUp' in s));
```
Expected: `runnerUp` is `false` for all stories (field missing). `triggerMatch` may be an older match, not the newest.

- [ ] **Step 2: Apply the two fixes to calcBattleMapUpdates()**

In `js/render-leaderboard.js`, replace the entire `calcBattleMapUpdates()` function (lines 297–386) with:

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

    // Iterate recent5 (newest-first) to find the most recent match in this territory
    const triggerKey = recent5
      .map(m => `${m.team1}|${m.team2}|${m.date}`)
      .find(k => territoryRecentKeys.has(k));
    const triggerMatch = triggerKey ? triggerKey.split('|').slice(0, 2).join(' vs ') : '';

    const afterController = after.controller;
    const beforeController = before.controller;
    const afterContested = after.contested;
    const beforeContested = before.contested;

    const sortedAfter = Object.entries(after.totalPts).sort((a, b) => b[1] - a[1]);
    const afterMargin = sortedAfter[0] ? sortedAfter[0][1] - (sortedAfter[1]?.[1] ?? 0) : 0;
    const runnerUp = sortedAfter[1]?.[0] ?? null;

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
      runnerUp,
    });
  }

  const order = { wrested: 0, seized: 1, 'broke-deadlock': 2, contested: 3, extended: 4 };
  stories.sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5));

  return stories;
}
```

- [ ] **Step 3: Verify in browser console**

```js
calcBattleMapUpdates().forEach(s => console.log(s.territory, s.triggerMatch, s.runnerUp));
```
Expected: every story object has a `runnerUp` string (a player name or null if no second scorer). No errors.

- [ ] **Step 4: Commit**

```bash
git add js/render-leaderboard.js
git commit -m "fix: add runnerUp to stories, fix triggerMatch to pick newest match"
```

---

### Task 2: Rewrite css/dispatch.css + renderWarDispatch()

**Files:**
- Modify: `css/dispatch.css` — full rewrite
- Modify: `js/render-leaderboard.js` — replace `renderWarDispatch()` (lines 388–441)

**Interfaces:**
- Consumes: story objects from `calcBattleMapUpdates()` now including `runnerUp` (added in Task 1)
- Consumes: `ownerHexColors` (global, title-case keys), `escapeHtml()` (global), `TERRITORY_DATA[*].name` for seed
- Produces: `#warDispatch` rendered with `.wd-story`, `.wd-stripe`, `.wd-body`, `.wd-status`, `.wd-headline`, `.wd-subline`, `.wd-territory`, `.wd-empty`

- [ ] **Step 1: Rewrite css/dispatch.css**

Replace the entire contents of `css/dispatch.css` with:

```css
/* ── WAR DISPATCH ── */
.war-dispatch {
  background: var(--card);
  border-top: 1px solid var(--border-alpha);
  border-bottom: 1px solid var(--border-alpha);
  margin-bottom: 16px;
  font-family: var(--font-mono);
}

.wd-masthead {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-bottom: 1px dashed var(--border-alpha-mid);
}

.wd-masthead-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.wd-sitrep {
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gold);
  border: 1px solid var(--gold);
  padding: 1px 5px;
  border-radius: 2px;
}

.wd-masthead-sub {
  margin-left: auto;
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.wd-story {
  display: flex;
  align-items: stretch;
  border-top: 1px dashed var(--border-alpha);
}

.wd-story:first-child {
  border-top: none;
}

.wd-stripe {
  width: 3px;
  flex-shrink: 0;
}

.wd-body {
  padding: 9px 14px;
}

.wd-status {
  display: block;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 3px;
}

.wd-headline {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text);
  line-height: 1.3;
}

.wd-territory {
  color: rgba(255,255,255,0.65);
}

.wd-subline {
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin-top: 3px;
  letter-spacing: 0.02em;
}

.wd-empty {
  padding: 10px 16px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}
```

- [ ] **Step 2: Rewrite renderWarDispatch() in js/render-leaderboard.js**

Replace the entire `renderWarDispatch()` function (from `function renderWarDispatch() {` through its closing `}`) with:

```js
function renderWarDispatch() {
  const el = document.getElementById('warDispatch');
  if (!el) return;

  const stories = calcBattleMapUpdates();

  const masthead = `
    <div class="wd-masthead">
      <span class="wd-masthead-label">BATTLE MAP</span>
      <span class="wd-sitrep">[ SITREP ]</span>
      <span class="wd-masthead-sub">AFTER LAST 5 RESULTS</span>
    </div>`;

  if (!stories.length) {
    el.innerHTML = masthead + `<div class="wd-empty">NO TERRITORY CHANGES FROM LAST 5 RESULTS</div>`;
    return;
  }

  const pick = (seed, pool) => pool[seed.charCodeAt(0) % pool.length];
  const pCol = (name) => ownerHexColors[name] || '#fff';
  const pSpan = (name) => `<span style="color:${pCol(name)}">${escapeHtml(name.toUpperCase())}</span>`;
  const tSpan = (name) => `<span class="wd-territory">${escapeHtml(name.toUpperCase())}</span>`;
  const ptStr = (n) => `${n} pt${n !== 1 ? 's' : ''}`;

  const SEIZED_VERBS = ['SEIZES', 'CAPTURES', 'CLAIMS', 'TAKES CONTROL OF'];
  const SEIZED_SUBS = [
    (s) => `Leads ${escapeHtml(s.runnerUp || 'the field')} by ${ptStr(s.margin)} · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `${ptStr(s.margin)} clear of ${escapeHtml(s.runnerUp || 'the field')} · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `Takes the lead by ${ptStr(s.margin)} · after ${escapeHtml(s.triggerMatch)}`,
  ];

  const WRESTED_HEADLINES = [
    (s) => `${pSpan(s.player)} WRESTS ${tSpan(s.territory)} FROM ${pSpan(s.displaced)}`,
    (s) => `${pSpan(s.player)} OVERTHROWS ${pSpan(s.displaced)} IN ${tSpan(s.territory)}`,
    (s) => `${pSpan(s.player)} TAKES ${tSpan(s.territory)} FROM ${pSpan(s.displaced)}`,
    (s) => `${pSpan(s.player)} DEFEATS ${pSpan(s.displaced)} FOR ${tSpan(s.territory)}`,
  ];
  const WRESTED_SUBS = [
    (s) => `Overtook ${escapeHtml(s.displaced)} by ${ptStr(s.margin)} · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `Took the lead by ${ptStr(s.margin)} · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `${ptStr(s.margin)} ahead of ${escapeHtml(s.displaced)} · after ${escapeHtml(s.triggerMatch)}`,
  ];

  const CONTESTED_HEADLINES = [
    (s, c) => `${pSpan(c)} BREAKS ${pSpan(s.displaced)}'S GRIP ON ${tSpan(s.territory)}`,
    (s, c) => `${pSpan(c)} CHALLENGES ${pSpan(s.displaced)} FOR ${tSpan(s.territory)}`,
    (s, c) => `${pSpan(s.displaced)}'S HOLD ON ${tSpan(s.territory)} UNDER THREAT`,
    (s, c) => `${pSpan(c)} TIES ${pSpan(s.displaced)} IN ${tSpan(s.territory)}`,
  ];
  const CONTESTED_SUBS = [
    (s, c) => `${escapeHtml(c)} and ${escapeHtml(s.displaced)} level · ${escapeHtml(s.displaced)} had sole control · ${s.matchesRemaining} match${s.matchesRemaining !== 1 ? 'es' : ''} remaining`,
    (s, c) => `Disputed — ${escapeHtml(c)} pulls level with ${escapeHtml(s.displaced)} · ${s.matchesRemaining} match${s.matchesRemaining !== 1 ? 'es' : ''} left`,
    (s, c) => `${escapeHtml(s.displaced)}'s sole control broken by ${escapeHtml(c)} · ${s.matchesRemaining} match${s.matchesRemaining !== 1 ? 'es' : ''} remaining`,
  ];

  const DEADLOCK_VERBS = ['BREAKS DEADLOCK IN', 'PULLS CLEAR IN', 'ENDS STALEMATE IN', 'EMERGES FROM CHAOS IN'];
  const DEADLOCK_SUBS = [
    (s) => `${ptStr(s.margin)} clear · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `Pulls ${ptStr(s.margin)} ahead · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `Decisive move — ${ptStr(s.margin)} clear · after ${escapeHtml(s.triggerMatch)}`,
  ];

  const EXTENDED_VERBS = ['TIGHTENS HOLD ON', 'EXTENDS GRIP ON', 'STRENGTHENS LEAD IN', 'PULLS FURTHER AHEAD IN'];
  const EXTENDED_SUBS = [
    (s) => `${ptStr(s.margin)} clear of ${escapeHtml(s.runnerUp || 'the field')} · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `Lead extended to ${ptStr(s.margin)} over ${escapeHtml(s.runnerUp || 'the field')} · after ${escapeHtml(s.triggerMatch)}`,
    (s) => `${ptStr(s.margin)} ahead of ${escapeHtml(s.runnerUp || 'the field')} · after ${escapeHtml(s.triggerMatch)}`,
  ];

  const storyHtml = stories.map(s => {
    const seed = s.territory;
    let stripeColor, statusLabel, headline, subline;

    if (s.type === 'seized') {
      stripeColor = pCol(s.player);
      statusLabel = 'SEIZED';
      headline = `${pSpan(s.player)} ${pick(seed, SEIZED_VERBS)} ${tSpan(s.territory)}`;
      subline = pick(seed, SEIZED_SUBS)(s);
    } else if (s.type === 'wrested') {
      stripeColor = pCol(s.player);
      statusLabel = 'CONTROL CHANGE';
      headline = pick(seed, WRESTED_HEADLINES)(s);
      subline = pick(seed, WRESTED_SUBS)(s);
    } else if (s.type === 'contested') {
      const challenger = s.contestedPlayers.find(p => p !== s.displaced) || s.contestedPlayers[0];
      stripeColor = 'var(--live)';
      statusLabel = 'CONTESTED';
      headline = pick(seed, CONTESTED_HEADLINES)(s, challenger);
      subline = pick(seed, CONTESTED_SUBS)(s, challenger);
    } else if (s.type === 'broke-deadlock') {
      stripeColor = pCol(s.player);
      statusLabel = 'DEADLOCK BROKEN';
      headline = `${pSpan(s.player)} ${pick(seed, DEADLOCK_VERBS)} ${tSpan(s.territory)}`;
      subline = pick(seed, DEADLOCK_SUBS)(s);
    } else {
      stripeColor = pCol(s.player);
      statusLabel = 'LEAD EXTENDED';
      headline = `${pSpan(s.player)} ${pick(seed, EXTENDED_VERBS)} ${tSpan(s.territory)}`;
      subline = pick(seed, EXTENDED_SUBS)(s);
    }

    return `<div class="wd-story">
      <div class="wd-stripe" style="background:${stripeColor}"></div>
      <div class="wd-body">
        <span class="wd-status">${statusLabel}</span>
        <div class="wd-headline">${headline}</div>
        <div class="wd-subline">${subline}</div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = masthead + `<div class="wd-stories">${storyHtml}</div>`;
}
```

- [ ] **Step 3: Verify in browser — structure**

Open `index.html`. Check between the header and the tab bar:
- Background is `#131d2a` (var(--card)) — darker than before
- Masthead shows `BATTLE MAP` (dim) · `[ SITREP ]` (amber bordered badge) · `AFTER LAST 5 RESULTS` (right-aligned, muted)
- Masthead separated from stories by a dashed line
- Each story has a 3px coloured left stripe in the player's colour (or red for contested)
- Status label (`SEIZED` / `CONTROL CHANGE` / `CONTESTED` / `DEADLOCK BROKEN` / `LEAD EXTENDED`) appears in amber above the headline
- All text is monospace
- `margin-bottom: 16px` creates visible gap below the card before the tab bar

- [ ] **Step 4: Verify in browser — phrase variety**

Open browser console:
```js
calcBattleMapUpdates().forEach(s => console.log(s.type, s.territory, s.triggerMatch, s.runnerUp));
```
Cross-check: for a `seized` story on "Empire" (`'E'.charCodeAt(0)` = 69, `69 % 4` = 1 → verb index 1 = `'CAPTURES'`), the headline should read `[PLAYER] CAPTURES EMPIRE`. Confirm the phrase shown matches this formula.

- [ ] **Step 5: Commit**

```bash
git add css/dispatch.css js/render-leaderboard.js
git commit -m "feat: war dispatch tactical briefing redesign — stripe layout, phrase pools, sitrep masthead"
```
