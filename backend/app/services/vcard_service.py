"""vCard (.vcf) import/export service."""
import vobject
from typing import List
from app.models.models import Contact


def export_contact_to_vcard(contact) -> str:
    """Export a single contact to vCard string."""
    v = vobject.vCard()
    v.add("fn").value = contact.name
    v.add("n").value = vobject.vcard.Name(family=contact.name, given="")

    if contact.phone:
        tel = v.add("tel")
        tel.value = contact.phone
        tel.type_param = "CELL"

    if contact.email:
        email = v.add("email")
        email.value = contact.email
        email.type_param = "INTERNET"

    if contact.company:
        v.add("org").value = [contact.company]

    if contact.job_title:
        v.add("title").value = contact.job_title

    if contact.notes:
        v.add("note").value = contact.notes

    if contact.birthday:
        v.add("bday").value = contact.birthday.strftime("%Y%m%d")

    if contact.photo_url:
        url = v.add("url")
        url.value = contact.photo_url

    return v.serialize()


def export_contacts_to_vcard(contacts: List) -> str:
    """Export multiple contacts to a single .vcf file content."""
    return "".join(export_contact_to_vcard(c) for c in contacts)


def parse_vcard(vcf_content: str) -> List[dict]:
    """Parse vCard content and return list of contact dicts."""
    contacts = []
    try:
        for component in vobject.readComponents(vcf_content):
            try:
                contact = {}
                if hasattr(component, "fn"):
                    contact["name"] = component.fn.value

                if hasattr(component, "n") and not contact.get("name"):
                    n = component.n.value
                    parts = [n.given, n.family]
                    contact["name"] = " ".join(p for p in parts if p).strip()

                if not contact.get("name"):
                    continue

                if hasattr(component, "tel"):
                    tel = component.tel
                    if isinstance(tel, list):
                        contact["phone"] = tel[0].value
                    else:
                        contact["phone"] = tel.value

                if hasattr(component, "email"):
                    em = component.email
                    if isinstance(em, list):
                        contact["email"] = em[0].value
                    else:
                        contact["email"] = em.value

                if hasattr(component, "org"):
                    org = component.org.value
                    contact["company"] = org[0] if isinstance(org, list) else org

                if hasattr(component, "title"):
                    contact["job_title"] = component.title.value

                if hasattr(component, "note"):
                    contact["notes"] = component.note.value

                if hasattr(component, "bday"):
                    try:
                        from datetime import datetime
                        bday_str = component.bday.value
                        for fmt in ["%Y%m%d", "%Y-%m-%d"]:
                            try:
                                contact["birthday"] = datetime.strptime(bday_str, fmt).date()
                                break
                            except ValueError:
                                continue
                    except Exception:
                        pass

                contacts.append(contact)
            except Exception:
                continue
    except Exception as e:
        print(f"vCard parse error: {e}")
    return contacts
