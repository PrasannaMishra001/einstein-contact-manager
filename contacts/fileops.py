import json
import os
import csv
import shutil
from datetime import datetime
from contacts.contact import Contact

DATA_FILE = os.path.join("data", "contacts.json")
BACKUP_DIR = os.path.join("data", "backups")
PHOTOS_DIR = os.path.join("data", "photos")

def ensure_directories():
    """Ensure all required directories exist"""
    for directory in [os.path.dirname(DATA_FILE), BACKUP_DIR, PHOTOS_DIR]:
        os.makedirs(directory, exist_ok=True)

def save_contacts(contacts):
    ensure_directories()
    with open(DATA_FILE, "w") as f:
        json.dump([c.to_dict() for c in contacts], f, indent=2)

def load_contacts():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
            return [Contact.from_dict(c) for c in data]
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def export_to_csv(contacts, filename):
    """Export contacts to CSV file"""
    ensure_directories()
    filepath = os.path.join("data", filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['name', 'phone', 'email', 'tags', 'is_favorite', 'notes', 'created_date']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for contact in contacts:
            row = contact.to_dict()
            row['tags'] = ';'.join(row['tags'])  # Convert list to string
            del row['photo_path']  # Don't export photo paths
            del row['modified_date']  # Simplify export
            writer.writerow(row)
    
    return filepath

def import_from_csv(filename):
    """Import contacts from CSV file"""
    filepath = os.path.join("data", filename)
    contacts = []
    
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File {filepath} not found")
    
    with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # Convert tags string back to list
            tags = row.get('tags', '').split(';') if row.get('tags') else []
            tags = [tag.strip() for tag in tags if tag.strip()]
            
            contact = Contact(
                name=row['name'],
                phone=row['phone'],
                email=row.get('email') or None,
                tags=tags,
                is_favorite=row.get('is_favorite', '').lower() == 'true',
                notes=row.get('notes') or None
            )
            contacts.append(contact)
    
    return contacts

def create_backup():
    """Create a backup of current contacts"""
    ensure_directories()
    if os.path.exists(DATA_FILE):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(BACKUP_DIR, f"contacts_backup_{timestamp}.json")
        shutil.copy2(DATA_FILE, backup_file)
        return backup_file
    return None

def list_backups():
    """List all available backups"""
    ensure_directories()
    backups = []
    if os.path.exists(BACKUP_DIR):
        for file in os.listdir(BACKUP_DIR):
            if file.startswith("contacts_backup_") and file.endswith(".json"):
                filepath = os.path.join(BACKUP_DIR, file)
                timestamp = os.path.getctime(filepath)
                backups.append((file, datetime.fromtimestamp(timestamp)))
    return sorted(backups, key=lambda x: x[1], reverse=True)

def restore_from_backup(backup_filename):
    """Restore contacts from a backup file"""
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    if os.path.exists(backup_path):
        shutil.copy2(backup_path, DATA_FILE)
        return True
    return False

def save_photo(photo_source_path, contact_name):
    """Save a photo for a contact"""
    ensure_directories()
    if not os.path.exists(photo_source_path):
        return None
    
    # Create safe filename
    safe_name = "".join(c for c in contact_name if c.isalnum() or c in (' ', '-', '_')).strip()
    file_ext = os.path.splitext(photo_source_path)[1]
    photo_filename = f"{safe_name}{file_ext}"
    photo_path = os.path.join(PHOTOS_DIR, photo_filename)
    
    try:
        shutil.copy2(photo_source_path, photo_path)
        return photo_path
    except Exception:
        return None