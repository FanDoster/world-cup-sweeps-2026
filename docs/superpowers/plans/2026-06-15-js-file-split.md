# JS File Split Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 4,390-line `index.html` into 14 focused JS files using plain `<script src>` tags, with no build step and no ES modules.

**Architecture:** Each JS file is loaded via a `<script src>` tag in `index.html`. All variables remain global (no import/export). Files are ordered so dependencies load first. `matchData` is converted from positional arrays to named-field objects in `data.js`, and all consumers are updated.

**Tech Stack:** Vanilla JS, Supabase CDN, D3/topojson CDNs, Surge for deployment.

---

## Reference: matchData field mapping

The current positional array `[date, time, tz, team1, team2, group, score1, score2, channel, prob1, probD, prob2]` maps to named fields:

| Old index | New field |
|-----------|-----------|
| `m[0]` | `m.date` |
| `m[1]` | `m.time` |
| `m[2]` | `m.tz` |
| `m[3]` | `m.team1` |
| `m[4]` | `m.team2` |
| `m[5]` | `m.group` |
| `m[6]` | `m.score1` |
| `m[7]` | `m.score2` |
| `m[8]` | `m.channel` |
| `m[9]` | `m.prob1` |
| `m[10]` | `m.probD` |
| `m[11]` | `m.prob2` |

---

## Task 1: Merge the two CSS blocks

**Files:**
- Modify: `index.html:10–1123` (first `<style>` block)
- Modify: `index.html:1124–1498` (second `<style>` block — the auth block)

The auth `<style>` block starts at line 1124 with `<!-- ── AUTH STYLES ── -->`.

- [ ] **Step 1: Move auth styles into the main style block**

In `index.html`, find the closing `</style>` of the first style block (around line 1123) and the `<!-- ── AUTH STYLES ── -->` comment followed by `<style>` (line 1124) and closing `</style>` (around line 1498). Remove the closing `</style>` of block 1 and the opening `<!-- ── AUTH STYLES ── --> <style>` of block 2, leaving one continuous `<style>` block. The result should be a single `<style>` tag ending where the auth block's `</style>` was.

- [ ] **Step 2: Verify**

Open `index.html` directly in the browser. Check that the sign-in modal, sign-up modal, and auth bar still look correct. There should be exactly one `<style>` tag in the `<head>`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: merge two CSS blocks into one"
```

---

## Task 2: Create js/config.js

**Files:**
- Create: `js/config.js`
- Modify: `index.html` (add script tag, remove moved code)

Move the Supabase client setup, `PLAYERS` constant, `ownerColors`, `ownerHexColors`, `VENUE_DATA`, and `TERRITORY_DATA` out of `index.html`'s `<script>` block.

- [ ] **Step 1: Create `js/config.js`**

```js
const SB_URL = 'https://nkztkzrkbeacyltidqwr.supabase.co';
const SB_KEY = 'sb_publishable_gSNbsrsq5ZV0glBJBeCZmQ_kBajhUPn';
const sb = supabase.createClient(SB_URL, SB_KEY);

const PLAYERS = ['Anton', 'Chris', 'Dan', 'Laurie', 'Pat', 'Steven'];

const ownerColors = {
  Anton: 'owner-anton', Chris: 'owner-chris', Dan: 'owner-dan',
  Laurie: 'owner-laurie', Pat: 'owner-pat', Steven: 'owner-steven',
};

