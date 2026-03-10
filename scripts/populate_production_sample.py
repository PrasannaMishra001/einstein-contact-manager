"""
Create/populate the 'einstein' demo account on the PRODUCTION Render backend.
  Email:    einstein@einstein.com
  Password: einstein

Usage:
    python scripts/populate_production_sample.py

Set PROD_API env var to override the backend URL:
    PROD_API=https://einstein-backend-vaqs.onrender.com python scripts/populate_production_sample.py
"""
import os, sys, time, requests

API = os.environ.get("PROD_API", "https://einstein-backend-vaqs.onrender.com") + "/api"

DATASET_ROOT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "photos", "India_Famous_Person_Dataset"
)

EMAIL = "einstein@einstein.com"
PASSWORD = "einstein"
FULL_NAME = "Einstein Demo"

# ── Profession map (same as populate_celebrities.py) ───────────────────────────
MALE = {
    "A R Rahman":        ("Music Composer / Singer",  "Indian Film Industry"),
    "Aamir Khan":        ("Actor",                    "Bollywood"),
    "Ajay Devgan":       ("Actor",                    "Bollywood"),
    "Akshay Kumar":      ("Actor",                    "Bollywood"),
    "Allu Arjun":        ("Actor",                    "Telugu Cinema"),
    "Amit Shah":         ("Politician",                "BJP / Government of India"),
    "Amitabh Bachchan":  ("Actor",                    "Bollywood"),
    "Arijit Singh":      ("Singer",                   "Indian Music Industry"),
    "Arnab Goswami":     ("Journalist",                "Republic TV"),
    "Arvind Kejriwal":   ("Politician",                "Aam Aadmi Party"),
    "Azim Premji":       ("Business Tycoon",          "Wipro"),
    "Badshah":           ("Rapper / Singer",          "Indian Music Industry"),
    "Bobby Deol":        ("Actor",                    "Bollywood"),
    "Boman Irani":       ("Actor",                    "Bollywood"),
    "Danny Denzongpa":   ("Actor",                    "Bollywood"),
    "Dhanush":           ("Actor",                    "Tamil Cinema"),
    "Diljit Dosanjh":    ("Singer / Actor",           "Punjabi Industry"),
    "Gautam Adani":      ("Industrialist",            "Adani Group"),
    "Gautam Gambhir":    ("Cricketer / Politician",   "Indian Cricket Team"),
    "Govinda":           ("Actor",                    "Bollywood"),
    "Guru Randhawa":     ("Singer",                   "Indian Music Industry"),
    "Hardik Pandya":     ("Cricketer",                "Indian Cricket Team"),
    "Hardy Sandhu":      ("Singer / Actor",           "Punjabi Industry"),
    "Himesh Reshammiya": ("Singer / Composer",        "Bollywood"),
    "Honey Singh":       ("Rapper / Singer",          "Indian Music Industry"),
    "Hrithik Roshan":    ("Actor",                    "Bollywood"),
    "Irfan Khan":        ("Actor",                    "Bollywood"),
    "Jackie Shroff":     ("Actor",                    "Bollywood"),
    "Jasprit Bumrah":    ("Cricketer",                "Indian Cricket Team"),
    "Johnny Lever":      ("Comedian / Actor",         "Bollywood"),
    "KK":                ("Singer",                   "Indian Music Industry"),
    "KL Rahul":          ("Cricketer",                "Indian Cricket Team"),
    "Kamal Haasan":      ("Actor",                    "Tamil Cinema"),
    "Kartik Aaryan":     ("Actor",                    "Bollywood"),
    "Kay Kay Menon":     ("Actor",                    "Bollywood"),
    "Kuldeep Yadav":     ("Cricketer",                "Indian Cricket Team"),
    "Kumar Birla":       ("Industrialist",            "Aditya Birla Group"),
    "MS Dhoni":          ("Cricketer",                "Indian Cricket Team"),
    "Mahesh Babu":       ("Actor",                    "Telugu Cinema"),
    "Manmohan Singh":    ("Politician / Economist",   "Indian National Congress"),
    "Manoj Bajpayee":    ("Actor",                    "Bollywood"),
    "Mohanlal":          ("Actor",                    "Malayalam Cinema"),
    "Mukesh Ambani":     ("Industrialist",            "Reliance Industries"),
    "NT Rama Rao Jr":    ("Actor",                    "Telugu Cinema"),
    "Narendra Modi":     ("Politician",                "BJP / Government of India"),
    "Naseeruddin Shah":  ("Actor",                    "Bollywood"),
    "Nawazuddin Siddiqui":("Actor",                   "Bollywood"),
    "Nitin Gadkari":     ("Politician",                "BJP / Government of India"),
    "Om Puri":           ("Actor",                    "Bollywood"),
    "Pankaj Tripathi":   ("Actor",                    "Bollywood"),
    "Paresh Raawal":     ("Actor / Politician",       "Bollywood"),
    "Prabhas":           ("Actor",                    "Telugu Cinema"),
    "Rahul Dravid":      ("Cricketer",                "Indian Cricket Team"),
    "Rahul Gandhi":      ("Politician",                "Indian National Congress"),
    "Rajkumar Rao":      ("Actor",                    "Bollywood"),
    "Rajnikanth":        ("Actor",                    "Tamil Cinema"),
    "Rajpal Yadav":      ("Actor",                    "Bollywood"),
    "Ram Charan":        ("Actor",                    "Telugu Cinema"),
    "Ranbir Kapoor":     ("Actor",                    "Bollywood"),
    "Ranveer Allahbadia": ("Content Creator",         "BeerBiceps"),
    "Ranveer Singh":     ("Actor",                    "Bollywood"),
    "Ratan Tata":        ("Industrialist",            "Tata Group"),
    "Ravi Shastri":      ("Cricketer / Coach",        "Indian Cricket Team"),
    "Ravichandran Ashwin":("Cricketer",               "Indian Cricket Team"),
    "Ravindra Jadeja":   ("Cricketer",                "Indian Cricket Team"),
    "Rohit Sharma":      ("Cricketer",                "Indian Cricket Team"),
    "S Jaishankar":      ("Politician / Diplomat",    "Government of India"),
    "Sachin Tendulkar":  ("Cricketer",                "Indian Cricket Team"),
    "Saif Ali Khan":     ("Actor",                    "Bollywood"),
    "Salman Khan":       ("Actor",                    "Bollywood"),
    "Sanjay Dutt":       ("Actor",                    "Bollywood"),
    "Shah Rukh Khan":    ("Actor",                    "Bollywood"),
    "Shaan":             ("Singer",                   "Indian Music Industry"),
    "Shashi Tharoor":    ("Politician / Author",      "Indian National Congress"),
    "Shikhar Dhawan":    ("Cricketer",                "Indian Cricket Team"),
    "Sonu Nigam":        ("Singer",                   "Indian Music Industry"),
    "Sonu Sood":         ("Actor / Philanthropist",   "Bollywood"),
    "Sunil Chhetri":     ("Footballer",               "Indian Football Team"),
    "Tiger Shroff":      ("Actor",                    "Bollywood"),
    "Varun Dhawan":      ("Actor",                    "Bollywood"),
    "Vidyut Jammwal":    ("Actor",                    "Bollywood"),
    "Vijay Devarakonda": ("Actor",                    "Telugu Cinema"),
    "Vijay Sethupathi":  ("Actor",                    "Tamil Cinema"),
    "Virat Kholi":       ("Cricketer",                "Indian Cricket Team"),
    "Vishal Dadlani":    ("Singer / Composer",        "Indian Music Industry"),
    "Vivek Oberoi":      ("Actor",                    "Bollywood"),
    "Yash":              ("Actor",                    "Kannada Cinema"),
    "Yogi Adityanath":   ("Politician",                "BJP / Government of India"),
    "Yuzvendra Chahal":  ("Cricketer",                "Indian Cricket Team"),
}

