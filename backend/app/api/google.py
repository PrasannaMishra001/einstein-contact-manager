"""Google Contacts sync — OAuth 2.0 + People API (two-way)."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import asyncio

from app.auth import get_current_user
from app.database import get_db
from app.models.models import User, Contact
from app.config import settings

router = APIRouter(prefix="/google", tags=["google"])

SCOPES = ["https://www.googleapis.com/auth/contacts"]


def _build_flow():
    from google_auth_oauthlib.flow import Flow
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )


def _get_credentials(user: User):
    from google.oauth2.credentials import Credentials
    if not user.google_access_token:
        return None
    return Credentials(
        token=user.google_access_token,
        refresh_token=user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )


def _build_person_body(cd: dict) -> dict:
    """Build a Google People API person body from contact data."""
    parts = cd["name"].strip().rsplit(" ", 1)
    given = parts[0]
    family = parts[1] if len(parts) > 1 else ""
    person: dict = {
        "names": [{"givenName": given, "familyName": family, "displayName": cd["name"]}],
    }
    if cd.get("email"):
        person["emailAddresses"] = [{"value": cd["email"], "type": "work"}]
    if cd.get("phone"):
        person["phoneNumbers"] = [{"value": cd["phone"], "type": "mobile"}]
    if cd.get("company"):
        org: dict = {"name": cd["company"]}
        if cd.get("job_title"):
            org["title"] = cd["job_title"]
        person["organizations"] = [org]
    if cd.get("notes"):
        person["biographies"] = [{"value": cd["notes"], "contentType": "TEXT_PLAIN"}]
    return person


# ── OAuth ──────────────────────────────────────────────────────────────────────

@router.get("/auth")
async def google_auth(current_user: User = Depends(get_current_user)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(400, detail="Google OAuth credentials not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")
    flow = _build_flow()
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=current_user.id,
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Google redirects here after user grants permission."""
    try:
        flow = _build_flow()
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        flow.fetch_token(code=code)
        creds = flow.credentials
    except Exception:
        return RedirectResponse(f"{settings.FRONTEND_URL}/google-sync?error=oauth_failed")

    result = await db.execute(select(User).where(User.id == state))
    user = result.scalar_one_or_none()
    if not user:
        return RedirectResponse(f"{settings.FRONTEND_URL}/google-sync?error=user_not_found")

    user.google_access_token = creds.token
    user.google_refresh_token = creds.refresh_token or user.google_refresh_token
    await db.commit()
    return RedirectResponse(f"{settings.FRONTEND_URL}/google-sync?connected=true")


# ── Status ─────────────────────────────────────────────────────────────────────

@router.get("/status")
async def google_status(current_user: User = Depends(get_current_user)):
    return {"connected": bool(current_user.google_access_token)}


# ── Contacts with sync status ──────────────────────────────────────────────────

