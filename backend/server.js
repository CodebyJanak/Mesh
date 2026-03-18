import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { supabase } from './config/supabase.js'
import authRoutes from './routes/auth.js'
import streamRoutes from './routes/streams.js'
import chatRoutes from './routes/chat.js'
import livekitRoutes from './routes/livekit.js'
import moderationRoutes from './routes/moderation.js'
import reactionsRoutes from './routes/reactions.js'
import profileRoutes from './routes/profiles.js'
import recordingRoutes from './routes/recordings.js'
import analyticsRoutes from './routes/analytics.js'
import goalsRoutes from './routes/goals.js'
import scheduledRoutes from './routes/scheduled.js'
import dmsRoutes from './routes/dms.js'
import notificationsRoutes, { notifyFollowers } from './routes/notifications.js'
import aimodRoutes from './routes/aimod.js'
import vodsRoutes from './routes/vods.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
})

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/streams', streamRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/livekit', livekitRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/reactions', reactionsRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/recordings', recordingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/scheduled', scheduledRoutes)
app.use('/api/dms', dmsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/aimod', aimodRoutes)
app.use('/api/vods', vodsRoutes)

app.get('/', (req, res) => res.json({ status: 'Mesh backend running ✅', version: '5.0' }))

// State
const viewerCounts = {}
const peakViewers = {}
const totalViewers = {}
const bannedUsers = {}

// Persist metrics every 30s
setInterval(async () => {
  for (const [streamKey, count] of Object.entries(viewerCounts)) {
    if (peakViewers[streamKey]) {
      await supabase.from('streams').update({
        peak_viewers: peakViewers[streamKey] || 0,
        total_viewers: totalViewers[streamKey] || 0
      }).eq('stream_key', streamKey).eq('is_live', true)
    }
  }
}, 30000)

// AI moderation check helper
async function checkMessage(message) {
  if (!process.env.GROQ_API_KEY) return true
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192', max_tokens: 30,
        messages: [
          { role: 'system', content: 'Reply ONLY with JSON {"allowed":true} or {"allowed":false}. Block hate speech, spam, threats.' },
          { role: 'user', content: `"${message}"` }
        ]
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || '{"allowed":true}'
    const result = JSON.parse(text.replace(/```json|```/g, '').trim())
    return result.allowed !== false
  } catch { return true }
}

io.on('connection', (socket) => {

  socket.on('join_stream', (streamKey) => {
    socket.join(streamKey)
    socket.streamKey = streamKey
    viewerCounts[streamKey] = (viewerCounts[streamKey] || 0) + 1
    totalViewers[streamKey] = (totalViewers[streamKey] || 0) + 1
    if (viewerCounts[streamKey] > (peakViewers[streamKey] || 0)) {
      peakViewers[streamKey] = viewerCounts[streamKey]
    }
    io.to(streamKey).emit('viewer_count', {
      current: viewerCounts[streamKey],
      peak: peakViewers[streamKey] || 0
    })
  })

  socket.on('chat_message', async ({ streamKey, username, message, msgId }) => {
    if (!streamKey || !username || !message) return
    if (bannedUsers[streamKey]?.has(username)) {
      socket.emit('banned', { message: 'You are banned from this chat.' })
      return
    }

    // AI moderation (async, non-blocking)
    const allowed = await checkMessage(message)
    if (!allowed) {
      socket.emit('message_blocked', { reason: 'Message blocked by AI moderation.' })
      return
    }

    const payload = {
      id: msgId || `msg_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
      username, message, timestamp: new Date().toISOString()
    }
    io.to(streamKey).emit('chat_message', payload)
  })

  socket.on('delete_message', ({ streamKey, messageId }) => {
    io.to(streamKey).emit('message_deleted', { messageId })
  })

  socket.on('ban_user', ({ streamKey, username }) => {
    if (!bannedUsers[streamKey]) bannedUsers[streamKey] = new Set()
    bannedUsers[streamKey].add(username)
    io.to(streamKey).emit('user_banned', { username })
  })

  socket.on('unban_user', ({ streamKey, username }) => {
    bannedUsers[streamKey]?.delete(username)
    io.to(streamKey).emit('user_unbanned', { username })
  })

  socket.on('reaction', ({ streamKey, emoji, username }) => {
    if (!streamKey || !emoji) return
    io.to(streamKey).emit('reaction', { emoji, username })
  })

  socket.on('title_updated', ({ streamKey, title }) => {
    io.to(streamKey).emit('title_updated', { title })
  })

  socket.on('stream_live', async ({ streamKey, streamerId, streamerUsername, title }) => {
    // Notify followers
    if (streamerId && streamerUsername) {
      await notifyFollowers(streamerId, streamerUsername, title, streamKey)
    }
  })

  socket.on('stream_ended', (streamKey) => {
    io.to(streamKey).emit('stream_ended')
  })

  // DM typing indicator
  socket.on('dm_typing', ({ toUserId, fromUsername }) => {
    socket.to(`user_${toUserId}`).emit('dm_typing', { fromUsername })
  })

  // Join personal notification room
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`)
  })

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id && viewerCounts[room]) {
        viewerCounts[room] = Math.max(0, viewerCounts[room] - 1)
        io.to(room).emit('viewer_count', {
          current: viewerCounts[room],
          peak: peakViewers[room] || 0
        })
      }
    }
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`\n🔴 Mesh v5.0 running on http://localhost:${PORT}\n`)
})
