import express from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { supabase } from '../config/supabase.js'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router()

// POST /api/livekit/token
// Body: { streamKey, identity, isStreamer }
router.post('/token', async (req, res) => {
  const { streamKey, identity, isStreamer } = req.body

  if (!streamKey || !identity) {
    return res.status(400).json({ error: 'streamKey and identity required.' })
  }

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit not configured on server.' })
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '4h'
    })

    at.addGrant({
      roomJoin: true,
      room: streamKey,
      canPublish: isStreamer === true,      // only streamer can publish
      canSubscribe: true,                   // everyone can watch
      canPublishData: true                  // chat data messages
    })

    const token = await at.toJwt()
    res.json({ token, wsUrl: process.env.LIVEKIT_WS_URL })
  } catch (err) {
    console.error('[livekit] token error:', err)
    res.status(500).json({ error: 'Failed to generate token.' })
  }
})

export default router
