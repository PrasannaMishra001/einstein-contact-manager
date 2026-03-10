# Environment Variables Reference

All backend env vars for Einstein Contact Manager. Frontend only needs `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL`.

---

## Backend (backend/.env)

### Database

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Async SQLAlchemy connection string |
| `DATABASE_URL_SYNC` | Prod only | Synchronous URL — used only by Alembic migrations |

```bash
# Local dev (SQLite — no setup needed)
DATABASE_URL=sqlite+aiosqlite:///./einstein_dev.db

# PostgreSQL (Docker or Neon)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/db?sslmode=require
DATABASE_URL_SYNC=postgresql://user:password@host:5432/db?sslmode=require
```

Note: `database.py` strips `sslmode`/`channel_binding` from the URL and passes them via `connect_args` — asyncpg rejects URL-level SSL params.

---

### JWT Auth

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | (required) | Generate: `openssl rand -hex 32`. Anyone with this can forge tokens. |
| `ALGORITHM` | `HS256` | Leave as-is |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | How long access tokens live |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | How long refresh tokens live |

---

### Groq AI

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | Yes | Free 14,400 req/day. Get from console.groq.com |

Used for: NL search, duplicate detection (AI), auto-tag, enrich, business card text parse, AI summary.
Without it: all AI features return errors. Smart duplicates (deterministic) still works.

---

### Gemini AI

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | No | Free tier available. Get from aistudio.google.com |

Used only for: photo OCR (business card image upload). Text AI uses Groq exclusively.
Without it: `/api/ai/parse-business-card-photo` returns 500.

---

### Cloudinary (Photo Storage)

| Variable | Required | Notes |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | No | From cloudinary.com dashboard |
| `CLOUDINARY_API_KEY` | No | From cloudinary.com dashboard |
| `CLOUDINARY_API_SECRET` | No | From cloudinary.com dashboard |

Used for: storing contact profile photos. Without it: photo upload fails (no local fallback).
Get from: cloudinary.com → Dashboard → API Keys section.

---

### Resend (Email)

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | No | From resend.com API Keys section |
| `EMAIL_FROM` | No | `noreply@yourdomain.com` or use `onboarding@resend.dev` for testing |

Used for: email verification, password reset emails.
Without it: registration still works, but no verification email is sent. Users are auto-verified in development.

---

### Google OAuth (Contacts Sync)

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | No | From Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | No | From Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | No | Must match exactly what's in Google Cloud Console |

```bash
# Local dev
GOOGLE_REDIRECT_URI=http://localhost:8001/api/google/callback

# Production (Render)
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/google/callback
```

Without it: Google Contacts sync is unavailable. All other features work.
See INTEGRATIONS.md for full Google Cloud Console setup steps.

---

### App Config

| Variable | Default | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | Set to `production` on Render. Controls auto-DB-init behavior. |
| `FRONTEND_URL` | `http://localhost:3000` | Used for CORS and redirect URLs |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `APP_NAME` | `Einstein Contact Manager` | Cosmetic only |
| `WEBHOOK_SECRET` | (required) | Used to sign outgoing webhook payloads |

```bash
# Local
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Production
ENVIRONMENT=production
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

## Frontend (frontend/.env.local)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL including protocol and port |
| `NEXT_PUBLIC_APP_URL` | No | Used for generating share links |

```bash
# Local dev
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production (Vercel)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Minimal Setup (Core Features Only)

To get the app running with just the essential features:

```bash
# backend/.env
DATABASE_URL=sqlite+aiosqlite:///./einstein_dev.db
SECRET_KEY=<openssl rand -hex 32>
GROQ_API_KEY=<from console.groq.com>
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8001
```

This gives you: full contact CRUD, tags, AI search, smart duplicates, reminders, analytics, import/export, QR codes, sharing.

Disabled without extra keys: photo upload (Cloudinary), email (Resend), Google Contacts sync, business card photo OCR (Gemini).
