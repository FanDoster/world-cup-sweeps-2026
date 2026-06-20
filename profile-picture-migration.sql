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
