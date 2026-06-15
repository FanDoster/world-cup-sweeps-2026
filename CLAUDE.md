# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A six-player sweepstakes tracker for the 2026 FIFA World Cup (live at world-cup-sweeps-2026.surge.sh). The app is **`index.html`** (CSS + HTML only) plus a `js/` directory of plain JS files loaded via `<script src>` tags — no build step, no package.json, no tests, no linter. All scripts run in global scope (no ES modules — required for `file://` compatibility). Backend is Supabase (Postgres + Auth) accessed directly from the browser via the supabase-js CDN bundle.

`h2h-data.js` holds all-time records between every pair of the 48 qualified teams (record, draws, goals, World Cup meetings, first/last meeting, biggest win), crunched from the martj42/international_results dataset by `.claude/build-h2h.mjs` — re-run that script to refresh it; never hand-edit the data file.

### JS file layout

Scripts load in dependency order (each file can call globals defined by earlier ones):

| File | Responsibility |
|------|---------------|
| `h2h-data.js` | Head-to-head lookup table (generated) |
| `js/config.js` | Supabase client, `PLAYERS`, `ownerColors`, `ownerHexColors`, `VENUE_DATA`, `TERRITORY_DATA` |
| `js/utils.js` | `flagUrl`, date/time helpers (`toDate`, `formatLocalTime`, `formatDateLabel`, `formatDateHeader`, `getCountdown`), `ordinal`, `escapeHtml` |
| `js/auth.js` | `currentSession`, `currentProfile`, sign-in/up/out, `updateAuthBar`, joker notification |
| `js/data.js` | Data globals, `loadData`, `loadPredData`; also globe state vars (`territoryControl` etc.) |
| `js/render-matches.js` | Match list with 3-way filters (`matchFilter`, `matchTeamFilter`) |
| `js/render-groups.js` | Group tables, qual scenarios, player cards (`renderPeople`) |
| `js/render-leaderboard.js` | `calcLeaderboard`, `renderLeaderboard`, `renderAwards`, `calcPredPoints`, `getPredStatsByPlayer`, `calcTerritoryControl`, `calcPredPointsForAll`, `predResultBadge`, `renderTerritoryStandings` |
| `js/render-predictions.js` | Prediction entry/edit UI, `submitPrediction`, joker toggle, `getLockCountdown`, `stepScore` |
| `js/render-teams.js` | `selectedTeam`, team chips, team schedule, `selectTeam` |
| `js/render-myteams.js` | My Teams tab cards |
| `js/render-profile.js` | Profile overlay, match pred panel, H2H block, match comments |
| `js/globe.js` | D3 globe, territory fills/stripes, venue/territory panels |
| `js/odds.js` | Broadcast clock, Polymarket odds ticker |
| `js/main.js` | `switchTab`, init calls (`restoreSession`, `setInterval`) |

## Commands

- **Run locally**: just open `index.html` in a browser (or any static server). It talks to the live Supabase project.
- **Deploy**: pushing to `main` auto-deploys to Surge via `.github/workflows/deploy.yml`. Manual deploy: `./deploy.sh` (needs `SURGE_TOKEN` env var). `.surgeignore` keeps SQL/markdown/config files off the public site — never weaken it: the invite code lives in SQL, and that file was once publicly readable.
- **Database changes**: the `.sql` files are not run by any tooling — they are pasted into the Supabase SQL Editor by hand. `supabase-schema.sql` (teams, matches, picks + seed data) is **destructive**: it starts with `DROP TABLE ... CASCADE` and reseeds everything. `supabase-auth.sql` adds `player_profiles`, `predictions`, and the `validate_invite_code` RPC. `supabase-fixes.sql` (June 2026) adds the prediction UPDATE policy, the server-side kickoff lock (`match_locked`), the `prediction_status` existence-only view, and rotates the invite code. `supabase-features.sql` adds the `is_joker` column (one 2× confidence pick per player per match day, enforced by trigger) and the `match_comments` table (banter thread, realtime-enabled). The frontend **feature-detects** both (`jokersEnabled`/`commentsEnabled` probes in `loadPredData`) and hides the UI until the SQL has been run.

