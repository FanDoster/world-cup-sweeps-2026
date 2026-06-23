# Knockout Bracket Prediction View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Bracket" tab that shows all 6 players' projected Round of 32 knockout fixtures derived from their group stage score predictions, using actual results for completed matches.

**Architecture:** All calculation is client-side from existing globals (`matchData`, `predLookup`, `matchIdByTeamDate`, `teamOwner`, `teamIso`). Three pure functions build up from projected group standings → qualified teams → R32 slot assignments. A `renderBracket()` function produces match cards showing every player's projected fixture for each of the 16 R32 slots. Phase 2 (after group stage ends July 1) adds a `round` column to the DB so real knockout fixtures replace projections automatically.

**Tech Stack:** Plain JS globals (no modules), Supabase REST via existing `sb` client, flagcdn.com flags via existing `flagUrl()`, CSS custom properties from `css/tokens.css`.

## Global Constraints

- No build step, no npm, no ES modules — all JS runs in global scope via `<script src>` tags
- No test framework — verification is via browser console (`open index.html`, call functions directly)
- CSS variables for colours/spacing — use `var(--...)` tokens from `css/tokens.css`, never hardcode
- Player names come from `PLAYERS` constant (`['Anton', 'Chris', 'Dan', 'Laurie', 'Pat', 'Steven']`) in `js/config.js`
- Owner colour classes: `owner-anton`, `owner-chris`, `owner-dan`, `owner-laurie`, `owner-pat`, `owner-steven`
- Team names in JS/DB match exactly what's in `teams` table (e.g. `'United States'` not `'USA'`, `'Ivory Coast'` not `"Côte d'Ivoire"`, `'Bosnia & Herzegovina'`, `'Curaçao'`)
- `flagUrl(iso)` is defined in `js/utils.js` and takes an ISO code string
- Supabase URL/key hardcoded in `js/config.js` — this is intentional (security via RLS)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/config.js` | Modify | Add `FIFA_RANK` lookup |
| `js/render-bracket.js` | **Create** | `R32_SLOTS`, `KNOCKOUT_BRACKET` constants + `calcProjectedStandings()`, `calcProjectedQualifiers()`, `calcProjectedBracket()`, `renderBracket()`, `setBracketRound()` |
| `css/bracket.css` | **Create** | Bracket tab, round selector, match card styles |
| `index.html` | Modify | Add CSS link, add Bracket tab button, add section div, add script tag |
| `js/main.js` | Modify | Add `sectionBracket` toggle + `renderBracket()` call to `switchTab()` |
| `js/render-user-profile.js` | Modify | Add `'bracket'` to `validTabs` in `handleHashRoute()` |
| `js/data.js` | Modify (Phase 2) | Add `round` field to Supabase query and `matchData` objects |

---

## Task 1: Add FIFA_RANK to config.js

**Files:**
- Modify: `js/config.js` (after the `ownerHexColors` block)

**Interfaces:**
- Produces: `FIFA_RANK` global object — `{ [teamName: string]: number }` — available to all subsequent scripts

- [ ] **Step 1: Add FIFA_RANK constant**

Open `js/config.js`. After the closing `};` of `ownerHexColors`, add:

```js
const FIFA_RANK = {
  Argentina: 1, France: 2, Spain: 3, England: 4, Brazil: 5,
  Morocco: 6, Netherlands: 7, Germany: 8, Portugal: 9, Belgium: 10,
  Mexico: 11, Colombia: 12, 'United States': 13, Croatia: 15, Japan: 16,
  Senegal: 17, Switzerland: 18, Uruguay: 19, Austria: 21, Iran: 22,
  'South Korea': 23, Australia: 25, Egypt: 26, Norway: 27, Canada: 28,
  Algeria: 29, Ecuador: 30, 'Ivory Coast': 31, Turkey: 32, Sweden: 36,
  Paraguay: 37, Panama: 40, Scotland: 41, 'DR Congo': 43,
  'Czech Republic': 44, Uzbekistan: 54, Qatar: 57, Tunisia: 58,
  'Saudi Arabia': 59, Iraq: 60, 'South Africa': 61, 'Cape Verde': 63,
  'Bosnia & Herzegovina': 64, Ghana: 65, Jordan: 68,
  'Curaçao': 81, 'New Zealand': 84, Haiti: 87,
};
```

- [ ] **Step 2: Verify in browser console**

Open `index.html` in browser. Open DevTools console. Run:
```js
FIFA_RANK['Argentina']   // → 1
FIFA_RANK['England']     // → 4
FIFA_RANK['Haiti']       // → 87
FIFA_RANK['Curaçao']     // → 81
```
All four should return the expected numbers.

- [ ] **Step 3: Commit**

```bash
git add js/config.js
git commit -m "feat: add FIFA_RANK lookup for bracket tiebreaker"
```

---

## Task 2: Scaffold bracket tab in HTML + CSS + main.js

**Files:**
- Modify: `index.html` (tab bar at line ~91, section divs at line ~200, CSS link at line ~31, script tag at line ~312)
- Create: `css/bracket.css`
- Modify: `js/main.js` (lines 1–32)
- Modify: `js/render-user-profile.js` (line 613)

**Interfaces:**
- Produces: `sectionBracket` DOM element, `switchTab('bracket')` works, `#/bracket` hash route works, `renderBracket()` called (will throw until Task 5 implements it — that's fine)

