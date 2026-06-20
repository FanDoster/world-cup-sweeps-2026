-- ═══════════════════════════════════════
-- User Predictions API — Postgres RPC
-- Run in Supabase SQL Editor.
-- Safe to re-run (CREATE OR REPLACE).
-- ═══════════════════════════════════════
--
-- Call from the client with:
--   const { data } = await sb.rpc('get_user_predictions', { target_user_id: uid });
--
-- SECURITY INVOKER so RLS applies: callers see their own predictions
-- in full, and other players' predictions only for locked/played matches
-- (matching the existing pred_read policy).
--
-- Response: a single JSONB object with two top-level keys:
--   .user_id     — the requested user's UUID
--   .predictions — array of prediction objects (newest first)
--   .stats       — aggregate stats object
--
-- See api-response-schema.md for the full shape.

CREATE OR REPLACE FUNCTION get_user_predictions(target_user_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH pred_data AS (
    SELECT
      p.id                     AS prediction_id,
      p.user_id,
      pp.player_name,
      p.match_id,
      p.predicted_home_score,
      p.predicted_away_score,
      p.is_joker,
      p.created_at             AS predicted_at,
      m.match_date,
      m.kickoff_time,
      m.tz_offset,
      m.group_letter,
      m.home_score,
      m.away_score,
      m.tv_channel,
      ht.name                  AS home_team,
      ht.iso                   AS home_iso,
      awt.name                 AS away_team,
      awt.iso                  AS away_iso,
      -- Base points (same scoring as client-side calcPredPoints in render-leaderboard.js)
      CASE
        WHEN m.home_score IS NULL OR m.away_score IS NULL THEN NULL
        ELSE
          CASE WHEN SIGN(p.predicted_home_score - p.predicted_away_score)
                 = SIGN(m.home_score - m.away_score)
               THEN 1 ELSE 0 END
          + CASE WHEN p.predicted_home_score = m.home_score THEN 2 ELSE 0 END
          + CASE WHEN p.predicted_away_score = m.away_score THEN 2 ELSE 0 END
      END                      AS base_points,
      m.home_score IS NOT NULL AND m.away_score IS NOT NULL AS match_played
    FROM predictions p
    LEFT JOIN player_profiles pp ON pp.id = p.user_id
    JOIN matches m ON m.id = p.match_id
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams awt ON awt.id = m.away_team_id
    WHERE p.user_id = target_user_id
    ORDER BY m.match_date DESC, m.kickoff_time DESC
  ),
  scored AS (
    SELECT *,
      CASE
        WHEN base_points IS NULL THEN NULL
        WHEN is_joker THEN base_points * 2
        ELSE base_points
      END AS points
    FROM pred_data
  )
  SELECT jsonb_build_object(
    'user_id', target_user_id,
    'user_name', (SELECT player_name FROM player_profiles WHERE id = target_user_id),
    'predictions', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'prediction_id',         prediction_id,
          'match_id',              match_id,
          'home_team',             home_team,
          'home_iso',              home_iso,
          'away_team',             away_team,
          'away_iso',              away_iso,
          'group',                 group_letter,
          'match_date',            match_date,
          'kickoff_time',         kickoff_time,
          'tz_offset',             tz_offset,
          'predicted_score',       jsonb_build_object('home', predicted_home_score, 'away', predicted_away_score),
          'actual_score',          CASE WHEN match_played
                                    THEN jsonb_build_object('home', home_score, 'away', away_score)
                                    ELSE NULL END,
          'is_joker',              is_joker,
          'points',                points,
          'base_points',           base_points,
          'match_played',          match_played,
          'predicted_at',          predicted_at,
          'tv_channel',            tv_channel
        ) ORDER BY match_date DESC, kickoff_time DESC
      ) FILTER (WHERE prediction_id IS NOT NULL),
      '[]'::jsonb
    ),
    'stats', (
      SELECT jsonb_build_object(
        'total_predictions',    COUNT(*),
        'resolved',             COUNT(*) FILTER (WHERE match_played),
        'pending',              COUNT(*) FILTER (WHERE NOT match_played),
        'correct',              COUNT(*) FILTER (WHERE base_points > 0 AND match_played),
        'wrong',                COUNT(*) FILTER (WHERE base_points = 0 AND match_played),
        'exact_scores',         COUNT(*) FILTER (WHERE base_points = 5 AND match_played),
        'jokers_used',          COUNT(*) FILTER (WHERE is_joker),
        'jokers_settled',       COUNT(*) FILTER (WHERE is_joker AND match_played),
        'total_points',         COALESCE(SUM(points) FILTER (WHERE match_played), 0),
        'max_points',           COALESCE(MAX(points) FILTER (WHERE match_played), 0),
        'win_rate_pct',         COALESCE(ROUND(
                                  COUNT(*) FILTER (WHERE base_points > 0 AND match_played)::numeric
                                  / NULLIF(COUNT(*) FILTER (WHERE match_played), 0) * 100, 2
                                ), 0),
        'avg_points_per_match', COALESCE(ROUND(
                                  SUM(points) FILTER (WHERE match_played)::numeric
                                  / NULLIF(COUNT(*) FILTER (WHERE match_played), 0), 2
                                ), 0)
      ) FROM scored
    )
  ) FROM scored;
