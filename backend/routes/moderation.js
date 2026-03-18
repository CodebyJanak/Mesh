import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// Middleware: verify streamer owns the stream
async function verifyStreamer(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { stream_id, stream_key } = req.body
  const key = stream_key || null
  const id = stream_id || null

  let query = supabase.from('streams').select('id, user_id, stream_key')
  if (id) query = query.eq('id', id)
  else if (key) query = query.eq('stream_key', key)
  else return res.status(400).json({ error: 'stream_id or stream_key required.' })

  const { data: stream, error: sErr } = await query.single()
  if (sErr || !stream) return res.status(404).json({ error: 'Stream not found.' })
  if (stream.user_id !== user.id) return res.status(403).json({ error: 'Forbidden.' })

  req.stream = stream
  req.user = user
  next()
}

// DELETE /api/moderation/message — delete a chat message
router.delete('/message', verifyStreamer, async (req, res) => {
  const { message_id } = req.body
  if (!message_id) return res.status(400).json({ error: 'message_id required.' })

  const { error } = await supabase
    .from('messages')
    .update({ deleted: true })
    .eq('id', message_id)
    .eq('stream_id', req.stream.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// POST /api/moderation/ban — ban a user from chat
router.post('/ban', verifyStreamer, async (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required.' })

  const { error } = await supabase.from('banned_users').insert({
    stream_id: req.stream.id,
    username,
    banned_by: req.user.id
  })

  if (error && error.code !== '23505') // ignore duplicate
    return res.status(500).json({ error: error.message })

  res.json({ ok: true, message: `${username} banned.` })
})

// DELETE /api/moderation/ban — unban a user
router.delete('/ban', verifyStreamer, async (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required.' })

  const { error } = await supabase
    .from('banned_users')
    .delete()
    .eq('stream_id', req.stream.id)
    .eq('username', username)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, message: `${username} unbanned.` })
})

// GET /api/moderation/banned?stream_id=xxx — list banned users
router.get('/banned', async (req, res) => {
  const { stream_id } = req.query
  if (!stream_id) return res.status(400).json({ error: 'stream_id required.' })

  const { data, error } = await supabase
    .from('banned_users')
    .select('username, created_at')
    .eq('stream_id', stream_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