- [ ] **Step 1: Create css/bracket.css**

Create `/Users/stevenfrostwick/Documents/world-cup-sweeps-2026/css/bracket.css` with:

```css
/* ── BRACKET TAB ── */
.bracket-round-selector {
  display: flex;
  gap: 8px;
  padding: 16px 0 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.bracket-round-btn {
  padding: 6px 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.85rem;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}

.bracket-round-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.bracket-round-btn.disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.bracket-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 40px;
}

.bracket-match-card {
  padding: 14px 16px;
}

.bracket-match-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.bracket-match-num {
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}

.bracket-projected-badge {
  font-size: 0.68rem;
  padding: 2px 8px;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 10px;
  letter-spacing: 0.02em;
}

.bracket-slot-label {
  font-size: 0.73rem;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.bracket-player-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bracket-player-row {
  display: grid;
  grid-template-columns: 58px 1fr 28px 1fr;
  align-items: center;
  gap: 4px;
  font-size: 0.84rem;
  padding: 1px 0;
}

.bracket-player-name {
  font-weight: 600;
  font-size: 0.8rem;
}

.bracket-team {
  display: flex;
  align-items: center;
  gap: 5px;
}

.bracket-team-owned {
  font-weight: 700;
}

.bracket-vs {
  color: var(--text-muted);
  font-size: 0.72rem;
  text-align: center;
}

.bracket-flag {
  width: 18px;
  height: 13px;
  object-fit: cover;
  border-radius: 1px;
  flex-shrink: 0;
}

.bracket-consensus {
  font-size: 0.84rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 0;
}

.bracket-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  padding: 48px 20px;
}
```

- [ ] **Step 2: Add CSS link to index.html**

In `index.html`, find the line:
```html
  <link rel="stylesheet" href="css/responsive.css">
```
Insert before it:
```html
  <link rel="stylesheet" href="css/bracket.css">
```

- [ ] **Step 3: Add Bracket tab button to nav**

In `index.html`, find the tab bar (around line 91). After the Battle Map button:
```html
      <button type="button" class="tab-btn" data-tab="map" onclick="switchTab('map')"><span class="emoji">🌐</span><span class="tab-label"> Battle Map</span></button>
```
Add after it (before the shooter button):
```html
      <button type="button" class="tab-btn" data-tab="bracket" onclick="switchTab('bracket')"><span class="emoji">📊</span><span class="tab-label"> Bracket</span></button>
```

- [ ] **Step 4: Add bracket section div to index.html**

In `index.html`, find:
```html
    <div class="section-profile" id="sectionProfile"></div>
```
Add after it:
```html
    <div class="section-bracket" id="sectionBracket"></div>
```

- [ ] **Step 5: Add script tag to index.html**

In `index.html`, find:
```html
  <script src="js/render-user-profile.js"></script>
```
Add after it:
```html
  <script src="js/render-bracket.js"></script>
```

- [ ] **Step 6: Update switchTab() in main.js**

In `js/main.js`, find the block of `classList.toggle` calls. After:
```js
  document.getElementById('sectionProfile').classList.toggle('active', tab === 'profile');
```
Add:
```js
  document.getElementById('sectionBracket').classList.toggle('active', tab === 'bracket');
```

Then find:
```js
  if (tab === 'shooter') initShooter();
```
Add before it:
```js
  if (tab === 'bracket') renderBracket();
```

- [ ] **Step 7: Add 'bracket' to hash routing**