$$;

-- Allow authenticated users to call it (and anon, so it works before login too)
GRANT EXECUTE ON FUNCTION get_user_predictions(UUID) TO authenticated, anon;

-- ═══════════════════════════════════════
-- RPC: get_user_teams(user_id UUID) → JSONB
-- 
-- Returns every team the user supports (via picks), with:
--   • Team identifiers (id, name, iso, group_letter, win_pct, owner)
--   • Group standing (rank, P/W/D/L, GF/GA/GD, pts)
--   • Last 2 completed match results
--   • Next 2 upcoming fixtures
--
-- Call from JS: sb.rpc('get_user_teams', { user_id })
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_teams(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', user_id,
        'teams', COALESCE((
            WITH user_picks AS (
                SELECT t.*
                FROM picks p
                JOIN teams t ON t.id = p.team_id
                WHERE p.user_id = get_user_teams.user_id
            ),
            -- ── Group standings from completed matches ──
            group_standings AS (
                SELECT
                    t.id AS team_id,
                    t.group_letter,
                    COUNT(m.id) AS played,
                    COUNT(m.id) FILTER (
                        WHERE (m.home_team_id = t.id AND m.home_score > m.away_score)
                           OR (m.away_team_id = t.id AND m.away_score > m.home_score)
                    ) AS wins,
                    COUNT(m.id) FILTER (
                        WHERE m.home_score = m.away_score
                    ) AS draws,
                    COUNT(m.id) FILTER (
                        WHERE (m.home_team_id = t.id AND m.home_score < m.away_score)
                           OR (m.away_team_id = t.id AND m.away_score < m.home_score)
                    ) AS losses,
                    COALESCE(SUM(
                        CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END
                    ), 0) AS gf,
                    COALESCE(SUM(
                        CASE WHEN m.home_team_id = t.id THEN m.away_score ELSE m.home_score END
                    ), 0) AS ga
                FROM teams t
                LEFT JOIN matches m ON (
                    m.home_score IS NOT NULL
                    AND m.away_score IS NOT NULL
                    AND (m.home_team_id = t.id OR m.away_team_id = t.id)
                )
                GROUP BY t.id, t.group_letter
            ),
            ranked AS (
                SELECT
                    team_id,
                    played, wins, draws, losses, gf, ga,
                    (gf - ga)::INT AS gd,
                    (wins * 3 + draws)::INT AS pts,
                    ROW_NUMBER() OVER (
                        PARTITION BY group_letter
                        ORDER BY (wins * 3 + draws) DESC,
                                 (gf - ga) DESC,
                                 gf DESC,
                                 team_id ASC   -- deterministic tiebreaker
                    ) AS rank
                FROM group_standings
            )
            -- ── Assemble per-team objects ──
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id',               t.id,
                    'name',             t.name,
                    'iso',              t.iso,
                    'group_letter',     t.group_letter,
                    'win_pct',          t.win_pct,
                    'owner',            t.owner,
                    'group_standing',   jsonb_build_object(
                        'rank',     r.rank,
                        'played',   r.played,
                        'wins',     r.wins,
                        'draws',    r.draws,
                        'losses',   r.losses,
                        'gf',       r.gf,
                        'ga',       r.ga,
                        'gd',       r.gd,
                        'pts',      r.pts
                    ),
                    'recent_results',   (
                        SELECT jsonb_agg(data ORDER BY match_date DESC, kickoff_time DESC)
                        FROM (
                            SELECT m.match_date, m.kickoff_time,
                                jsonb_build_object(
                                    'match_id',  m.id,
                                    'date',      m.match_date,
                                    'opponent',  CASE WHEN m.home_team_id = t.id
                                                      THEN ta.name ELSE th.name END,
                                    'score',     format('%s-%s', m.home_score, m.away_score),
                                    'result',    CASE
                                        WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 'W'
                                        WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 'W'
                                        WHEN m.home_score = m.away_score THEN 'D'
                                        ELSE 'L'
                                    END,
                                    'venue',     CASE WHEN m.home_team_id = t.id
                                                      THEN 'home' ELSE 'away' END
                                ) AS data
                            FROM matches m
                            JOIN teams th ON th.id = m.home_team_id
                            JOIN teams ta ON ta.id = m.away_team_id
                            WHERE m.home_score IS NOT NULL
                              AND m.away_score IS NOT NULL
                              AND (m.home_team_id = t.id OR m.away_team_id = t.id)
                            ORDER BY m.match_date DESC, m.kickoff_time DESC
                            LIMIT 2
                        ) sub
                    ),
                    'upcoming_fixtures', (
                        SELECT jsonb_agg(data ORDER BY match_date ASC, kickoff_time ASC)
                        FROM (
                            SELECT m.match_date, m.kickoff_time,
                                jsonb_build_object(
                                    'match_id',    m.id,
                                    'date',        m.match_date,
                                    'time',        m.kickoff_time,
                                    'tz_offset',   m.tz_offset,
                                    'opponent',    CASE WHEN m.home_team_id = t.id
                                                        THEN ta.name ELSE th.name END,
                                    'venue',       CASE WHEN m.home_team_id = t.id
                                                        THEN 'home' ELSE 'away' END,
                                    'group',       m.group_letter,
                                    'tv_channel',  m.tv_channel,
                                    'prob_home',   m.prob_home,
                                    'prob_draw',   m.prob_draw,
                                    'prob_away',   m.prob_away
                                ) AS data
                            FROM matches m
                            JOIN teams th ON th.id = m.home_team_id
                            JOIN teams ta ON ta.id = m.away_team_id
                            WHERE (m.home_score IS NULL OR m.away_score IS NULL)
                              AND (m.home_team_id = t.id OR m.away_team_id = t.id)
                            ORDER BY m.match_date ASC, m.kickoff_time ASC
                            LIMIT 2
                        ) sub
                    )
                )
                ORDER BY t.group_letter, t.name
            )
            FROM user_picks t
            LEFT JOIN ranked r ON r.team_id = t.id
        ), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;

-- Allow authenticated users to call it (and anon, so it works before login too)
GRANT EXECUTE ON FUNCTION get_user_teams(UUID) TO authenticated, anon;

-- ═══════════════════════════════════════
-- ═══════════════════════════════════════
-- Profile Picture Storage (June 2026)
-- Run in Supabase SQL Editor.
-- Adds avatar_url to player_profiles + creates
-- the avatars storage bucket with RLS policies.
-- Safe to re-run.
-- ═══════════════════════════════════════

-- ── 1) ADD AVATAR_URL TO PLAYER_PROFILES ──

ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ── 2) CREATE AVATARS STORAGE BUCKET ─────
-- Public bucket: anyone can read, authenticated users
-- can upload/update/delete their own files.
-- Max 5 MB, images only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ── 3) STORAGE RLS POLICIES ──────────────

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar"     ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Anyone can read avatar files (bucket is public)
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Authenticated users can upload (they can only write their own files
-- by convention — file path should be {user_id}/avatar.{ext})
CREATE POLICY "Users can upload avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Only the owner can update their own file
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- Only the owner can delete their own file
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = owner);
