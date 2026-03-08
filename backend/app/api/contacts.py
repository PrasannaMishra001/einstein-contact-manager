import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from app.database import get_db
from app.models.models import User, Contact, Tag, ContactTag, ContactHistory
from app.schemas.schemas import (
    ContactCreate, ContactUpdate, ContactOut, ContactListResponse,
    TagCreate, TagOut, HistoryOut
)
from app.auth import get_current_user
from app.services.cloudinary_service import upload_photo, delete_photo
from app.services import broadcast_event

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _contact_query(user_id: str):
    return select(Contact).where(Contact.user_id == user_id).options(
        selectinload(Contact.contact_tags).selectinload(ContactTag.tag)
    )


async def _get_or_404(contact_id: str, user_id: str, db: AsyncSession) -> Contact:
    result = await db.execute(
        _contact_query(user_id).where(Contact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


def _snapshot(contact: Contact) -> dict:
    return {k: str(v) if v else v for k, v in {
        "name": contact.name, "phone": contact.phone, "email": contact.email,
        "company": contact.company, "notes": contact.notes,
        "is_favorite": contact.is_favorite,
    }.items()}


async def _record_history(db, contact_id, user_id, action, old=None, new=None):
    db.add(ContactHistory(contact_id=contact_id, user_id=user_id, action=action, old_data=old, new_data=new))


# ── Tags CRUD ─────────────────────────────────────────────────────────────────

@router.get("/tags", response_model=list[TagOut])
async def list_tags(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Tag).where(Tag.user_id == user.id).order_by(Tag.name))
    return result.scalars().all()


@router.post("/tags", response_model=TagOut, status_code=201)
async def create_tag(payload: TagCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    existing = await db.execute(select(Tag).where(Tag.user_id == user.id, func.lower(Tag.name) == payload.name.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tag already exists")
    tag = Tag(user_id=user.id, name=payload.name, color=payload.color)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)


# ── Contacts CRUD ─────────────────────────────────────────────────────────────

@router.get("", response_model=ContactListResponse)
async def list_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    favorites: Optional[bool] = Query(None),
    archived: Optional[bool] = Query(False),
    sort: str = Query("name"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base = _contact_query(user.id).where(Contact.is_archived == (archived or False))

    if search:
        q = f"%{search.lower()}%"
        base = base.where(or_(
            func.lower(Contact.name).like(q),
            func.lower(Contact.phone).like(q),
            func.lower(Contact.email).like(q),
            func.lower(Contact.company).like(q),
            func.lower(Contact.notes).like(q),
        ))

    if favorites is True:
        base = base.where(Contact.is_favorite == True)

    if tag:
        base = base.join(ContactTag, Contact.id == ContactTag.contact_id).join(
            Tag, ContactTag.tag_id == Tag.id
        ).where(func.lower(Tag.name) == tag.lower())

    sort_map = {
        "name": Contact.name,
        "-name": Contact.name.desc(),
        "created": Contact.created_at.desc(),
        "updated": Contact.updated_at.desc(),
        "favorite": Contact.is_favorite.desc(),
    }
    base = base.order_by(sort_map.get(sort, Contact.name))

    count_q = select(func.count()).select_from(base.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar()

    offset = (page - 1) * per_page
    result = await db.execute(base.offset(offset).limit(per_page))
    contacts = result.scalars().all()

    return ContactListResponse(
        contacts=[ContactOut.model_validate(c) for c in contacts],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, -(-total // per_page)),
    )


@router.post("", response_model=ContactOut, status_code=201)
async def create_contact(
    payload: ContactCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact = Contact(
        user_id=user.id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        company=payload.company,
        job_title=payload.job_title,
        address=payload.address.model_dump() if payload.address else None,
        birthday=payload.birthday,
        anniversary=payload.anniversary,
        notes=payload.notes,
        is_favorite=payload.is_favorite,
    )
    db.add(contact)
    await db.flush()

    for tag_id in payload.tag_ids:
        tag_result = await db.execute(select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id))
        if tag_result.scalar_one_or_none():
            db.add(ContactTag(contact_id=contact.id, tag_id=tag_id))

    await _record_history(db, contact.id, user.id, "created", new=_snapshot(contact))
    await db.flush()

    full = await _get_or_404(contact.id, user.id, db)
    await broadcast_event(user.id, "contact.created", ContactOut.model_validate(full).model_dump())
    return full


@router.get("/{contact_id}", response_model=ContactOut)
async def get_contact(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await _get_or_404(contact_id, user.id, db)


@router.patch("/{contact_id}", response_model=ContactOut)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact = await _get_or_404(contact_id, user.id, db)
    old = _snapshot(contact)

    for field, value in payload.model_dump(exclude_unset=True, exclude={"tag_ids"}).items():
        if field == "address" and value:
            setattr(contact, field, value)
        elif value is not None or field in ("is_favorite", "is_archived"):
            setattr(contact, field, value)

    if payload.tag_ids is not None:
        await db.execute(
            ContactTag.__table__.delete().where(ContactTag.contact_id == contact_id)
        )
        for tag_id in payload.tag_ids:
            tag_result = await db.execute(select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id))
            if tag_result.scalar_one_or_none():
                db.add(ContactTag(contact_id=contact_id, tag_id=tag_id))

    await _record_history(db, contact_id, user.id, "updated", old=old, new=_snapshot(contact))
    await db.flush()

    full = await _get_or_404(contact_id, user.id, db)
    await broadcast_event(user.id, "contact.updated", ContactOut.model_validate(full).model_dump())
    return full


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contact = await _get_or_404(contact_id, user.id, db)
    if contact.photo_url:
        await delete_photo(contact.photo_url)
    await broadcast_event(user.id, "contact.deleted", {"id": contact_id})
    await db.delete(contact)


@router.post("/{contact_id}/photo", response_model=ContactOut)
async def upload_contact_photo(
    contact_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact = await _get_or_404(contact_id, user.id, db)
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WebP/GIF allowed")
    contents = await file.read()
    url = await upload_photo(contents, f"contacts/{user.id}/{contact_id}")
    if contact.photo_url:
        await delete_photo(contact.photo_url)
    contact.photo_url = url
    await db.flush()
    return await _get_or_404(contact_id, user.id, db)


@router.delete("/{contact_id}/photo", response_model=ContactOut)
async def delete_contact_photo(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contact = await _get_or_404(contact_id, user.id, db)
    if contact.photo_url:
        await delete_photo(contact.photo_url)
        contact.photo_url = None
        await db.flush()
    return await _get_or_404(contact_id, user.id, db)


@router.get("/{contact_id}/history", response_model=list[HistoryOut])
async def get_contact_history(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _get_or_404(contact_id, user.id, db)
    result = await db.execute(
        select(ContactHistory)
        .where(ContactHistory.contact_id == contact_id)
        .order_by(ContactHistory.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.post("/{contact_id}/favorite", response_model=ContactOut)
async def toggle_favorite(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contact = await _get_or_404(contact_id, user.id, db)
    contact.is_favorite = not contact.is_favorite
    await _record_history(db, contact_id, user.id, "favorited", new={"is_favorite": contact.is_favorite})
    await db.flush()
    return await _get_or_404(contact_id, user.id, db)


@router.post("/{contact_id}/share", response_model=dict)
async def create_share_link(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contact = await _get_or_404(contact_id, user.id, db)
    if not contact.share_token:
        contact.share_token = secrets.token_urlsafe(32)
        await db.flush()
    return {"share_token": contact.share_token, "share_url": f"/share/{contact.share_token}"}


@router.delete("/{contact_id}/share", status_code=204)
async def revoke_share_link(contact_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contact = await _get_or_404(contact_id, user.id, db)
    contact.share_token = None
    await db.flush()