In `js/render-user-profile.js`, find line ~613:
```js
  const validTabs = ['players', 'matches', 'groups', 'leaderboard', 'teams', 'map', 'shooter', 'myteams', 'predictions'];
```
Replace with:
```js
  const validTabs = ['players', 'matches', 'groups', 'leaderboard', 'teams', 'map', 'shooter', 'myteams', 'predictions', 'bracket'];
```

- [ ] **Step 8: Create placeholder render-bracket.js**

Create `/Users/stevenfrostwick/Documents/world-cup-sweeps-2026/js/render-bracket.js` with just enough to not throw:

```js
// ── BRACKET STATE ──
let bracketRound = 'R32';

function setBracketRound(round) {
  bracketRound = round;
  renderBracket();
}

function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;
  section.innerHTML = '<p class="bracket-empty">Bracket loading…</p>';
}
```

- [ ] **Step 9: Verify in browser**

Open `index.html`. Click the "Bracket" tab in the nav — it should become active and the section should show "Bracket loading…". Check the URL updates to `#/bracket`. No console errors.

- [ ] **Step 10: Commit**

```bash
git add css/bracket.css index.html js/main.js js/render-user-profile.js js/render-bracket.js
git commit -m "feat: scaffold bracket tab — nav, section div, empty renderer"
```

---

## Task 3: calcProjectedStandings(playerName)

**Files:**
- Modify: `js/render-bracket.js`

**Interfaces:**
- Consumes: `matchData` global (array of `{date, team1, team2, group, score1, score2, isComplete}`), `predLookup` global (`{matchId: [{player_name, home, away}]}`), `matchIdByTeamDate` global (`{"team1|team2|date": matchId}`), `FIFA_RANK` global
- Produces: `calcProjectedStandings(playerName)` → `{ A: [{team, pts, gd, gf, h2h}], B: [...], ... }` sorted by standing (index 0 = 1st place)

This function is the core of the bracket view. It simulates each group's final table from a given player's perspective.

- [ ] **Step 1: Add helper — group matches by group letter**

Add to `js/render-bracket.js` before `renderBracket()`:

```js
function calcProjectedStandings(playerName) {
  // Bucket group stage matches by group letter
  const groupMatches = {};
  for (const m of matchData) {
    if (!m.group) continue;
    if (!groupMatches[m.group]) groupMatches[m.group] = [];
    groupMatches[m.group].push(m);
  }

  const result = {};

  for (const [letter, matches] of Object.entries(groupMatches)) {
    // Initialise record for each team in this group
    const rec = {};
    for (const m of matches) {
      if (!rec[m.team1]) rec[m.team1] = { team: m.team1, pts: 0, gd: 0, gf: 0, h2h: {} };
      if (!rec[m.team2]) rec[m.team2] = { team: m.team2, pts: 0, gd: 0, gf: 0, h2h: {} };
    }

    // Apply each match
    for (const m of matches) {
      let s1, s2;
      if (m.isComplete) {
        s1 = m.score1;
        s2 = m.score2;
      } else {
        // Look up this player's prediction
        const mid = matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`];
        const preds = predLookup[mid] || [];
        const pred = preds.find(p => p.player_name === playerName);
        if (pred && pred.home !== undefined && pred.away !== undefined) {
          s1 = pred.home;
          s2 = pred.away;
        } else {
          s1 = 0; s2 = 0; // no prediction → assume 0-0
        }
      }

      const t1 = rec[m.team1];
      const t2 = rec[m.team2];

      // Overall stats
      t1.gf += s1; t1.gd += (s1 - s2);
      t2.gf += s2; t2.gd += (s2 - s1);

      // H2H tracking (each entry tracks stats vs that specific opponent)
      if (!t1.h2h[m.team2]) t1.h2h[m.team2] = { pts: 0, gd: 0, gf: 0 };
      if (!t2.h2h[m.team1]) t2.h2h[m.team1] = { pts: 0, gd: 0, gf: 0 };

      if (s1 > s2) {
        t1.pts += 3;
        t1.h2h[m.team2].pts += 3;
        t1.h2h[m.team2].gd += (s1 - s2); t1.h2h[m.team2].gf += s1;
        t2.h2h[m.team1].gd += (s2 - s1); t2.h2h[m.team1].gf += s2;
      } else if (s2 > s1) {
        t2.pts += 3;
        t2.h2h[m.team1].pts += 3;
        t2.h2h[m.team1].gd += (s2 - s1); t2.h2h[m.team1].gf += s2;
        t1.h2h[m.team2].gd += (s1 - s2); t1.h2h[m.team2].gf += s1;
      } else {
        t1.pts += 1; t2.pts += 1;
        t1.h2h[m.team2].pts += 1; t1.h2h[m.team2].gf += s1;
        t2.h2h[m.team1].pts += 1; t2.h2h[m.team1].gf += s2;
      }
    }

    // Sort: group teams by points tier, apply tiebreakers within each tier
    const teams = Object.values(rec);
    result[letter] = sortGroupStandings(teams);
  }

  return result;
}

