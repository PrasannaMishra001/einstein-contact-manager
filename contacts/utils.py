import os
from datetime import datetime, timedelta

def sort_by_name(contacts):
    return sorted(contacts, key=lambda c: c.name.lower())

def sort_by_date_added(contacts):
    return sorted(contacts, key=lambda c: c.created_date, reverse=True)

def group_by_first_letter(contacts):
    groups = {}
    for c in contacts:
        first = c.name[0].upper() if c.name else 'Unknown'
        groups.setdefault(first, []).append(c)
    return groups

def group_by_tags(contacts):
    """Group contacts by their tags"""
    groups = {}
    for contact in contacts:
        if not contact.tags:
            groups.setdefault('Untagged', []).append(contact)
        else:
            for tag in contact.tags:
                groups.setdefault(tag, []).append(contact)
    return groups

def search_contacts(contacts, query):
    """Search contacts by name, phone, or email"""
    results = []
    query_lower = query.lower()
    for contact in contacts:
        if (query_lower in contact.name.lower() or 
            query_lower in contact.phone or 
            (contact.email and query_lower in contact.email.lower()) or
            (contact.notes and query_lower in contact.notes.lower()) or
            any(query_lower in tag.lower() for tag in contact.tags)):
            results.append(contact)
    return results

def filter_contacts(contacts, **filters):
    """Advanced filtering of contacts"""
    filtered = contacts[:]
    
    if filters.get('tag'):
        tag = filters['tag'].lower()
        filtered = [c for c in filtered if any(tag in t.lower() for t in c.tags)]
    
    if filters.get('favorites_only'):
        filtered = [c for c in filtered if c.is_favorite]
    
    if filters.get('has_email'):
        filtered = [c for c in filtered if c.email]
    
    if filters.get('has_photo'):
        filtered = [c for c in filtered if c.photo_path and os.path.exists(c.photo_path)]
    
    if filters.get('created_after'):
        date_threshold = filters['created_after']
        filtered = [c for c in filtered if c.created_date >= date_threshold.isoformat()]
    
    return filtered

def get_available_tags(contacts):
    """Get all unique tags from contacts"""
    tags = set()
    for contact in contacts:
        tags.update(contact.tags)
    return sorted(list(tags))