from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import User, Contact, Reminder
from app.schemas.schemas import ReminderCreate, ReminderOut
from app.auth import get_current_user

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
async def list_reminders(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Reminder)
        .where(Reminder.user_id == user.id)
        .order_by(Reminder.remind_at)
    )
    return result.scalars().all()


@router.post("/{contact_id}", response_model=ReminderOut, status_code=201)
async def create_reminder(
    contact_id: str,
    payload: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact_result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user.id)
    )
    if not contact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contact not found")

    reminder = Reminder(
        contact_id=contact_id,
        user_id=user.id,
        reminder_type=payload.reminder_type,
        message=payload.message,
        remind_at=payload.remind_at,
    )
    db.add(reminder)
    await db.flush()
    await db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(reminder_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await db.delete(reminder)
