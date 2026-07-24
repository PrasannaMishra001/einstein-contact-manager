"""
Enrich the 'einstein' demo account so it looks genuinely used: adds notes,
birthdays/anniversaries, placeholder phones/emails, social links, a handful of
reminders and share links, and a couple of sample webhooks.

  Email:    einstein@einstein.com
  Password: einstein

Design notes:
  - IDEMPOTENT: field updates are deterministic (seeded RNG over a stable sort),
    and reminders/webhooks are skipped if they already exist. Safe to re-run.
  - PII: the contacts are real public figures, so all contact data here is
    OBVIOUSLY FAKE placeholder data (@example.com, +91 90000-0xxxx). We never
    fabricate realistic-looking personal phone/email for a real person.

Usage:
    python scripts/enrich_demo.py
    PROD_API=https://einstein-backend-vaqs.onrender.com python scripts/enrich_demo.py
"""
import os
import sys
import time
import random
import re
from datetime import datetime, date, timezone, timedelta

import requests

API = os.environ.get("PROD_API", "https://einstein-backend-vaqs.onrender.com") + "/api"
EMAIL = "einstein@einstein.com"
PASSWORD = "einstein"

RNG = random.Random(42)  # stable across runs → idempotent field values

SESSION = requests.Session()


def req(method: str, url: str, **kw):
    """Request with retries — Render's free tier resets connections under load."""
    kw.setdefault("timeout", 60)
    last = None
    for attempt in range(4):
        try:
            return SESSION.request(method, url, **kw)
        except requests.RequestException as e:
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise last


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def warm_up():
    """Free-tier backend cold-starts (~45 s). Ping /health until it responds."""
    base = API.rsplit("/api", 1)[0]
    print(f"Warming up {base} …")
    for attempt in range(1, 7):
        try:
            r = requests.get(f"{base}/health", timeout=60)
            if r.status_code == 200:
                print("  backend awake")
                return
        except requests.RequestException:
            pass
        print(f"  still waking (attempt {attempt})…")
        time.sleep(5)


def login() -> dict:
    r = req("POST", f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=90)
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def all_contacts(headers) -> list:
    out, page = [], 1
    while True:
        r = req("GET", f"{API}/contacts", params={"page": page, "per_page": 100}, headers=headers)
        r.raise_for_status()
        data = r.json()
        out.extend(data.get("contacts", []))
        if page >= data.get("pages", 1):
            break
        page += 1
    return out


def birthday_for(i: int) -> date:
    year = 1955 + (i * 7) % 45          # 1955–1999, deterministic
    month = 1 + (i * 3) % 12
    day = 1 + (i * 5) % 28
    return date(year, month, day)


def next_occurrence(bday: date) -> datetime:
    today = datetime.now(timezone.utc).date()
    nxt = bday.replace(year=today.year)
    if nxt < today:
        nxt = bday.replace(year=today.year + 1)
    return datetime(nxt.year, nxt.month, nxt.day, 9, 0, tzinfo=timezone.utc)


def main():
    warm_up()
    print(f"\nTarget: {API}\nLogging in as {EMAIL} …")
    headers = login()
    print("  ok")

    contacts = all_contacts(headers)
    contacts.sort(key=lambda c: c["name"])            # stable order for the RNG
    print(f"Found {len(contacts)} contacts\n")

    existing_reminder_cids = {
        r["contact_id"] for r in req("GET", f"{API}/reminders", headers=headers).json()
    }
    existing_webhook_urls = {
        w["url"] for w in req("GET", f"{API}/webhooks", headers=headers).json()
    }

    stats = {"enriched": 0, "reminders": 0, "shares": 0, "webhooks": 0}
    reminders_left, shares_left = 8, 10

    for i, c in enumerate(contacts):
        cid, name = c["id"], c["name"]
        s = slug(name)
        job = c.get("job_title") or "Notable figure"
        company = c.get("company") or ""

        patch = {}
        # ~60% phone + email
        if RNG.random() < 0.60:
            patch["phone"] = f"+91 90000 {i % 100000:05d}"
            patch["email"] = f"{s}@example.com"
        # ~40% notes (real public job info + a clear demo marker)
        if RNG.random() < 0.40:
            tail = f" · {company}" if company else ""
            patch["notes"] = f"{job}{tail}. Sample contact in the Einstein demo account."
        # ~25% social links (all example.com — clearly placeholder)
        if RNG.random() < 0.25:
            patch["social_links"] = {"website": "https://example.com", "linkedin": f"https://example.com/in/{s}"}
        # ~30% birthday, ~12% anniversary
        gave_birthday = RNG.random() < 0.30
        if gave_birthday:
            patch["birthday"] = birthday_for(i).isoformat()
        if RNG.random() < 0.12:
            patch["anniversary"] = date(2005 + i % 15, 1 + i % 12, 1 + i % 28).isoformat()

        if patch:
            r = req("PATCH", f"{API}/contacts/{cid}", json=patch, headers=headers)
            if r.status_code in (200, 201):
                stats["enriched"] += 1
            else:
                print(f"  PATCH {name}: {r.status_code} {r.text[:80]}")

        # birthday reminder (idempotent: skip if this contact already has one)
        if gave_birthday and reminders_left > 0 and cid not in existing_reminder_cids:
            rr = req(
                "POST", f"{API}/reminders/{cid}",
                json={
                    "reminder_type": "birthday",
                    "message": f"🎂 {name}'s birthday is coming up",
                    "remind_at": next_occurrence(birthday_for(i)).isoformat(),
                },
                headers=headers,
            )
            if rr.status_code in (200, 201):
                stats["reminders"] += 1
                reminders_left -= 1

        # share links (POST /share is idempotent server-side)
        if shares_left > 0 and RNG.random() < 0.12:
            sr = req("POST", f"{API}/contacts/{cid}/share", headers=headers)
            if sr.status_code in (200, 201):
                stats["shares"] += 1
                shares_left -= 1

        time.sleep(0.05)

    # sample webhooks (skip if already present)
    for url, events in [
        ("https://example.com/webhooks/einstein", ["contact.created", "contact.updated"]),
        ("https://example.com/hooks/crm-sync", ["contact.created", "contact.deleted", "contact.favorited"]),
    ]:
        if url in existing_webhook_urls:
            continue
        wr = req("POST", f"{API}/webhooks", json={"url": url, "events": events}, headers=headers)
        if wr.status_code in (200, 201):
            stats["webhooks"] += 1

    print("\nDone.")
    for k, v in stats.items():
        print(f"  {k:10s}: {v}")


if __name__ == "__main__":
    main()
