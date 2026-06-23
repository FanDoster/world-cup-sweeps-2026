-- Add the `round` column to matches (knockout-stage label).
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Used by the Bracket tab (js/render-bracket.js) to tell group-stage
-- fixtures apart from knockout ones. NULL = group stage; knockout rows
-- carry a label such as 'R32', 'R16', 'QF', 'SF', '3P', 'Final'.
-- The frontend feature-detects this column (loadData re-queries without
-- it if absent), so the app works whether or not this has been run.
--
-- No backfill: existing seeded rows are all group-stage, where NULL is
-- the correct value. Populate knockout rows when those fixtures are added.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS round TEXT;
