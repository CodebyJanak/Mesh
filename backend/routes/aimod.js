import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// POST /api/aimod/check — check a message for toxicity
router.post('/check', async (req, res) => {
  const { message, stream_id, username } = req.body
  if (!message) return res.status(400).json({ error: 'message required.' })

  // If no Groq key, skip AI and allow
  if (!GROQ_API_KEY) {
    return res.json({ allowed: true, reason: null })
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        max_tokens: 60,
        messages: [{
          role: 'system',
          content: 'You are a chat moderation AI. Respond ONLY with JSON: {"allowed": true/false, "reason": "string or null"}. Block spam, hate speech, threats, NSFW content. Allow normal chat.'
        }, {
          role: 'user',
          content: `Chat message: "${message}"`
        }]
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || '{"allowed":true}'
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    // Log blocked messages
    if (!result.allowed && stream_id) {
      await supabase.from('moderation_log').insert({
        stream_id, username, message,
        action: 'ai_blocked',
        reason: result.reason
      })
    }

    res.json(result)
  } catch (err) {
    console.error('[aimod] error:', err.message)
    res.json({ allowed: true, reason: null }) // fail open
  }
})

// GET /api/aimod/log/:stream_id — get moderation log
router.get('/log/:stream_id', async (req, res) => {
  const { data, error } = await supabase
    .from('moderation_log')
    .select('*')
    .eq('stream_id', req.params.stream_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
