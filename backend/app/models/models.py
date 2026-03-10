import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey,
    Index, func, JSON, Date
)
from sqlalchemy.orm import relationship
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    google_access_token = Column(Text)
    google_refresh_token = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    contacts = relationship("Contact", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    webhooks = relationship("Webhook", back_populates="user", cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50))
    email = Column(String(255))
    company = Column(String(255))
    job_title = Column(String(255))
    address = Column(JSON)
    birthday = Column(Date)
    anniversary = Column(Date)
    photo_url = Column(String(500))
    notes = Column(Text)
    is_favorite = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    google_resource_name = Column(String(255))
    social_links = Column(JSON)   # {"linkedin": "...", "twitter": "...", "website": "...", ...}
    share_token = Column(String(64), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="contacts")
    contact_tags = relationship("ContactTag", back_populates="contact", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="contact_tags", viewonly=True)
    history = relationship("ContactHistory", back_populates="contact", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="contact", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_contacts_name_gin", "name"),
        Index("ix_contacts_user_name", "user_id", "name"),
    )


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#6366f1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="tags")
    contact_tags = relationship("ContactTag", back_populates="tag", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tags_user_name", "user_id", "name", unique=True),
    )


class ContactTag(Base):
    __tablename__ = "contact_tags"

    contact_id = Column(String, ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    contact = relationship("Contact", back_populates="contact_tags")
    tag = relationship("Tag", back_populates="contact_tags")


class ContactHistory(Base):
    __tablename__ = "contact_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    contact_id = Column(String, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # created, updated, tagged, favorited
    old_data = Column(JSON)
    new_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contact = relationship("Contact", back_populates="history")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=gen_uuid)
    contact_id = Column(String, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reminder_type = Column(String(50), nullable=False)  # birthday, anniversary, custom
    message = Column(Text)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    is_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contact = relationship("Contact", back_populates="reminders")
    user = relationship("User", back_populates="reminders")


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    events = Column(JSON, default=list)  # ["contact.created", "contact.updated", ...]
    secret = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="webhooks")