FEMALE = {
    "Agatha Sangma":         ("Politician",               "National People's Party"),
    "Alia Bhatt":            ("Actor",                    "Bollywood"),
    "Anushka Sharma":        ("Actor",                    "Bollywood"),
    "Asha Bhosle":           ("Singer",                   "Indian Music Industry"),
    "Athiya Shetty":         ("Actor",                    "Bollywood"),
    "Avneet Kaur":           ("Actor",                    "Indian TV / Bollywood"),
    "Deepika Padukone":      ("Actor",                    "Bollywood"),
    "Disha Patani":          ("Actor",                    "Bollywood"),
    "Droupadi Murmu":        ("Politician",                "Government of India"),
    "Ileana Dcruz":          ("Actor",                    "Bollywood"),
    "Jacqueline Fernandez":  ("Actor",                    "Bollywood"),
    "Kajal Aggarwal":        ("Actor",                    "Telugu / Tamil Cinema"),
    "Katrina Kaif":          ("Actor",                    "Bollywood"),
    "Kriti Sanon":           ("Actor",                    "Bollywood"),
    "Mamata Banerjee":       ("Politician",                "Trinamool Congress"),
    "Mary Kom":              ("Boxer",                    "Indian Olympic Team"),
    "Mirabai Chanu":         ("Weightlifter",             "Indian Olympic Team"),
    "Neha Kakkar":           ("Singer",                   "Indian Music Industry"),
    "Nirmala Sitharaman":    ("Politician",                "BJP / Government of India"),
    "P T Usha":              ("Athlete",                  "Indian Olympic Committee"),
    "Pooja Hegde":           ("Actor",                    "Telugu / Bollywood"),
    "Preity Zinta":          ("Actor",                    "Bollywood"),
    "Priyanka Chopra":       ("Actor",                    "Bollywood / Hollywood"),
    "Rani Mukerji":          ("Actor",                    "Bollywood"),
    "Rashmika Mandanna":     ("Actor",                    "Telugu / Bollywood"),
    "Samantha Ruth Prabhu":  ("Actor",                    "Telugu Cinema"),
    "Sanya Malhotra":        ("Actor",                    "Bollywood"),
    "Sara Ali Khan":         ("Actor",                    "Bollywood"),
    "Shraddha Kapoor":       ("Actor",                    "Bollywood"),
    "Shreya Ghoshal":        ("Singer",                   "Indian Music Industry"),
    "Sonia Gandhi":          ("Politician",                "Indian National Congress"),
    "Sunidhi Chauhan":       ("Singer",                   "Indian Music Industry"),
    "Tara Sutaria":          ("Actor",                    "Bollywood"),
    "Tripti Dimri":          ("Actor",                    "Bollywood"),
}