const ownerHexColors = {
  Anton:  '#39d353',
  Chris:  '#3b82f6',
  Dan:    '#22c55e',
  Laurie: '#a855f7',
  Pat:    '#f97316',
  Steven: '#ef4444',
};
```

Then copy `VENUE_DATA` (lines 1730–1795) and `TERRITORY_DATA` (lines 1806–1854) verbatim into `js/config.js` after the above.

- [ ] **Step 2: Add script tag to `index.html`**

In `index.html`, just before the existing `<script>` block (line 1723), add:

```html
<script src="js/config.js"></script>
```

Note: this must go *after* the Supabase CDN script tag (line 1719), since `config.js` calls `supabase.createClient`.

- [ ] **Step 3: Remove moved code from `index.html`**

Delete from `index.html`'s `<script>` block:
- Lines 1724–1727 (`SB_URL`, `SB_KEY`, `sb`)
- Lines 1729–1795 (`VENUE_DATA`)
- Lines 1797–1804 (`ownerHexColors`)
- Lines 1806–1854 (`TERRITORY_DATA`)
- Lines 1991–1994 (`ownerColors`)

Leave `flagUrl` in `index.html` for now — it moves to `utils.js` in Task 3.

- [ ] **Step 4: Verify**

Open `index.html`. The app should load normally. Check the browser console for errors. The Players tab and leaderboard should still show owner colours.

- [ ] **Step 5: Commit**

```bash
git add js/config.js index.html
git commit -m "refactor: extract config constants to js/config.js"
```

---

## Task 3: Create js/utils.js

**Files:**
- Create: `js/utils.js`
- Modify: `index.html` (add script tag, remove moved code)

Move all pure helper functions: date/time utilities, `flagUrl`, `ordinal`, `escapeHtml`.

- [ ] **Step 1: Create `js/utils.js`**

Copy these functions verbatim from `index.html` into `js/utils.js`:

- `flagUrl` (lines 1996–1998)
- `formatDateLabel` (lines 2125–2138)
- `toDate` (lines 2140–2146)
- `formatLocalTime` (lines 2148–2151)
- `getCountdown` (lines 2153–2172)
- `formatDateHeader` (lines 2174–2187)
- `ordinal` (lines 2419–2422)
- `escapeHtml` (lines 2420–2423 — check actual position with grep)

- [ ] **Step 2: Add script tag to `index.html`**

Add after the `js/config.js` script tag:

```html
<script src="js/utils.js"></script>
```

- [ ] **Step 3: Remove moved functions from `index.html`**

Delete the function bodies for all 8 functions listed above from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html`. Match countdowns, date labels, and time formatting should all still work on the Matches tab.

- [ ] **Step 5: Commit**

```bash
git add js/utils.js index.html
git commit -m "refactor: extract date/time utils to js/utils.js"
```

---

## Task 4: Create js/auth.js

**Files:**
- Create: `js/auth.js`
- Modify: `index.html` (add script tag, remove moved code)

Move all auth state and functions.

- [ ] **Step 1: Create `js/auth.js`**

Copy verbatim from `index.html`:

- `let currentSession = null;` (line 1872)
- `let currentProfile = null;` (line 1873)
- `restoreSession` (lines 1875–1886)
- `updateAuthBar` (lines 1888–1904)
- `showSignIn`, `showSignUp`, `closeModals` (lines 1906–1908)
- `showJokerNotification` (lines 1910–1913)
- `dismissJokerNotification` (lines 1914–1917)
- `doSignIn` (lines 1919–1931)
- `doSignUp` (lines 1933–1975)
- `doSignOut` (lines 1976–1983)

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/utils.js`:

```html
<script src="js/auth.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete all the auth variables and functions listed above from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html`. Sign in with a test account. The auth bar should show the player name. Sign out should work. The Joker notification popup should appear on sign-in.

- [ ] **Step 5: Commit**

```bash
git add js/auth.js index.html
git commit -m "refactor: extract auth to js/auth.js"
```

---

## Task 5: Create js/data.js with named matchData objects

**Files:**
- Create: `js/data.js`
- Modify: `index.html` (add script tag, remove moved code)

This is the most impactful task. `matchData` changes from positional arrays to named-field objects here.

- [ ] **Step 1: Create `js/data.js`**

Copy the global state declarations from `index.html` (lines 1855–1870 for globe state, lines 1984–1989 for data state), then `loadData` and `loadPredData`. In `loadData`, replace the array `.map()` with a named-object version, and update `matchByKey` to use named fields:

