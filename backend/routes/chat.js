import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// GET /api/chat/messages?stream_id=xxx
router.get('/messages', async (req, res) => {
  const { stream_id } = req.query
  if (!stream_id) return res.status(400).json({ error: 'stream_id required.' })

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('stream_id', stream_id)
    .order('timestamp', { ascending: true })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/chat/send
router.post('/send', async (req, res) => {
  const { stream_id, username, message } = req.body
  if (!stream_id || !username || !message)
    return res.status(400).json({ error: 'stream_id, username, and message required.' })

  const { data, error } = await supabase
    .from('messages')
    .insert({ stream_id, username, message })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