TAG_MAP = {
    "Actor": ("#EF4444", "🎬 Actor"),
    "Cricketer": ("#3B82F6", "🏏 Cricketer"),
    "Singer": ("#8B5CF6", "🎵 Singer"),
    "Politician": ("#F59E0B", "🏛️ Politician"),
    "Industrialist": ("#10B981", "💼 Industrialist"),
    "Business Tycoon": ("#10B981", "💼 Business"),
    "Footballer": ("#3B82F6", "⚽ Footballer"),
    "Boxer": ("#EF4444", "🥊 Boxer"),
    "Weightlifter": ("#EF4444", "🏋️ Weightlifter"),
    "Athlete": ("#F59E0B", "🏃 Athlete"),
    "Journalist": ("#6B7280", "📰 Journalist"),
    "Content Creator": ("#EC4899", "📱 Creator"),
}

FAVORITES = {
    "Shah Rukh Khan", "Amitabh Bachchan", "Sachin Tendulkar",
    "A R Rahman", "Priyanka Chopra", "Deepika Padukone",
    "Virat Kholi", "MS Dhoni", "Narendra Modi", "Ratan Tata",
}


def find_photo(name):
    for gender in ("male", "female"):
        folder = os.path.join(DATASET_ROOT, gender, name)
        if os.path.isdir(folder):
            for f in sorted(os.listdir(folder)):
                if f.lower().endswith((".jpg", ".jpeg", ".png")):
                    return os.path.join(folder, f)
    return None


