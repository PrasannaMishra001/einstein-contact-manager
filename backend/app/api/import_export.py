import io
import csv
import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import pandas as pd
from app.database import get_db
from app.models.models import User, Contact, Tag, ContactTag
from app.schemas.schemas import ImportResult, ContactOut
from app.auth import get_current_user
from app.services.vcard_service import export_contacts_to_vcard, parse_vcard
from app.services.qr_service import generate_vcard_qr

router = APIRouter(prefix="/io", tags=["import-export"])


async def _get_all_contacts(user_id: str, db: AsyncSession):
    result = await db.execute(
        select(Contact).where(Contact.user_id == user_id, Contact.is_archived == False)
        .options(
            selectinload(Contact.contact_tags).selectinload(ContactTag.tag),
            selectinload(Contact.tags),
        )
        .order_by(Contact.name)
    )
    return result.scalars().all()


@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contacts = await _get_all_contacts(user.id, db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "phone", "email", "company", "job_title", "tags", "is_favorite", "notes", "birthday"])
    for c in contacts:
        tags = ";".join(ct.tag.name for ct in c.contact_tags)
        writer.writerow([c.name, c.phone or "", c.email or "", c.company or "",
                         c.job_title or "", tags, c.is_favorite, c.notes or "",
                         str(c.birthday) if c.birthday else ""])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


@router.get("/export/vcard")
async def export_vcard(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contacts = await _get_all_contacts(user.id, db)
    vcf = export_contacts_to_vcard(contacts)
    return Response(
        content=vcf,
        media_type="text/vcard",
        headers={"Content-Disposition": "attachment; filename=contacts.vcf"},
    )


@router.get("/export/json")
async def export_json(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    contacts = await _get_all_contacts(user.id, db)
    data = [ContactOut.model_validate(c).model_dump(mode="json") for c in contacts]
    return Response(
        content=json.dumps(data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=contacts.json"},
    )


@router.post("/import/csv", response_model=ImportResult)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    added, skipped, errors = 0, 0, []

    for i, row in enumerate(reader, 1):
        try:
            name = row.get("name", "").strip()
            if not name:
                skipped += 1
                continue
            existing = await db.execute(
                select(Contact).where(Contact.user_id == user.id, Contact.name == name)
            )
            if existing.scalar_one_or_none():
                skipped += 1
                continue
            contact = Contact(
                user_id=user.id,
                name=name,
                phone=row.get("phone") or None,
                email=row.get("email") or None,
                company=row.get("company") or None,
                job_title=row.get("job_title") or None,
                notes=row.get("notes") or None,
                is_favorite=str(row.get("is_favorite", "")).lower() == "true",
            )
            db.add(contact)
            await db.flush()

            tags_str = row.get("tags", "")
            if tags_str:
                for tag_name in tags_str.split(";"):
                    tag_name = tag_name.strip()
                    if not tag_name:
                        continue
                    tag_result = await db.execute(
                        select(Tag).where(Tag.user_id == user.id, Tag.name == tag_name)
                    )
                    tag = tag_result.scalar_one_or_none()
                    if not tag:
                        tag = Tag(user_id=user.id, name=tag_name)
                        db.add(tag)
                        await db.flush()
                    db.add(ContactTag(contact_id=contact.id, tag_id=tag.id))

            added += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
            skipped += 1

    await db.flush()
    return ImportResult(added=added, skipped=skipped, errors=errors[:10])


@router.post("/import/vcard", response_model=ImportResult)
async def import_vcard(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    parsed = parse_vcard(content.decode("utf-8", errors="ignore"))
    added, skipped, errors = 0, 0, []

    for i, data in enumerate(parsed, 1):
        try:
            name = data.get("name", "").strip()
            if not name:
                skipped += 1
                continue
            existing = await db.execute(
                select(Contact).where(Contact.user_id == user.id, Contact.name == name)
            )
            if existing.scalar_one_or_none():
                skipped += 1
                continue
            contact = Contact(user_id=user.id, **{k: v for k, v in data.items() if k != "birthday"})
            if data.get("birthday"):
                contact.birthday = data["birthday"]
            db.add(contact)
            added += 1
        except Exception as e:
            errors.append(f"Contact {i}: {str(e)}")
            skipped += 1

    await db.flush()
    return ImportResult(added=added, skipped=skipped, errors=errors[:10])


@router.get("/{contact_id}/qr")
async def get_qr_code(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user.id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    qr_data = generate_vcard_qr({
        "name": contact.name,
        "phone": contact.phone,
        "email": contact.email,
        "company": contact.company,
        "job_title": contact.job_title,
    })
    return {"qr_code": qr_data, "contact_name": contact.name}
