import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// GET /api/profiles/:username
router.get('/:username', async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, bio, avatar_url, follower_count, created_at')
    .eq('username', req.params.username)
    .single()

  if (error || !profile) return res.status(404).json({ error: 'Profile not found.' })

  // Get their streams
  const { data: streams } = await supabase
    .from('streams')
    .select('id, title, category, is_live, peak_viewers, created_at, stream_key, thumbnail_url')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)

  res.json({ ...profile, streams: streams || [] })
})

// PATCH /api/profiles/me — update own profile
router.patch('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { bio, avatar_url } = req.body
  const updates = { updated_at: new Date().toISOString() }
  if (bio !== undefined) updates.bio = bio
  if (avatar_url !== undefined) updates.avatar_url = avatar_url

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/profiles/follow
router.post('/follow', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { following_id } = req.body
  if (!following_id) return res.status(400).json({ error: 'following_id required.' })
  if (following_id === user.id) return res.status(400).json({ error: 'Cannot follow yourself.' })

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id
  })

  if (error && error.code !== '23505') return res.status(500).json({ error: error.message })
  res.json({ ok: true, following: true })
})

// DELETE /api/profiles/follow
router.delete('/follow', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { following_id } = req.body
  if (!following_id) return res.status(400).json({ error: 'following_id required.' })

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', following_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, following: false })
})

// GET /api/profiles/follow/status?follower_id=x&following_id=y
router.get('/follow/status', async (req, res) => {
  const { follower_id, following_id } = req.query
  if (!follower_id || !following_id) return res.status(400).json({ error: 'Both IDs required.' })

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', follower_id)
    .eq('following_id', following_id)
    .single()

  res.json({ following: !!data })
})

export default router
