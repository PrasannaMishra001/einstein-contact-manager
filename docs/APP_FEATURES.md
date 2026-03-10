# Einstein Contact Manager — Feature Reference

Full reference for every feature. Frontend is Next.js 15 + Tailwind. Backend is FastAPI + SQLAlchemy.

---

## Authentication

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Register | `POST /api/auth/register` | Email + password. Auto-verified in dev. |
| Login | `POST /api/auth/login` | Returns access + refresh tokens (JWT). |
| Refresh token | `POST /api/auth/refresh` | Exchange refresh token for new access token. |
| Logout | `POST /api/auth/logout` | Invalidates refresh token. |
| Get current user | `GET /api/auth/me` | Returns `{id, email, full_name, is_verified}`. |
| Update profile | `PUT /api/auth/me` | Change `full_name`. |
| Change password | `POST /api/auth/change-password` | Requires current password. |
| Email verification | `GET /api/auth/verify?token=...` | Link sent by Resend. Skipped in dev mode. |
| Password reset | `POST /api/auth/forgot-password` | Sends reset link via Resend. |

---

## Contacts (CRUD)

| Feature | Endpoint | Notes |
|---------|----------|-------|
| List contacts | `GET /api/contacts` | Supports `q`, `tag`, `sort`, `order`, `limit`, `offset` query params. |
| Get contact | `GET /api/contacts/{id}` | Full contact with tags and history. |
| Create contact | `POST /api/contacts` | All fields optional except `name`. |
| Update contact | `PUT /api/contacts/{id}` | Partial updates supported. |
| Delete contact | `DELETE /api/contacts/{id}` | Permanent delete. |
| Archive contact | `POST /api/contacts/{id}/archive` | Hides from main list. |
| Restore contact | `POST /api/contacts/{id}/restore` | Moves back to active list. |
| Favorite | `POST /api/contacts/{id}/favorite` | Toggle favorite flag. |
| Contact history | `GET /api/contacts/{id}/history` | Audit log of all changes. |
| Upload photo | `POST /api/contacts/{id}/photo` | Stored on Cloudinary. |
| Delete photo | `DELETE /api/contacts/{id}/photo` | Removes from Cloudinary + clears URL. |
| QR code | `GET /api/contacts/{id}/qr` | PNG image with vCard data. Scan to save to phone. |
| Share link | `POST /api/contacts/{id}/share` | Generates a public URL. Valid for 30 days. |
| Public share view | `GET /api/share/{token}` | Public read-only contact card (no auth). |

### Contact fields

`name`, `email`, `phone`, `company`, `job_title`, `address` (object), `birthday`, `anniversary`, `notes`, `website`, `linkedin`, `twitter`, `is_favorite`, `is_archived`, `photo_url`

---

## Tags

| Feature | Endpoint | Notes |
|---------|----------|-------|
| List tags | `GET /api/tags` | All user's tags with contact count. |
| Create tag | `POST /api/tags` | `{name, color}` — color is a hex string. |
| Delete tag | `DELETE /api/tags/{id}` | Removes from all contacts too. |
| Add tag to contact | `POST /api/contacts/{id}/tags/{tag_id}` | |
| Remove tag from contact | `DELETE /api/contacts/{id}/tags/{tag_id}` | |

---

## AI Features (Groq / Gemini)

| Feature | Endpoint | AI Used | Notes |
|---------|----------|---------|-------|
| Natural language search | `POST /api/ai/search` | Groq | Query like "engineers in Bangalore I haven't contacted". |
| AI duplicate detection | `GET /api/ai/duplicates` | Groq | AI-based fuzzy matching. Uses quota. |
| Smart duplicates | `GET /api/ai/smart-duplicates` | None | Deterministic string similarity. No quota. |
| Merge contacts | `POST /api/ai/merge` | None | Merge two contacts, keep primary ID, combine tags. |
| Auto-tag | `POST /api/ai/auto-tag` | Groq | Suggests relevant tags based on contact fields. |
| Enrich contact | `POST /api/ai/enrich` | Groq | Suggests missing fields. |
| Parse business card (text) | `POST /api/ai/parse-business-card` | Groq | Paste raw text from a card. |
| Parse business card (photo) | `POST /api/ai/parse-business-card-photo` | Gemini | Upload image, OCR extracts fields. |
| Contact summary | `GET /api/ai/{id}/summary` | Groq | 2-3 sentence professional bio. |

---

## Import / Export

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Import CSV | `POST /api/contacts/import/csv` | Standard vCard-style CSV. Returns `{created, updated, errors}`. |
| Import vCard | `POST /api/contacts/import/vcard` | `.vcf` file from iPhone/Google/Outlook. |
| Export CSV | `GET /api/contacts/export/csv` | Downloads all contacts as CSV. |
| Export vCard | `GET /api/contacts/export/vcard` | Downloads all contacts as `.vcf`. |

---

## Google Contacts Sync

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Start OAuth | `GET /api/google/auth` | Redirects to Google consent screen. |
| OAuth callback | `GET /api/google/callback` | Exchanges code for tokens, stores encrypted. |
| Sync contacts | `POST /api/google/sync` | Imports from Google People API. |
| Disconnect | `DELETE /api/google/disconnect` | Removes stored OAuth tokens. |

Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` env vars.

---

## Reminders

| Feature | Endpoint | Notes |
|---------|----------|-------|
| List reminders | `GET /api/reminders` | All user's reminders. |
| Create reminder | `POST /api/reminders` | `{contact_id, type, date, note}`. Types: `birthday`, `anniversary`, `custom`. |
| Update reminder | `PUT /api/reminders/{id}` | |
| Delete reminder | `DELETE /api/reminders/{id}` | |

Reminders trigger email notifications via Resend. The background scheduler checks for due reminders every 15 minutes.

---

## Analytics

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Dashboard stats | `GET /api/analytics/overview` | Total contacts, recent additions, tag distribution. |
| Contact growth | `GET /api/analytics/growth` | New contacts by time period. |
| Tag breakdown | `GET /api/analytics/tags` | Contacts per tag. |
| Activity heatmap | `GET /api/analytics/activity` | Contact interactions by day. |

---

## Webhooks

| Feature | Endpoint | Notes |
|---------|----------|-------|
| List webhooks | `GET /api/webhooks` | |
| Create webhook | `POST /api/webhooks` | `{url, events}`. Events: `contact.created`, `contact.updated`, `contact.deleted`. |
| Toggle active | `POST /api/webhooks/{id}/toggle` | Enable/disable without deleting. |
| Delete webhook | `DELETE /api/webhooks/{id}` | |

Payloads signed with HMAC-SHA256 using `WEBHOOK_SECRET`. Verify with `X-Webhook-Signature` header.

---

## Real-time Updates (SSE)

`GET /api/sse/events` — Server-Sent Events stream. Frontend subscribes and receives live contact updates without polling.

Events: `contact.created`, `contact.updated`, `contact.deleted`

---

## Health Check

`GET /health` — Returns `{"status": "healthy"}`. Used by Render's health check and to keep Neon database warm.
