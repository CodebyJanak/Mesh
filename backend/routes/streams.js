import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

function generateStreamKey() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

// GET /api/streams/live
router.get('/live', async (req, res) => {
  const { category, search } = req.query
  let query = supabase
    .from('streams')
    .select('*, profiles(username)')
    .eq('is_live', true)
    .order('peak_viewers', { ascending: false })
  if (category && category !== 'All') query = query.eq('category', category)
  if (search) query = query.ilike('title', `%${search}%`)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/streams/my
router.get('/my', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token.' })
  const { data, error } = await supabase
    .from('streams').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/streams/:key
router.get('/:key', async (req, res) => {
  const { data, error } = await supabase
    .from('streams').select('*, profiles(username)').eq('stream_key', req.params.key).single()
  if (error) return res.status(404).json({ error: 'Stream not found.' })
  res.json(data)
})

// POST /api/streams/create
router.post('/create', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token.' })
  const { title, category, thumbnail_url } = req.body
  if (!title) return res.status(400).json({ error: 'Title required.' })
  const streamKey = generateStreamKey()
  const { data, error } = await supabase.from('streams').insert({
    user_id: user.id, title, category: category || 'General',
    stream_key: streamKey, thumbnail_url: thumbnail_url || null,
    is_live: true, started_at: new Date().toISOString()
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/streams/update — update title/thumbnail while live
router.patch('/update', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token.' })
  const { stream_id, title, thumbnail_url } = req.body
  if (!stream_id) return res.status(400).json({ error: 'stream_id required.' })
  const updates = {}
  if (title) updates.title = title
  if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url
  const { data, error } = await supabase
    .from('streams').update(updates).eq('id', stream_id).eq('user_id', user.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/streams/metrics
router.patch('/metrics', async (req, res) => {
  const { stream_key, peak_viewers, total_viewers } = req.body
  if (!stream_key) return res.status(400).json({ error: 'stream_key required.' })
  const updates = {}
  if (peak_viewers !== undefined) updates.peak_viewers = peak_viewers
  if (total_viewers !== undefined) updates.total_viewers = total_viewers
  const { error } = await supabase.from('streams').update(updates).eq('stream_key', stream_key)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// POST /api/streams/end
router.post('/end', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token.' })
  const { stream_id } = req.body
  if (!stream_id) return res.status(400).json({ error: 'stream_id required.' })
  const { error } = await supabase.from('streams')
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq('id', stream_id).eq('user_id', user.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Stream ended.' })
})

export default router
