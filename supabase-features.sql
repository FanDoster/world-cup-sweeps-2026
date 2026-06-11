-- ═══════════════════════════════════════
-- Features (June 2026): joker picks + match banter
-- Run in Supabase SQL Editor AFTER supabase-fixes.sql.
-- Safe to re-run. The app detects these and enables the
-- features automatically — no frontend config needed.
-- ═══════════════════════════════════════

-- ── 1) JOKER (2× CONFIDENCE PICK) ──────
-- One prediction per match day can be flagged as the joker;
-- it scores double points. One per player per match day.

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_joker BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION enforce_one_joker()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM predictions p
    JOIN matches m1 ON m1.id = p.match_id
    JOIN matches m2 ON m2.id = NEW.match_id
    WHERE p.user_id = NEW.user_id
      AND p.is_joker
      AND p.match_id <> NEW.match_id
      AND m1.match_date = m2.match_date
  ) THEN
    RAISE EXCEPTION 'Only one joker per match day';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS one_joker_per_day ON predictions;
CREATE TRIGGER one_joker_per_day
  BEFORE INSERT OR UPDATE ON predictions
  FOR EACH ROW WHEN (NEW.is_joker)
  EXECUTE FUNCTION enforce_one_joker();

-- ── 2) MATCH BANTER (COMMENTS) ─────────

CREATE TABLE IF NOT EXISTS match_comments (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_read" ON match_comments;
DROP POLICY IF EXISTS "comments_insert" ON match_comments;
DROP POLICY IF EXISTS "comments_delete" ON match_comments;

CREATE POLICY "comments_read" ON match_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON match_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON match_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Live updates while the match panel is open
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE match_comments;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already in the publication
END;
$$;