@router.get("/contacts-with-status")
async def contacts_with_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all contacts with 3-way status: synced / einstein_only / google_only."""
    if not current_user.google_access_token:
        raise HTTPException(400, detail="Google not connected")

    creds = _get_credentials(current_user)

    def _fetch_google():
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request
        if not creds.valid and creds.refresh_token:
            creds.refresh(Request())
        service = build("people", "v1", credentials=creds)
        result = service.people().connections().list(
            resourceName="people/me",
            pageSize=500,
            personFields="names,emailAddresses,phoneNumbers,organizations,photos",
        ).execute()
        items = []
        for person in result.get("connections", []):
            names = person.get("names", [])
            name = names[0].get("displayName", "") if names else ""
            if not name:
                continue
            emails = person.get("emailAddresses", [])
            phones = person.get("phoneNumbers", [])
            orgs = person.get("organizations", [])
            photos = person.get("photos", [])
            photo_url = None
            for p in photos:
                if not p.get("default"):
                    photo_url = p.get("url")
                    break
            items.append({
                "resource_name": person.get("resourceName", ""),
                "name": name,
                "email": emails[0].get("value") if emails else None,
                "phone": phones[0].get("value") if phones else None,
                "company": orgs[0].get("name") if orgs else None,
                "job_title": orgs[0].get("title") if orgs else None,
                "photo_url": photo_url,
            })
        return items, creds.token

    loop = asyncio.get_event_loop()
    google_contacts, new_token = await loop.run_in_executor(None, _fetch_google)

    # Get all non-archived Einstein contacts
    result = await db.execute(
        select(Contact)
        .where(Contact.user_id == current_user.id)
        .where(Contact.is_archived == False)
    )
    einstein_contacts = result.scalars().all()

    # Build lookup: resource_name → einstein contact
    rn_to_einstein = {c.google_resource_name: c for c in einstein_contacts if c.google_resource_name}
    google_rns = {gc["resource_name"] for gc in google_contacts}

    synced = []
    einstein_only = []
    google_only = []

    for c in einstein_contacts:
        if c.google_resource_name and c.google_resource_name in google_rns:
            gc_match = next((g for g in google_contacts if g["resource_name"] == c.google_resource_name), None)
            synced.append({
                "id": c.id,
                "resource_name": c.google_resource_name,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "job_title": c.job_title,
                "photo_url": c.photo_url or (gc_match["photo_url"] if gc_match else None),
                "status": "synced",
            })
        elif not c.google_resource_name:
            einstein_only.append({
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "job_title": c.job_title,
                "photo_url": c.photo_url,
                "status": "einstein_only",
            })

    for gc in google_contacts:
        if gc["resource_name"] not in rn_to_einstein:
            google_only.append({
                "resource_name": gc["resource_name"],
                "name": gc["name"],
                "email": gc["email"],
                "phone": gc["phone"],
                "company": gc["company"],
                "job_title": gc["job_title"],
                "photo_url": gc["photo_url"],
                "status": "google_only",
            })

    if new_token and new_token != current_user.google_access_token:
        current_user.google_access_token = new_token
        await db.commit()

    return {
        "synced": synced,
        "einstein_only": einstein_only,
        "google_only": google_only,
    }


# ── Sync all Einstein-only → Google ───────────────────────────────────────────

@router.post("/sync")
async def google_sync(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Push all Einstein-only contacts to Google Contacts."""
    if not current_user.google_access_token:
        raise HTTPException(400, detail="Google not connected — authorise first")

    result = await db.execute(
        select(Contact)
        .where(Contact.user_id == current_user.id)
        .where(Contact.google_resource_name.is_(None))
        .where(Contact.is_archived == False)
    )
    contacts = result.scalars().all()
    if not contacts:
        return {"synced": 0, "errors": [], "total": 0}

    contact_data = [
        {"id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
         "company": c.company, "job_title": c.job_title, "notes": c.notes}
        for c in contacts
    ]

    token = current_user.google_access_token
    refresh_token = current_user.google_refresh_token

    def _do_sync():
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        creds = Credentials(
            token=token, refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=SCOPES,
        )
        if not creds.valid and creds.refresh_token:
            creds.refresh(Request())

        service = build("people", "v1", credentials=creds)
        synced, errors, resource_names = 0, [], {}

        for cd in contact_data:
            try:
                res = service.people().createContact(body=_build_person_body(cd)).execute()
                resource_names[cd["id"]] = res.get("resourceName", "synced")
                synced += 1
            except Exception as exc:
                errors.append(f"{cd['name']}: {str(exc)[:100]}")

        return synced, errors, resource_names, creds.token

    loop = asyncio.get_event_loop()
    synced, errors, resource_names, new_token = await loop.run_in_executor(None, _do_sync)

    for c in contacts:
        if c.id in resource_names:
            c.google_resource_name = resource_names[c.id]
    if new_token and new_token != current_user.google_access_token:
        current_user.google_access_token = new_token
    await db.commit()
    return {"synced": synced, "errors": errors, "total": len(contacts)}


# ── Selective export ───────────────────────────────────────────────────────────

class SelectiveExportRequest(BaseModel):
    contact_ids: list[str]


