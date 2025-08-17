import os
import sys
import subprocess
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt


console = Console()



def install_google_requirements():
    """Install Google integration requirements"""
    requirements = [
        'google-api-python-client>=2.0.0',
        'google-auth-httplib2>=0.1.0', 
        'google-auth-oauthlib>=0.5.0',
        'cryptography>=3.4.8'
    ]
    
    console.print("[yellow]Installing Google integration requirements...[/yellow]")
    
    for req in requirements:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', req])
            console.print(f"[green]✓ Installed {req}[/green]")
        except subprocess.CalledProcessError:
            console.print(f"[red]❌ Failed to install {req}[/red]")
            return False
    
    return True

def create_google_setup_guide():
    """Create a setup guide for Google integration"""
    guide_content = """
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
"""
    
    os.makedirs('docs', exist_ok=True)
    with open('docs/GOOGLE_SETUP.md', 'w', encoding='utf-8') as f:
        f.write(guide_content)
    
    console.print("[green]✓ Setup guide created: docs/GOOGLE_SETUP.md[/green]")

def main():
    console.print(Panel.fit(
        "🚀 Google Contacts Integration Setup\n"
        "This will install required packages and create setup guides",
        style="bold blue"
    ))
    
    # Install requirements
    if not install_google_requirements():
        console.print("[red]❌ Failed to install some requirements. Please install manually.[/red]")
        return
    
    # Create setup guide
    create_google_setup_guide()
    
    # Check if credentials exist
    creds_path = os.path.join('data', 'credentials.json')
    if not os.path.exists(creds_path):
        console.print(f"\n[yellow]⚠️ Google credentials not found at {creds_path}[/yellow]")
        console.print("[yellow]Please follow the setup guide in docs/GOOGLE_SETUP.md[/yellow]")
    else:
        console.print(f"\n[green]✓ Google credentials found![/green]")
    
    console.print("\n[bold green]Setup completed![/bold green]")
    console.print("\n[cyan]Next steps:[/cyan]")
    console.print("1. If you haven't already, follow docs/GOOGLE_SETUP.md")
    console.print("2. Run: python main.py")
    console.print("3. Choose '☁️ Google Sync' from the menu")
    console.print("4. Test authentication and start syncing!")

if __name__ == "__main__":
    main()