import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

const ALLOWED_EMOJIS = ['❤️', '🔥', '😂', '👏', '😮', '🎉']

// POST /api/reactions — send a reaction
router.post('/', async (req, res) => {
  const { stream_id, emoji, username } = req.body
  if (!stream_id || !emoji) return res.status(400).json({ error: 'stream_id and emoji required.' })
  if (!ALLOWED_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji.' })

  const { error } = await supabase.from('reactions').insert({
    stream_id, emoji, username: username || 'viewer'
  })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// GET /api/reactions/counts?stream_id=xxx
router.get('/counts', async (req, res) => {
  const { stream_id } = req.query
  if (!stream_id) return res.status(400).json({ error: 'stream_id required.' })

  const { data, error } = await supabase
    .from('reactions')
    .select('emoji')
    .eq('stream_id', stream_id)

  if (error) return res.status(500).json({ error: error.message })

  // Count per emoji
  const counts = {}
  ALLOWED_EMOJIS.forEach(e => counts[e] = 0)
  data.forEach(r => { if (counts[r.emoji] !== undefined) counts[r.emoji]++ })
  res.json(counts)
})

export default router