```js
// ── GLOBE STATE (used by globe.js) ──
let territoryFeatures = [];
let territoryControl  = [];
let matchByKey = {};
let globeInitialised = false;
let worldGeoData = null;
let usStatesTopoData = null;
let globeRotation = [96.3, -35.1, 0];
let autoRotateRaf = null;
let isDragging = false;
let venuePanelOpen = false;
let globeIntroPlaying = false;
let driftBase = [96.3, -35.1, 0];

// ── DATA STATE ──
let people = {};
let groups = {};
let teamOwner = {};
let teamIso = {};
let teamWinPct = {};
let matchData = [];

let predLookup = {};
let matchIdByTeamDate = {};
let predPointsByPlayer = {};
let jokersEnabled = false;
let commentsEnabled = false;
let featureProbeDone = false;
```

Then copy `loadData` verbatim but replace the `matchData = m.map(...)` section (lines 2035–2040) with:

```js
matchData = m.map(r => ({
  date:    r.match_date,
  time:    r.kickoff_time.substring(0, 5),
  tz:      r.tz_offset,
  team1:   r.home.name,
  team2:   r.away.name,
  group:   r.group_letter,
  score1:  r.home_score,
  score2:  r.away_score,
  channel: r.tv_channel,
  prob1:   r.prob_home,
  probD:   r.prob_draw,
  prob2:   r.prob_away,
}));
```

And replace the `matchByKey` build (lines 2043–2046) with:

```js
matchByKey = {};
for (const m of matchData) {
  matchByKey[`${m.team1}|${m.team2}|${m.date}`] = m;
}
```

Then copy `loadPredData` verbatim (lines 2068–2121) — it doesn't use positional indices.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/auth.js`:

```html
<script src="js/data.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete all state variables and both load functions from the `<script>` block (lines 1855–1870 and 1984–2121).

- [ ] **Step 4: Verify**

Open `index.html`. The Matches, Groups, and Players tabs should all load with data. Open the browser console — no errors. The matchData is now named objects, but render functions in `index.html` still use `m[N]` indices — they will break in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add js/data.js index.html
git commit -m "refactor: extract data layer to js/data.js, convert matchData to named objects"
```

---

## Task 6: Create js/render-matches.js

**Files:**
- Create: `js/render-matches.js`
- Modify: `index.html` (add script tag, remove moved code)

Move the matches filter state and `renderMatches`. Update `m[N]` → `m.field` throughout.

- [ ] **Step 1: Create `js/render-matches.js`**

Copy `matchFilter`, `teamScheduleFilter`, `matchTeamFilter` state variables (lines 2188–2190) and `setMatchFilter`, `setMatchTeamFilter`, `renderMatches` (lines 2192–2353).

Update `renderMatches` — replace the `.map()` that converts positional arrays to named fields (lines 2221–2226):

```js
// OLD:
let all = matchData
  .map(m => {
    const kickoff = toDate(m[0], m[1], m[2]);
    return { date: m[0], time: m[1], tz: m[2], team1: m[3], team2: m[4], group: m[5], score1: m[6], score2: m[7], channel: m[8], prob1: m[9], probD: m[10], prob2: m[11], kickoff };
  })
  .sort((a, b) => a.kickoff - b.kickoff);

// NEW:
let all = matchData
  .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
  .sort((a, b) => a.kickoff - b.kickoff);
```

No other changes needed in `renderMatches` — the rest of the function already uses the named fields from the `.map()` result.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/data.js`:

```html
<script src="js/render-matches.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete lines 2188–2353 from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html` → Matches tab. Upcoming and completed matches should render. The Upcoming/Completed/All filters should work. The "My Teams" match filter (when signed in) should work.

- [ ] **Step 5: Commit**

```bash
git add js/render-matches.js index.html
git commit -m "refactor: extract match rendering to js/render-matches.js"
```

---

## Task 7: Create js/render-groups.js

