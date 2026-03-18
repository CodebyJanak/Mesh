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

// GET /api/goals/:stream_id
router.get('/:stream_id', async (req, res) => {
  const { data, error } = await supabase
    .from('stream_goals')
    .select('*')
    .eq('stream_id', req.params.stream_id)
    .single()
  if (error) return res.json(null)
  res.json(data)
})

// POST /api/goals
router.post('/', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return
  const { stream_id, title, target_viewers } = req.body
  if (!stream_id || !title) return res.status(400).json({ error: 'stream_id and title required.' })

  const { data, error } = await supabase.from('stream_goals')
    .upsert({ stream_id, user_id: user.id, title, target_viewers: target_viewers || 100 },
      { onConflict: 'stream_id' })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/goals/:stream_id
router.delete('/:stream_id', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return
  await supabase.from('stream_goals').delete().eq('stream_id', req.params.stream_id).eq('user_id', user.id)
  res.json({ ok: true })
})

export default router
