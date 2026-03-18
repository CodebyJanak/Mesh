import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// POST /api/recordings — save recording metadata after upload
router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { stream_id, file_path, file_size, duration_seconds } = req.body
  if (!stream_id || !file_path) return res.status(400).json({ error: 'stream_id and file_path required.' })

  const { data, error } = await supabase.from('recordings').insert({
    stream_id, user_id: user.id,
    file_path, file_size: file_size || 0,
    duration_seconds: duration_seconds || 0
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/recordings — list own recordings
router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { data, error } = await supabase
    .from('recordings')
    .select('*, streams(title, category)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Generate signed URLs for each recording
  const recordingsWithUrls = await Promise.all(data.map(async (rec) => {
    const { data: urlData } = await supabase.storage
      .from('recordings')
      .createSignedUrl(rec.file_path, 3600) // 1hr expiry
    return { ...rec, download_url: urlData?.signedUrl || null }
  }))

  res.json(recordingsWithUrls)
})

// DELETE /api/recordings/:id
router.delete('/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  // Get recording to find file path
  const { data: rec, error: fetchErr } = await supabase
    .from('recordings').select('*').eq('id', req.params.id).eq('user_id', user.id).single()

  if (fetchErr || !rec) return res.status(404).json({ error: 'Recording not found.' })

  // Delete from storage
  await supabase.storage.from('recordings').remove([rec.file_path])

  // Delete from DB
  await supabase.from('recordings').delete().eq('id', req.params.id)

  res.json({ ok: true })
})

// POST /api/recordings/upload-url — get signed upload URL
router.post('/upload-url', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized.' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' })

  const { stream_key } = req.body
  if (!stream_key) return res.status(400).json({ error: 'stream_key required.' })

  const filePath = `${user.id}/${stream_key}_${Date.now()}.webm`

  const { data, error } = await supabase.storage
    .from('recordings')
    .createSignedUploadUrl(filePath)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ upload_url: data.signedUrl, file_path: filePath, token: data.token })
})

export default router
