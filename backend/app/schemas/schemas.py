from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime, date


# ── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Tags ──────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9A-Fa-f]{6}$")


class TagOut(BaseModel):
    id: str
    name: str
    color: str

    model_config = {"from_attributes": True}


# ── Contacts ──────────────────────────────────────────────────────────────────

class AddressSchema(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[AddressSchema] = None
    birthday: Optional[date] = None
    anniversary: Optional[date] = None
    notes: Optional[str] = None
    is_favorite: bool = False
    tag_ids: List[str] = Field(default_factory=list)
    social_links: Optional[Dict[str, Optional[str]]] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[AddressSchema] = None
    birthday: Optional[date] = None
    anniversary: Optional[date] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    tag_ids: Optional[List[str]] = None
    social_links: Optional[Dict[str, Optional[str]]] = None


class ContactOut(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    email: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    address: Optional[dict]
    birthday: Optional[date]
    anniversary: Optional[date]
    photo_url: Optional[str]
    notes: Optional[str]
    is_favorite: bool
    is_archived: bool
    share_token: Optional[str]
    tags: List[TagOut] = []
    social_links: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    contacts: List[ContactOut]
    total: int
    page: int
    per_page: int
    pages: int


# ── History ───────────────────────────────────────────────────────────────────

class HistoryOut(BaseModel):
    id: str
    action: str
    old_data: Optional[dict]
    new_data: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Reminders ─────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    reminder_type: str  # birthday, anniversary, custom
    message: Optional[str] = None
    remind_at: datetime


class ReminderOut(BaseModel):
    id: str
    contact_id: str
    reminder_type: str
    message: Optional[str]
    remind_at: datetime
    is_sent: bool

    model_config = {"from_attributes": True}


# ── Webhooks ──────────────────────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    url: str
    events: List[str] = Field(default_factory=lambda: ["contact.created", "contact.updated", "contact.deleted"])
    secret: Optional[str] = None


class WebhookOut(BaseModel):
    id: str
    url: str
    events: List[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── AI ────────────────────────────────────────────────────────────────────────

class AISearchRequest(BaseModel):
    query: str = Field(min_length=1)


class AISearchResponse(BaseModel):
    contacts: List[ContactOut]
    explanation: str
    suggested_filters: dict


class DuplicateGroup(BaseModel):
    contacts: List[ContactOut]
    similarity_score: float
    reason: str


class EnrichRequest(BaseModel):
    contact_id: str


class BusinessCardRequest(BaseModel):
    text: str


class AutoTagRequest(BaseModel):
    contact_id: str


class SmartDuplicateGroup(BaseModel):
    ids: List[str]
    names: List[str]
    similarity_score: float
    reason: str
    contacts: List[ContactOut]


class MergeRequest(BaseModel):
    primary_id: str
    secondary_id: str
    field_preferences: dict = Field(default_factory=dict)


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    total_contacts: int
    favorites: int
    with_email: int
    with_phone: int
    with_photo: int
    archived: int
    total_tags: int
    google_synced: int
    contacts_this_month: int
    contacts_this_week: int
    tag_breakdown: List[dict]
    growth_chart: List[dict]


# ── Import/Export ─────────────────────────────────────────────────────────────

class ImportResult(BaseModel):
    added: int
    skipped: int
    errors: List[str] = []


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
