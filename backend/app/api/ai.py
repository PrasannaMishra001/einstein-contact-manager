from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import User, Contact, Tag, ContactTag
from app.schemas.schemas import (
    AISearchRequest, AISearchResponse, ContactOut,
    DuplicateGroup, EnrichRequest, BusinessCardRequest, AutoTagRequest
)
from app.auth import get_current_user
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


def _load_contacts_query(user_id: str):
    return select(Contact).where(
        Contact.user_id == user_id,
        Contact.is_archived == False
    ).options(
        selectinload(Contact.contact_tags).selectinload(ContactTag.tag),
        selectinload(Contact.tags),
    )


@router.post("/search", response_model=AISearchResponse)
async def ai_search(
    payload: AISearchRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(_load_contacts_query(user.id))
    contacts = result.scalars().all()

    summary = [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "company": c.company,
            "job_title": c.job_title,
            "tags": [ct.tag.name for ct in c.contact_tags],
            "is_favorite": c.is_favorite,
            "notes": c.notes[:100] if c.notes else None,
        }
        for c in contacts
    ]

    ai_result = await ai_service.natural_language_search(payload.query, summary)
    matched_ids = set(ai_result.get("matched_ids", []))

    matched = [c for c in contacts if c.id in matched_ids]
    return AISearchResponse(
        contacts=[ContactOut.model_validate(c) for c in matched],
        explanation=ai_result.get("explanation", ""),
        suggested_filters=ai_result.get("suggested_filters", {}),
    )


@router.get("/duplicates", response_model=list[DuplicateGroup])
async def find_duplicates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(_load_contacts_query(user.id))
    contacts = result.scalars().all()

    summary = [
        {"id": c.id, "name": c.name, "email": c.email, "phone": c.phone}
        for c in contacts
    ]
    groups = await ai_service.find_duplicates(summary)

    contact_map = {c.id: c for c in contacts}
    output = []
    for group in groups:
        ids = group.get("ids", [])
        group_contacts = [contact_map[i] for i in ids if i in contact_map]
        if len(group_contacts) >= 2:
            output.append(DuplicateGroup(
                contacts=[ContactOut.model_validate(c) for c in group_contacts],
                similarity_score=group.get("similarity_score", 0.9),
                reason=group.get("reason", ""),
            ))
    return output


@router.post("/auto-tag")
async def auto_tag(
    payload: AutoTagRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == payload.contact_id, Contact.user_id == user.id)
        .options(selectinload(Contact.contact_tags).selectinload(ContactTag.tag))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    tags_result = await db.execute(select(Tag).where(Tag.user_id == user.id))
    existing_tags = [t.name for t in tags_result.scalars().all()]

    contact_data = {
        "name": contact.name, "email": contact.email, "company": contact.company,
        "job_title": contact.job_title, "notes": contact.notes,
    }
    suggestions = await ai_service.suggest_tags(contact_data, existing_tags)
    return {"suggested_tags": suggestions}


@router.post("/enrich")
async def enrich_contact(
    payload: EnrichRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == payload.contact_id, Contact.user_id == user.id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    data = {
        "name": contact.name, "email": contact.email, "phone": contact.phone,
        "company": contact.company, "job_title": contact.job_title,
    }
    enriched = await ai_service.enrich_contact(data)
    return {"suggestions": enriched}


@router.post("/parse-business-card")
async def parse_business_card(payload: BusinessCardRequest):
    result = await ai_service.parse_business_card(payload.text)
    return {"parsed": result}


@router.get("/{contact_id}/summary")
async def contact_summary(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user.id)
        .options(selectinload(Contact.contact_tags).selectinload(ContactTag.tag))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    data = {
        "name": contact.name, "email": contact.email, "phone": contact.phone,
        "company": contact.company, "job_title": contact.job_title,
        "tags": [ct.tag.name for ct in contact.contact_tags],
        "notes": contact.notes,
    }
    summary = await ai_service.generate_contact_summary(data)
    return {"summary": summary}
