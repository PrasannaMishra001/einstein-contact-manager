from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.models import User, Contact, Tag, ContactTag
from app.schemas.schemas import AnalyticsResponse
from app.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    uid = user.id

    total = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid))).scalar()
    favorites = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid, Contact.is_favorite == True))).scalar()
    with_email = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid, Contact.email != None))).scalar()
    with_phone = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid, Contact.phone != None))).scalar()
    with_photo = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid, Contact.photo_url != None))).scalar()
    archived = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid, Contact.is_archived == True))).scalar()
    total_tags = (await db.execute(select(func.count()).select_from(Tag).where(Tag.user_id == uid))).scalar()
    google_synced = (await db.execute(select(func.count()).select_from(Contact).where(Contact.user_id == uid, Contact.google_resource_name != None))).scalar()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    contacts_this_month = (await db.execute(
        select(func.count()).select_from(Contact)
        .where(Contact.user_id == uid, Contact.created_at >= month_start)
    )).scalar()

    contacts_this_week = (await db.execute(
        select(func.count()).select_from(Contact)
        .where(Contact.user_id == uid, Contact.created_at >= week_start)
    )).scalar()

    # Tag breakdown
    tag_result = await db.execute(
        select(Tag.name, Tag.color, func.count(ContactTag.contact_id).label("count"))
        .join(ContactTag, Tag.id == ContactTag.tag_id)
        .join(Contact, ContactTag.contact_id == Contact.id)
        .where(Tag.user_id == uid, Contact.is_archived == False)
        .group_by(Tag.id, Tag.name, Tag.color)
        .order_by(func.count(ContactTag.contact_id).desc())
        .limit(10)
    )
    tag_breakdown = [{"name": r.name, "color": r.color, "count": r.count} for r in tag_result]

    # Growth chart: contacts added per month for last 6 months
    growth_chart = []
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        m_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end = (m_start.replace(month=m_start.month % 12 + 1) if m_start.month < 12
                 else m_start.replace(year=m_start.year + 1, month=1))
        count = (await db.execute(
            select(func.count()).select_from(Contact)
            .where(Contact.user_id == uid, Contact.created_at >= m_start, Contact.created_at < m_end)
        )).scalar()
        growth_chart.append({"month": m_start.strftime("%b %Y"), "count": count})

    return AnalyticsResponse(
        total_contacts=total or 0,
        favorites=favorites or 0,
        with_email=with_email or 0,
        with_phone=with_phone or 0,
        with_photo=with_photo or 0,
        archived=archived or 0,
        total_tags=total_tags or 0,
        google_synced=google_synced or 0,
        contacts_this_month=contacts_this_month or 0,
        contacts_this_week=contacts_this_week or 0,
        tag_breakdown=tag_breakdown,
        growth_chart=growth_chart,
    )
