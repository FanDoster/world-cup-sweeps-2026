-- ═══════════════════════════════════════
-- Auth + Player Profiles + Invite Code
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- ── PLAYER PROFILES ─────────────────────

CREATE TABLE player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON player_profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON player_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── INVITE CODE VALIDATOR ──────────────

-- Secured function — code not visible in JS
CREATE OR REPLACE FUNCTION validate_invite_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN code = 'ILoveDan';
END;
$$;

-- ── PREDICTIONS TABLE (for future) ─────

CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  match_id INTEGER REFERENCES matches(id) NOT NULL,
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pred_read" ON predictions FOR SELECT USING (true);
CREATE POLICY "pred_insert" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
