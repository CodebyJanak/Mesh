# 🚀 Mesh — Phase 4 Deployment Guide

## Pre-Deploy Checklist

Before deploying, make sure all phases are working locally:
- [ ] Auth (register/login) works
- [ ] Stream creation + shareable link works
- [ ] LiveKit video streaming works
- [ ] Chat + emoji reactions work
- [ ] Profile pages load
- [ ] Recordings save to Supabase Storage

---

## Step 1 — Supabase Storage Bucket

1. Go to **Supabase → Storage**
2. Click **"New bucket"**
3. Name: `recordings`
4. Toggle **Public bucket: OFF** (private, signed URLs only)
5. Click **Create bucket**
6. Go to **Storage → Policies** → Add policy for `recordings`:
   - Allow authenticated users to upload/download their own files

Or run this SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users download own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Step 2 — Deploy Backend to Render

### 2.1 Push backend to GitHub
```bash
cd mesh/backend
git init
git add .
git commit -m "Mesh backend v1"
git remote add origin https://github.com/JnkVasani/mesh-backend.git
git push -u origin main
```

### 2.2 Create Render Web Service
1. Go to **render.com** → New → **Web Service**
2. Connect your GitHub repo (`mesh-backend`)
3. Configure:
   - **Name**: `mesh-backend`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free

### 2.3 Add Environment Variables on Render
Go to your service → **Environment** → Add these:

| Key | Value |
|-----|-------|
| `PORT` | `5000` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `your_service_role_key` |
| `JWT_SECRET` | `any_random_string_32chars` |
| `FRONTEND_URL` | `https://your-app.vercel.app` ← fill after Step 3 |
| `LIVEKIT_API_KEY` | `APIxxxxxxxxx` |
| `LIVEKIT_API_SECRET` | `your_livekit_secret` |
| `LIVEKIT_WS_URL` | `wss://your-project.livekit.cloud` |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` |
| `APP_NAME` | `Mesh` |

4. Click **Save Changes** → Render will auto-deploy
5. Copy your backend URL: `https://mesh-backend.onrender.com`

---

## Step 3 — Deploy Frontend to Vercel

### 3.1 Push frontend to GitHub
```bash
cd mesh/frontend
git init
git add .
git commit -m "Mesh frontend v1"
git remote add origin https://github.com/JnkVasani/mesh-frontend.git
git push -u origin main
```

### 3.2 Create Vercel Project
1. Go to **vercel.com** → New Project
2. Import your `mesh-frontend` repo
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`

### 3.3 Add Environment Variables on Vercel
Go to project → **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your_anon_public_key` |
| `VITE_BACKEND_URL` | `https://mesh-backend.onrender.com` |

6. Click **Deploy**
7. Copy your frontend URL: `https://mesh-frontend.vercel.app`

### 3.4 Update Render FRONTEND_URL
Go back to Render → your backend → Environment:
- Update `FRONTEND_URL` to your Vercel URL
- Render will redeploy automatically

---

## Step 4 — Update Supabase Auth Settings

1. Go to **Supabase → Authentication → URL Configuration**
2. Set **Site URL**: `https://mesh-frontend.vercel.app`
3. Add to **Redirect URLs**: `https://mesh-frontend.vercel.app/**`
4. Save

---

## ✅ Full Environment Variables Checklist

### Backend (.env / Render)
```
PORT=5000
SUPABASE_URL=                    ← from Supabase Project Settings > API
SUPABASE_SERVICE_KEY=            ← service_role key (keep SECRET)
JWT_SECRET=                      ← any random 32+ char string
FRONTEND_URL=                    ← your Vercel URL
LIVEKIT_API_KEY=                 ← from cloud.livekit.io
LIVEKIT_API_SECRET=              ← from cloud.livekit.io
LIVEKIT_WS_URL=                  ← wss://xxx.livekit.cloud
RESEND_API_KEY=                  ← from resend.com (optional)
RESEND_FROM_EMAIL=               ← your sender email
APP_NAME=Mesh
```

### Frontend (.env / Vercel)
```
VITE_SUPABASE_URL=               ← same as backend SUPABASE_URL
VITE_SUPABASE_ANON_KEY=         ← anon/public key (NOT service_role)
VITE_BACKEND_URL=                ← your Render backend URL
```

---

## Step 5 — Verify Deployment

Test these in order after deploying:

- [ ] `https://your-app.vercel.app` loads
- [ ] Register a new account
- [ ] Go to Dashboard → Create a stream → shareable link works
- [ ] Open link in incognito → viewer page loads
- [ ] Chat messages send/receive
- [ ] Emoji reactions float up
- [ ] Profile page loads at `/profile/yourusername`
- [ ] Follow another user works

---

## Free Tier Limits Summary

| Service | Free Limit |
|---------|-----------|
| Supabase | 500MB DB, 1GB Storage, 50MB file uploads |
| LiveKit Cloud | 25GB/month bandwidth |
| Render | 750hrs/month (sleeps after 15min inactivity) |
| Vercel | 100GB bandwidth/month |
| Resend | 3,000 emails/month |

### ⚠️ Render Free Tier Note
Render free services **sleep after 15 minutes** of inactivity and take ~30s to wake up. To avoid this:
- Upgrade to Render Starter ($7/mo), OR
- Use a free uptime monitor like **UptimeRobot** to ping your backend every 5 minutes

UptimeRobot setup:
1. Go to uptimerobot.com → free account
2. Add monitor → HTTP(s)
3. URL: `https://mesh-backend.onrender.com`
4. Interval: 5 minutes
