# Third-Party Integrations Reference

Full details on every external service integrated into Einstein Contact Manager.

---

## 1. Neon — Serverless PostgreSQL

**Used for:** Production database
**Free tier:** 0.5 GB storage, 1 compute unit, scales to zero after 5 min inactivity
**URL:** https://neon.tech

### How it works

Neon provides a serverless PostgreSQL database with connection pooling via pgBouncer. The connection string uses `asyncpg` as the driver with SSL required.

### Setup steps

1. Create account at https://neon.tech
2. New Project > choose region closest to your Render deployment (e.g., `ap-southeast-1` for India)
3. Dashboard > Connection Details > copy the connection string
4. Switch the protocol from `postgresql://` to `postgresql+asyncpg://` for async use

### Important: Scale-to-zero

The free tier automatically suspends after 5 minutes of inactivity. The first query after suspension takes 2-3 seconds for the database to wake up. This is expected and normal for the free tier.

To prevent this in production:
- Render's health check endpoint (`/health`) pings every 30 seconds, which keeps Neon awake
- You can also set a cron job to ping the API every 4 minutes

### Connection string format

```
postgresql+asyncpg://neondb_owner:PASSWORD@ep-NAME.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Note: The `channel_binding=require` parameter is stripped by our `database.py` code since asyncpg does not support it. SSL is applied via a context object instead.

---

## 2. Groq — AI Text Processing

**Used for:** Natural language search, duplicate detection, tag suggestions, contact enrichment, business card text parsing, contact summaries
**Model:** llama-3.3-70b-versatile
**Free tier:** 14,400 requests/day, no billing required
**URL:** https://console.groq.com

### How it works

Groq runs Meta's Llama 3.3 70B model on custom LPU (Language Processing Unit) hardware — extremely fast inference. The API is OpenAI-compatible. We use the `groq` Python SDK.

### Setup steps

1. Go to https://console.groq.com
2. Sign in with Google (no credit card required)
3. API Keys > Create API Key
4. Copy key starting with `gsk_`

### What each AI feature does

- **Natural Language Search** (`POST /api/ai/search`): Sends all contact summaries to Groq, asks it to identify which contacts match the query.
- **Duplicate Detection** (`GET /api/ai/duplicates`): Sends all contact names/emails/phones, asks Groq to identify likely duplicates.
- **Smart Duplicates** (`GET /api/ai/smart-duplicates`): Deterministic version using string similarity — does NOT use Groq. Free and instant.
- **Tag Suggestions** (`POST /api/ai/auto-tag`): Given a contact's data, suggests relevant tags from the user's existing tag list.
- **Enrich Contact** (`POST /api/ai/enrich`): Suggests likely missing fields (company, job title) based on other available data.
- **Business Card Text** (`POST /api/ai/parse-business-card`): Parses raw text pasted from a business card.
- **Contact Summary** (`GET /api/ai/{id}/summary`): Generates a 2-3 sentence professional bio for CRM display.

### Rate limits (free tier)

- 14,400 requests/day
- 6,000 requests/minute
- 30 requests/minute per model

---

## 3. Gemini 2.5 Flash — Photo OCR

**Used for:** Business card photo scanning (image to contact fields)
**Model:** gemini-2.5-flash
**Free tier:** 1,500 requests/day, no billing required
**URL:** https://aistudio.google.com

### How it works

Gemini 2.5 Flash is Google's multimodal model — it accepts images directly and can read/interpret them. We send the business card image as a PIL Image object, and Gemini extracts structured contact fields (name, phone, email, company, job title, address).

### Setup steps

1. Go to https://aistudio.google.com
2. Sign in with Google (no billing required for free tier)
3. Get API Key > Create API key in new project
4. Copy key starting with `AIza`

### What it does

Endpoint: `POST /api/ai/parse-business-card-photo`

Accepts: multipart/form-data with `file` field (JPEG, PNG, WebP, GIF)

Response:
```json
{
  "parsed": {
    "name": "John Smith",
    "phone": "+1 (555) 123-4567",
    "email": "john@acmecorp.com",
    "company": "Acme Corporation",
    "job_title": "Senior Engineer",
    "address": {"city": "New York", "country": "USA"}
  }
}
```

### Difference from text parsing

- `POST /api/ai/parse-business-card` — accepts plain text (uses Groq)
- `POST /api/ai/parse-business-card-photo` — accepts image file (uses Gemini OCR)

---

## 4. Cloudinary — Photo Storage

**Used for:** Contact profile photos (upload, delete, URL generation)
**Free tier:** 25 GB storage, 25 GB bandwidth/month
**URL:** https://cloudinary.com

### How it works

When a user uploads a photo for a contact, the image bytes are sent to Cloudinary's API. Cloudinary returns a permanent URL which is stored in the `contacts.photo_url` database column. When a contact is deleted or a new photo is uploaded, the old image is deleted from Cloudinary to save storage.

### Setup steps

1. Create account at https://cloudinary.com
2. Dashboard > Product Environment Credentials
3. Copy: Cloud Name, API Key, API Secret

### Storage structure

Photos are stored at path: `contacts/{user_id}/{contact_id}`

This means each user's photos are isolated by user ID, and each contact has at most one photo at a predictable path.

### Supported formats

JPEG, PNG, WebP, GIF (enforced by the upload endpoint)

---

## 5. Resend — Transactional Email

**Used for:** Reminder emails, contact sharing emails, welcome emails
**Free tier:** 3,000 emails/month, 100/day
**URL:** https://resend.com

### How it works

The `resend` Python SDK is used to send HTML emails. The `email_service.py` service handles reminder notifications triggered by the background task scheduler.

### Setup steps

1. Create account at https://resend.com
2. API Keys > Create API Key
3. Copy key starting with `re_`
4. For production: Domains > Add Domain > verify DNS records

### Sender address

- Testing: Use `onboarding@resend.dev` (Resend's verified testing address)
- Production: Must verify your own domain (add TXT, MX, DKIM DNS records)

### What emails are sent

- Reminder notifications (birthday, anniversary, custom)
- Contact share (when a contact's public share URL is created)
- Welcome email on registration

---

## 6. Google OAuth — Contacts Sync

**Used for:** Importing and syncing contacts from Google Contacts (Google People API)
**Free tier:** Google People API is free (no billing for personal use)
**URL:** https://console.cloud.google.com

### How it works

OAuth 2.0 flow:
1. User clicks "Connect Google Contacts"
2. Browser redirects to Google's consent screen
3. User approves access to Google Contacts
4. Google redirects back to `GOOGLE_REDIRECT_URI` with an authorization code
5. Backend exchanges the code for access + refresh tokens
6. Tokens are stored encrypted in the user's database row
7. Contacts are fetched from Google People API and imported

### Setup steps

1. Go to https://console.cloud.google.com
2. Create project (or use existing)
3. Enable People API: APIs & Services > Enable APIs > search "People API"
4. Create OAuth credentials: APIs & Services > Credentials > Create OAuth Client ID
5. Application type: Web Application
6. Add Authorized Redirect URIs:
   - `http://localhost:8001/api/google/callback` (development)
   - `https://your-render-url.onrender.com/api/google/callback` (production)
