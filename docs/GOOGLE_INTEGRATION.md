# Google Contacts Integration

## Features

### 🔄 **Two-Way Synchronization**
- **Import**: Download all contacts from Google to your local Contact Manager
- **Export**: Upload your local contacts to Google Contacts
- **Smart Merge**: Avoids duplicates during sync

### 🔒 **Security**
- **OAuth 2.0**: Secure authentication (no password storage)
- **Encrypted Storage**: Access tokens encrypted locally
- **Limited Scope**: Only accesses contacts, not other Google data
- **Revocable**: Can be disabled anytime from Google Account settings

### 🏷️ **Tag Preservation**
- Contacts synced from Google get 'google-synced' tag
- Custom tags are preserved during sync
- Local-only contacts can be identified and exported

## Usage Flow

### First Time Setup
1. Download credentials.json from Google Cloud Console
2. Place in `data/credentials.json`
3. Run Contact Manager → Google Sync → Test Authentication
4. Browser opens for one-time Google login
5. Grant permissions
6. Ready to sync!

### Import from Google
- Downloads all Google contacts
- Adds 'google-synced' tag
- Preserves existing local contacts
- Shows count of imported/skipped contacts

### Export to Google  
- Uploads local contacts (excluding already synced ones)
- Creates contacts in Google with your notes
- Adds custom tags as metadata
- Shows count of exported/failed contacts

### Two-Way Sync
- First imports from Google
- Then exports local contacts
- Maintains data consistency
- Perfect for keeping everything in sync

## Data Mapping

| Local Contact | Google Contact |
|---------------|----------------|
| Name | Display Name |
| Phone | Primary Phone |
| Email | Primary Email |
| Notes | Biography |
| Tags | User Defined Fields |
| Created Date | Biography note |

## Menu Options

```
☁️ Google Contacts Sync
├── 1. Import from Google (Google → Local)
├── 2. Export to Google (Local → Google)  
├── 3. Two-way sync (Import then Export)
├── 4. View sync statistics
├── 5. Clear authentication
├── 6. Test authentication
└── 7. Back to main menu
```

## Statistics View

Shows:
- Total contacts in local database
- Number of Google-synced contacts
- Number of local-only contacts  
- Authentication status
- Last sync information

## Troubleshooting

### Common Issues

**"Credentials not found"**
- Ensure `credentials.json` is in `data/` folder
- Follow Google Cloud Console setup steps

**"Authentication failed"**  
- Clear authentication and retry
- Check Google Cloud Console API is enabled
- Verify OAuth client type is "Desktop"

**"API quota exceeded"**
- Google has rate limits for API calls
- Wait a few minutes and retry
- Large imports may need to be done in batches

**"Permission denied"**
- Ensure all requested scopes were granted
- Re-authenticate if needed
- Check Google Account security settings

### Security Best Practices

1. **Keep credentials.json secure** - don't share or commit to version control
2. **Monitor access** - check Google Account → Security → Third-party apps
3. **Revoke when not needed** - disable access if you stop using sync
4. **Backup before sync** - create backup before large sync operations

## Advanced Usage

### Batch Operations
- Import handles pagination automatically
- Large contact lists (1000+) are processed in chunks
- Progress indication during long operations

### Selective Sync
- Use tags to identify sync sources
- Filter by 'google-synced' tag to see imported contacts
- Export only local contacts to avoid duplicates

### Integration with Other Features
- Synced contacts work with all existing features:
  - Favorites, tags, search, filtering
  - Backup/restore, CSV export
  - Photo management, notes

This integration makes your Contact Manager a powerful bridge between local contact management and Google's cloud services!