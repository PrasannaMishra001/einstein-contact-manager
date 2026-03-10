# Setup Guide

Three environments: local SQLite (dev), Docker PostgreSQL (local full-stack), Production (Render + Vercel + Neon).

## Prerequisites

- Python 3.12 or 3.13
- Node.js 20+
- Git
- Docker Desktop (Docker setup only)
- Accounts: Groq (required), Cloudinary (for photos), Resend (for email), Gemini (for OCR) — see INTEGRATIONS.md

---

## 1. Local Development (SQLite)

Best for daily development. No PostgreSQL needed, works offline.

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

The `.env` file is already configured for SQLite. Just add your API keys (GROQ_API_KEY is the only required one):

```
DATABASE_URL=sqlite+aiosqlite:///./einstein_dev.db
GROQ_API_KEY=your-key-here
```

Start the server:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

- Server: http://127.0.0.1:8001
- API docs: http://127.0.0.1:8001/docs
- SQLite DB file `einstein_dev.db` is auto-created on first run

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- `frontend/.env.local` is pre-configured to point to `http://localhost:8001`

### Verify

```bash
# Health check
curl http://localhost:8001/health
# Expected: {"status":"healthy"}

# Register
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123","full_name":"Your Name"}'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'
# Copy the access_token from the response

# Create a contact (replace TOKEN)
curl -X POST http://localhost:8001/api/contacts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Smith","phone":"+1234567890","email":"alice@example.com"}'

# List contacts
curl -H "Authorization: Bearer TOKEN" http://localhost:8001/api/contacts
```

---

## 2. Local Docker (PostgreSQL)

Runs everything in containers with a real PostgreSQL database.

### Setup

```bash
# 1. Fill in your API keys in backend/.env.docker
#    (see ENV.md — only GROQ_API_KEY is required for basic functionality)

# 2. Build and start all services
docker-compose up --build
```

Services started:
- `db` — PostgreSQL 16 on port 5432
- `backend` — FastAPI on host port **8001** (mapped from container port 8000)
- `frontend` — Next.js on port 3000

### Verify

```bash
curl http://localhost:8001/health
# Expected: {"status":"healthy"}
```

Open http://localhost:3000 in browser.

### Common commands

```bash
# Stop
docker-compose down

# Stop and delete DB volume
docker-compose down -v

# Rebuild after code changes
docker-compose up --build

# Run migrations
docker-compose exec backend alembic upgrade head

# View backend logs
docker-compose logs -f backend

# Open backend shell
docker-compose exec backend bash
```

---

## 3. Production: Render + Vercel + Neon

### 3a. Database — Neon (free tier)

1. Sign up at https://neon.tech
2. New Project → name it "einstein-contacts"
3. Dashboard → Connection Details → copy the connection string
4. Format: `postgresql+asyncpg://neondb_owner:<pw>@ep-xxx.neon.tech/neondb?sslmode=require`

Note: Neon free tier sleeps after 5 min of inactivity. First request after sleep takes 2-3s to wake. Normal behavior.

### 3b. Backend — Render (free tier)

1. Sign up at https://render.com
2. New → Web Service → connect GitHub repo
3. Settings:
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt && alembic upgrade head`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. Environment Variables (set in Render dashboard):

```
DATABASE_URL          = postgresql+asyncpg://<user>:<pw>@ep-xxx.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_URL_SYNC     = postgresql://<user>:<pw>@ep-xxx.neon.tech/neondb?sslmode=require
ENVIRONMENT           = production
SECRET_KEY            = <openssl rand -hex 32>
ALGORITHM             = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS   = 30
GROQ_API_KEY          = <from console.groq.com>
GEMINI_API_KEY        = <from aistudio.google.com>
CLOUDINARY_CLOUD_NAME = <from cloudinary.com>
CLOUDINARY_API_KEY    = <from cloudinary.com>
CLOUDINARY_API_SECRET = <from cloudinary.com>
RESEND_API_KEY        = <from resend.com>
EMAIL_FROM            = noreply@yourdomain.com
GOOGLE_CLIENT_ID      = <from Google Cloud Console>
GOOGLE_CLIENT_SECRET  = <from Google Cloud Console>
GOOGLE_REDIRECT_URI   = https://<your-render-url>/api/google/callback
FRONTEND_URL          = https://<your-vercel-url>
ALLOWED_ORIGINS       = https://<your-vercel-url>
APP_NAME              = Einstein Contact Manager
WEBHOOK_SECRET        = <random string>
```

5. Deploy. `alembic upgrade head` runs automatically on every deploy via build command.
6. Note your backend URL (e.g., `https://einstein-backend.onrender.com`)

### 3c. Frontend — Vercel (free tier)

1. Sign up at https://vercel.com
2. Import GitHub repository
3. Framework: Next.js (auto-detected)
4. Root Directory: `frontend`
5. Environment Variables:

```
NEXT_PUBLIC_API_URL  = https://<your-render-backend-url>
NEXT_PUBLIC_APP_URL  = https://<your-vercel-url>
```

6. Deploy.

### 3d. After deployment

Once both are live, update Render:
- `FRONTEND_URL` → your Vercel URL
- `ALLOWED_ORIGINS` → your Vercel URL

Update Google Cloud Console:
- OAuth Authorized Redirect URI → `https://your-render-app.onrender.com/api/google/callback`

### Verify production

```bash
curl https://your-render-app.onrender.com/health
# Expected: {"status":"healthy"}
```

---

## Database Migrations (Alembic)

Used for production PostgreSQL. SQLite dev uses auto `init_db()` and doesn't need migrations.

```bash
# After changing models — generate migration
alembic revision --autogenerate -m "describe your change"

# Apply pending migrations
alembic upgrade head

# Check status
alembic current
alembic history
```

---

## Switching Databases

In `backend/.env`, change only `DATABASE_URL`:

```bash
# SQLite (local dev)
DATABASE_URL=sqlite+aiosqlite:///./einstein_dev.db

# PostgreSQL (Docker or Neon)
DATABASE_URL=postgresql+asyncpg://einstein:einstein@localhost:5432/einstein
```

Everything else (ORM, API, migrations) works identically with both.
