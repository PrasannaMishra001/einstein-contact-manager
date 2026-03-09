"""Public sharing endpoints — no auth required."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Contact, ContactTag
from app.schemas.schemas import ContactOut

router = APIRouter(prefix="/share", tags=["sharing"])


@router.get("/{share_token}", response_model=ContactOut)
async def get_shared_contact(share_token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Contact)
        .where(Contact.share_token == share_token)
        .options(
            selectinload(Contact.contact_tags).selectinload(ContactTag.tag),
            selectinload(Contact.tags),
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found or link revoked")
    return contact