def get_tag_info(job_title):
    for key, (color, _) in TAG_MAP.items():
        if key.lower() in job_title.lower():
            return key, color
    return None, None


def main():
    print(f"Target: {API}")

    # 1. Register or login
    print(f"\nRegistering {EMAIL}...")
    r = requests.post(f"{API}/auth/register",
                      json={"email": EMAIL, "password": PASSWORD, "full_name": FULL_NAME},
                      timeout=30)
    if r.status_code in (200, 201):
        tokens = r.json()
        print("  Registered successfully")
    elif r.status_code == 400 and "already" in r.text.lower():
        print("  Already exists, logging in...")
        r = requests.post(f"{API}/auth/login",
                          json={"email": EMAIL, "password": PASSWORD}, timeout=30)
        r.raise_for_status()
        tokens = r.json()
        print("  Logged in")
    else:
        print(f"  Error: {r.status_code} {r.text}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 2. Create tags
    print("\nCreating tags...")
    tag_ids = {}
    for key, (color, _) in TAG_MAP.items():
        r = requests.post(f"{API}/contacts/tags", json={"name": key, "color": color}, headers=headers, timeout=15)
        if r.status_code in (200, 201):
            tag_ids[key] = r.json()["id"]
        time.sleep(0.05)
    print(f"  {len(tag_ids)} tags ready")

    # 3. Create contacts
    all_people = {**{n: (j, c, "M") for n, (j, c) in MALE.items()},
                  **{n: (j, c, "F") for n, (j, c) in FEMALE.items()}}

    print(f"\nCreating {len(all_people)} contacts...")
    created = 0
    skipped = 0

    # Check existing
    r = requests.get(f"{API}/contacts", params={"per_page": 200}, headers=headers, timeout=30)
    existing_names = {c["name"] for c in r.json().get("contacts", [])}

    for name, (job, company, _) in all_people.items():
        if name in existing_names:
            skipped += 1
            continue

        tag_key, _ = get_tag_info(job)
        tags = [tag_ids[tag_key]] if tag_key and tag_key in tag_ids else []

        payload = {
            "name": name,
            "job_title": job,
            "company": company,
            "tags": tags,
            "is_favorite": name in FAVORITES,
        }
        r = requests.post(f"{API}/contacts", json=payload, headers=headers, timeout=15)
        if r.status_code in (200, 201):
            created += 1
            contact_id = r.json()["id"]

            # Upload photo
            photo = find_photo(name)
            if photo:
                with open(photo, "rb") as f:
                    ext = os.path.splitext(photo)[1].lower()
                    mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
                    pr = requests.post(
                        f"{API}/contacts/{contact_id}/photo",
                        files={"file": (os.path.basename(photo), f, mime)},
                        headers=headers, timeout=30)
                    if pr.status_code in (200, 201):
                        print(f"  [{created}] {name} + photo")
                    else:
                        print(f"  [{created}] {name} (no photo: {pr.status_code})")
            else:
                print(f"  [{created}] {name}")
        else:
            print(f"  SKIP {name}: {r.status_code} {r.text[:60]}")

        time.sleep(0.1)

    print(f"\nDone! {created} created, {skipped} already existed.")
    print(f"\nDemo login:\n  Email:    {EMAIL}\n  Password: {PASSWORD}")


if __name__ == "__main__":
    main()
