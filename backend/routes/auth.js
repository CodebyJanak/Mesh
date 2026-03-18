import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body
  if (!email || !password || !username)
    return res.status(400).json({ error: 'All fields required.' })

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username }
  })

  if (error) return res.status(400).json({ error: error.message })

  // Insert profile
  await supabase.from('profiles').insert({
    id: data.user.id,
    username,
    email
  })

  res.json({ message: 'User created.', userId: data.user.id })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(401).json({ error: error.message })

  res.json({
    access_token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata?.username
    }
  })
})

export default router