// Sort a group's teams with full 2026 tiebreaker chain.
// Note: for 3-way+ ties the H2H step is applied across all tied teams;
// in genuinely equal 3-way ties FIFA would draw lots — FIFA_RANK used instead.
function sortGroupStandings(teams) {
  // Group by points first
  const byPts = {};
  for (const t of teams) {
    if (!byPts[t.pts]) byPts[t.pts] = [];
    byPts[t.pts].push(t);
  }

  const sorted = [];
  for (const pts of Object.keys(byPts).map(Number).sort((a, b) => b - a)) {
    const tier = byPts[pts];
    if (tier.length === 1) {
      sorted.push(tier[0]);
    } else {
      sorted.push(...sortByTiebreakers(tier));
    }
  }
  return sorted;
}

function sortByTiebreakers(teams) {
  // Compute H2H totals among just these teams
  const h2h = {};
  for (const t of teams) {
    h2h[t.team] = { pts: 0, gd: 0, gf: 0 };
    for (const opp of teams) {
      if (opp.team === t.team) continue;
      const r = t.h2h[opp.team] || { pts: 0, gd: 0, gf: 0 };
      h2h[t.team].pts += r.pts;
      h2h[t.team].gd  += r.gd;
      h2h[t.team].gf  += r.gf;
    }
  }

  return [...teams].sort((a, b) => {
    // Steps 1-3: H2H among tied teams
    if (h2h[b.team].pts !== h2h[a.team].pts) return h2h[b.team].pts - h2h[a.team].pts;
    if (h2h[b.team].gd  !== h2h[a.team].gd)  return h2h[b.team].gd  - h2h[a.team].gd;
    if (h2h[b.team].gf  !== h2h[a.team].gf)  return h2h[b.team].gf  - h2h[a.team].gf;
    // Steps 4-5: overall group stats
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // Step 6-7 proxy: FIFA rank (lower = better)
    return (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999);
  });
}
```

- [ ] **Step 2: Verify in browser console**

Open `index.html`, wait for data to load (matches tab shows), then open DevTools console:

```js
// Should return 4 teams for Group A sorted by standing
const s = calcProjectedStandings('Anton');
console.table(s['A'].map(t => ({ team: t.team, pts: t.pts, gd: t.gd, gf: t.gf })));
// Group A has: Mexico (A), South Korea (A), Czech Republic (A), South Africa (A)
// With actual results loaded, Mexico and South Korea both have results
// Expected: Mexico 1st (most pts), then by tiebreakers

// Check all 12 groups are present
console.log(Object.keys(s).sort()); // → ['A','B','C','D','E','F','G','H','I','J','K','L']

// Check each group has exactly 4 teams
Object.entries(s).forEach(([g, teams]) => {
  if (teams.length !== 4) console.error(`Group ${g} has ${teams.length} teams`);
});
console.log('all groups have 4 teams ✓');
```

- [ ] **Step 3: Commit**

```bash
git add js/render-bracket.js
git commit -m "feat: calcProjectedStandings — group table simulation per player"
```

---

## Task 4: calcProjectedQualifiers(playerName)

**Files:**
- Modify: `js/render-bracket.js`

**Interfaces:**
- Consumes: `calcProjectedStandings(playerName)`, `FIFA_RANK`
- Produces: `calcProjectedQualifiers(playerName)` → `{ winners: {A:'Spain',...}, runners: {A:'Uruguay',...}, qualifyingThirds: [{team, group, pts, gd, gf}, ...] }` where `qualifyingThirds` is sorted best-to-worst, length 8

- [ ] **Step 1: Add calcProjectedQualifiers**

Add to `js/render-bracket.js` after `sortByTiebreakers`:

```js
function calcProjectedQualifiers(playerName) {
  const standings = calcProjectedStandings(playerName);
  const winners = {}, runners = {}, allThirds = [];

  for (const [letter, teams] of Object.entries(standings)) {
    winners[letter] = teams[0].team;
    runners[letter] = teams[1].team;
    // Third-placed team with their group for slot assignment
    allThirds.push({ ...teams[2], group: letter });
  }

  // Rank all 12 third-placed teams: pts → GD → GF → FIFA_RANK
  allThirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd  !== a.gd)  return b.gd  - a.gd;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    return (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999);
  });

  return {
    winners,
    runners,
    qualifyingThirds: allThirds.slice(0, 8),
  };
}
```

- [ ] **Step 2: Verify in browser console**

```js
const q = calcProjectedQualifiers('Anton');

