# Einstein Contact Manager

<img src="pic.png" alt="Einstein Contact Manager" width="100%" />

A full-stack AI-powered contact management web app built with **Next.js 15** and **FastAPI**.

**By Prasanna Mishra**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, TanStack Query |
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Database | SQLite (dev) / PostgreSQL via Neon (prod) |
| AI | Groq llama-3.3-70b (NL search, deduplication, tag suggestions) · Gemini 2.5 Flash (OCR) |
| Storage | Cloudinary (photos) |
| Email | Resend |

## Features

- Contact CRUD with photo upload, tags, favorites, notes, social links
- AI natural-language search, smart duplicate detection & merge
- Business card OCR (photo → contact)
- Google Contacts two-way sync
- Import/Export (CSV, vCard)
- Analytics dashboard
- Reminders & webhooks
- QR code & shareable contact links
- Neobrutalism UI with dark mode

## Quick Start (Local)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8001
npm run dev
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8001/docs

## Deployment

- Backend → [Render](https://render.com) (Python web service, `rootDir: backend`)
- Frontend → [Vercel](https://vercel.com) (Next.js, `rootDir: frontend`)
- Database → [Neon](https://neon.tech) (serverless PostgreSQL)

See [`docs/SETUP.md`](docs/SETUP.md) for full deployment walkthrough and [`docs/ENV.md`](docs/ENV.md) for all environment variables.

## License

MIT
