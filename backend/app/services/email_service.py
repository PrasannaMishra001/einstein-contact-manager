"""Email service using Resend (https://resend.com)."""
import resend
from app.config import settings

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


async def send_reminder_email(to_email: str, contact_name: str, reminder_type: str, message: str):
    if not settings.RESEND_API_KEY:
        print(f"[Email] Would send {reminder_type} reminder for {contact_name} to {to_email}")
        return

    subject_map = {
        "birthday": f"🎂 Birthday Reminder: {contact_name}",
        "anniversary": f"💍 Anniversary Reminder: {contact_name}",
        "custom": f"🔔 Reminder: {contact_name}",
    }

    html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #6366f1;">{subject_map.get(reminder_type, 'Reminder')}</h2>
      <p style="font-size: 16px; color: #374151;">
        {message or f"Don't forget about {contact_name} today!"}
      </p>
      <hr style="border: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #9ca3af;">
        Sent by Einstein Contact Manager
      </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "subject": subject_map.get(reminder_type, "Reminder"),
            "html": html,
        })
    except Exception as e:
        print(f"Email send error: {e}")


async def send_welcome_email(to_email: str, full_name: str):
    if not settings.RESEND_API_KEY:
        return
    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "subject": "Welcome to Einstein Contact Manager",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Welcome, {full_name or 'there'}!</h1>
              <p>Your smart contact manager is ready. Start adding your contacts and experience
              AI-powered organization.</p>
              <p style="font-size: 12px; color: #9ca3af;">Einstein Contact Manager</p>
            </div>
            """,
        })
    except Exception as e:
        print(f"Welcome email error: {e}")
