import os
import pickle
import json

import tempfile

from datetime import datetime
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from contacts.contact import Contact
from cryptography.fernet import Fernet

# Import embedded credentials
try:
    from contacts.embedded_credentials import EMBEDDED_CREDENTIALS, AUTHORIZED_USERS
    HAS_EMBEDDED_CREDS = True
except ImportError:
    HAS_EMBEDDED_CREDS = False
    EMBEDDED_CREDENTIALS = None
    AUTHORIZED_USERS = []

class GoogleContactsSync:
    SCOPES = ['https://www.googleapis.com/auth/contacts']  # Read/write access
    TOKEN_FILE = os.path.join('data', 'google_token.pkl')
    CREDENTIALS_FILE = os.path.join('data', 'credentials.json')
    KEY_FILE = os.path.join('data', 'sync_key.key')
    
    def __init__(self):
        self.service = None
        self.encryption_key = self._get_or_create_key()
        self.use_embedded_creds = HAS_EMBEDDED_CREDS and EMBEDDED_CREDENTIALS
    
    def _get_or_create_key(self):
        """Get or create encryption key for token security"""
        os.makedirs('data', exist_ok=True)
        if os.path.exists(self.KEY_FILE):
            with open(self.KEY_FILE, 'rb') as key_file:
                key = key_file.read()
        else:
            key = Fernet.generate_key()
            with open(self.KEY_FILE, 'wb') as key_file:
                key_file.write(key)
        return Fernet(key)
    
    def _encrypt_token(self, token_data):
        """Encrypt token data"""
        return self.encryption_key.encrypt(pickle.dumps(token_data))
    
    def _decrypt_token(self, encrypted_data):
        """Decrypt token data"""
        return pickle.loads(self.encryption_key.decrypt(encrypted_data))
    
    def _create_temp_credentials_file(self):
        """Create temporary credentials file from embedded data"""
        if not self.use_embedded_creds:
            return None

        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(EMBEDDED_CREDENTIALS, temp_file, indent=2)
        temp_file.close()
        return temp_file.name
    
    def authenticate(self):
        """Authenticate with Google and return service object"""
        creds = None
        
        # Load existing encrypted token
        if os.path.exists(self.TOKEN_FILE):
            try:
                with open(self.TOKEN_FILE, 'rb') as token:
                    encrypted_data = token.read()
                    creds = self._decrypt_token(encrypted_data)
            except Exception as e:
                print(f"Error loading token: {e}")
                creds = None
        
        # If there are no (valid) credentials available, let the user log in
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception:
                    creds = None
            
            if not creds:
                # Try embedded credentials first
                credentials_file = None
                if self.use_embedded_creds:
                    credentials_file = self._create_temp_credentials_file()
                elif os.path.exists(self.CREDENTIALS_FILE):
                    credentials_file = self.CREDENTIALS_FILE
                
                if not credentials_file:
                    raise FileNotFoundError(
                        "No Google credentials available. Contact the developer for access."
                    )
                
                try:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        credentials_file, self.SCOPES)
                    
                    # Use a specific port for consistency
                    creds = flow.run_local_server(
                        port=8080,
                        prompt='select_account',
                        authorization_prompt_message='Please visit this URL to authorize Einstein Contact Manager: {url}',
                        success_message='Authorization successful! You can close this window and return to Einstein.'
                    )
                    
                    # Clean up temp file if used
                    if credentials_file != self.CREDENTIALS_FILE:
                        try:
                            os.unlink(credentials_file)
                        except:
                            pass
                            
                except Exception as e:
                    print(f"Authentication failed: {e}")
                    return False
            
            # Save encrypted credentials
            os.makedirs(os.path.dirname(self.TOKEN_FILE), exist_ok=True)
            with open(self.TOKEN_FILE, 'wb') as token:
                encrypted_data = self._encrypt_token(creds)
                token.write(encrypted_data)
        
        try:
            self.service = build('people', 'v1', credentials=creds)
            return True
        except Exception as e:
            print(f"Failed to build Google service: {e}")
            return False
    
    def fetch_contacts(self):
        """Fetch all contacts from Google"""
        if not self.service:
            if not self.authenticate():
                return []
        
        try:
            contacts = []
            page_token = None
            
            while True:
                # Fetch contacts with pagination
                results = self.service.people().connections().list(
                    resourceName='people/me',
                    pageSize=1000,
                    pageToken=page_token,
                    personFields='names,emailAddresses,phoneNumbers,organizations,biographies,userDefined'
                ).execute()
                
                connections = results.get('connections', [])
                
                for person in connections:
                    contact = self._convert_google_contact(person)
                    if contact:
                        contacts.append(contact)
                
                page_token = results.get('nextPageToken')
                if not page_token:
                    break
            
            return contacts
            
        except HttpError as error:
            print(f"Google API error: {error}")
            return []
        except Exception as error:
            print(f"Error fetching contacts: {error}")
            return []
    
    def _convert_google_contact(self, person):
        """Convert Google contact to our Contact object"""
        # Extract name
        names = person.get('names', [])
        if not names:
            return None
        name = names[0].get('displayName', 'Unknown')
        
        # Extract phone (primary phone)
        phones = person.get('phoneNumbers', [])
        phone = phones[0].get('value', '') if phones else ''
        
        # Extract email (primary email)
        emails = person.get('emailAddresses', [])
        email = emails[0].get('value', '') if emails else None
        
        # Extract organization for notes
        orgs = person.get('organizations', [])
        org_info = f" - {orgs[0].get('name', '')}" if orgs else ""
        
        # Extract biography for notes
        bios = person.get('biographies', [])
        bio_info = bios[0].get('value', '') if bios else ''
        
        notes = f"Synced from Google{org_info}"
        if bio_info:
            notes += f"\nBio: {bio_info}"
        
        # Create contact with Google sync tag
        tags = ['google-synced']
        
        # Extract custom fields for tags if any
        user_defined = person.get('userDefined', [])
        for field in user_defined:
            if field.get('key', '').lower() == 'tags':
                custom_tags = field.get('value', '').split(',')
                tags.extend([tag.strip() for tag in custom_tags if tag.strip()])
        
        return Contact(
            name=name,
            phone=phone,
            email=email,
            tags=tags,
            is_favorite=False,
            photo_path=None,
            notes=notes
        )
    
    def push_contact_to_google(self, contact):
        """Push a contact to Google (for future two-way sync)"""
        if not self.service:
            if not self.authenticate():
                return False
        
        try:
            person_body = {
                'names': [{'displayName': contact.name, 'familyName': '', 'givenName': contact.name}],
                'phoneNumbers': [{'value': contact.phone, 'type': 'mobile'}] if contact.phone else [],
                'emailAddresses': [{'value': contact.email, 'type': 'work'}] if contact.email else [],
                'biographies': [{'value': contact.notes or f'Created by Contact Manager on {datetime.now().strftime("%Y-%m-%d")}', 'contentType': 'TEXT_PLAIN'}]
            }
            
            # Add tags as user defined fields
            if contact.tags:
                person_body['userDefined'] = [
                    {'key': 'tags', 'value': ','.join(contact.tags)}
                ]
            
            result = self.service.people().createContact(body=person_body).execute()
            return result.get('resourceName') is not None
            
        except HttpError as error:
            print(f"Error creating Google contact: {error}")
            return False
    
    def is_authenticated(self):
        """Check if user is authenticated with Google"""
        return os.path.exists(self.TOKEN_FILE)
    
    def clear_authentication(self):
        """Clear stored authentication"""
        files_to_remove = [self.TOKEN_FILE, self.KEY_FILE]
        for file_path in files_to_remove:
            if os.path.exists(file_path):
                os.remove(file_path)
