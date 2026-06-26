# Einstein Contact Manager — Architecture & Deep Explanation

> A from-scratch walkthrough of how this project is built, so you can re-learn
> the whole system quickly and explain any part of it in an interview.

---

## 1. What it is, in one paragraph

Einstein is a **full-stack, multi-user contact manager**. A logged-in user owns a
private set of contacts (name, phone, email, company, photo, tags, notes, social
links, birthdays). On top of plain CRUD it adds: natural-language search,
duplicate detection + merge, business-card OCR, Google Contacts two-way sync,
CSV/vCard import-export, an analytics dashboard, reminders, webhooks, and
shareable contact links. It is split into a **Next.js frontend** and a
**FastAPI backend** that talk over a REST API, backed by **PostgreSQL**.

---

## 2. The big picture (request lifecycle)

```
Browser (React)                Vercel Edge              Render (FastAPI)        Neon
─────────────────              ───────────              ─────────────────       ──────
[ app/page.tsx, lib/api.ts ]
   axios → /api/auth/login  ──► rewrite /api/:path* ──► uvicorn app.main:app ──► Postgres
                                (next.config.ts)         routers → services      (async
   ◄──────────────────── JSON { access_token, ... } ◄──────────────────────────  SQLAlchemy)
```

1. The browser runs the Next.js app (hosted on **Vercel**, `iiitmgwalior.vercel.app`).
2. `frontend/lib/api.ts` creates an axios client with `baseURL = NEXT_PUBLIC_API_URL + "/api"`.
   In production the request hits `/api/...` on the Vercel origin, and
   `frontend/next.config.ts`'s `rewrites()` proxies it to the real backend.
3. The backend (**FastAPI on Render**) routes the request to a router, which calls
   a service and the database layer.
4. Data lives in **Neon** (serverless PostgreSQL). SQLAlchemy async talks to it.

**Why this split?** Frontend and backend scale and deploy independently; the
frontend is static/edge-cached, the backend is a stateful API. The `rewrites()`
trick means the browser only ever calls its own origin (no CORS headaches in the
common path).

---

## 3. Frontend (`frontend/`)

**Stack:** Next.js 15 App Router · React · Tailwind CSS · TanStack Query · axios ·
next-themes · react-hook-form · lucide-react icons.

```
app/
  layout.tsx              # root layout, fonts, <Providers>
  page.tsx                # public landing page (the "homescreen")
  (auth)/login, register  # route group — auth screens, no sidebar
  (dashboard)/            # route group — app screens, WITH sidebar
     contacts/            #   list + [id] detail
     ai/                  #   natural-language search UI
     analytics/           #   charts
     google-sync/ import/ reminders/ settings/
  share/[token]/          # public read-only shared contact
components/
  providers.tsx           # QueryClientProvider + ThemeProvider + Toaster
  ThemeToggle.tsx         # light/dark switch (next-themes)
  layout/Sidebar.tsx
  contacts/ContactTable.tsx, ContactForm.tsx
lib/
  api.ts                  # axios instance + every typed API call
  utils.ts
types/                    # shared TS types mirroring backend schemas
app/globals.css           # neo-brutalism design tokens + dark theme
tailwind.config.ts        # color tokens (hsl vars), neo shadows
```

**Key ideas:**
- **Route groups** `(auth)` and `(dashboard)` let two different layouts coexist
  without affecting the URL. `/login` has no sidebar; `/contacts` does.
- **TanStack Query** (`providers.tsx`) caches server state, dedupes requests,
  and revalidates — so the UI feels instant and you avoid hand-rolling loading
  state everywhere.
- **Auth tokens** live in `localStorage`. `lib/api.ts` has two interceptors:
  one attaches `Authorization: Bearer <access_token>` to every request; the
  other catches a `401`, calls `/auth/refresh` with the refresh token, retries
  the original request once, and on failure redirects to `/login`.
- **Theming** is `next-themes` with `attribute="class"` → it toggles a `.dark`
  class on `<html>`. All colors are CSS variables in `globals.css` (`:root` for
  light, `.dark` for the Midnight-Indigo night theme), surfaced to Tailwind via
  `tailwind.config.ts` (`hsl(var(--card))` etc.). Components that use the
  semantic classes (`bg-card`, `text-foreground`) adapt automatically.

---

## 4. Backend (`backend/app/`)

**Stack:** FastAPI · async SQLAlchemy 2.0 · Alembic (migrations) · Pydantic
(schemas) · python-jose / passlib (JWT + hashing) · httpx (outbound calls).

```
main.py            # builds the FastAPI app, mounts all routers under /api, /health
config.py          # pydantic-settings: reads env vars (DB url, API keys, ...)
database.py        # async engine + session, declarative Base, get_db() dependency
auth.py            # password hashing + JWT create/decode + get_current_user dep
models/models.py   # SQLAlchemy ORM tables (see §5)
schemas/schemas.py # Pydantic request/response models (the API contract)
api/               # one router per feature area:
   auth.py            register / login / refresh / me / change-password
   contacts.py        CRUD, favorite, archive, share-token
   ai.py              NL search, duplicate detection, tag suggestions  (Groq)
   import_export.py   CSV + vCard in/out, business-card OCR            (Gemini)
   analytics.py       aggregate stats for the dashboard
   sharing.py         public shared-contact endpoints
   reminders.py       birthday/anniversary/custom reminders
   webhooks.py        register URLs, fire events
   sse.py             Server-Sent Events stream for live updates
   google.py          Google OAuth + Contacts two-way sync
services/          # logic that isn't HTTP:
   ai_service.py          Groq llama-3.3-70b prompts
   entity_resolution.py   deterministic duplicate scoring/merge
   cloudinary_service.py  photo upload
   email_service.py       Resend transactional email
   vcard_service.py       vCard (de)serialization
   qr_service.py          QR code generation
```

