
import csv
import os

def create_sample_csv():
    """Create a sample CSV file with contact data"""
    sample_data = [
        {
            'name': 'Michael Johnson',
            'phone': '555-1001',
            'email': 'michael@tech.com',
            'tags': 'work;colleague;tech',
            'is_favorite': 'true',
            'notes': 'Senior developer at StartupXYZ'
        },
        {
            'name': 'Sarah Williams',
            'phone': '555-1002', 
            'email': 'sarah@design.com',
            'tags': 'work;creative',
            'is_favorite': 'false',
            'notes': 'UI/UX designer for mobile apps'
        },
        {
            'name': 'Robert Davis',
            'phone': '555-1003',
            'email': 'rob@email.com',
            'tags': 'friend;sports',
            'is_favorite': 'true',
            'notes': 'Basketball teammate'
        },
        {
            'name': 'Lisa Anderson',
            'phone': '555-1004',
            'email': '',
            'tags': 'family',
            'is_favorite': 'true',
            'notes': 'Aunt from Portland'
        },
        {
            'name': 'Tom Wilson',
            'phone': '555-1005',
            'email': 'tom@business.com',
            'tags': 'work;client;important',
            'is_favorite': 'false',
            'notes': 'CEO of Wilson Industries - major client'
        },
        {
            'name': 'Jennifer Lopez',
            'phone': '555-1006',
            'email': 'jen@fitness.com',
            'tags': 'friend;fitness;trainer',
            'is_favorite': 'true',
            'notes': 'Personal trainer and nutritionist'
        },
        {
            'name': 'Mark Thompson',
            'phone': '555-1007',
            'email': 'mark@consulting.com',
            'tags': 'work;consultant',
            'is_favorite': 'false',
            'notes': 'Business strategy consultant'
        },
        {
            'name': 'Amanda Rodriguez',
            'phone': '555-1008',
            'email': 'amanda@med.org',
            'tags': 'family;doctor;emergency',
            'is_favorite': 'true',
            'notes': 'Family doctor - emergency contact'
        },
        {
            'name': 'Chris Martin',
            'phone': '555-1009',
            'email': 'chris@music.com',
            'tags': 'friend;music;band',
            'is_favorite': 'false',
            'notes': 'Guitarist in local band'
        },
        {
            'name': 'Diana Prince',
            'phone': '555-1010',
            'email': 'diana@law.com',
            'tags': 'work;legal;lawyer',
            'is_favorite': 'true',
            'notes': 'Patent attorney for IP matters'
        }
    ]
    
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    filename = os.path.join('data', 'sample_contacts.csv')
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['name', 'phone', 'email', 'tags', 'is_favorite', 'notes', 'created_date']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for contact in sample_data:
            contact['created_date'] = '2024-01-15T10:30:00'  # Sample date
            writer.writerow(contact)
    
    print(f"Sample CSV created: {filename}")
    print(f"Contains {len(sample_data)} sample contacts")
    return filename

if __name__ == "__main__":
    create_sample_csv()