"""
Upload dataset photos to Einstein contacts.
Usage:  python scripts/upload_photos.py
Requires backend running at http://127.0.0.1:8001
"""
import os
import sys
import time
import requests

API = "http://127.0.0.1:8001/api"
EMAIL = "prasanna.iiitm@gmail.com"
PASSWORD = "87654321"

DATASET_ROOT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "photos", "India_Famous_Person_Dataset"
)


def find_photo(name: str) -> str | None:
    """Return path to first valid image for the given contact name."""
    for gender in ("male", "female"):
        folder = os.path.join(DATASET_ROOT, gender, name)
        if os.path.isdir(folder):
            for fname in sorted(os.listdir(folder)):
                if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    return os.path.join(folder, fname)
    return None


def main():
    print("Starting photo upload...")

    # Login
    try:
        resp = requests.post(f"{API}/auth/login",
                             json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("Cannot connect to backend at http://127.0.0.1:8001 — is it running?")
        sys.exit(1)

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully")

    # Fetch all contacts (paginated)
    all_contacts = []
    page = 1
    while True:
        r = requests.get(f"{API}/contacts",
                         params={"page": page, "page_size": 100},
                         headers=headers, timeout=10)
        data = r.json()
        batch = data.get("contacts", [])
        all_contacts.extend(batch)
        if page >= data.get("pages", 1):
            break
        page += 1

    print(f"Found {len(all_contacts)} contacts")

    uploaded = 0
    skipped = 0
    not_found = 0

    for contact in all_contacts:
        cid = contact["id"]
        name = contact["name"]

        # Skip if already has a photo
        if contact.get("photo_url"):
            skipped += 1
            continue

        photo_path = find_photo(name)
        if not photo_path:
            not_found += 1
            continue

        # Upload
        with open(photo_path, "rb") as f:
            ext = os.path.splitext(photo_path)[1].lower()
            mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
            r = requests.post(
                f"{API}/contacts/{cid}/photo",
                files={"file": (os.path.basename(photo_path), f, mime)},
                headers=headers,
                timeout=30,
            )

        if r.status_code in (200, 201):
            uploaded += 1
            print(f"  [{uploaded}] {name}")
        else:
            print(f"  FAILED {name}: {r.status_code} {r.text[:80]}")

        time.sleep(0.05)

    print(f"\nDone! {uploaded} photos uploaded, {skipped} already had photos, {not_found} not in dataset.")


if __name__ == "__main__":
    main()
