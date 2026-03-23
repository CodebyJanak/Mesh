# 🔴 Mesh — Live Streaming Platform

> Phase 1 MVP: Auth · Dashboard · Discover · Real-time Chat Setup

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express + Socket.IO |
| Database + Auth | Supabase (free tier) |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Phase 1 Setup Guide

### Step 1 — Supabase Setup (Free)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open **SQL Editor** and paste the contents of `supabase_schema.sql` → Run
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (for backend only — keep secret!)

---

### Step 2 — Frontend Setup

```bash
cd frontend
cp .env.example .env
# Fill in your Supabase URL and anon key in .env
npm install
npm run dev
```

Your frontend runs at: `http://localhost:5173`

---

### Step 3 — Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Supabase URL, service key, and a random JWT_SECRET
npm install
npm run dev
```

Your backend runs at: `http://localhost:5000`

---

## Environment Variables

### frontend/.env
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_URL=http://localhost:5000
```

### backend/.env
```
PORT=5000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=some_random_string_here
FRONTEND_URL=http://localhost:5173
```

---

## Project Structure

```
mesh/
├── frontend/
│   ├── src/
│   │   ├── components/     # Navbar
│   │   ├── context/        # AuthContext
│   │   ├── lib/            # Supabase client
│   │   └── pages/          # Home, Login, Register, Dashboard, Discover
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── config/             # Supabase admin client
│   ├── routes/             # auth.js, streams.js, chat.js
│   ├── server.js           # Express + Socket.IO main server
│   └── package.json
│
└── supabase_schema.sql     # Run this in Supabase SQL Editor
```

---

## API Endpoints (Backend)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/streams/live` | Get all live streams |
| GET | `/api/streams/:key` | Get stream by key |
| POST | `/api/streams/create` | Create stream (auth required) |
| POST | `/api/streams/end` | End stream (auth required) |
| GET | `/api/chat/messages?stream_id=` | Get chat history |
| POST | `/api/chat/send` | Send chat message |

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_stream` | client → server | Join a stream room |
| `viewer_count` | server → client | Updated viewer count |
| `chat_message` | both | Send / receive chat messages |

---

## What's in Phase 1

- ✅ User registration & login (Supabase Auth)
- ✅ Streamer dashboard with stream creation
- ✅ Stream key generation + shareable link
- ✅ Start / end stream controls
- ✅ Stream history
- ✅ Public Discover page (all live streams)
- ✅ Category filtering on Discover
- ✅ Socket.IO backend for real-time viewer counts + chat
- ✅ Full dark hacker UI (Syne + JetBrains Mono, teal/neon accents)

## Coming in Phase 2

- WebRTC browser streaming (LiveKit SDK)
- Viewer page with video player
- Live viewer count wired to Socket.IO

## Coming in Phase 3

- Live chat UI on viewer page
- OBS RTMP stream key support
- Streamer metrics (duration, peak viewers)

---

## Deploy (Free)

**Backend → Render**
1. Push `backend/` folder to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all `.env` variables in Render dashboard

**Frontend → Vercel**
1. Push `frontend/` folder to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all `VITE_` env variables
4. Deploy