// Should have all 12 groups
console.log(Object.keys(q.winners).sort()); // ['A','B','C','D','E','F','G','H','I','J','K','L']

// Should have exactly 8 qualifying thirds
console.log(q.qualifyingThirds.length); // → 8

// Each qualifying third should have a group letter
q.qualifyingThirds.forEach(t => {
  if (!t.group) console.error('missing group on', t);
});
console.log('all thirds have groups ✓');

// Groups should all be different
const groups = q.qualifyingThirds.map(t => t.group);
console.log('qualifying third groups:', groups);
// Should be 8 distinct letters from A-L

// Spot-check: with real results so far, Morocco (top-ranked 3rd?) should be in there
console.log('3rd place teams:', q.qualifyingThirds.map(t => `${t.team}(${t.group})`).join(', '));
```

- [ ] **Step 3: Commit**

```bash
git add js/render-bracket.js
git commit -m "feat: calcProjectedQualifiers — best-8 thirds ranked by pts/GD/GF/FIFA"
```

---

## Task 5: calcProjectedBracket(playerName) + R32 constants

**Files:**
- Modify: `js/render-bracket.js` (add constants at top, add function)

**Interfaces:**
- Consumes: `calcProjectedQualifiers(playerName)`, `R32_SLOTS` constant
- Produces: `calcProjectedBracket(playerName)` → `{ [matchNumber: number]: {home: string|null, away: string|null} }` for all 16 R32 matches, `R32_SLOTS` constant, `KNOCKOUT_BRACKET` constant

The third-placed team slot assignment uses a greedy algorithm: for each R32 slot (in match number order), assign the highest-ranked unassigned qualifying third whose group is in that slot's `thirdPool`. This approximates FIFA's Annex C behaviour and will be correct for the majority of realistic group outcomes.

- [ ] **Step 1: Add R32_SLOTS and KNOCKOUT_BRACKET constants**

At the very top of `js/render-bracket.js` (before `let bracketRound`), add:

```js
// ── R32 BRACKET STRUCTURE (FIFA 2026) ──
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

// Subsequent round pairings — winner references (W73 = winner of match 73)
const KNOCKOUT_BRACKET = [
  { match: 89,  round: 'R16',   home: 'W73', away: 'W75' },
  { match: 90,  round: 'R16',   home: 'W74', away: 'W77' },
  { match: 91,  round: 'R16',   home: 'W76', away: 'W78' },
  { match: 92,  round: 'R16',   home: 'W79', away: 'W80' },
  { match: 93,  round: 'R16',   home: 'W83', away: 'W84' },
  { match: 94,  round: 'R16',   home: 'W81', away: 'W82' },
  { match: 95,  round: 'R16',   home: 'W86', away: 'W88' },
  { match: 96,  round: 'R16',   home: 'W85', away: 'W87' },
  { match: 97,  round: 'QF',    home: 'W89', away: 'W90' },
  { match: 98,  round: 'QF',    home: 'W93', away: 'W94' },
  { match: 99,  round: 'QF',    home: 'W91', away: 'W92' },
  { match: 100, round: 'QF',    home: 'W95', away: 'W96' },
  { match: 101, round: 'SF',    home: 'W97', away: 'W98' },
  { match: 102, round: 'SF',    home: 'W99', away: 'W100' },
  { match: 103, round: '3P',    home: 'L101', away: 'L102' },
  { match: 104, round: 'Final', home: 'W101', away: 'W102' },
];
```

- [ ] **Step 2: Add calcProjectedBracket**

Add to `js/render-bracket.js` after `calcProjectedQualifiers`:

```js
function calcProjectedBracket(playerName) {
  const { winners, runners, qualifyingThirds } = calcProjectedQualifiers(playerName);
  const bracket = {};

  // Greedy third-place slot assignment: iterate slots in match order,
  // assign the best-ranked unassigned qualifying third whose group is eligible.
  const thirdsLeft = [...qualifyingThirds]; // already sorted best-to-worst

  function resolvePos(pos, thirdPool) {
    if (pos === '3rd') {
      const idx = thirdsLeft.findIndex(t => thirdPool.includes(t.group));
      if (idx === -1) return null;
      const t = thirdsLeft.splice(idx, 1)[0];
      return t.team;
    }
    const placement = pos[0]; // '1' or '2'
    const group = pos[1];     // 'A'-'L'
    return placement === '1' ? (winners[group] || null)
                             : (runners[group]  || null);
  }

  for (const slot of R32_SLOTS) {
    bracket[slot.match] = {
      home: resolvePos(slot.home, slot.thirdPool),
      away: resolvePos(slot.away, slot.thirdPool),
    };
  }

  return bracket;
}
```

- [ ] **Step 3: Verify in browser console**

```js
const b = calcProjectedBracket('Anton');

