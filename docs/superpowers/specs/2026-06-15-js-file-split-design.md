# JS File Split Refactor — Design Spec

**Date:** 2026-06-15
**Status:** Approved

## Goal

Split the single 4,390-line `index.html` into focused JS files using plain `<script src>` tags. No build step, no ES modules, no new tooling. The app must continue to open directly from `file://` and deploy to Surge unchanged.

## What changes

### 1. CSS consolidation

Merge the two `<style>` blocks (main at line 10, auth at line 1124) into one block. No functional change.

### 2. `PLAYERS` constant

Extract `['Anton','Chris','Dan','Laurie','Pat','Steven']` from the ~6 places it's hardcoded into a single `const PLAYERS` in `js/config.js`.

### 3. `matchData` named objects

`matchData` currently stores positional arrays. In `js/data.js`, convert to named objects at load time:

```js
{
  date, time, tz,
  team1, team2, group,
  score1, score2,
  channel,
  prob1, probD, prob2,
  id, kickoff
}
```

Every render function is updated to use `m.score1`, `m.team1` etc. instead of `m[6]`, `m[3]`.

### 4. File split

`index.html` retains all CSS (one merged block) and HTML structure. The entire `<script>` block is replaced with 14 `<script src>` tags.

```
js/
  config.js              # SB_URL/KEY, supabase client, PLAYERS, VENUE_DATA, ownerColors, ownerHexColors, TERRITORY_DATA
  utils.js               # toDate, formatDateLabel, formatLocalTime, getCountdown, formatDateHeader, ordinal, escapeHtml, flagUrl
  auth.js                # restoreSession, doSignIn, doSignUp, doSignOut, updateAuthBar, showSignIn, showSignUp, closeModals, showJokerNotification, dismissJokerNotification
  data.js                # all module-level globals (people, groups, teamOwner, teamIso, teamWinPct, matchData, predLookup, matchIdByTeamDate, predPointsByPlayer, jokersEnabled, commentsEnabled, featureProbeDone) + loadData, loadPredData
  render-matches.js      # renderMatches, setMatchFilter, setMatchTeamFilter, matchFilter, matchTeamFilter state
  render-groups.js       # renderGroups, renderPeople, qualScenarios
  render-leaderboard.js  # calcLeaderboard, renderLeaderboard, renderAwards, calcPredPoints, getPredStatsByPlayer, predResultBadge, calcPredPointsForAll
  render-predictions.js  # renderPredictions, submitPrediction, toggleJoker, editPrediction, editPredictionFromPanel, submitPredictionFromPanel, toggleJokerFromPanel, getLockCountdown, stepScore
  render-teams.js        # renderTeamChips, renderTeamSchedule, getAllTeams, selectTeam, selectedTeam state
  render-myteams.js      # renderMyTeams, getPlayerTeams, getNextMatch
  render-profile.js      # renderProfile, showProfile, closeProfile, renderPredPanel, showPredPanel, closePredPanel, h2hHtml, loadComments, postComment
  globe.js               # initGlobe + all globe/venue/territory functions and state (globeInitialised, worldGeoData, etc.)
  odds.js                # loadOdds, updateClock, fmtVol, fmtPct, safePrices, oddsTeamName
  main.js                # switchTab, page init, setInterval wiring, DOMContentLoaded entry point
```

Script load order in `index.html`:
1. `h2h-data.js` (external, unchanged)
2. Supabase CDN
3. D3 + topojson CDNs
4. `js/config.js`
5. `js/utils.js`
6. `js/auth.js`
7. `js/data.js`
8. `js/render-matches.js`
9. `js/render-groups.js`
10. `js/render-leaderboard.js`
11. `js/render-predictions.js`
12. `js/render-teams.js`
13. `js/render-myteams.js`
14. `js/render-profile.js`
15. `js/globe.js`
16. `js/odds.js`
17. `js/main.js`

## Migration order

Do one step per commit, in this order, verifying the app still works after each:

1. Merge CSS blocks
2. Create `js/config.js`, update `index.html` script tags
3. Create `js/utils.js`
4. Create `js/auth.js`
5. Create `js/data.js` — convert `matchData` to named objects here, update any data.js-internal usage
6. Create `js/render-matches.js` — update all `m[N]` → `m.field` references
7. Create `js/render-groups.js`
8. Create `js/render-leaderboard.js`
9. Create `js/render-predictions.js`
10. Create `js/render-teams.js`
11. Create `js/render-myteams.js`
12. Create `js/render-profile.js`
13. Create `js/globe.js`
14. Create `js/odds.js`
15. Create `js/main.js` — delete remaining `<script>` block from `index.html`

## Constraints

- No ES modules (`import`/`export`) — must work with `file://`
- No build step, no `package.json`
- Globals remain shared across files (no isolation enforcement)
- Surge deployment unchanged — all files in repo root/subdirs are deployed as-is
- `.surgeignore` does not need updating (the `js/` folder should be public)

## Out of scope

- Any logic changes or feature additions
- CSS refactoring beyond merging the two blocks
- Converting from innerHTML regeneration to any reactive pattern
- Adding a linter, formatter, or test suite
