
from contacts.contact import Contact
from contacts.addressbook import AddressBook
from contacts.cli_interface import CLIInterface, console

from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich import box

def show_logo():
    """Display Einstein ASCII art logo"""
    logo = """
    ███████╗██╗███╗   ██╗███████╗████████╗███████╗██╗███╗   ██╗
    ██╔════╝██║████╗  ██║██╔════╝╚══██╔══╝██╔════╝██║████╗  ██║
    █████╗  ██║██╔██╗ ██║███████╗   ██║   █████╗  ██║██╔██╗ ██║
    ██╔══╝  ██║██║╚██╗██║╚════██║   ██║   ██╔══╝  ██║██║╚██╗██║
    ███████╗██║██║ ╚████║███████║   ██║   ███████╗██║██║ ╚████║
    ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝
    
         🧠 Smart Contact Management System 📞
         ═══════════════════════════════════════
    """
    
    console.print(logo, style="bold cyan")
    console.print("[dim]Press Enter to continue...[/dim]")
    input()

def create_sample_data(ab):
    """Create sample contacts for demonstration"""
    sample_contacts = [
        Contact("Alice Johnson", "555-0101", "alice@email.com", ["work", "colleague"], True, None, "Team lead at TechCorp"),
        Contact("Bob Smith", "555-0102", "bob@personal.com", ["friend"], False, None, "College roommate"),
        Contact("Carol Davis", "555-0103", "carol.davis@company.com", ["work", "manager"], True, None, "Direct supervisor"),
        Contact("David Wilson", "555-0104", None, ["family"], True, None, "Cousin from Seattle"),
        Contact("Emma Brown", "555-0105", "emma@startup.com", ["work", "client"], False, None, "Potential business partner"),
        Contact("Frank Miller", "555-0106", "frank@email.com", ["friend", "gym"], False, None, "Workout buddy"),
        Contact("Grace Lee", "555-0107", "grace@med.com", ["family", "doctor"], True, None, "Family physician"),
        Contact("Henry Taylor", "555-0108", "h.taylor@law.com", ["work", "legal"], False, None, "Company lawyer"),
    ]
    
    added_count = 0
    for contact in sample_contacts:
        success, _ = ab.add_contact(contact)
        if success:
            added_count += 1
    
    return added_count

def main():
    # Show logo first
    show_logo()
    
    # Welcome message
    console.print(Panel.fit(
        "Welcome to Enhanced Contact Manager!\n"
        "A feature-rich contact management system with tags, favorites, and more!",
        style="bold green",
        box=box.DOUBLE_EDGE
    ))
    
    # Initialize
    ab = AddressBook()
    cli = CLIInterface(ab)
    
    # Check if this is first run
    if ab.get_contact_count() == 0:
        if Confirm.ask("No contacts found. Would you like to load sample data?", default=True):
            count = create_sample_data(ab)
            console.print(f"[green]✓ Loaded {count} sample contacts![/green]")
    
    while True:
        try:
            choice = cli.show_main_menu()
            
            if choice == "1":
                cli.add_contact_menu()
            elif choice == "2":
                contacts = ab.list_contacts()
                cli.display_contacts_table(contacts, f"All Contacts ({len(contacts)})")
            elif choice == "3":
                cli.search_menu()
            elif choice == "4":
                cli.advanced_search_menu()
            elif choice == "5":
                # Update contact menu
                console.print(Panel("✏️ Update Contact", style="yellow"))
                name = Prompt.ask("Contact name to update")
                matches = ab.search_contact(name)
                
                if not matches:
                    console.print("[red]No contacts found[/red]")
                    continue
                
                if len(matches) > 1:
                    cli.display_contacts_table(matches, "Multiple Matches Found")
                    try:
                        idx = int(Prompt.ask("Select contact number")) - 1
                        if 0 <= idx < len(matches):
                            contact = matches[idx]
                        else:
                            console.print("[red]Invalid selection[/red]")
                            continue
                    except ValueError:
                        console.print("[red]Invalid input[/red]")
                        continue
                else:
                    contact = matches[0]
                
                console.print(f"Updating: [bold]{contact.name}[/bold]")
                
                new_phone = Prompt.ask(f"Phone (current: {contact.phone})")
                new_email = Prompt.ask(f"Email (current: {contact.email or 'N/A'})")
                new_notes = Prompt.ask(f"Notes (current: {contact.notes or 'N/A'})")
                
                kwargs = {}
                if new_phone: kwargs['phone'] = new_phone
                if new_email: kwargs['email'] = new_email if new_email != "N/A" else None
                if new_notes: kwargs['notes'] = new_notes if new_notes != "N/A" else None
                
                if kwargs:
                    updated = ab.update_contact(contact.name, **kwargs)
                    if updated:
                        console.print(f"[green]✓ Contact updated![/green]")
                    else:
                        console.print("[red]Update failed[/red]")
                        
            elif choice == "6":
                # Delete contact
                console.print(Panel("🗑️ Delete Contact", style="red"))
                name = Prompt.ask("Contact name to delete")
                
                matches = ab.search_contact(name)
                if not matches:
                    console.print("[red]No contacts found[/red]")
                    continue
                
                cli.display_contacts_table(matches, "Contacts to Delete")
                
                if Confirm.ask("Delete these contacts?", default=False):
                    deleted = ab.delete_contact(name)
                    console.print(f"[green]✓ Deleted {deleted} contact(s)[/green]")
                else:
                    console.print("Delete cancelled.")
                    
            elif choice == "7":
                cli.manage_tags_menu()
            elif choice == "8":
                cli.favorites_menu()
            elif choice == "9":
                cli.import_export_menu()
            elif choice == "10":
                cli.backup_restore_menu()
            elif choice == "11":  # Google Sync (new option)
                cli.google_sync_menu()
            elif choice == "12":
                cli.show_statistics()
            elif choice == "13":
                cli.display_options_menu()
            elif choice == "0":
                console.print(Panel.fit(
                    "Thank you for using Contact Manager!\nGoodbye! 👋",
                    style="bold blue"
                ))
                break
            else:
                console.print("[red]Invalid option. Please choose 0-13.[/red]")
                
            # Pause before returning to menu
            if choice != "0":
                console.print("\n[dim]Press Enter to continue...[/dim]")
                input()
                
        except KeyboardInterrupt:
            console.print("\n[yellow]Interrupted by user. Goodbye![/yellow]")
            break
        except Exception as e:
            console.print(f"[red]An error occurred: {e}[/red]")
            console.print("[dim]Press Enter to continue...[/dim]")
            input()

if __name__ == "__main__":
    main()
