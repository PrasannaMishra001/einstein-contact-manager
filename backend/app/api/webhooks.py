import hmac
import hashlib
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import User, Webhook
from app.schemas.schemas import WebhookCreate, WebhookOut
from app.auth import get_current_user

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

VALID_EVENTS = [
    "contact.created", "contact.updated", "contact.deleted",
    "contact.favorited", "contact.tagged",
]


@router.get("", response_model=list[WebhookOut])
async def list_webhooks(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Webhook).where(Webhook.user_id == user.id))
    return result.scalars().all()


@router.post("", response_model=WebhookOut, status_code=201)
async def create_webhook(
    payload: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    invalid = [e for e in payload.events if e not in VALID_EVENTS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")

    webhook = Webhook(
        user_id=user.id,
        url=payload.url,
        events=payload.events,
        secret=payload.secret,
    )
    db.add(webhook)
    await db.flush()
    await db.refresh(webhook)
    return webhook


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.user_id == user.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(wh)


@router.patch("/{webhook_id}/toggle", response_model=WebhookOut)
async def toggle_webhook(webhook_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.user_id == user.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    wh.is_active = not wh.is_active
    await db.flush()
    await db.refresh(wh)
    return wh


async def fire_webhooks(db: AsyncSession, user_id: str, event: str, data: dict):
    """Fire all active webhooks for a user matching the event type."""
    result = await db.execute(
        select(Webhook).where(Webhook.user_id == user_id, Webhook.is_active == True)
    )
    webhooks = result.scalars().all()

    payload_str = json.dumps({"event": event, "data": data})

    async with httpx.AsyncClient(timeout=5.0) as client:
        for wh in webhooks:
            if event not in (wh.events or []):
                continue
            headers = {"Content-Type": "application/json", "X-Einstein-Event": event}
            if wh.secret:
                sig = hmac.new(wh.secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
                headers["X-Einstein-Signature"] = f"sha256={sig}"
            try:
                await client.post(wh.url, content=payload_str, headers=headers)
            except Exception as e:
                print(f"Webhook delivery failed ({wh.url}): {e}")
