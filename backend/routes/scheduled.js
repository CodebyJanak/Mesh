import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

async function auth(req, res) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) { res.status(401).json({ error: 'Unauthorized.' }); return null }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) { res.status(401).json({ error: 'Invalid token.' }); return null }
  return user
}

// GET /api/scheduled — all upcoming scheduled streams
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('scheduled_streams')
    .select('*, profiles(username, avatar_url)')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(20)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/scheduled — create scheduled stream
router.post('/', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return
  const { title, category, description, scheduled_at, tags, thumbnail_url } = req.body
  if (!title || !scheduled_at) return res.status(400).json({ error: 'title and scheduled_at required.' })

  const { data, error } = await supabase.from('scheduled_streams').insert({
    user_id: user.id, title, category: category || 'General',
    description, scheduled_at, tags: tags || [], thumbnail_url
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/scheduled/:id
router.delete('/:id', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return
  await supabase.from('scheduled_streams').delete().eq('id', req.params.id).eq('user_id', user.id)
  res.json({ ok: true })
})

export default router
