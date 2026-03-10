# Einstein Contact Manager — Docs

AI-powered contact management. Next.js 15 frontend + FastAPI backend.

## Documents

| File | What it covers |
|------|---------------|
| [SETUP.md](SETUP.md) | Local (SQLite), Docker (PostgreSQL), Production (Render + Vercel), verification commands |
| [ENV.md](ENV.md) | Every environment variable — what it does, where to get it, what breaks without it |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Neon, Groq, Gemini, Cloudinary, Resend, Google OAuth — setup steps for each |
| [APP_FEATURES.md](APP_FEATURES.md) | Complete feature reference — auth, contacts, AI, import/export, webhooks, reminders |

## Quick start (local)

```bash
# Backend (run in backend/)
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# Frontend (new terminal, run in frontend/)
npm install && npm run dev
```

- Backend: http://localhost:8001  |  API docs: http://localhost:8001/docs
- Frontend: http://localhost:3000

## Ports

| Service | Local dev | Docker |
|---------|-----------|--------|
| Backend | 8001 | host 8001 → container 8000 |
| Frontend | 3000 | 3000 |
| PostgreSQL | n/a | 5432 |