**Files:**
- Create: `js/render-groups.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/render-groups.js`**

Copy verbatim from `index.html`:
- `renderPeople` (lines 2354–2388)
- `qualScenarios` (lines 2389–2418)
- `renderGroups` (lines 2424–2540)

`renderGroups` uses `matchData` but only accesses the named fields that `renderMatches` already puts in scope via the `.map()` — actually, `renderGroups` reads from `matchData` directly. Check: it builds group tables from `matchData`. Search for `m[` in `renderGroups` — if it uses positional indices, update them to named fields using the reference table at the top of this plan.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-matches.js`:

```html
<script src="js/render-groups.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete lines 2354–2540 from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html` → Groups tab. All group tables should render with correct standings and qualification highlighting.

- [ ] **Step 5: Commit**

```bash
git add js/render-groups.js index.html
git commit -m "refactor: extract group/player rendering to js/render-groups.js"
```

---

## Task 8: Create js/render-leaderboard.js

**Files:**
- Create: `js/render-leaderboard.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/render-leaderboard.js`**

Copy verbatim from `index.html`:
- `calcLeaderboard` (lines 2695–2716)
- `renderLeaderboard` (lines 2718–2732)
- `renderAwards` (lines 2734–2767)
- `calcPredPoints` (lines 3111–3119)
- `getPredStatsByPlayer` (lines 3121–3151)
- `calcTerritoryControl` (lines 3153–3196)
- `calcPredPointsForAll` (lines 3198–3201)
- `predResultBadge` (lines 3203–3212)

Update `calcLeaderboard` — replace positional indices (lines 2700–2703):

```js
// OLD:
const s1 = m[6], s2 = m[7];
if (s1 === null || s2 === null) continue;
const o1 = teamOwner[m[3]], o2 = teamOwner[m[4]];

// NEW:
const { score1, score2, team1, team2 } = m;
if (score1 === null || score2 === null) continue;
const o1 = teamOwner[team1], o2 = teamOwner[team2];
```

And update the win/draw/loss logic below to use `score1`/`score2` instead of `s1`/`s2`:

```js
if (score1 > score2) { scores[o1].pts += 3; scores[o1].w++; scores[o2].l++; }
else if (score2 > score1) { scores[o2].pts += 3; scores[o2].w++; scores[o1].l++; }
else { scores[o1].pts += 1; scores[o2].pts += 1; scores[o1].d++; scores[o2].d++; }
```

Also check `calcTerritoryControl` and `getPredStatsByPlayer` for any `m[N]` references and apply the same mapping.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-groups.js`:

```html
<script src="js/render-leaderboard.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete the functions listed above from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html` → Leaderboard tab. Points totals, W/D/L counts, and Tournament Awards should all render correctly.

- [ ] **Step 5: Commit**

```bash
git add js/render-leaderboard.js index.html
git commit -m "refactor: extract leaderboard rendering to js/render-leaderboard.js"
```

---

## Task 9: Create js/render-predictions.js

**Files:**
- Create: `js/render-predictions.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/render-predictions.js`**

Copy verbatim from `index.html`:
- `renderPredictions` (lines 2839–2990)
- `submitPrediction` (lines 2991–3003)
- `toggleJoker` (lines 3004–3026)
- `editPrediction` (lines 3027–3034)
- `editPredictionFromPanel` (lines 3035–3043)
- `submitPredictionFromPanel` (lines 3044–3062)
- `toggleJokerFromPanel` (lines 3063–3089)
- `getLockCountdown` (lines 3090–3101)
- `stepScore` (lines 3102–3109)

Check `renderPredictions` for any `m[N]` references. It works from `matchIdByTeamDate` and `predLookup` (named keys), so positional indices are unlikely — but verify with a quick grep.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-leaderboard.js`:

```html
<script src="js/render-predictions.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete the functions listed above from the `<script>` block.

- [ ] **Step 4: Verify**

