import os
from datetime import datetime

class Contact:
    def __init__(self, name, phone, email=None, tags=None, is_favorite=False, photo_path=None, notes=None):
        self.name = name
        self.phone = phone
        self.email = email
        self.tags = tags or []
        self.is_favorite = is_favorite
        self.photo_path = photo_path
        self.notes = notes
        self.created_date = datetime.now().isoformat()
        self.modified_date = datetime.now().isoformat()

    def add_tag(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)
            self.modified_date = datetime.now().isoformat()

    def remove_tag(self, tag):
        if tag in self.tags:
            self.tags.remove(tag)
            self.modified_date = datetime.now().isoformat()

    def toggle_favorite(self):
        self.is_favorite = not self.is_favorite
        self.modified_date = datetime.now().isoformat()

    def update_info(self, phone=None, email=None, notes=None):
        if phone:
            self.phone = phone
        if email is not None:
            self.email = email
        if notes is not None:
            self.notes = notes
        self.modified_date = datetime.now().isoformat()

    def to_dict(self):
        return {
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "tags": self.tags,
            "is_favorite": self.is_favorite,
            "photo_path": self.photo_path,
            "notes": self.notes,
            "created_date": self.created_date,
            "modified_date": self.modified_date
        }

    @staticmethod
    def from_dict(data):
        contact = Contact(
            data["name"], 
            data["phone"], 
            data.get("email"),
            data.get("tags", []),
            data.get("is_favorite", False),
            data.get("photo_path"),
            data.get("notes")
        )
        contact.created_date = data.get("created_date", datetime.now().isoformat())
        contact.modified_date = data.get("modified_date", datetime.now().isoformat())
        return contact

    def __str__(self):
        favorite_star = "⭐" if self.is_favorite else ""
        tags_str = f" [{', '.join(self.tags)}]" if self.tags else ""
        return f"{favorite_star}{self.name} | {self.phone} | {self.email or 'N/A'}{tags_str}"
