# File: tests/test_addressbook.py
import unittest
import os
import tempfile
import shutil
from contacts.contact import Contact
from contacts.addressbook import AddressBook
from contacts.fileops import DATA_FILE

class TestAddressBook(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
        self.original_data_file = DATA_FILE
        # Override DATA_FILE for testing
        import contacts.fileops
        contacts.fileops.DATA_FILE = os.path.join(self.test_dir, "test_contacts.json")
        
        self.ab = AddressBook()

    def tearDown(self):
        # Clean up temporary directory
        shutil.rmtree(self.test_dir)
        # Restore original DATA_FILE
        import contacts.fileops
        contacts.fileops.DATA_FILE = self.original_data_file

    def test_add_contact(self):
        contact = Contact("John Doe", "123-456-7890", "john@example.com")
        result = self.ab.add_contact(contact)
        self.assertTrue(result)
        self.assertEqual(len(self.ab.contacts), 1)
        self.assertEqual(self.ab.contacts[0].name, "John Doe")

    def test_search_contact(self):
        contact1 = Contact("John Doe", "123-456-7890", "john@example.com")
        contact2 = Contact("Jane Smith", "098-765-4321", "jane@example.com")
        self.ab.add_contact(contact1)
        self.ab.add_contact(contact2)
        
        results = self.ab.search_contact("John")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "John Doe")

    def test_delete_contact(self):
        contact = Contact("John Doe", "123-456-7890", "john@example.com")
        self.ab.add_contact(contact)
        self.assertEqual(len(self.ab.contacts), 1)
        
        deleted_count = self.ab.delete_contact("John")
        self.assertEqual(deleted_count, 1)
        self.assertEqual(len(self.ab.contacts), 0)

    def test_update_contact(self):
        contact = Contact("John Doe", "123-456-7890", "john@example.com")
        self.ab.add_contact(contact)
        
        updated = self.ab.update_contact("John", new_phone="555-555-5555")
        self.assertIsNotNone(updated)
        self.assertEqual(updated.phone, "555-555-5555")

if __name__ == "__main__":
    unittest.main()
