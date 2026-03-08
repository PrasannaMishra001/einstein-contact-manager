"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("google_access_token", sa.Text()),
        sa.Column("google_refresh_token", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "contacts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("company", sa.String(255)),
        sa.Column("job_title", sa.String(255)),
        sa.Column("address", sa.JSON()),
        sa.Column("birthday", sa.Date()),
        sa.Column("anniversary", sa.Date()),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("notes", sa.Text()),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("google_resource_name", sa.String(255)),
        sa.Column("share_token", sa.String(64), unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_contacts_user_id", "contacts", ["user_id"])
    op.create_index("ix_contacts_user_name", "contacts", ["user_id", "name"])

    op.create_table(
        "tags",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), server_default="#6366f1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_tags_user_name"),
    )

    op.create_table(
        "contact_tags",
        sa.Column("contact_id", sa.String(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.String(), sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "contact_history",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("contact_id", sa.String(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("old_data", sa.JSON()),
        sa.Column("new_data", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_contact_history_contact_id", "contact_history", ["contact_id"])

    op.create_table(
        "reminders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("contact_id", sa.String(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reminder_type", sa.String(50), nullable=False),
        sa.Column("message", sa.Text()),
        sa.Column("remind_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_sent", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "webhooks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("events", sa.JSON()),
        sa.Column("secret", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("webhooks")
    op.drop_table("reminders")
    op.drop_table("contact_history")
    op.drop_table("contact_tags")
    op.drop_table("tags")
    op.drop_table("contacts")
    op.drop_table("users")
