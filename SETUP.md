# Einstein Contact Manager — Setup Guide

> **All services listed here are FREE and work in India.**

---

## 1. Neon (PostgreSQL Database)

**URL:** https://neon.tech

1. Sign up → **New Project** → pick region closest to you (e.g., `ap-southeast-1` for India)
2. Project created → go to **Dashboard → Connection Details**
3. Copy two strings:
   - **Pooled connection (for app):** looks like
     `postgresql://user:pwd@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   - **Direct connection (for Alembic):** same but without pooler

4. Set in `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://user:pwd@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?ssl=require
DATABASE_URL_SYNC=postgresql://user:pwd@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Google Gemini AI (AI Features)

**URL:** https://aistudio.google.com/app/apikey

1. Sign in with Google account
2. Click **Create API key** → copy it
3. Free tier: **1 million tokens/day** with `gemini-2.0-flash`

4. Set in `backend/.env`:
```
GEMINI_API_KEY=AIzaSy...your-key-here
```

---

## 3. Cloudinary (Photo Storage)

**URL:** https://cloudinary.com

1. Sign up (free) → **Dashboard**
2. You'll see your **Cloud Name**, **API Key**, and **API Secret**
3. Free tier: 25 GB storage, 25 GB bandwidth/month

4. Set in `backend/.env`:
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

---

## 4. Resend (Email / Reminders)

**URL:** https://resend.com

1. Sign up → **API Keys** → **Create API Key**
2. Free tier: **3,000 emails/month**
3. Add and verify your domain (or use their sandbox for testing)

4. Set in `backend/.env`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```
> For testing without a domain, use: `EMAIL_FROM=onboarding@resend.dev`

---

## 5. Google OAuth (Google Contacts Sync — Optional)

**URL:** https://console.cloud.google.com

1. Create project → **APIs & Services** → **Enable APIs**
2. Search and enable: **People API**
3. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs: add your backend URL + `/api/google/callback`
6. Download → note Client ID and Client Secret

7. Set in `backend/.env`:
```
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/google/callback
```

---

## 6. JWT Secret Key

Generate a secure random key:
```bash
openssl rand -hex 32
```
Set in `backend/.env`:
```
SECRET_KEY=the-64-char-hex-string-you-generated
```

---

## Local Development

### Option A: Docker (easiest)
```bash
# Requires Docker Desktop
docker compose up
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option B: Manual

**Backend:**
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
source .venv/bin/activate     # Mac/Linux
pip install -r requirements.txt

# Copy and fill in your keys
cp .env.example .env

# Run migrations (first time only)
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

**CLI (local mode, no backend needed):**
```bash
pip install -r requirements.txt
python main.py
```

---

## Deploy to Production

### Backend → Render (Free)

1. Go to https://render.com → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Python Version:** 3.12
4. **Environment Variables** → add all keys from `backend/.env.example`
5. After first deploy, run migrations:
   ```
   # In Render Shell tab:
   alembic upgrade head
   ```
6. Copy your Render URL (e.g., `https://einstein-backend.onrender.com`)

> **Note:** Free tier spins down after 15 min idle. First request takes ~30s.
> Upgrade to Starter ($7/mo) to keep it always-on.

---

### Frontend → Vercel (Free)

1. Go to https://vercel.com → New Project → Import your repo
2. **Framework Preset:** Next.js
3. **Root Directory:** `frontend`
4. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL = https://einstein-backend.onrender.com
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   ```
5. Deploy → get your URL (e.g., `https://einstein.vercel.app`)

6. Go back to Render → update `FRONTEND_URL` and `ALLOWED_ORIGINS`:
   ```
   FRONTEND_URL=https://einstein.vercel.app
   ALLOWED_ORIGINS=https://einstein.vercel.app
   ```

---

## GitHub Actions CI/CD (Auto-deploy)

Add these secrets to your repo (**Settings → Secrets → Actions**):

| Secret | Value | Where to get |
|--------|-------|--------------|
| `RENDER_DEPLOY_HOOK` | Render deploy hook URL | Render → Service → Settings → Deploy Hook |

The workflows will:
- **backend.yml** — lint + test on every push to `backend/`, auto-deploy to Render on `main`
- **frontend.yml** — type-check + build on every push to `frontend/`

---

## Complete `backend/.env` Template

```env
# Neon PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:pwd@ep-xxx.region.aws.neon.tech/neondb?ssl=require
DATABASE_URL_SYNC=postgresql://user:pwd@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Auth
SECRET_KEY=your-64-char-hex-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-secret

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Google OAuth (optional, for Google Contacts sync)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# App
ENVIRONMENT=production
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
APP_NAME=Einstein Contact Manager
```

## Complete `frontend/.env.local` Template

```env
NEXT_PUBLIC_API_URL=https://einstein-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://einstein.vercel.app
```

---

## Feature Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Contact CRUD | ✅ | Full create/read/update/delete |
| Tags with colors | ✅ | Custom tag system |
| Favorites | ✅ | Toggle per contact |
| Photo upload | ✅ | Cloudinary storage |
| AI Natural Language Search | ✅ | Gemini 2.0 Flash |
| AI Duplicate Detection | ✅ | Gemini |
| AI Auto-Tag Suggestions | ✅ | Gemini |
| AI Contact Enrichment | ✅ | Gemini |
| AI Business Card Parser | ✅ | Paste text → auto-fill |
| AI Contact Summary | ✅ | Per contact |
| QR Code Generation | ✅ | vCard format, styled |
| CSV Import/Export | ✅ | With column mapping |
| vCard (.vcf) Import/Export | ✅ | Universal format |
| JSON Export | ✅ | Full data |
| Contact Sharing | ✅ | Public link via token |
| Contact History / Timeline | ✅ | Every change tracked |
| Birthday/Anniversary Reminders | ✅ | Email via Resend |
| Analytics Dashboard | ✅ | Charts, stats, growth |
| Webhooks | ✅ | HMAC-signed events |
| Real-time Updates (SSE) | ✅ | No polling needed |
| Dark / Light Theme | ✅ | System + manual |
| PWA (installable) | ✅ | manifest.json |
| Google Contacts Sync | ✅ | Two-way, OAuth2 |
| CLI Local Mode | ✅ | Fully offline |
| CLI Cloud API Mode | ✅ | Connects to backend |
| Vercel Deploy | ✅ | vercel.json included |
| Render Deploy | ✅ | render.yaml included |
| Docker Dev | ✅ | docker-compose.yml |
| GitHub Actions CI | ✅ | Auto test + deploy |
