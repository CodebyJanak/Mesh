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

// GET /api/analytics/overview — streamer's overall stats
router.get('/overview', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { data: streams } = await supabase
    .from('streams')
    .select('id, title, peak_viewers, total_viewers, started_at, ended_at, is_live, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!streams) return res.json({ totalStreams: 0, totalViewers: 0, peakViewers: 0, streams: [] })

  const totalStreams = streams.length
  const totalViewers = streams.reduce((sum, s) => sum + (s.total_viewers || 0), 0)
  const peakViewers = Math.max(...streams.map(s => s.peak_viewers || 0), 0)
  const liveStreams = streams.filter(s => s.is_live).length

  // Duration calc
  const totalSeconds = streams
    .filter(s => s.started_at && s.ended_at)
    .reduce((sum, s) => {
      return sum + Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 1000)
    }, 0)

  res.json({
    totalStreams,
    totalViewers,
    peakViewers,
    liveStreams,
    totalHours: Math.floor(totalSeconds / 3600),
    streams: streams.slice(0, 20)
  })
})

// GET /api/analytics/stream/:id — single stream stats
router.get('/stream/:id', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { data: stream, error } = await supabase
    .from('streams')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !stream) return res.status(404).json({ error: 'Stream not found.' })

  const { data: messages } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('stream_id', req.params.id)

  const { data: reactions } = await supabase
    .from('reactions')
    .select('id', { count: 'exact' })
    .eq('stream_id', req.params.id)

  const duration = stream.started_at && stream.ended_at
    ? Math.floor((new Date(stream.ended_at) - new Date(stream.started_at)) / 1000)
    : 0

  res.json({
    ...stream,
    chat_messages: messages?.length || 0,
    reactions_count: reactions?.length || 0,
    duration_seconds: duration
  })
})

// POST /api/analytics/save — save analytics snapshot when stream ends
router.post('/save', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { stream_id, peak_viewers, total_viewers, duration_seconds, chat_messages, reactions_count } = req.body
  if (!stream_id) return res.status(400).json({ error: 'stream_id required.' })

  const { data, error } = await supabase.from('stream_analytics').insert({
    stream_id, user_id: user.id,
    peak_viewers: peak_viewers || 0,
    total_viewers: total_viewers || 0,
    duration_seconds: duration_seconds || 0,
    chat_messages: chat_messages || 0,
    reactions_count: reactions_count || 0
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
