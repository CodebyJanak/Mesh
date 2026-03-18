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

// GET /api/dms/conversations — list all DM conversations
router.get('/conversations', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { data, error } = await supabase
    .from('messages_dm')
    .select('*, sender:sender_id(id, username:raw_user_meta_data->>username), receiver:receiver_id(id, username:raw_user_meta_data->>username)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Group by conversation partner
  const conversations = {}
  data.forEach(msg => {
    const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    if (!conversations[partnerId]) {
      conversations[partnerId] = {
        partnerId,
        partnerUsername: msg.sender_id === user.id
          ? (msg.receiver?.username || partnerId)
          : (msg.sender?.username || partnerId),
        lastMessage: msg.message,
        lastAt: msg.created_at,
        unread: 0
      }
    }
    if (msg.receiver_id === user.id && !msg.read) {
      conversations[partnerId].unread++
    }
  })

  res.json(Object.values(conversations))
})

// GET /api/dms/:partnerId — get messages with a user
router.get('/:partnerId', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { data, error } = await supabase
    .from('messages_dm')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${req.params.partnerId}),and(sender_id.eq.${req.params.partnerId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  // Mark as read
  await supabase.from('messages_dm')
    .update({ read: true })
    .eq('sender_id', req.params.partnerId)
    .eq('receiver_id', user.id)
    .eq('read', false)

  res.json(data)
})

// POST /api/dms — send a DM
router.post('/', async (req, res) => {
  const user = await auth(req, res)
  if (!user) return

  const { receiver_id, message } = req.body
  if (!receiver_id || !message) return res.status(400).json({ error: 'receiver_id and message required.' })
  if (receiver_id === user.id) return res.status(400).json({ error: 'Cannot DM yourself.' })

  const { data, error } = await supabase.from('messages_dm').insert({
    sender_id: user.id, receiver_id, message
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
