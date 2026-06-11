# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A six-player sweepstakes tracker for the 2026 FIFA World Cup (live at world-cup-sweeps-2026.surge.sh). The entire app is **one static file, `index.html`** (~2100 lines: CSS, HTML, and vanilla JS in `<style>`/`<script>` blocks). There is no build step, no package.json, no tests, and no linter. Backend is Supabase (Postgres + Auth) accessed directly from the browser via the supabase-js CDN bundle.

## Commands

- **Run locally**: just open `index.html` in a browser (or any static server). It talks to the live Supabase project.
- **Deploy**: pushing to `main` auto-deploys to Surge via `.github/workflows/deploy.yml`. Manual deploy: `./deploy.sh` (needs `SURGE_TOKEN` env var). `.surgeignore` keeps SQL/markdown/config files off the public site — never weaken it: the invite code lives in SQL, and that file was once publicly readable.
- **Database changes**: the `.sql` files are not run by any tooling — they are pasted into the Supabase SQL Editor by hand. `supabase-schema.sql` (teams, matches, picks + seed data) is **destructive**: it starts with `DROP TABLE ... CASCADE` and reseeds everything. `supabase-auth.sql` adds `player_profiles`, `predictions`, and the `validate_invite_code` RPC. `supabase-fixes.sql` (June 2026) adds the prediction UPDATE policy, the server-side kickoff lock (`match_locked`), the `prediction_status` existence-only view, and rotates the invite code.

## Architecture

### Data flow

All data lives in Supabase; the client is anonymous-readable via RLS (`SELECT USING (true)` on every table). Writes are restricted to the authenticated user's own rows (`auth.uid() = user_id`). On page load, `restoreSession().then(() => loadData())` fetches teams + matches and populates module-level globals that every render function reads:

- `people` (owner → teams), `groups` (letter → teams), `teamOwner`, `teamIso`, `teamWinPct` — lookups built from the `teams` table
- `matchData` — **positional arrays**: `[date, time, tz_offset, team1, team2, group, score1, score2, channel, prob_home, prob_draw, prob_away]`. Most logic indexes these numerically (`m[6] === null` means "not played yet").
- `predLookup` (matchId → predictions) and `matchIdByTeamDate` — matches are keyed client-side by the string `"team1|team2|date"`, which is also what `showPredPanel()` receives via inline `onclick`.

Rendering is full innerHTML regeneration: `renderMatches()`, `renderGroups()`, `renderLeaderboard()`, etc. rebuild their section from the globals. `renderMatches` re-runs every 60s for countdowns. Tabs are show/hide via `switchTab()`; the My Teams and Predictions tabs only exist when signed in (injected by `updateAuthBar()`).

### Scoring rules (duplicated client-side, keep consistent)

- **Leaderboard** (`calcLeaderboard`): an owner gets 3 pts when their team wins, 1 pt for a draw; the table also shows prediction points (`predPointsByPlayer`) and ranks by the combined total. Standings/group tables are computed entirely client-side from match scores — nothing is stored. Group tables highlight qualification (top 2 + best 8 third-placed of 12 groups in the 2026 format) plus a best-thirds ranking card.
- **Predictions** (`calcPredPoints`): 1 pt for correct result (win/draw/loss sign), +2 pts per correct team score, max 5 ("5★" exact score). Predictions lock 5 minutes before kickoff and other players' picks stay hidden until then — enforced server-side by the RLS policies in `supabase-fixes.sql` (`match_locked`). The ✓/✗ "has predicted" dots read the `prediction_status` view, which exposes existence but not scores; `loadPredData` falls back to the predictions table if the view is missing.

### Auth

Supabase email/password, no email confirmation (private game). Sign-up requires an invite code validated by the `validate_invite_code` RPC (SECURITY DEFINER, code lives in the SQL) and a player name picked from the fixed six: Anton, Chris, Dan, Laurie, Pat, Steven. That list is hardcoded in several places (sign-up dropdown, `ownerColors`, prediction-dot loops, pred panel) — adding/renaming a player means touching all of them plus the `teams.owner` column. `player_profiles` maps auth user id → player name. See `LOGIN-PLAN.md` for the original design rationale.

### Dates and times

Matches store local-to-venue `kickoff_time` plus `tz_offset` (hours, negative for the Americas). `toDate()` converts to a UTC-based `Date`, and everything displays in the **viewer's** local time. Match results are entered by updating `home_score`/`away_score` directly in the Supabase table editor; the UI treats `null` scores as "not played".

### Conventions

- The Supabase URL and publishable (anon) key are intentionally hardcoded in `index.html` — security comes from RLS, not key secrecy.
- Team flags come from flagcdn.com using the `teams.iso` code (`gb-eng`, `gb-sct` for England/Scotland).
- Owner color classes (`owner-anton` etc.) and TV channel styling (`channel-bbc`/`channel-itv`, inferred from the channel string prefix) are CSS conventions used by multiple render functions.
- Mobile layout (≤700px) is a separate set of rules in the main `<style>` block; match rows render extra mobile-only markup (`.match-meta-mobile`, `.match-prob-text`) that is hidden on desktop.
