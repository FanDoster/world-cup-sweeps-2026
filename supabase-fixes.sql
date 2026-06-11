-- ═══════════════════════════════════════
-- Fixes (June 2026): prediction editing, server-side
-- lock, hidden predictions, invite code rotation
-- Run in Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════

-- ── 1) KICKOFF LOCK HELPER ─────────────
-- True once a match is within 5 minutes of kickoff (or already played).
-- matches stores venue-local kickoff_time + tz_offset hours; UTC = local - offset.

CREATE OR REPLACE FUNCTION match_locked(mid INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((
    SELECT now() >= ((m.match_date + m.kickoff_time) AT TIME ZONE 'UTC')
                    - make_interval(hours => COALESCE(m.tz_offset, 0))
                    - interval '5 minutes'
    FROM matches m WHERE m.id = mid
  ), true);
$$;

-- ── 2) PREDICTIONS POLICIES ────────────
-- Fixes: editing a prediction was impossible (no UPDATE policy),
-- the 5-min lock was client-side only, and everyone's predictions
-- were readable via the API before kickoff.

DROP POLICY IF EXISTS "pred_read"   ON predictions;
DROP POLICY IF EXISTS "pred_insert" ON predictions;
DROP POLICY IF EXISTS "pred_update" ON predictions;

-- Your own predictions always; other players' only once the match is locked
CREATE POLICY "pred_read" ON predictions FOR SELECT
  USING (auth.uid() = user_id OR match_locked(match_id));

CREATE POLICY "pred_insert" ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT match_locked(match_id));

CREATE POLICY "pred_update" ON predictions FOR UPDATE
  USING (auth.uid() = user_id AND NOT match_locked(match_id))
  WITH CHECK (auth.uid() = user_id AND NOT match_locked(match_id));

-- ── 3) EXISTENCE-ONLY STATUS VIEW ──────
-- The ✓/✗ "has predicted" dots need to know a prediction EXISTS
-- before kickoff without exposing the scores. Views run as owner,
-- bypassing RLS — deliberate here: it exposes only (user_id, match_id).

CREATE OR REPLACE VIEW prediction_status AS
  SELECT user_id, match_id FROM predictions;

GRANT SELECT ON prediction_status TO anon, authenticated;

-- ── 4) ROTATE THE INVITE CODE ──────────
-- The old code was publicly readable at
-- world-cup-sweeps-2026.surge.sh/supabase-auth.sql (now fixed via
-- .surgeignore, but the old code is burned — pick a fresh one).
-- ⚠ EDIT THE VALUE BELOW BEFORE RUNNING, and don't commit the real code.

CREATE OR REPLACE FUNCTION validate_invite_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN code = 'PICK-A-NEW-CODE';
END;
$$;
