from contacts.contact import Contact
from contacts.fileops import save_contacts, load_contacts, export_to_csv, import_from_csv, create_backup, restore_from_backup, list_backups
from contacts.utils import search_contacts, filter_contacts, get_available_tags
from contacts.google_sync import GoogleContactsSync
import threading
from datetime import datetime

class AddressBook:
    def __init__(self):
        self.contacts = load_contacts()
        self.google_sync = GoogleContactsSync()


    def add_contact(self, contact):
        # Check for duplicate names
        existing = [c for c in self.contacts if c.name.lower() == contact.name.lower()]
        if existing:
            return False, f"Contact with name '{contact.name}' already exists."
        
        self.contacts.append(contact)
        save_contacts(self.contacts)
        return True, "Contact added successfully!"

    def list_contacts(self, show_details=False):
        if not self.contacts:
            return []
        return self.contacts

    def get_favorites(self):
        return [c for c in self.contacts if c.is_favorite]

    def search_contact(self, query):
        return search_contacts(self.contacts, query)

    def filter_contacts(self, **filters):
        return filter_contacts(self.contacts, **filters)

    def delete_contact(self, name):
        original_count = len(self.contacts)
        self.contacts = [c for c in self.contacts if name.lower() not in c.name.lower()]
        deleted_count = original_count - len(self.contacts)
        
        if deleted_count > 0:
            save_contacts(self.contacts)
            return deleted_count
        return 0

    def update_contact(self, name, **kwargs):
        """Update contact information"""
        for contact in self.contacts:
            if name.lower() in contact.name.lower():
                if 'phone' in kwargs:
                    contact.phone = kwargs['phone']
                if 'email' in kwargs:
                    contact.email = kwargs['email'] if kwargs['email'] else None
                if 'notes' in kwargs:
                    contact.notes = kwargs['notes'] if kwargs['notes'] else None
                if 'photo_path' in kwargs:
                    contact.photo_path = kwargs['photo_path']
                contact.modified_date = datetime.now().isoformat()
                save_contacts(self.contacts)
                return contact
        return None

    def toggle_favorite(self, name):
        """Toggle favorite status of a contact"""
        for contact in self.contacts:
            if name.lower() in contact.name.lower():
                contact.toggle_favorite()
                save_contacts(self.contacts)
                return contact
        return None

    def add_tag_to_contact(self, name, tag):
        """Add a tag to a contact"""
        for contact in self.contacts:
            if name.lower() in contact.name.lower():
                contact.add_tag(tag)
                save_contacts(self.contacts)
                return contact
        return None

    def remove_tag_from_contact(self, name, tag):
        """Remove a tag from a contact"""
        for contact in self.contacts:
            if name.lower() in contact.name.lower():
                contact.remove_tag(tag)
                save_contacts(self.contacts)
                return contact
        return None

    def export_to_csv(self, filename="contacts_export.csv"):
        """Export contacts to CSV"""
        return export_to_csv(self.contacts, filename)

    def import_from_csv(self, filename):
        """Import contacts from CSV"""
        try:
            imported_contacts = import_from_csv(filename)
            added_count = 0
            skipped_count = 0
            
            for contact in imported_contacts:
                success, _ = self.add_contact(contact)
                if success:
                    added_count += 1
                else:
                    skipped_count += 1
            
            return added_count, skipped_count
        except Exception as e:
            return 0, 0, str(e)

    def create_backup(self):
        """Create a backup of current contacts"""
        return create_backup()

    def list_backups(self):
        """List all available backups"""
        return list_backups()

    def restore_from_backup(self, backup_filename):
        """Restore from backup"""
        if restore_from_backup(backup_filename):
            self.contacts = load_contacts()  # Reload contacts
            return True
        return False

    def get_contact_count(self):
        return len(self.contacts)

    def get_available_tags(self):
        return get_available_tags(self.contacts)

    def get_statistics(self):
        """Get comprehensive statistics"""
        total = len(self.contacts)
        favorites = len(self.get_favorites())
        with_email = len([c for c in self.contacts if c.email])
        with_photo = len([c for c in self.contacts if c.photo_path])
        tags = self.get_available_tags()
        
        return {
            'total': total,
            'favorites': favorites,
            'with_email': with_email,
            'with_photo': with_photo,
            'total_tags': len(tags),
            'available_tags': tags
        }
    
    def sync_with_google(self, sync_direction='import'):
        """
        Sync contacts with Google
        sync_direction: 'import', 'export', or 'both'
        """
        try:
            if sync_direction in ['import', 'both']:
                return self._import_from_google()
            elif sync_direction == 'export':
                return self._export_to_google()
        except Exception as e:
            return False, f"Sync failed: {str(e)}"
    
    def _import_from_google(self):
        """Import contacts from Google"""
        try:
            google_contacts = self.google_sync.fetch_contacts()
            
            if not google_contacts:
                return False, "No contacts found in Google account or authentication failed"
            
            added_count = 0
            skipped_count = 0
            
            for google_contact in google_contacts:
                # Check for existing contact with same name and phone
                existing = [c for c in self.contacts 
                           if c.name.lower() == google_contact.name.lower() 
                           and c.phone == google_contact.phone]
                
                if not existing:
                    self.contacts.append(google_contact)
                    added_count += 1
                else:
                    # Update existing contact with Google tag if not present
                    existing_contact = existing[0]
                    if 'google-synced' not in existing_contact.tags:
                        existing_contact.tags.append('google-synced')
                        existing_contact.modified_date = datetime.now().isoformat()
                    skipped_count += 1
            
            if added_count > 0:
                save_contacts(self.contacts)
            
            return True, f"Import completed: {added_count} added, {skipped_count} skipped"
            
        except Exception as e:
            return False, f"Import failed: {str(e)}"
    
    def _export_to_google(self):
        """Export contacts to Google"""
        try:
            exported_count = 0
            failed_count = 0
            
            # Only export contacts that are not already synced from Google
            contacts_to_export = [c for c in self.contacts if 'google-synced' not in c.tags]
            
            for contact in contacts_to_export:
                if self.google_sync.push_contact_to_google(contact):
                    contact.tags.append('google-synced')
                    contact.modified_date = datetime.now().isoformat()
                    exported_count += 1
                else:
                    failed_count += 1
            
            if exported_count > 0:
                save_contacts(self.contacts)
            
            return True, f"Export completed: {exported_count} exported, {failed_count} failed"
            
        except Exception as e:
            return False, f"Export failed: {str(e)}"
    
    def is_google_authenticated(self):
        """Check if Google authentication is available"""
        return self.google_sync.is_authenticated()
    
    def clear_google_auth(self):
        """Clear Google authentication"""
        self.google_sync.clear_authentication()
        return True