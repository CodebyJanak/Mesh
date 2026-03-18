-- ================================================
-- MESH Phase 3 — Database Schema Additions
-- Run this in Supabase SQL Editor
-- ================================================

-- Add new columns to streams table
ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS peak_viewers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_viewers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Banned users per stream
CREATE TABLE IF NOT EXISTS banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  username text NOT NULL,
  banned_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(stream_id, username)
);

-- Emoji reactions
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  username text,
  created_at timestamptz DEFAULT now()
);

-- Add message_id to messages for deletion support
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;

-- RLS for new tables
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public banned_users read" ON banned_users FOR SELECT USING (true);
CREATE POLICY "Streamer can ban" ON banned_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Streamer can unban" ON banned_users FOR DELETE USING (true);

CREATE POLICY "Public reactions read" ON reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can react" ON reactions FOR INSERT WITH CHECK (true);
