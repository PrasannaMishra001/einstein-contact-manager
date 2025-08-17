# 🧠 Einstein Contact Manager

A smart, feature-rich contact management system with Google Contacts synchronization, built for the terminal.

```
███████╗██╗███╗   ██╗███████╗████████╗███████╗██╗███╗   ██╗
██╔════╝██║████╗  ██║██╔════╝╚══██╔══╝██╔════╝██║████╗  ██║
█████╗  ██║██╔██╗ ██║███████╗   ██║   █████╗  ██║██╔██╗ ██║
██╔══╝  ██║██║╚██╗██║╚════██║   ██║   ██╔══╝  ██║██║╚██╗██║
███████╗██║██║ ╚████║███████║   ██║   ███████╗██║██║ ╚████║
╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝

🧠 Smart Contact Management System 📞
```

## ✨ Features

- 📞 **Complete Contact Management**: Add, edit, delete, and search contacts
- 🏷️ **Smart Tagging System**: Organize contacts with custom tags
- ⭐ **Favorites**: Mark important contacts as favorites
- 🔍 **Advanced Search**: Filter by tags, favorites, email, photos, and date
- 📊 **Statistics**: Get insights about your contact database
- 💾 **Backup & Restore**: Automatic backups with restore functionality
- 📁 **Import/Export**: CSV import/export support
- 📸 **Photo Support**: Add photos to your contacts
- ☁️ **Google Sync**: Two-way synchronization with Google Contacts
- 🎨 **Rich UI**: Beautiful terminal interface with tables, colors, and emojis

## 🚀 Quick Install

### Option 1: NPM (Recommended)
```bash
npm install -g einstein-contact-manager
einstein
```

### Option 2: Direct Download
1. Download the latest release from [GitHub Releases](https://github.com/PrasannaMishra001/einstein-contact-manager/releases)
2. Run the installer for your platform

### Option 3: Build from Source
```bash
git clone https://github.com/PrasannaMishra001/einstein-contact-manager.git
cd einstein-contact-manager
python setup.py
python main.py
```

## 📋 Requirements

- Python 3.7+ (for building from source)
- No requirements for pre-built executables

## 🔧 Setup

### Basic Setup
1. Run `einstein` to start the application
2. Follow the on-screen prompts to create your first contacts

### Google Sync Setup (Optional)
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the "People API"
4. Create OAuth 2.0 Client ID (Desktop Application)
5. Download `credentials.json`
6. Place it in the `data/` folder
7. Run Einstein and use the Google Sync menu

Detailed setup guide: [docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md)

## 📖 Usage

### Main Menu Options
- **Add Contact**: Create new contacts with phone, email, tags, and notes
- **List Contacts**: View all contacts in a formatted table
- **Search**: Find contacts by name, phone, or email
- **Advanced Search**: Filter by tags, favorites, and other criteria
- **Update/Delete**: Modify or remove existing contacts
- **Tag Management**: Organize contacts with custom tags
- **Favorites**: Manage your favorite contacts
- **Import/Export**: Backup to CSV or import from other sources
- **Google Sync**: Synchronize with Google Contacts
- **Statistics**: View contact database insights

### Keyboard Shortcuts
- `Ctrl+C`: Exit application
- `Enter`: Navigate menus
- `0`: Return to main menu (from submenus)

## 🔄 Google Sync Features

- **Import**: Download contacts from Google to local database
- **Export**: Upload local contacts to Google Contacts
- **Two-way Sync**: Combine both import and export
- **Secure**: Uses OAuth 2.0, no passwords stored
- **Encrypted**: Local tokens are encrypted for security

## 📂 File Structure

```
ContactManager/
├── contacts/           # Core application modules
├── data/              # User data (contacts, backups, photos)
├── docs/              # Documentation
├── main.py           # Application entry point
├── requirements.txt  # Python dependencies
└── README.md        # This file
```

## 🔒 Privacy & Security

- **Local Storage**: All data stored locally on your device
- **Encrypted Tokens**: Google access tokens are encrypted
- **No Cloud Storage**: Your contacts never leave your control
- **Open Source**: Full transparency, inspect the code yourself

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports

Found a bug? Please open an issue on [GitHub Issues](https://github.com/PrasannaMishra001/einstein-contact-manager/issues) with:
- Your operating system
- Python version (if applicable)
- Steps to reproduce the bug
- Expected vs actual behavior

## 📞 Support

- 📖 [Documentation](docs/)
- 🐛 [Bug Reports](https://github.com/PrasannaMishra001/einstein-contact-manager/issues)
- 💡 [Feature Requests](https://github.com/PrasannaMishra001/einstein-contact-manager/issues)

## 🎯 Roadmap

- [ ] Mobile app companion
- [ ] Calendar integration
- [ ] Contact sharing
- [ ] Advanced contact analytics
- [ ] Plugin system
- [ ] Multiple account support

---

**Made with ❤️ by [Your Name]**

⭐ If you find Einstein useful, please give it a star on GitHub!