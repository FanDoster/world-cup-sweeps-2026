# Sweepstakes Login — Implementation Plan

## Overview

Add email/password login to the World Cup sweepstakes so six players can sign in, see their personal dashboard, and (future) submit match predictions. Built on Supabase Auth — no extra infrastructure.

---

## Phase 1: Supabase Auth Config (5 min, Dan in dashboard)

**Go to** Authentication → Settings:

| Setting | Value | Why |
|---------|-------|-----|
| Enable email confirmations | OFF | 6 trusted friends, skip the email round-trip |
| Minimum password length | 6 | Low friction for a private game |

That's it. Everything else stays default.

---

## Phase 2: Player ↔ User Mapping

We need to link Supabase auth users to sweepstakes player names. Two approaches:

**Approach A: `player_profiles` table (recommended)**

```sql
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  player_name TEXT NOT NULL UNIQUE  -- 'Dan', 'Chris', 'Anton', etc.
);
```

When someone signs up, they pick their sweepstakes name from a dropdown. This keeps auth clean and supports future flexibility (players can change email, add avatars, etc).

**Approach B: Store player_name in user metadata**

Simpler but less flexible. Player name goes in `raw_user_meta_data` on signup. No extra table needed.

**Decision: Go with Approach A** — cleaner, supports future profile fields, matches the existing DB pattern.

---

## Phase 3: Auth UI (frontend changes)

### 3a. Auth State Bar (header, always visible)

```
[🟢 Signed in as Dan] [Sign out]
[🔒 Sign in] [Create account]
```

Minimal, out of the way, but always present.

### 3b. Sign Up Modal

Three fields:
- Email
- Password
- **Player name** (dropdown: Anton, Chris, Dan, Laurie, Pat, Steven)

On submit: creates Supabase auth user + inserts into `player_profiles`.

### 3c. Sign In Modal

Two fields:
- Email
- Password

On submit: Supabase session stored in localStorage. Page re-renders with player-specific content.

### 3d. Session Persistence

Supabase SDK handles this automatically. `sb.auth.getSession()` on page load restores the session. No extra code needed.

---

## Phase 4: Personalised Dashboard

When logged in, the Players tab shows **your card highlighted** at the top, with:
- "Your teams" label
- Your 8 teams with fixtures
- A "My Dashboard" link to a new tab

**New "My Teams" tab** (logged in only):
- Your 8 teams in a grid
- Each team card shows: group, next match with countdown, current group position
- Quick link to team schedule
- Future: prediction form for each upcoming match

---

## Phase 5: Predictions Table (prepare for Phase 6)

```sql
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  match_id INTEGER REFERENCES matches(id) NOT NULL,
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)  -- one prediction per match per user
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pred_read" ON predictions FOR SELECT USING (true);
CREATE POLICY "pred_insert" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scoring view (for leaderboard)
CREATE VIEW prediction_scores AS
SELECT 
  p.user_id,
  COUNT(*) FILTER (WHERE p.predicted_home_score = m.home_score 
                     AND p.predicted_away_score = m.away_score) AS exact_scores,
  COUNT(*) FILTER (WHERE SIGN(p.predicted_home_score - p.predicted_away_score) 
                         = SIGN(m.home_score - m.away_score)
                     AND NOT (p.predicted_home_score = m.home_score 
                            AND p.predicted_away_score = m.away_score)) AS correct_results
FROM predictions p
JOIN matches m ON p.match_id = m.id
WHERE m.home_score IS NOT NULL
GROUP BY p.user_id;
```

---

## Phase 6: Predictions UI (future work)

- Each upcoming match shows a prediction form when logged in
- Two number inputs (home score, away score) + Submit button
- Predictions lock 5 minutes before kickoff
- After match finishes, show your prediction vs actual result (green/red)
- Prediction leaderboard alongside team leaderboard

---

## File Changes Summary

| File | Change |
|------|--------|
| `index.html` | Add auth bar, sign in/up modals, my-teams tab, session handling |
| `supabase-schema.sql` | Add `player_profiles` and `predictions` tables |

New CSS needed: ~80 lines for auth bar, modals, my-teams grid. New JS needed: ~150 lines for auth flow + personalised rendering.

---

## Edge Cases & Pitfalls

- **Duplicate player names**: `player_profiles.player_name` is UNIQUE — prevents two people claiming "Dan"
- **Wrong player mapping**: If someone picks the wrong name, Dan (admin) fixes it in the Supabase table editor
- **Email already exists**: Supabase returns a friendly error, show it in the modal
- **Session expiry**: Supabase refresh tokens last 1 hour by default, auto-refreshed by SDK
- **Already-drawn picks**: The current picks are hardcoded by owner, not per-user. When we add the predictions feature later, we'll migrate picks to be per-auth-user. For now, picks stay as-is — auth is purely for the dashboard and future predictions

---

## Execution Order

1. Dan flips "Enable email confirmations" to OFF in Supabase dashboard
2. Mr P creates the `player_profiles` table + predictions schema
3. Mr P adds auth UI to `index.html`
4. Test: Dan signs up, picks "Dan" as player name, sees his dashboard
5. Deploy to Surge
6. Share the URL — Anton, Chris, Laurie, Pat, Steven sign up

**Total effort: ~30 minutes for the full auth system.**
