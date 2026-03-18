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

// GET /api/vods — public VODs
router.get('/', async (req, res) => {
  const { username, limit = 20 } = req.query
  let query = supabase
    .from('vods')
    .select('*, profiles(username, avatar_url)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (username) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
    if (profile) query = query.eq('user_id', profile.id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/vods/:id — single VOD with signed URL
router.get('/:id', async (req, res) => {
  const { data: vod, error } = await supabase
    .from('vods')
    .select('*, profiles(username)')
    .eq('id', req.params.id)
    .single()

  if (error || !vod) return res.status(404).json({ error: 'VOD not found.' })

  // Increment views
  await supabase.from('vods').update({ views: (vod.views || 0) + 1 }).eq('id', vod.id)

  // Get signed URL if file exists
  let playback_url = null
  if (vod.file_path) {
    const { data } = await supabase.storage.from('recordings').createSignedUrl(vod.file_path, 7200)
    playback_url = data?.signedUrl
  }

  res.json({ ...vod, playback_url })
})

// POST /api/vods — save recording as VOD
router.post('/', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { stream_id, title, file_path, thumbnail_url, duration_seconds, is_public } = req.body
  if (!stream_id || !title) return res.status(400).json({ error: 'stream_id and title required.' })

  const { data, error } = await supabase.from('vods').insert({
    stream_id, user_id: user.id, title,
    file_path, thumbnail_url, duration_seconds: duration_seconds || 0,
    is_public: is_public !== false
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/vods/:id
router.patch('/:id', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { title, is_public, thumbnail_url } = req.body
  const updates = {}
  if (title !== undefined) updates.title = title
  if (is_public !== undefined) updates.is_public = is_public
  if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url

  const { data, error } = await supabase.from('vods')
    .update(updates).eq('id', req.params.id).eq('user_id', user.id).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/vods/:id
router.delete('/:id', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { data: vod } = await supabase.from('vods').select('file_path').eq('id', req.params.id).eq('user_id', user.id).single()
  if (vod?.file_path) await supabase.storage.from('recordings').remove([vod.file_path])
  await supabase.from('vods').delete().eq('id', req.params.id).eq('user_id', user.id)
  res.json({ ok: true })
})

export default router