## Architecture

### Data flow

All data lives in Supabase; the client is anonymous-readable via RLS (`SELECT USING (true)` on every table). Writes are restricted to the authenticated user's own rows (`auth.uid() = user_id`). On page load, `restoreSession().then(() => loadData())` fetches teams + matches and populates module-level globals that every render function reads:

- `people` (owner → teams), `groups` (letter → teams), `teamOwner`, `teamIso`, `teamWinPct` — lookups built from the `teams` table
- `matchData` — **named-field objects**: `{ date, time, tz, team1, team2, group, score1, score2, channel, prob1, probD, prob2 }`. Built in `loadData` from the raw Supabase rows; all render functions use field names (e.g. `m.score1 === null` means "not played yet").
- `predLookup` (matchId → predictions) and `matchIdByTeamDate` — matches are keyed client-side by the string `"team1|team2|date"`, which is also what `showPredPanel()` receives via inline `onclick`.
- `matchByKey` — same `"team1|team2|date"` key → matchData object, used by the globe's venue panel.

Rendering is full innerHTML regeneration: `renderMatches()`, `renderGroups()`, `renderLeaderboard()`, etc. rebuild their section from the globals. `renderMatches` re-runs every 60s for countdowns. Tabs are show/hide via `switchTab()`; the My Teams and Predictions tabs only exist when signed in (injected by `updateAuthBar()`).

### Scoring rules (duplicated client-side, keep consistent)

- **Leaderboard** (`calcLeaderboard`): an owner gets 3 pts when their team wins, 1 pt for a draw; the table also shows prediction points (`predPointsByPlayer`) and ranks by the combined total. Standings/group tables are computed entirely client-side from match scores — nothing is stored. Group tables highlight qualification (top 2 + best 8 third-placed of 12 groups in the 2026 format) plus a best-thirds ranking card.
- **Predictions** (`calcPredPoints`): 1 pt for correct result (win/draw/loss sign), +2 pts per correct team score, max 5 ("5★" exact score); a joker doubles a match's points. All per-player aggregates (leaderboard pred pts, profile badges, tournament awards) flow through `getPredStatsByPlayer()` — change scoring there, not in the renderers. Predictions lock 5 minutes before kickoff and other players' picks stay hidden until then — enforced server-side by the RLS policies in `supabase-fixes.sql` (`match_locked`). The ✓/✗ "has predicted" dots read the `prediction_status` view, which exposes existence but not scores; `loadPredData` falls back to the predictions table if the view is missing.

### Auth

Supabase email/password, no email confirmation (private game). Sign-up requires an invite code validated by the `validate_invite_code` RPC (SECURITY DEFINER, code lives in the SQL) and a player name picked from the fixed six: Anton, Chris, Dan, Laurie, Pat, Steven. The canonical list is `PLAYERS` in `js/config.js` — render functions that iterate players use that constant. Adding/renaming a player still requires updating `PLAYERS`, `ownerColors`, `ownerHexColors`, the sign-up dropdown HTML, and the `teams.owner` column. `player_profiles` maps auth user id → player name. See `LOGIN-PLAN.md` for the original design rationale.

### Dates and times

Matches store local-to-venue `kickoff_time` plus `tz_offset` (hours, negative for the Americas). `toDate()` converts to a UTC-based `Date`, and everything displays in the **viewer's** local time. Match results are entered by updating `home_score`/`away_score` directly in the Supabase table editor; the UI treats `null` scores as "not played".

### Conventions

- The Supabase URL and publishable (anon) key are intentionally hardcoded in `js/config.js` — security comes from RLS, not key secrecy.
- Team flags come from flagcdn.com using the `teams.iso` code (`gb-eng`, `gb-sct` for England/Scotland).
- Owner color classes (`owner-anton` etc.) and TV channel styling (`channel-bbc`/`channel-itv`, inferred from the channel string prefix) are CSS conventions used by multiple render functions.
- Mobile layout (≤700px) is a separate set of rules in the main `<style>` block; match rows render extra mobile-only markup (`.match-meta-mobile`, `.match-prob-text`) that is hidden on desktop.
