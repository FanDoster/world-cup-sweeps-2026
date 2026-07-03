-- ═══════════════════════════════════════
-- Banter message pinning (July 2026)
-- Run in Supabase SQL Editor AFTER supabase-features.sql.
-- Safe to re-run. The app detects the `pinned` column and
-- enables the pin/unpin UI automatically — no frontend config needed.
-- ═══════════════════════════════════════

ALTER TABLE match_comments ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE match_comments ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE match_comments ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- Any signed-in player can pin/unpin any message (not just their own).
-- The trigger below stops this policy being used to tamper with a
-- comment's body/author/match — only the pin fields may change.
DROP POLICY IF EXISTS "comments_pin_update" ON match_comments;
CREATE POLICY "comments_pin_update" ON match_comments FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION restrict_comment_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body
     OR NEW.match_id IS DISTINCT FROM OLD.match_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only pin fields can be changed on an existing comment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_pin_only_update ON match_comments;
CREATE TRIGGER comments_pin_only_update
  BEFORE UPDATE ON match_comments
  FOR EACH ROW EXECUTE FUNCTION restrict_comment_update();

-- Live updates so a pin/unpin shows up for everyone watching the feed
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE match_comments;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already in the publication
END;
$$;