// Should have all 16 R32 match numbers
console.log(Object.keys(b).map(Number).sort((a,b)=>a-b));
// → [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88]

// Each slot should have home and away (may be null if prediction data incomplete)
Object.entries(b).forEach(([match, pair]) => {
  if (pair.home === undefined || pair.away === undefined) {
    console.error(`Match ${match} missing team`, pair);
  }
});
console.log('all slots resolved ✓');

// Spot-check: Match 73 is 2A vs 2B — runners-up of groups A and B
// With current results: Group A runner-up and Group B runner-up
console.log('Match 73:', b[73]); // { home: '...', away: '...' }

// Spot-check: Check no third-place team appears twice
const thirdTeams = [];
R32_SLOTS.filter(s => s.away === '3rd').forEach(s => {
  thirdTeams.push(b[s.match].away);
});
const unique = new Set(thirdTeams);
console.log('3rd place assignments (should be 8 unique):', thirdTeams);
console.log('unique count:', unique.size); // → 8
```

- [ ] **Step 4: Commit**

```bash
git add js/render-bracket.js
git commit -m "feat: R32_SLOTS, KNOCKOUT_BRACKET constants + calcProjectedBracket"
```

---

## Task 6: renderBracket() + CSS polish

**Files:**
- Modify: `js/render-bracket.js` (replace placeholder `renderBracket`)

**Interfaces:**
- Consumes: `R32_SLOTS`, `calcProjectedBracket(playerName)` for each player in `PLAYERS`, `teamOwner`, `teamIso`, `flagUrl()`, `bracketRound` state, `matchData` (to detect real knockout matches)
- Produces: `renderBracket()` — populates `#sectionBracket` with round selector + match cards

- [ ] **Step 1: Replace renderBracket() with full implementation**

In `js/render-bracket.js`, replace the placeholder `renderBracket` function with:

