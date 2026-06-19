-- Add is_complete column with trigger that only sets TRUE when
-- both scores are non-null AND the match kickoff has passed.
-- Run this in the Supabase SQL Editor.

-- 1. Add the column
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE;

-- 2. Trigger function: sets is_complete based on scores + kickoff time
CREATE OR REPLACE FUNCTION check_match_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    -- Convert local kickoff to UTC: local_time - offset = UTC
    NEW.is_complete := (NEW.match_date + NEW.kickoff_time - (NEW.tz_offset || ' hours')::interval) < now();
  ELSE
    NEW.is_complete := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger (runs before every insert/update)
DROP TRIGGER IF EXISTS trg_match_complete ON matches;
CREATE TRIGGER trg_match_complete
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION check_match_complete();

-- 4. Fix existing rows
UPDATE matches SET is_complete = FALSE;
UPDATE matches
SET is_complete = TRUE
WHERE home_score IS NOT NULL
  AND away_score IS NOT NULL
  AND (match_date + kickoff_time - (tz_offset || ' hours')::interval) < now();