@router.post("/selective-export")
async def selective_export(
    req: SelectiveExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export specific Einstein contacts (by ID) to Google Contacts."""
    if not current_user.google_access_token:
        raise HTTPException(400, detail="Google not connected")
    if not req.contact_ids:
        return {"exported": 0, "errors": [], "total": 0}

    result = await db.execute(
        select(Contact)
        .where(Contact.user_id == current_user.id)
        .where(Contact.id.in_(req.contact_ids))
    )
    contacts = result.scalars().all()

    contact_data = [
        {"id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
         "company": c.company, "job_title": c.job_title, "notes": c.notes,
         "google_resource_name": c.google_resource_name}
        for c in contacts
    ]

    token = current_user.google_access_token
    refresh_token = current_user.google_refresh_token

    def _do_export():
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        creds = Credentials(
            token=token, refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=SCOPES,
        )
        if not creds.valid and creds.refresh_token:
            creds.refresh(Request())

        service = build("people", "v1", credentials=creds)
        exported, errors, resource_names = 0, [], {}

        for cd in contact_data:
            if cd.get("google_resource_name"):
                continue  # already synced
            try:
                res = service.people().createContact(body=_build_person_body(cd)).execute()
                resource_names[cd["id"]] = res.get("resourceName", "synced")
                exported += 1
            except Exception as exc:
                errors.append(f"{cd['name']}: {str(exc)[:100]}")

        return exported, errors, resource_names, creds.token

    loop = asyncio.get_event_loop()
    exported, errors, resource_names, new_token = await loop.run_in_executor(None, _do_export)

    for c in contacts:
        if c.id in resource_names:
            c.google_resource_name = resource_names[c.id]
    if new_token and new_token != current_user.google_access_token:
        current_user.google_access_token = new_token
    await db.commit()
    return {"exported": exported, "errors": errors, "total": len(contacts)}


# ── Import from Google ────────────────────────────────────────────────────────

@router.post("/import-contacts")
async def import_google_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import all Google Contacts into Einstein (with photos). Already-imported ones are skipped."""
    if not current_user.google_access_token:
        raise HTTPException(400, detail="Google not connected")

    creds = _get_credentials(current_user)

    def _fetch_all():
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request
        from datetime import date as _date
        if not creds.valid and creds.refresh_token:
            creds.refresh(Request())
        service = build("people", "v1", credentials=creds)
        result = service.people().connections().list(
            resourceName="people/me",
            pageSize=500,
            personFields="names,emailAddresses,phoneNumbers,organizations,birthdays,photos",
        ).execute()
        items = []
        for person in result.get("connections", []):
            names = person.get("names", [])
            name = names[0].get("displayName", "") if names else ""
            if not name:
                continue
            emails = person.get("emailAddresses", [])
            phones = person.get("phoneNumbers", [])
            orgs = person.get("organizations", [])
            bdays = person.get("birthdays", [])
            photos = person.get("photos", [])
            bday = None
            if bdays:
                bd = bdays[0].get("date", {})
                try:
                    bday = _date(bd.get("year", 2000), bd.get("month", 1), bd.get("day", 1))
                except Exception:
                    pass
            photo_url = None
            for p in photos:
                if not p.get("default"):
                    photo_url = p.get("url")
                    break
            items.append({
                "resource_name": person.get("resourceName", ""),
                "name": name,
                "email": emails[0].get("value") if emails else None,
                "phone": phones[0].get("value") if phones else None,
                "company": orgs[0].get("name") if orgs else None,
                "job_title": orgs[0].get("title") if orgs else None,
                "birthday": bday,
                "photo_url": photo_url,
            })
        return items, creds.token

    loop = asyncio.get_event_loop()
    google_contacts, new_token = await loop.run_in_executor(None, _fetch_all)

    existing_result = await db.execute(
        select(Contact.google_resource_name)
        .where(Contact.user_id == current_user.id)
        .where(Contact.google_resource_name.isnot(None))
    )
    existing_rns = {r[0] for r in existing_result.all()}

    added = 0
    for gc in google_contacts:
        if gc["resource_name"] in existing_rns:
            continue
        db.add(Contact(
            user_id=current_user.id,
            name=gc["name"],
            email=gc["email"],
            phone=gc["phone"],
            company=gc["company"],
            job_title=gc["job_title"],
            birthday=gc["birthday"],
            photo_url=gc["photo_url"],
            google_resource_name=gc["resource_name"],
        ))
        added += 1

    if new_token and new_token != current_user.google_access_token:
        current_user.google_access_token = new_token
    await db.commit()
    return {"added": added, "skipped": len(google_contacts) - added, "total": len(google_contacts)}


# ── Disconnect ─────────────────────────────────────────────────────────────────

@router.delete("/disconnect")
async def google_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.google_access_token = None
    current_user.google_refresh_token = None
    await db.commit()
    return {"disconnected": True}