```js
function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;

  // Detect which rounds have real knockout matches in the DB (Phase 2)
  const realRounds = new Set(matchData.filter(m => m.round).map(m => m.round));
  const hasRealR32 = realRounds.has('R32');

  // Round selector
  const rounds = [
    { id: 'R32',   label: 'R32' },
    { id: 'R16',   label: 'R16' },
    { id: 'QF',    label: 'QF' },
    { id: 'SF',    label: 'SF' },
    { id: 'Final', label: 'Final' },
  ];

  const selectorHtml = `
    <div class="bracket-round-selector">
      ${rounds.map(r => {
        const available = r.id === 'R32' || realRounds.has(r.id);
        return `<button class="bracket-round-btn${r.id === bracketRound ? ' active' : ''}${!available ? ' disabled' : ''}"
          onclick="${available ? `setBracketRound('${r.id}')` : ''}">${r.label}</button>`;
      }).join('')}
    </div>`;

  // Calculate all players' brackets
  const allBrackets = {};
  for (const player of PLAYERS) {
    allBrackets[player] = calcProjectedBracket(player);
  }

  // Render R32 cards (Phase 1 — projected)
  let cardsHtml = '';

  if (bracketRound === 'R32' && !hasRealR32) {
    cardsHtml = R32_SLOTS.map(slot => {
      const date = new Date(slot.date + 'T12:00:00');
      const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

      const homeTeams = PLAYERS.map(p => allBrackets[p][slot.match]?.home);
      const awayTeams  = PLAYERS.map(p => allBrackets[p][slot.match]?.away);
      const allAgree = homeTeams.every(t => t === homeTeams[0]) && awayTeams.every(t => t === awayTeams[0]) && homeTeams[0];

      const slotLabel = `${slot.home} vs ${slot.away === '3rd' ? '3rd place qualifier' : slot.away}`;

      let rowsHtml;
      if (allAgree) {
        rowsHtml = `<div class="bracket-consensus">
          All: ${bracketTeam(homeTeams[0])} vs ${bracketTeam(awayTeams[0])}
        </div>`;
      } else {
        rowsHtml = PLAYERS.map(p => {
          const home = allBrackets[p][slot.match]?.home;
          const away = allBrackets[p][slot.match]?.away;
          const ownsHome = home && teamOwner[home] === p;
          const ownsAway = away && teamOwner[away] === p;
          return `<div class="bracket-player-row">
            <span class="bracket-player-name ${ownerColour(p)}">${p}</span>
            <span class="bracket-team${ownsHome ? ' bracket-team-owned' : ''}">${home ? bracketTeam(home) : '?'}</span>
            <span class="bracket-vs">vs</span>
            <span class="bracket-team${ownsAway ? ' bracket-team-owned' : ''}">${away ? bracketTeam(away) : '?'}</span>
          </div>`;
        }).join('');
      }

      return `<div class="bracket-match-card card-base">
        <div class="bracket-match-header">
          <span class="bracket-match-num">Match ${slot.match} · ${dateStr}</span>
          <span class="bracket-projected-badge">Projected</span>
        </div>
        <div class="bracket-slot-label">${slotLabel}</div>
        <div class="bracket-player-rows">${rowsHtml}</div>
      </div>`;
    }).join('');
  } else if (bracketRound === 'R32' && hasRealR32) {
    // Phase 2: show real R32 fixtures from matchData
    const realR32 = matchData.filter(m => m.round === 'R32').sort((a, b) => a.date.localeCompare(b.date));
    cardsHtml = realR32.map(m => {
      const date = new Date(m.date + 'T12:00:00');
      const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      return `<div class="bracket-match-card card-base">
        <div class="bracket-match-header">
          <span class="bracket-match-num">${dateStr}</span>
        </div>
        <div class="bracket-player-rows">
          <div class="bracket-consensus">${bracketTeam(m.team1)} vs ${bracketTeam(m.team2)}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    cardsHtml = `<p class="bracket-empty">Available once ${bracketRound} fixtures are confirmed.</p>`;
  }

  section.innerHTML = selectorHtml + `<div class="bracket-cards">${cardsHtml}</div>`;
}

