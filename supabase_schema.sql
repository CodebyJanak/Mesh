-- ================================================
-- MESH — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ================================================

-- Profiles (linked to Supabase Auth users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  created_at timestamptz default now()
);

-- Streams
create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  category text default 'General',
  stream_key text unique not null,
  is_live boolean default true,
  created_at timestamptz default now()
);

-- Viewers (optional tracking)
create table if not exists viewers (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references streams(id) on delete cascade,
  viewer_id text,
  joined_at timestamptz default now()
);

-- Chat Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references streams(id) on delete cascade not null,
  username text not null,
  message text not null,
  timestamp timestamptz default now()
);

-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================

-- Enable RLS
alter table profiles enable row level security;
alter table streams enable row level security;
alter table messages enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Public profiles read" on profiles for select using (true);
create policy "User can update own profile" on profiles for update using (auth.uid() = id);
create policy "User can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Streams: anyone can read live streams, auth users can insert/update their own
create policy "Public streams read" on streams for select using (true);
create policy "Auth users can create streams" on streams for insert with check (auth.uid() = user_id);
create policy "Users can update own streams" on streams for update using (auth.uid() = user_id);
create policy "Users can delete own streams" on streams for delete using (auth.uid() = user_id);

-- Messages: anyone can read, anyone can insert (viewers don't need accounts)
create policy "Public messages read" on messages for select using (true);
create policy "Anyone can send messages" on messages for insert with check (true);