7. Copy Client ID and Client Secret

### OAuth scopes requested

- `https://www.googleapis.com/auth/contacts.readonly` — read Google Contacts

---

## 7. QR Code — Built-in (qrcode library)

**Used for:** Generating QR codes for contacts
**Free tier:** Entirely local, no API calls
**Library:** `qrcode[pil]==8.0`

### How it works

When `GET /api/contacts/{id}/qr` is called, the backend generates a PNG QR code image in memory containing the contact's vCard data. The image uses a rounded module style via `RoundedModuleDrawer`. No external service involved.

The QR code encodes:
```
BEGIN:VCARD
VERSION:3.0
FN:John Smith
TEL:+1234567890
EMAIL:john@example.com
ORG:Acme Corp
END:VCARD
```

Scanning the QR code with any phone saves the contact directly to the phone's contacts app.

---

## 8. Server-Sent Events — Built-in (sse-starlette)

**Used for:** Real-time contact updates pushed to the frontend
**Library:** `sse-starlette==2.2.1`

### How it works

Frontend subscribes to `GET /api/sse/events` with the user's JWT token. The server keeps this connection open. When any contact is created, updated, or deleted, the backend broadcasts an event to all active connections for that user.

Event types:
- `contact.created` — payload: full contact object
- `contact.updated` — payload: full contact object
- `contact.deleted` — payload: `{"id": "..."}`

Frontend React code listens to these events and updates the contact list in real-time without polling.

---

## 9. Webhooks — Built-in (httpx)

**Used for:** Notifying external systems of contact changes
**Library:** `httpx==0.28.1`

### How it works

Users can register webhook URLs via `POST /api/webhooks`. When a contact event fires (created, updated, deleted), the backend sends an HTTP POST to each registered webhook URL with:

```json
{
  "event": "contact.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": { ... contact object ... }
}
```

Payloads are signed with HMAC-SHA256 using `WEBHOOK_SECRET`, sent in the `X-Webhook-Signature` header. Recipients should verify this signature to confirm authenticity.

---

## Integration Health Check

To verify all integrations are working:

```bash
# 1. Groq AI
curl -X POST http://localhost:8001/api/ai/parse-business-card \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"John Smith\nCEO, Acme Corp\njohn@acme.com\n+1-555-0100"}'

# 2. Cloudinary (upload a photo)
curl -X POST http://localhost:8001/api/contacts/<id>/photo \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg"

# 3. QR code (no external service)
curl http://localhost:8001/api/contacts/<id>/qr \
  -H "Authorization: Bearer <token>" \
  --output qr.png
```
