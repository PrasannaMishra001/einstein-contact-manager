# Einstein Contact Manager

<img src="pic.png" alt="Einstein Contact Manager" width="100%" />

A full-stack contact manager with a **local-first, conflict-free sync engine** at
its core, built with **Next.js 15** and **FastAPI**.

**By Prasanna Mishra**

---

## Live demo

- **App:** https://iiitmgwalior.vercel.app
- **One-click demo login** (or use the button on the sign-in page):
  `einstein@einstein.com` / `einstein` — pre-loaded with 100+ contacts.
- **Offline-sync demo (no login):** https://iiitmgwalior.vercel.app/crdt-demo —
  take a device offline, edit both, watch them merge with no conflicts.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, TanStack Query |
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Database | SQLite (dev) / PostgreSQL via Neon (prod) |
| Sync | Hand-rolled CRDT (Hybrid Logical Clock + LWW map + add-wins OR-Set) |
| AI | Groq llama-3.3-70b (NL search, deduplication, tags) · Gemini 2.5 Flash (OCR) |
| Storage | Cloudinary (photos) |

## Features

- **Offline sync (CRDT)** — edit on any device, even offline; changes merge
  conflict-free with no lost writes. [Design notes](frontend/lib/crdt/README.md) ·
  [live demo](https://iiitmgwalior.vercel.app/crdt-demo)
- Contact CRUD with photo upload, tags, favorites, notes, social links
- AI natural-language search, smart duplicate detection & merge
- Business card OCR (photo → contact)
- Google Contacts two-way sync
- Import/Export (CSV, vCard)
- Analytics dashboard
- Reminders (in-app) & webhooks
- QR code & shareable contact links
- Neobrutalism UI with a "Midnight Indigo" dark mode

## The CRDT engine

The differentiator. Every device keeps a full replica and reads/writes locally,
so the UI never waits on the network and works offline. Replicas reconcile by
*merging*, not "last request wins":

- **Hybrid Logical Clock** for a total, skew-tolerant event order
- **LWW map** for contact fields (concurrent edits to different fields both survive)
- **add-wins OR-Set** for tags (a concurrent re-add beats a delete)

Correctness is proven by a Vitest suite (`cd frontend && npm test`) asserting the
join-semilattice laws plus a randomized 4-replica convergence fuzz. Full write-up:
[`docs/CRDT-OFFLINE-SYNC.md`](docs/CRDT-OFFLINE-SYNC.md).

## Quick Start (Local)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # defaults to SQLite; add GROQ_API_KEY for AI features
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# Frontend (new terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8001" > .env.local
npm run dev            # http://localhost:3000
npm test               # CRDT convergence suite (Vitest)
```

- Frontend: http://localhost:3000 · API docs: http://localhost:8001/docs

## Deployment

- Frontend → [Vercel](https://vercel.com) (`rootDir: frontend`) — `iiitmgwalior.vercel.app`
- Backend → [Render](https://render.com) (`rootDir: backend`) — `einstein-backend-vaqs.onrender.com`
- Database → [Neon](https://neon.tech) (serverless PostgreSQL)

See [`docs/SETUP.md`](docs/SETUP.md) for the full walkthrough and
[`docs/ENV.md`](docs/ENV.md) for every environment variable.

## Roadmap

The project is being grown into a full local-first system in phases
([`docs/CRDT-OFFLINE-SYNC.md`](docs/CRDT-OFFLINE-SYNC.md)):

- **Phase 0 — done:** the CRDT core, tests, and the public offline demo.
- **Phase 1:** persist the real contact list to IndexedDB so the whole app is
  local-first, not just the demo.
- **Phase 2 — flagship:** **peer-to-peer sync over WebRTC** — devices exchange
  CRDT deltas directly, with the server demoted to a signaling relay (works on a
  LAN with no internet).
- **Later:** δ-state sync (only changes travel) and end-to-end encryption
  (server stores only ciphertext).

## License

MIT