**Request → router → service → DB** is the spine. Routers stay thin (validate,
call a service, return a schema); services hold the real logic; `get_db()`
injects an async session per request.

**Auth flow (`auth.py`):**
- Passwords hashed with bcrypt (passlib).
- `create_access_token` (short-lived) + `create_refresh_token` (long-lived),
  both JWTs signed with `SECRET_KEY`/`HS256`.
- `get_current_user` is a FastAPI dependency that decodes the bearer token and
  loads the `User`; every protected route depends on it.

---

## 5. Data model (`models/models.py`)

Seven tables, all per-user (multi-tenant by `user_id`):

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | account | email (unique), `hashed_password`, `google_access_token/refresh_token` |
| `contacts` | the core entity | name, phone, email, company, `address`/`social_links` (JSON), birthday, `photo_url`, `is_favorite`, `is_archived`, `google_resource_name`, `share_token` |
| `tags` | user-defined labels | name, color; unique per `(user_id, name)` |
| `contact_tags` | many-to-many join | `(contact_id, tag_id)` composite PK |
| `contact_history` | audit log | `action`, `old_data`/`new_data` (JSON) — powers undo/history |
| `reminders` | scheduled nudges | `reminder_type`, `remind_at`, `is_sent` |
| `webhooks` | outbound integrations | `url`, `events` (JSON list), `secret` |

IDs are UUID strings. `address`, `social_links`, `old/new_data`, `events` use
JSON columns for flexible, schema-light fields. Indexes on `contacts(user_id,
name)` keep per-user list/search fast.

> Note for the CRDT extension (see `CRDT-OFFLINE-SYNC.md`): today every write is
> a destructive `UPDATE` on a row, and "real-time" is a one-way SSE push. That is
> exactly the seam the offline-first / CRDT work replaces.

---

## 6. How each headline feature actually works

- **AI natural-language search** — `api/ai.py` + `services/ai_service.py`. The
  query string is sent to **Groq (llama-3.3-70b)** with a prompt that converts
  "work contacts in Bangalore" into structured filters, which become a SQL query.
- **Smart deduplication & merge** — `services/entity_resolution.py`. Deterministic
  scoring (normalized name/phone/email similarity) groups likely duplicates;
  the AI only assists the final merge suggestion, so you don't burn API quota.
- **Business-card OCR** — `api/import_export.py` → **Gemini 2.5 Flash** reads a
  photo and returns structured fields that pre-fill a new contact.
- **Google Contacts sync** — `api/google.py`. OAuth gives access/refresh tokens
  (stored on `users`); `google_resource_name` on a contact links it to the
  Google-side record for two-way sync.
- **Import/Export** — CSV and **vCard** via `services/vcard_service.py`.
- **Photos** — uploaded to **Cloudinary**, only the URL stored (`photo_url`).
- **Reminders & email** — `api/reminders.py` + `services/email_service.py`
  (**Resend**) for birthday/anniversary nudges.
- **Real-time updates** — `api/sse.py` streams Server-Sent Events so an open tab
  updates when data changes.
- **Webhooks** — `api/webhooks.py` POSTs signed events to user-registered URLs.
- **Sharing / QR** — `api/sharing.py` + `services/qr_service.py`; a `share_token`
  exposes a single contact read-only at `/share/[token]`.

---

## 7. Deployment & the cold-start gotcha

| Piece | Host | Notes |
|---|---|---|
| Frontend | **Vercel** | `rootDir: frontend`, env `NEXT_PUBLIC_API_URL` |
| Backend | **Render** (free) | `render.yaml`, `uvicorn app.main:app` |
| Database | **Neon** | serverless Postgres, `DATABASE_URL` |

**Why login/registration "stops working":** Render's free tier **sleeps the
service after ~15 min idle**. The next request must cold-start it (~45 s,
verified). During that wait the UI looks frozen, so it feels broken — but the
backend, DB, and keys are all fine (a warm login takes ~3 s). Fixes:
1. **Keep-warm pinger** hitting `/health` every ~10 min (cron-job.org / UptimeRobot / GitHub Action).
2. **UX**: show "waking the server, ~45 s" on the auth buttons.
3. **Pin `SECRET_KEY`** in `render.yaml` (it currently uses `generateValue: true`,
   so every redeploy invalidates all existing JWTs and logs everyone out).

---

## 8. Run it locally

```bash
# Backend
cd backend && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt && cp .env.example .env   # fill keys
uvicorn app.main:app --port 8001 --reload                 # docs at :8001/docs

# Frontend
cd frontend && npm install
echo NEXT_PUBLIC_API_URL=http://localhost:8001 > .env.local
npm run dev                                                # http://localhost:3000
```
