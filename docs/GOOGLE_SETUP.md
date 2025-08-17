
# Google Contacts Integration Setup Guide

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select Project**
   - Click "Select a project" -> "New Project"
   - Name: "Contact Manager" (or any name you prefer)
   - Click "Create"

3. **Enable People API**
   - Go to "APIs & Services" -> "Library"
   - Search for "People API"
   - Click on it and press "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" -> "Credentials"
   - Click "Create Credentials" -> "OAuth client ID"
   - Choose "Desktop application"
   - Name: "Contact Manager Desktop"
   - Click "Create"

5. **Download Credentials**
   - Click the download button (⬇️) next to your created credential
   - Save the file as `credentials.json`
   - Move it to your ContactManager/data/ folder

## Step 2: File Placement

Make sure your file structure looks like this:
```
ContactManager/
├── data/
│   └── credentials.json  # Place downloaded file here
├── contacts/
│   ├── google_sync.py    # New file
│   └── ...
└── main.py
```

## Step 3: First Run

1. Run the Contact Manager: `python main.py`
2. Choose "☁️ Google Sync"
3. Choose "Test authentication"
4. A browser window will open
5. Sign in to your Google account
6. Grant permissions to the app
7. Return to terminal - you should see "Authentication successful!"

## Security Notes

- Your Google password is NEVER stored
- Only an encrypted access token is saved locally
- The app can only access contacts (not other Google data)
- You can revoke access anytime from your Google Account settings

## Troubleshooting

**"Credentials not found" error:**
- Ensure credentials.json is in the data/ folder
- Check the file isn't named credentials.json.txt

**"Permission denied" error:**
- Make sure you granted all requested permissions
- Try clearing authentication and re-authenticating

**"API not enabled" error:**
- Ensure People API is enabled in Google Cloud Console
- Wait a few minutes after enabling for it to activate
