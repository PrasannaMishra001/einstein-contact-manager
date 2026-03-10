from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import User, Contact, Tag, ContactTag
from app.schemas.schemas import (
    AISearchRequest, AISearchResponse, ContactOut,
    DuplicateGroup, EnrichRequest, BusinessCardRequest, AutoTagRequest,
    SmartDuplicateGroup, MergeRequest,
)
from app.auth import get_current_user
from app.services import ai_service
from app.services.entity_resolution import find_duplicates_deterministic, merge_contact_data

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


@router.post("/parse-business-card-photo")
async def parse_business_card_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload a business card image — Gemini 2.5 Flash OCR extracts contact fields."""
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WebP/GIF allowed")
    contents = await file.read()
    result = await ai_service.parse_business_card_photo(contents, file.content_type)
    return {"parsed": result}


@router.get("/smart-duplicates", response_model=list[SmartDuplicateGroup])
async def smart_duplicates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Deterministic duplicate detection using blocking + string similarity. No AI quota used."""
    result = await db.execute(_load_contacts_query(user.id))
    contacts = result.scalars().all()

    summary = [
        {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "company": c.company}
        for c in contacts
    ]
    groups = find_duplicates_deterministic(summary)

    contact_map = {c.id: ContactOut.model_validate(c) for c in contacts}
    output = []
    for group in groups:
        ids = group["ids"]
        group_contacts = [contact_map[i] for i in ids if i in contact_map]
        if len(group_contacts) >= 2:
            output.append(SmartDuplicateGroup(
                ids=ids,
                names=[c.name for c in group_contacts],
                similarity_score=group["similarity_score"],
                reason=group["reason"],
                contacts=group_contacts,
            ))
    return output


@router.post("/merge", response_model=ContactOut)
async def merge_contacts(
    payload: MergeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Merge two contacts. Primary contact is kept (its ID preserved).
    Secondary contact is deleted. Tags from both are combined.
    field_preferences: {field: "primary"|"secondary"} overrides which value wins.
    """
    from app.models.models import ContactTag as CT, ContactHistory

    def _q(cid: str):
        return select(Contact).where(
            Contact.id == cid, Contact.user_id == user.id
        ).options(
            selectinload(Contact.contact_tags).selectinload(CT.tag),
            selectinload(Contact.tags),
        )

    primary_r = await db.execute(_q(payload.primary_id))
    secondary_r = await db.execute(_q(payload.secondary_id))
    primary = primary_r.scalar_one_or_none()
    secondary = secondary_r.scalar_one_or_none()

    if not primary or not secondary:
        raise HTTPException(status_code=404, detail="One or both contacts not found")

    # Build data dicts for merge
    def _to_dict(c: Contact) -> dict:
        return {
            "name": c.name, "phone": c.phone, "email": c.email,
            "company": c.company, "job_title": c.job_title, "address": c.address,
            "birthday": c.birthday, "anniversary": c.anniversary, "notes": c.notes,
        }

    merged = merge_contact_data(_to_dict(primary), _to_dict(secondary), payload.field_preferences)

    # Apply merged fields to primary
    for field, value in merged.items():
        setattr(primary, field, value)

    # Combine tags (union)
    existing_tag_ids = {ct.tag_id for ct in primary.contact_tags}
    for ct in secondary.contact_tags:
        if ct.tag_id not in existing_tag_ids:
            db.add(CT(contact_id=primary.id, tag_id=ct.tag_id))

    # Record history
    db.add(ContactHistory(
        contact_id=primary.id,
        user_id=user.id,
        action="merged",
        old_data={"merged_from": secondary.id, "merged_from_name": secondary.name},
        new_data=merged,
    ))

    # Delete secondary
    await db.delete(secondary)
    await db.flush()

    # Return refreshed primary
    result = await db.execute(
        select(Contact).where(Contact.id == primary.id).options(
            selectinload(Contact.contact_tags).selectinload(CT.tag),
            selectinload(Contact.tags),
        )
    )
    return ContactOut.model_validate(result.scalar_one())


@router.get("/nba")
async def next_best_action(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Next Best Action — proactive nudges based on contact data."""
    from datetime import date, datetime, timedelta
    from collections import defaultdict

    today = date.today()
    cutoff = datetime.now() - timedelta(days=90)

    result = await db.execute(_load_contacts_query(user.id))
    contacts = result.scalars().all()

    suggestions = []

    # 1. Upcoming birthdays (next 7 days)
    for c in contacts:
        if c.birthday:
            try:
                bday = c.birthday.replace(year=today.year)
                if bday < today:
                    bday = c.birthday.replace(year=today.year + 1)
                delta = (bday - today).days
                if 0 <= delta <= 7:
                    day_str = "today!" if delta == 0 else f"in {delta} day{'s' if delta != 1 else ''}"
                    suggestions.append({
                        "type": "birthday", "priority": "high",
                        "icon": "🎂", "contact_id": c.id, "contact_name": c.name,
                        "message": f"{c.name}'s birthday is {day_str}",
                        "action": "send_wish",
                    })
            except (ValueError, AttributeError):
                pass

    # 2. No interaction in 90+ days (proxy: updated_at old)
    for c in contacts:
        if c.updated_at:
            updated_naive = c.updated_at.replace(tzinfo=None) if c.updated_at.tzinfo else c.updated_at
            if updated_naive < cutoff:
                days_ago = (datetime.now() - updated_naive).days
                suggestions.append({
                    "type": "check_in", "priority": "medium",
                    "icon": "💬", "contact_id": c.id, "contact_name": c.name,
                    "message": f"You haven't contacted {c.name} in {days_ago} days — send a check-in?",
                    "action": "send_message",
                })

    # 3. Company clusters (3+ contacts at same company)
    company_map: dict = defaultdict(list)
    for c in contacts:
        if c.company:
            company_map[c.company.strip()].append(c.name)
    for company, names in company_map.items():
        if len(names) >= 3:
            suggestions.append({
                "type": "meeting", "priority": "low",
                "icon": "📅", "contact_id": None, "contact_name": None,
                "company": company,
                "message": f"You have {len(names)} contacts at {company} — schedule a group check-in?",
                "action": "schedule_meeting",
            })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))
    return {"suggestions": suggestions[:15]}


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
