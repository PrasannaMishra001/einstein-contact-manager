import os
# import sys
# from datetime import datetime

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.text import Text
from rich import box
from rich.columns import Columns
from rich.tree import Tree
from contacts.contact import Contact
from contacts.utils import sort_by_name, group_by_first_letter, group_by_tags

console = Console()

class CLIInterface:
    def __init__(self, addressbook):
        self.ab = addressbook

    def show_main_menu(self):
        """Display the main menu with rich formatting"""
        console.clear()

        # ASCII Art Logo
        logo = """
        ███████╗██╗███╗   ██╗███████╗████████╗███████╗██╗███╗   ██╗
        ██╔════╝██║████╗  ██║██╔════╝╚══██╔══╝██╔════╝██║████╗  ██║
        █████╗  ██║██╔██╗ ██║███████╗   ██║   █████╗  ██║██╔██╗ ██║
        ██╔══╝  ██║██║╚██╗██║╚════██║   ██║   ██╔══╝  ██║██║╚██╗██║
        ███████╗██║██║ ╚████║███████║   ██║   ███████╗██║██║ ╚████║
        ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝
        
                        📞 CONTACT MANAGER v2.0
                    Smart Contacts with Google Sync
        """
        
        console.print(Text(logo, style="bold cyan"))
        console.print("─" * 70, style="dim")
        
        # Title
        title = Text("📞 CONTACT MANAGER", style="bold blue")
        console.print(Panel(title, box=box.DOUBLE_EDGE))
        
        # Menu options
        menu_items = [
            "1️⃣  Add Contact",
            "2️⃣  List All Contacts", 
            "3️⃣  Search Contacts",
            "4️⃣  Advanced Search & Filter",
            "5️⃣  Update Contact",
            "6️⃣  Delete Contact",
            "7️⃣  Manage Tags",
            "8️⃣  Favorites",
            "9️⃣  Import/Export",
            "🔟 Backup & Restore",
            "1️⃣1️⃣ Google Sync",
            "1️⃣2️⃣ Statistics",
            "1️⃣3️⃣ Display Options",
            "0️⃣  Exit"
        ]
        
        for item in menu_items:
            console.print(f"  {item}")
        
        console.print()
        return Prompt.ask("Choose an option", choices=[str(i) for i in range(14)] + ["0"])

    def display_contacts_table(self, contacts, title="Contacts"):
        """Display contacts in a formatted table"""
        if not contacts:
            console.print(f"[yellow]No contacts found.[/yellow]")
            return

        table = Table(title=title, box=box.ROUNDED)
        table.add_column("#", style="dim", width=3)
        table.add_column("Name", style="cyan", min_width=15)
        table.add_column("Phone", style="green", min_width=12)
        table.add_column("Email", style="blue", min_width=20)
        table.add_column("Tags", style="magenta", min_width=15)
        table.add_column("Fav", justify="center", width=3)
        table.add_column("Notes", style="dim", max_width=20)

        for i, contact in enumerate(contacts, 1):
            fav_symbol = "⭐" if contact.is_favorite else ""
            tags_str = ", ".join(contact.tags) if contact.tags else ""
            notes_preview = (contact.notes[:17] + "...") if contact.notes and len(contact.notes) > 20 else (contact.notes or "")
            
            table.add_row(
                str(i),
                contact.name,
                contact.phone,
                contact.email or "N/A",
                tags_str,
                fav_symbol,
                notes_preview
            )

        console.print(table)

    def add_contact_menu(self):
        """Enhanced add contact menu"""
        console.print(Panel("➕ Add New Contact", style="green"))
        
        name = Prompt.ask("Name")
        if not name.strip():
            console.print("[red]Name cannot be empty![/red]")
            return
        
        phone = Prompt.ask("Phone")
        if not phone.strip():
            console.print("[red]Phone cannot be empty![/red]")
            return
        
        email = Prompt.ask("Email (optional)") or None
        notes = Prompt.ask("Notes (optional)") or None
        
        # Tags
        available_tags = self.ab.get_available_tags()
        if available_tags:
            console.print(f"Available tags: {', '.join(available_tags)}")
        
        tags_input = Prompt.ask("Tags (comma-separated, optional)") or ""
        tags = [tag.strip() for tag in tags_input.split(",") if tag.strip()]
        
        is_favorite = Confirm.ask("Add to favorites?", default=False)
        
        # Photo
        photo_path = None
        if Confirm.ask("Add photo?", default=False):
            photo_source = Prompt.ask("Photo file path")
            if photo_source and os.path.exists(photo_source):
                from contacts.fileops import save_photo
                photo_path = save_photo(photo_source, name)
                if photo_path:
                    console.print(f"[green]Photo saved successfully![/green]")
                else:
                    console.print(f"[red]Failed to save photo.[/red]")
        
        contact = Contact(name, phone, email, tags, is_favorite, photo_path, notes)
        success, message = self.ab.add_contact(contact)
        
        if success:
            console.print(f"[green]✓ {message}[/green]")
        else:
            console.print(f"[red]❌ {message}[/red]")

    def search_menu(self):
        """Enhanced search menu"""
        console.print(Panel("🔍 Search Contacts", style="blue"))
        
        query = Prompt.ask("Enter search term")
        if not query.strip():
            console.print("[red]Search term cannot be empty![/red]")
            return
        
        results = self.ab.search_contact(query)
        self.display_contacts_table(results, f"Search Results for '{query}'")

    def advanced_search_menu(self):
        """Advanced search and filtering"""
        console.print(Panel("🔬 Advanced Search & Filters", style="blue"))
        
        filters = {}
        
        # Tag filter
        available_tags = self.ab.get_available_tags()
        if available_tags:
            console.print(f"Available tags: {', '.join(available_tags)}")
            tag_filter = Prompt.ask("Filter by tag (optional)") or None
            if tag_filter:
                filters['tag'] = tag_filter
        
        # Other filters
        if Confirm.ask("Show only favorites?", default=False):
            filters['favorites_only'] = True
        
        if Confirm.ask("Show only contacts with email?", default=False):
            filters['has_email'] = True
            
        if Confirm.ask("Show only contacts with photos?", default=False):
            filters['has_photo'] = True
        
        # Date filter
        if Confirm.ask("Filter by creation date?", default=False):
            days = Prompt.ask("Show contacts created in last X days", default="30")
            try:
                days_int = int(days)
                from datetime import datetime, timedelta
                date_threshold = datetime.now() - timedelta(days=days_int)
                filters['created_after'] = date_threshold
            except ValueError:
                console.print("[red]Invalid number of days[/red]")
        
        results = self.ab.filter_contacts(**filters)
        filter_desc = ", ".join([f"{k}={v}" for k, v in filters.items()])
        self.display_contacts_table(results, f"Filtered Results ({filter_desc})")

    def manage_tags_menu(self):
        """Tag management menu"""
        console.print(Panel("🏷️ Tag Management", style="magenta"))
        
        options = [
            "1. View all tags",
            "2. Add tag to contact", 
            "3. Remove tag from contact",
            "4. View contacts by tag",
            "5. Back to main menu"
        ]
        
        for option in options:
            console.print(f"  {option}")
        
        choice = Prompt.ask("Choose option", choices=["1", "2", "3", "4", "5"])
        
        if choice == "1":
            tags = self.ab.get_available_tags()
            if tags:
                console.print(f"Available tags: {', '.join(tags)}")
            else:
                console.print("No tags found.")
                
        elif choice == "2":
            name = Prompt.ask("Contact name")
            tag = Prompt.ask("Tag to add")
            result = self.ab.add_tag_to_contact(name, tag)
            if result:
                console.print(f"[green]✓ Tag '{tag}' added to {result.name}[/green]")
            else:
                console.print("[red]Contact not found[/red]")
                
        elif choice == "3":
            name = Prompt.ask("Contact name")
            contact = None
            for c in self.ab.contacts:
                if name.lower() in c.name.lower():
                    contact = c
                    break
            
            if contact and contact.tags:
                console.print(f"Current tags: {', '.join(contact.tags)}")
                tag = Prompt.ask("Tag to remove")
                result = self.ab.remove_tag_from_contact(name, tag)
                if result:
                    console.print(f"[green]✓ Tag '{tag}' removed from {result.name}[/green]")
                else:
                    console.print("[red]Tag not found[/red]")
            else:
                console.print("[red]Contact not found or no tags[/red]")
                
        elif choice == "4":
            groups = group_by_tags(self.ab.contacts)
            for tag, contacts in groups.items():
                console.print(f"\n[bold]{tag}[/bold] ({len(contacts)} contacts):")
                for contact in contacts:
                    console.print(f"  • {contact}")

    def favorites_menu(self):
        """Favorites management"""
        console.print(Panel("⭐ Favorites Management", style="yellow"))
        
        options = [
            "1. Show all favorites",
            "2. Add to favorites",
            "3. Remove from favorites", 
            "4. Back to main menu"
        ]
        
        for option in options:
            console.print(f"  {option}")
        
        choice = Prompt.ask("Choose option", choices=["1", "2", "3", "4"])
        
        if choice == "1":
            favorites = self.ab.get_favorites()
            self.display_contacts_table(favorites, "⭐ Favorite Contacts")
            
        elif choice == "2":
            name = Prompt.ask("Contact name to add to favorites")
            result = self.ab.toggle_favorite(name)
            if result:
                status = "added to" if result.is_favorite else "removed from"
                console.print(f"[green]✓ {result.name} {status} favorites[/green]")
            else:
                console.print("[red]Contact not found[/red]")
                
        elif choice == "3":
            favorites = self.ab.get_favorites()
            if not favorites:
                console.print("No favorites to remove.")
                return
            
            self.display_contacts_table(favorites, "Current Favorites")
            name = Prompt.ask("Contact name to remove from favorites")
            result = self.ab.toggle_favorite(name)
            if result:
                console.print(f"[green]✓ {result.name} removed from favorites[/green]")
            else:
                console.print("[red]Contact not found[/red]")

    def import_export_menu(self):
        """Import/Export menu"""
        console.print(Panel("📁 Import/Export", style="cyan"))
        
        options = [
            "1. Export to CSV",
            "2. Import from CSV",
            "3. View sample CSV format",
            "4. Back to main menu"
        ]
        
        for option in options:
            console.print(f"  {option}")
        
        choice = Prompt.ask("Choose option", choices=["1", "2", "3", "4"])
        
        if choice == "1":
            filename = Prompt.ask("Export filename", default="contacts_export.csv")
            try:
                filepath = self.ab.export_to_csv(filename)
                console.print(f"[green]✓ Contacts exported to {filepath}[/green]")
            except Exception as e:
                console.print(f"[red]Export failed: {e}[/red]")
                
        elif choice == "2":
            filename = Prompt.ask("Import filename")
            try:
                result = self.ab.import_from_csv(filename)
                if len(result) == 3:  # Error case
                    added, skipped, error = result
                    console.print(f"[red]Import failed: {error}[/red]")
                else:
                    added, skipped = result
                    console.print(f"[green]✓ Import completed: {added} added, {skipped} skipped[/green]")
            except Exception as e:
                console.print(f"[red]Import failed: {e}[/red]")
                
        elif choice == "3":
            console.print("\n[bold]Sample CSV format:[/bold]")
            sample_table = Table(box=box.SIMPLE)
            sample_table.add_column("name")
            sample_table.add_column("phone") 
            sample_table.add_column("email")
            sample_table.add_column("tags")
            sample_table.add_column("is_favorite")
            sample_table.add_column("notes")
            
            sample_table.add_row("John Doe", "123-456-7890", "john@email.com", "work;friend", "true", "Important client")
            sample_table.add_row("Jane Smith", "098-765-4321", "jane@email.com", "family", "false", "Sister")
            
            console.print(sample_table)

    def backup_restore_menu(self):
        """Backup and restore menu"""
        console.print(Panel("💾 Backup & Restore", style="green"))
        
        options = [
            "1. Create backup",
            "2. List backups",
            "3. Restore from backup",
            "4. Back to main menu"
        ]
        
        for option in options:
            console.print(f"  {option}")
        
        choice = Prompt.ask("Choose option", choices=["1", "2", "3", "4"])
        
        if choice == "1":
            backup_file = self.ab.create_backup()
            if backup_file:
                console.print(f"[green]✓ Backup created: {backup_file}[/green]")
            else:
                console.print("[red]No contacts to backup[/red]")
                
        elif choice == "2":
            backups = self.ab.list_backups()
            if backups:
                console.print("\n[bold]Available Backups:[/bold]")
                for i, (filename, date) in enumerate(backups, 1):
                    console.print(f"{i:2d}. {filename} - {date.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                console.print("No backups found.")
                
        elif choice == "3":
            backups = self.ab.list_backups()
            if not backups:
                console.print("No backups available.")
                return
            
            console.print("\n[bold]Available Backups:[/bold]")
            for i, (filename, date) in enumerate(backups, 1):
                console.print(f"{i:2d}. {filename} - {date.strftime('%Y-%m-%d %H:%M:%S')}")
            
            try:
                choice_idx = int(Prompt.ask("Select backup to restore")) - 1
                if 0 <= choice_idx < len(backups):
                    filename = backups[choice_idx][0]
                    if Confirm.ask(f"Restore from {filename}? This will overwrite current contacts"):
                        if self.ab.restore_from_backup(filename):
                            console.print(f"[green]✓ Contacts restored from {filename}[/green]")
                        else:
                            console.print("[red]Restore failed[/red]")
                    else:
                        console.print("Restore cancelled.")
                else:
                    console.print("Invalid selection.")
            except ValueError:
                console.print("Invalid input.")

    def show_statistics(self):
        """Display comprehensive statistics"""
        stats = self.ab.get_statistics()
        
        # Main stats panel
        stats_table = Table(title="📊 Contact Statistics", box=box.ROUNDED)
        stats_table.add_column("Metric", style="cyan")
        stats_table.add_column("Value", style="green", justify="right")
        
        stats_table.add_row("Total Contacts", str(stats['total']))
        stats_table.add_row("Favorites", str(stats['favorites']))
        stats_table.add_row("With Email", str(stats['with_email']))
        stats_table.add_row("With Photos", str(stats['with_photo']))
        stats_table.add_row("Total Tags", str(stats['total_tags']))
        
        console.print(stats_table)
        
        # Tags breakdown
        if stats['available_tags']:
            console.print(f"\n[bold]Available Tags:[/bold] {', '.join(stats['available_tags'])}")

    def display_options_menu(self):
        """Display options menu"""
        console.print(Panel("🎨 Display Options", style="purple"))
        
        options = [
            "1. Sort by name (A-Z)",
            "2. Sort by date added (newest first)",
            "3. Group by first letter",
            "4. Group by tags",
            "5. Show only favorites",
            "6. Back to main menu"
        ]
        
        for option in options:
            console.print(f"  {option}")
        
        choice = Prompt.ask("Choose option", choices=["1", "2", "3", "4", "5", "6"])
        
        if choice == "1":
            sorted_contacts = sort_by_name(self.ab.contacts)
            self.display_contacts_table(sorted_contacts, "📝 Contacts (A-Z)")
            
        elif choice == "2":
            from contacts.utils import sort_by_date_added
            sorted_contacts = sort_by_date_added(self.ab.contacts)
            self.display_contacts_table(sorted_contacts, "📅 Contacts (Newest First)")
            
        elif choice == "3":
            groups = group_by_first_letter(self.ab.contacts)
            for letter in sorted(groups.keys()):
                console.print(f"\n[bold blue]{letter}[/bold blue]")
                for contact in groups[letter]:
                    console.print(f"  • {contact}")
                    
        elif choice == "4":
            groups = group_by_tags(self.ab.contacts)
            tree = Tree("📂 Contacts by Tags")
            for tag, contacts in groups.items():
                tag_branch = tree.add(f"{tag} ({len(contacts)})")
                for contact in contacts:
                    tag_branch.add(str(contact))
            console.print(tree)
            
        elif choice == "5":
            favorites = self.ab.get_favorites()
            self.display_contacts_table(favorites, "⭐ Favorite Contacts")

    def google_sync_menu(self):
        """Google Contacts synchronization menu"""
        console.print(Panel("☁️ Google Contacts Sync", style="blue"))
        
        # Check if credentials file exists
        credentials_path = os.path.join('data', 'credentials.json')
        if not os.path.exists(credentials_path):
            console.print("[red]❌ Google credentials not found![/red]")
            console.print("\n[yellow]Setup required:[/yellow]")
            console.print("1. Go to https://console.cloud.google.com/")
            console.print("2. Create a new project or select existing")
            console.print("3. Enable 'People API'")
            console.print("4. Create OAuth 2.0 Client ID (Desktop Application)")
            console.print("5. Download credentials.json")
            console.print(f"6. Place credentials.json in: {credentials_path}")
            console.print("\n[dim]Press Enter to continue...[/dim]")
            input()
            return
        
        # Check authentication status
        is_authenticated = self.ab.is_google_authenticated()
        auth_status = "[green]✓ Authenticated[/green]" if is_authenticated else "[red]❌ Not authenticated[/red]"
        console.print(f"Status: {auth_status}")
        
        options = [
            "1. Import from Google (Google → Local)",
            "2. Export to Google (Local → Google)",
            "3. Two-way sync (Import then Export)",
            "4. View sync statistics",
            "5. Clear authentication",
            "6. Test authentication",
            "7. Back to main menu"
        ]
        
        for option in options:
            console.print(f"  {option}")
        
        choice = Prompt.ask("Choose option", choices=["1", "2", "3", "4", "5", "6", "7"])
        
        if choice == "1":
            console.print("\n[yellow]Starting import from Google...[/yellow]")
            with console.status("[bold green]Fetching contacts from Google..."):
                success, message = self.ab.sync_with_google('import')
            
            if success:
                console.print(f"[green]✓ {message}[/green]")
            else:
                console.print(f"[red]❌ {message}[/red]")
                
        elif choice == "2":
            console.print("\n[yellow]Starting export to Google...[/yellow]")
            
            # Count contacts to export
            contacts_to_export = [c for c in self.ab.contacts if 'google-synced' not in c.tags]
            if not contacts_to_export:
                console.print("[yellow]No local contacts to export (all are already synced)[/yellow]")
                return
            
            console.print(f"Will export {len(contacts_to_export)} local contacts to Google.")
            if not Confirm.ask("Continue?", default=True):
                console.print("Export cancelled.")
                return
            
            with console.status("[bold green]Exporting contacts to Google..."):
                success, message = self.ab.sync_with_google('export')
            
            if success:
                console.print(f"[green]✓ {message}[/green]")
            else:
                console.print(f"[red]❌ {message}[/red]")
                
        elif choice == "3":
            console.print("\n[yellow]Starting two-way sync...[/yellow]")
            console.print("Step 1: Importing from Google...")
            
            with console.status("[bold green]Importing from Google..."):
                import_success, import_message = self.ab.sync_with_google('import')
            
            console.print(f"Import: {import_message}")
            
            if import_success:
                console.print("Step 2: Exporting to Google...")
                with console.status("[bold green]Exporting to Google..."):
                    export_success, export_message = self.ab.sync_with_google('export')
                console.print(f"Export: {export_message}")
            
        elif choice == "4":
            # Show sync statistics
            google_synced = [c for c in self.ab.contacts if 'google-synced' in c.tags]
            local_only = [c for c in self.ab.contacts if 'google-synced' not in c.tags]
            
            stats_table = Table(title="📊 Sync Statistics", box=box.ROUNDED)
            stats_table.add_column("Category", style="cyan")
            stats_table.add_column("Count", style="green", justify="right")
            
            stats_table.add_row("Total Contacts", str(len(self.ab.contacts)))
            stats_table.add_row("Google Synced", str(len(google_synced)))
            stats_table.add_row("Local Only", str(len(local_only)))
            stats_table.add_row("Authentication", "Yes" if is_authenticated else "No")
            
            console.print(stats_table)
            
        elif choice == "5":
            if Confirm.ask("Clear Google authentication? You'll need to re-authenticate next time.", default=False):
                self.ab.clear_google_auth()
                console.print("[green]✓ Authentication cleared[/green]")
            else:
                console.print("Authentication kept.")
                
        elif choice == "6":
            console.print("\n[yellow]Testing Google authentication...[/yellow]")
            try:
                with console.status("[bold green]Testing connection..."):
                    success = self.ab.google_sync.authenticate()
                    if success:
                        # Test API call
                        test_contacts = self.ab.google_sync.fetch_contacts()
                        contact_count = len(test_contacts) if test_contacts else 0
                
                console.print(f"[green]✓ Authentication successful![/green]")
                console.print(f"[green]Found {contact_count} contacts in Google account[/green]")
                
            except Exception as e:
                console.print(f"[red]❌ Authentication failed: {e}[/red]")
