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

// GET /api/notifications
router.get('/', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
  res.json({ ok: true })
})

// POST /api/notifications/send — internal: notify followers when going live
router.post('/send', async (req, res) => {
  const { user_id, type, title, message, link } = req.body
  if (!user_id || !type || !title) return res.status(400).json({ error: 'Missing fields.' })

  const { error } = await supabase.from('notifications').insert({ user_id, type, title, message, link })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// Helper: notify all followers of a streamer (called when stream starts)
export async function notifyFollowers(streamerId, streamerUsername, streamTitle, streamKey) {
  try {
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', streamerId)

    if (!followers?.length) return

    const notifications = followers.map(f => ({
      user_id: f.follower_id,
      type: 'stream_live',
      title: `@${streamerUsername} is live!`,
      message: streamTitle,
      link: `/stream/${streamKey}`
    }))

    await supabase.from('notifications').insert(notifications)
  } catch (err) {
    console.error('[notify] failed:', err.message)
  }
}

export default router