Sign in, open `index.html` → Predictions tab. Match cards should show. Submitting and editing a prediction should work. Joker toggle should work.

- [ ] **Step 5: Commit**

```bash
git add js/render-predictions.js index.html
git commit -m "refactor: extract prediction rendering to js/render-predictions.js"
```

---

## Task 10: Create js/render-teams.js

**Files:**
- Create: `js/render-teams.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/render-teams.js`**

Copy verbatim from `index.html`:
- `getAllTeams` (lines 2541–2549)
- `let selectedTeam = null;` (line 2551)
- `renderTeamChips` (lines 2558–2580)
- `renderTeamSchedule` (lines 2581–2694)
- `selectTeam` (lines 2770–2775)

Update `getAllTeams` — replace positional indices:

```js
// OLD:
for (const t of [m[3], m[4]]) {

// NEW:
for (const t of [m.team1, m.team2]) {
```

Update `renderTeamSchedule` — replace the `.map()` that builds named objects from positional arrays (lines 2590–2594):

```js
// OLD:
.map(m => ({
  date: m[0], time: m[1], tz: m[2], team1: m[3], team2: m[4], group: m[5],
  score1: m[6], score2: m[7], channel: m[8], prob1: m[9], probD: m[10], prob2: m[11],
  kickoff: toDate(m[0], m[1], m[2])
}))

// NEW:
.map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
```

And update the `.filter()` above it:

```js
// OLD:
.filter(m => m[3] === selectedTeam || m[4] === selectedTeam)

// NEW:
.filter(m => m.team1 === selectedTeam || m.team2 === selectedTeam)
```

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-predictions.js`:

```html
<script src="js/render-teams.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete the functions/variables listed above from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html` → Teams tab. Team chips should render. Clicking a team chip should show that team's schedule with correct match info.

- [ ] **Step 5: Commit**

```bash
git add js/render-teams.js index.html
git commit -m "refactor: extract team rendering to js/render-teams.js"
```

---

## Task 11: Create js/render-myteams.js

**Files:**
- Create: `js/render-myteams.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/render-myteams.js`**

Copy verbatim from `index.html`:
- `getPlayerTeams` (lines 2798–2808)
- `getNextMatch` (lines 2810–2816)
- `renderMyTeams` (lines 2818–2836)

Update `getPlayerTeams` — replace positional indices:

```js
// OLD:
return matchData.reduce((acc, m) => {
  if (m[3] && teamOwner[m[3]] === owner && !acc.find(t => t.name === m[3]))
    acc.push({ name: m[3], iso: teamIso[m[3]], group: m[5] });
  if (m[4] && teamOwner[m[4]] === owner && !acc.find(t => t.name === m[4]))
    acc.push({ name: m[4], iso: teamIso[m[4]], group: m[5] });
  return acc;
}, []);

// NEW:
return matchData.reduce((acc, m) => {
  if (m.team1 && teamOwner[m.team1] === owner && !acc.find(t => t.name === m.team1))
    acc.push({ name: m.team1, iso: teamIso[m.team1], group: m.group });
  if (m.team2 && teamOwner[m.team2] === owner && !acc.find(t => t.name === m.team2))
    acc.push({ name: m.team2, iso: teamIso[m.team2], group: m.group });
  return acc;
}, []);
```

Update `getNextMatch` — replace positional indices:

```js
// OLD:
return matchData
  .filter(m => (m[3] === teamName || m[4] === teamName) && m[6] === null)
  .map(m => ({ date: m[0], time: m[1], tz: m[2], team1: m[3], team2: m[4], group: m[5], kickoff: toDate(m[0], m[1], m[2]) }))
  .sort((a, b) => a.kickoff - b.kickoff)[0] || null;

// NEW:
return matchData
  .filter(m => (m.team1 === teamName || m.team2 === teamName) && m.score1 === null)
  .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
  .sort((a, b) => a.kickoff - b.kickoff)[0] || null;
```

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-teams.js`:

```html
<script src="js/render-myteams.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete the three functions from the `<script>` block.