// Render a team name with its flag
function bracketTeam(teamName) {
  const iso = teamIso[teamName];
  const flag = iso ? `<img src="${flagUrl(iso)}" class="bracket-flag" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  return `<span class="bracket-team">${flag}${escapeHtml(teamName)}</span>`;
}

// Map player name to owner CSS colour class
function ownerColour(playerName) {
  return ownerColors[playerName] || '';
}
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Click the "Bracket" tab.

Check:
- 16 match cards appear for R32
- Each card shows "Match 73 · Sun 28 Jun" style header
- Each card shows "Projected" badge
- Each card shows all 6 player rows with team names and flags
- Player names are coloured (Anton = green, Chris = blue, etc.)
- Teams a player owns appear in bold
- Where all 6 agree, a single "All: 🇪🇸 Spain vs 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England" row shows
- R16 / QF / SF / Final buttons are greyed out and unclickable
- No console errors

Also check edge case: open DevTools console and run:
```js
// Verify bracket differs between players with different predictions
const bAnton  = calcProjectedBracket('Anton');
const bLaurie = calcProjectedBracket('Laurie');
const diffs = R32_SLOTS.filter(s => bAnton[s.match]?.home !== bLaurie[s.match]?.home || bAnton[s.match]?.away !== bLaurie[s.match]?.away);
console.log('slots where Anton and Laurie differ:', diffs.map(s => s.match));
// Should show some differences (players predict differently)
```

- [ ] **Step 3: Commit**

```bash
git add js/render-bracket.js
git commit -m "feat: renderBracket — R32 projected match cards, all-player rows, consensus collapse"
```

---

## Task 7: Phase 2 — round column migration + loadData() update

This task prepares the app to switch from projections to real fixtures once the group stage ends (around July 1) and knockout matches are entered into Supabase.

**Files:**
- Modify: `js/data.js` (Supabase query + matchData mapping)

**Interfaces:**
- Produces: `matchData` objects gain a `round` field (`string | null`) — `null` for group stage matches, `'R32'`/`'R16'`/`'QF'`/`'SF'`/`'3P'`/`'Final'` for knockout matches

- [ ] **Step 1: Run SQL migration in Supabase**

In the Supabase dashboard → SQL Editor, run:

```sql
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round TEXT;
```

This is non-destructive — existing rows get `round = null`, which is correct for group stage matches. New knockout matches inserted after this point should have their `round` value set when inserting.

- [ ] **Step 2: Update loadData() Supabase query**

In `js/data.js`, find the primary matches query (around line 57):

```js
  let { data: m, error } = await sb.from('matches').select(`
    match_date, kickoff_time, tz_offset,
    home:home_team_id(name), away:away_team_id(name),
    group_letter, home_score, away_score, tv_channel,
    prob_home, prob_draw, prob_away, is_complete
  `).order('match_date').order('kickoff_time');
```

Replace with:

```js
  let { data: m, error } = await sb.from('matches').select(`
    match_date, kickoff_time, tz_offset,
    home:home_team_id(name), away:away_team_id(name),
    group_letter, home_score, away_score, tv_channel,
    prob_home, prob_draw, prob_away, is_complete, round
  `).order('match_date').order('kickoff_time');
```

Also update the fallback query (around line 68) to include `round`:

```js
    const retry = await sb.from('matches').select(`
      match_date, kickoff_time, tz_offset,
      home:home_team_id(name), away:away_team_id(name),
      group_letter, home_score, away_score, tv_channel,
      prob_home, prob_draw, prob_away, round
    `).order('match_date').order('kickoff_time');
```

- [ ] **Step 3: Add round to matchData objects**

In `js/data.js`, find the `matchData = m.map(r => {` block (around line 79). Add `round` to the returned object. Find:

```js
      isComplete,
    };
```

Replace with:

```js
      isComplete,
      round: r.round || null,
    };
```

- [ ] **Step 4: Verify in browser console**

Open `index.html`, open DevTools console:

```js
// All group stage matches should have round = null
const groupMatches = matchData.filter(m => m.group);
const allNull = groupMatches.every(m => m.round === null);
console.log('all group matches have round=null:', allNull); // → true

// No errors loading data
console.log('matchData length:', matchData.length); // → 72 (group stage only for now)
```

- [ ] **Step 5: Commit**

```bash
git add js/data.js
git commit -m "feat: add round field to matchData for Phase 2 knockout fixture detection"
```

---

## How to Insert Knockout Matches (Phase 2 — from July 4)

When real R32 fixtures are confirmed (after June 30 when group stage ends), insert them into Supabase via Table Editor or SQL. Example for one match:

```sql
SELECT ins_match_ko('2026-07-04','20:00',-5,'Spain','Uruguay','R32',null,null,'BBC One',69,17,14);
```

Or manually in Table Editor: set `home_team_id`, `away_team_id`, `match_date`, `kickoff_time`, `tz_offset`, `tv_channel`, `prob_home`, `prob_draw`, `prob_away`, `round = 'R32'`, leave `group_letter` null, leave `home_score`/`away_score` null.

Once real R32 matches exist in the DB, `renderBracket()` automatically switches from projected to real fixtures (the `hasRealR32` check in `renderBracket()`).

---

## Self-Review

**Spec coverage:**
- ✅ FIFA_RANK hardcoded in config.js (Task 1)
- ✅ calcProjectedStandings with full tiebreaker chain (Task 3)
- ✅ calcProjectedQualifiers — 12 winners/runners + best 8 thirds (Task 4)
- ✅ calcProjectedBracket — 16 R32 slots with greedy third-place assignment (Task 5)
- ✅ R32_SLOTS and KNOCKOUT_BRACKET hardcoded constants (Task 5)
- ✅ renderBracket — round selector, match cards, all-player rows, consensus collapse (Task 6)
- ✅ "Projected" badge removed when real fixtures in DB (Task 6)
- ✅ Phase 2 DB migration + loadData() update (Task 7)
- ✅ New Bracket tab visible to all users (Task 2)
- ✅ Mobile: cards full-width, round selector scrolls (CSS in Task 2)
- ✅ Hash routing for #/bracket (Task 2, Step 7)

**Placeholder scan:** None found. Every step has concrete code.

**Type consistency:**
- `calcProjectedStandings` returns `{ [letter]: [{team, pts, gd, gf, h2h}] }` — consumed correctly by `calcProjectedQualifiers`
- `calcProjectedQualifiers` returns `{ winners, runners, qualifyingThirds }` — consumed correctly by `calcProjectedBracket`
- `calcProjectedBracket` returns `{ [matchNum]: {home, away} }` — consumed correctly by `renderBracket`
- `bracketTeam(teamName)` returns HTML string — used in template literals in `renderBracket`
- `matchData[].round` is `string | null` — consistent between loadData() and renderBracket() check
