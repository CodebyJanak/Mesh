-- ================================================
-- MESH Phase 5 — All Features Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- ── ENGAGEMENT ──

-- Stream analytics (daily snapshots)
CREATE TABLE IF NOT EXISTS stream_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  peak_viewers integer DEFAULT 0,
  total_viewers integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  chat_messages integer DEFAULT 0,
  reactions_count integer DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Stream goals
CREATE TABLE IF NOT EXISTS stream_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_viewers integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- Tips (Ko-fi link based, just store the link)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kofi_link text,
  ADD COLUMN IF NOT EXISTS tip_message text;

-- ── DISCOVERY ──

-- Stream tags
CREATE TABLE IF NOT EXISTS stream_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE(stream_id, tag)
);

-- Scheduled streams
CREATE TABLE IF NOT EXISTS scheduled_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text DEFAULT 'General',
  description text,
  scheduled_at timestamptz NOT NULL,
  tags text[],
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- ── SOCIAL ──

-- Direct messages
CREATE TABLE IF NOT EXISTS messages_dm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Clips
CREATE TABLE IF NOT EXISTS clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  duration_seconds integer DEFAULT 30,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Subscriber badges (chat roles)
CREATE TABLE IF NOT EXISTS chat_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge text NOT NULL DEFAULT 'subscriber',
  created_at timestamptz DEFAULT now(),
  UNIQUE(streamer_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── TECHNICAL ──

-- AI moderation log
CREATE TABLE IF NOT EXISTS moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  username text,
  message text,
  action text,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- VOD (saved stream replays)
CREATE TABLE IF NOT EXISTS vods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text,
  thumbnail_url text,
  duration_seconds integer DEFAULT 0,
  views integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── RLS Policies ──
ALTER TABLE stream_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_dm ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public analytics read" ON stream_analytics FOR SELECT USING (true);
CREATE POLICY "Owner insert analytics" ON stream_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public goals read" ON stream_goals FOR SELECT USING (true);
CREATE POLICY "Owner manage goals" ON stream_goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public tags read" ON stream_tags FOR SELECT USING (true);
CREATE POLICY "Anyone insert tags" ON stream_tags FOR INSERT WITH CHECK (true);

CREATE POLICY "Public scheduled read" ON scheduled_streams FOR SELECT USING (true);
CREATE POLICY "Owner manage scheduled" ON scheduled_streams FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "DM participants read" ON messages_dm FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Auth send DM" ON messages_dm FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Public clips read" ON clips FOR SELECT USING (true);
CREATE POLICY "Owner manage clips" ON clips FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public badges read" ON chat_badges FOR SELECT USING (true);
CREATE POLICY "Streamer manage badges" ON chat_badges FOR ALL USING (auth.uid() = streamer_id);

CREATE POLICY "Own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Own update notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public vods read" ON vods FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Owner manage vods" ON vods FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Owner read modlog" ON moderation_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM streams WHERE streams.id = stream_id AND streams.user_id = auth.uid())
);
CREATE POLICY "System insert modlog" ON moderation_log FOR INSERT WITH CHECK (true);