- [ ] **Step 4: Verify**

Sign in, open `index.html` → My Teams tab. Your assigned teams should show with correct next-match info and countdowns.

- [ ] **Step 5: Commit**

```bash
git add js/render-myteams.js index.html
git commit -m "refactor: extract my teams rendering to js/render-myteams.js"
```

---

## Task 12: Create js/render-profile.js

**Files:**
- Create: `js/render-profile.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/render-profile.js`**

Copy verbatim from `index.html`:
- `showProfile` (lines 3214–3218)
- `closeProfile` (lines 3219–3222)
- `showPredPanel` (lines 3224–3228)
- `closePredPanel` (lines 3229–3233)
- `renderPredPanel` (lines 3234–3384)
- `h2hHtml` (lines 3385–3419)
- `loadComments` (lines 3424–3456)
- `postComment` (lines 3447–3457)
- `renderProfile` (lines 3458–3601)

Check these functions for `m[N]` references and update any found using the reference table at the top of this plan.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-myteams.js`:

```html
<script src="js/render-profile.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete all functions listed above from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html`. Click a player name on the Players tab — the profile modal should open with stats and badges. Click a match row — the prediction panel should open with H2H data and prediction dots. Comments should load if `commentsEnabled`.

- [ ] **Step 5: Commit**

```bash
git add js/render-profile.js index.html
git commit -m "refactor: extract profile/panel rendering to js/render-profile.js"
```

---

## Task 13: Create js/globe.js

**Files:**
- Create: `js/globe.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/globe.js`**

Copy verbatim from `index.html`:
- `initGlobe` (lines 3603–3852)
- `updateMarkers` (lines 3853–3863)
- `isVisible` (lines 3864–3873)
- `updateGlobeZoomElements` (lines 3874–3887)
- `resetGlobe` (lines 3888–3895)
- `updateTerritoryFills` (lines 3896–3914)
- `updateTerritoryLabels` (lines 3915–3923)
- `updateMarkerColors` (lines 3924–3936)
- `stopAutoRotate` (lines 3937–3940)
- `startIdleDrift` (lines 3941–3967)
- `playIntroAnimation` (lines 3968–4003)
- `renderVenueMarkers` (lines 4004–4050)
- `openVenuePanel` (lines 4051–4063)
- `renderTerritoryStandings` (lines 4064–4112)
- `openTerritoryPanel` (lines 4113–4133)
- `renderTerritoryPanel` (lines 4134–4218)
- `closeVenuePanel` (lines 4219–4228)
- `renderVenueMatches` (lines 4229–4291)

Check `renderVenueMatches` for `m[N]` references — it reads from `matchByKey` which now stores named-field objects, so update any positional accesses.

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/render-profile.js`:

```html
<script src="js/globe.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete all globe functions from the `<script>` block.

- [ ] **Step 4: Verify**

Open `index.html` → Battle Map tab. The globe should appear, animate in, and show venue markers. Clicking a venue should open the venue panel with correct match listings. Territory colours should match owner assignments.

- [ ] **Step 5: Commit**

```bash
git add js/globe.js index.html
git commit -m "refactor: extract globe to js/globe.js"
```

---

## Task 14: Create js/odds.js

**Files:**
- Create: `js/odds.js`
- Modify: `index.html` (add script tag, remove moved code)

- [ ] **Step 1: Create `js/odds.js`**

Copy verbatim from `index.html`:
- `updateClock` (lines 4292–4302)
- `POLYMARKET_SLUGS` constant (lines 4307–4317)
- `fmtVol` (lines 4319–4324)
- `fmtPct` (line 4326)
- `safePrices` (lines 4328–4330)
- `oddsTeamName` (lines 4332–4334)
- `loadOdds` (lines 4336–4385)

- [ ] **Step 2: Add script tag to `index.html`**

Add after `js/globe.js`:

```html
<script src="js/odds.js"></script>
```

- [ ] **Step 3: Remove moved code from `index.html`**

Delete the functions and `POLYMARKET_SLUGS` from the `<script>` block. Also remove the bare `updateClock()` call and `setInterval(updateClock, 1000)` and `loadOdds()` call — these move to `main.js`.

- [ ] **Step 4: Verify**

Open `index.html`. The broadcast clock in the header should tick. The Polymarket odds ticker should load and scroll.

- [ ] **Step 5: Commit**

```bash
git add js/odds.js index.html
git commit -m "refactor: extract clock and odds ticker to js/odds.js"
```

---

## Task 15: Create js/main.js and clean up index.html

**Files:**
- Create: `js/main.js`
- Modify: `index.html` (add script tag, delete old `<script>` block entirely)

At this point the `<script>` block in `index.html` should contain only: `switchTab`, `selectTeam` reference (already in `render-teams.js`), and the init calls. Verify by checking what's left.

- [ ] **Step 1: Create `js/main.js`**

```js
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('sectionPlayers').classList.toggle('active', tab === 'players');
  document.getElementById('sectionMatches').classList.toggle('active', tab === 'matches');
  document.getElementById('sectionGroups').classList.toggle('active', tab === 'groups');
  document.getElementById('sectionLeaderboard').classList.toggle('active', tab === 'leaderboard');
  document.getElementById('sectionTeams').classList.toggle('active', tab === 'teams');
  document.getElementById('sectionMyTeams').classList.toggle('active', tab === 'myteams');
  document.getElementById('sectionPredictions').classList.toggle('active', tab === 'predictions');
  document.getElementById('sectionMap').classList.toggle('active', tab === 'map');
  if (tab === 'teams') renderTeamChips();
  if (tab === 'map') { initGlobe(); renderTerritoryStandings(); }
  if (tab !== 'map') stopAutoRotate();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'myteams') renderMyTeams();
  if (tab === 'predictions') renderPredictions();
}

restoreSession().then(() => loadData());
setInterval(renderMatches, 60000);
setInterval(loadData, 180000);

updateClock();
setInterval(updateClock, 1000);
loadOdds();
```

- [ ] **Step 2: Add script tag and remove old `<script>` block from `index.html`**

Add after `js/odds.js`:

```html
<script src="js/main.js"></script>
```

Then delete the now-empty `<script>` block (it should contain nothing substantive at this point — if anything remains, move it to the appropriate file first).

- [ ] **Step 3: Verify the full app**

Open `index.html`. Work through every tab:
- Players tab: owner cards with team lists
- Matches tab: match rows with countdowns, filters work
- Groups tab: group tables with standings
- Leaderboard tab: points table and awards
- Teams tab: chip grid, click a team, see schedule
- Battle Map tab: globe loads, venues clickable, territory colours correct
- (Signed in) My Teams tab: your teams show
- (Signed in) Predictions tab: match cards, submit/edit/joker all work
- Click a player name → profile modal
- Click a match row → prediction panel with H2H and dots

- [ ] **Step 4: Final commit**

```bash
git add js/main.js index.html
git commit -m "refactor: extract main init to js/main.js, remove old script block from index.html"
```

---

## Post-refactor checklist

- [ ] `index.html` contains no `<script>` block (only `<script src>` tags)
- [ ] `index.html` contains exactly one `<style>` block
- [ ] Grep for positional matchData access in `js/` — should return zero results:
  ```bash
  grep -rF "m[0]" js/ index.html
  grep -rF "m[3]" js/ index.html
  grep -rF "m[6]" js/ index.html
  ```
- [ ] `PLAYERS` constant defined once in `js/config.js`; confirm no other hardcoded player name arrays exist:
  ```bash
  grep -r "Anton.*Chris\|Chris.*Dan" js/ index.html
  ```
- [ ] Deploy to Surge: `./deploy.sh` or push to `main` and confirm the live site works
