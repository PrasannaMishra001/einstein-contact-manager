"""
Populate Einstein DB with Indian Famous Personalities.
Usage:  python scripts/populate_celebrities.py
Requires backend running at http://localhost:8001
"""
import os
import sys
import random
import requests
import time

API = "http://127.0.0.1:8001/api"
EMAIL = "prasanna.iiitm@gmail.com"
PASSWORD = "87654321"

# ── Profession mapping ─────────────────────────────────────────────────────────
MALE_PROFESSIONS = {
    "A R Rahman":           ("Music Composer / Singer", "Indian Film Industry"),
    "Aamir Khan":           ("Actor",                   "Bollywood"),
    "Ajay Devgan":          ("Actor",                   "Bollywood"),
    "Akshay Kumar":         ("Actor",                   "Bollywood"),
    "Allu Arjun":           ("Actor",                   "Telugu Cinema"),
    "Amit Shah":            ("Politician",               "BJP / Government of India"),
    "Amitabh Bachchan":     ("Actor",                   "Bollywood"),
    "Arijit Singh":         ("Singer",                  "Indian Music Industry"),
    "Arnab Goswami":        ("Journalist",               "Republic TV"),
    "Arvind Kejriwal":      ("Politician",               "Aam Aadmi Party"),
    "Azim Premji":          ("Business Tycoon",         "Wipro"),
    "Badshah":              ("Rapper / Singer",         "Indian Music Industry"),
    "Bobby Deol":           ("Actor",                   "Bollywood"),
    "Boman Irani":          ("Actor",                   "Bollywood"),
    "Danny Denzongpa":      ("Actor",                   "Bollywood"),
    "Dhanush":              ("Actor",                   "Tamil Cinema"),
    "Diljit Dosanjh":       ("Singer / Actor",          "Punjabi Industry"),
    "Gautam Adani":         ("Industrialist",           "Adani Group"),
    "Gautam Gambhir":       ("Cricketer / Politician",  "Indian Cricket Team"),
    "Govinda":              ("Actor",                   "Bollywood"),
    "Guru Randhawa":        ("Singer",                  "Indian Music Industry"),
    "Hardik Pandya":        ("Cricketer",               "Indian Cricket Team"),
    "Hardy Sandhu":         ("Singer / Actor",          "Punjabi Industry"),
    "Himesh Reshammiya":    ("Singer / Composer",       "Bollywood"),
    "Honey Singh":          ("Rapper / Singer",         "Indian Music Industry"),
    "Hrithik Roshan":       ("Actor",                   "Bollywood"),
    "Irfan Khan":           ("Actor",                   "Bollywood"),
    "Jackie Shroff":        ("Actor",                   "Bollywood"),
    "Jasprit Bumrah":       ("Cricketer",               "Indian Cricket Team"),
    "Johnny Lever":         ("Comedian / Actor",        "Bollywood"),
    "KK":                   ("Singer",                  "Indian Music Industry"),
    "KL Rahul":             ("Cricketer",               "Indian Cricket Team"),
    "Kailesh Kher":         ("Singer",                  "Indian Music Industry"),
    "Kamal Haasan":         ("Actor",                   "Tamil Cinema"),
    "Kartik Aaryan":        ("Actor",                   "Bollywood"),
    "Kay Kay Menon":        ("Actor",                   "Bollywood"),
    "Kiren Rijiju":         ("Politician",               "Government of India"),
    "Kuldeep Yadav":        ("Cricketer",               "Indian Cricket Team"),
    "Kumar Birla":          ("Industrialist",           "Aditya Birla Group"),
    "MS Dhoni":             ("Cricketer",               "Indian Cricket Team"),
    "Mahesh Babu":          ("Actor",                   "Telugu Cinema"),
    "Manmohan Singh":       ("Politician / Economist",  "Indian National Congress"),
    "Manoj Bajpayee":       ("Actor",                   "Bollywood"),
    "Mohanlal":             ("Actor",                   "Malayalam Cinema"),
    "Mukesh Ambani":        ("Industrialist",           "Reliance Industries"),
    "NT Rama Rao Jr":       ("Actor",                   "Telugu Cinema"),
    "Narendra Modi":        ("Politician",               "BJP / Government of India"),
    "Naseeruddin Shah":     ("Actor",                   "Bollywood"),
    "Nawazuddin Siddiqui":  ("Actor",                   "Bollywood"),
    "Om Puri":              ("Actor",                   "Bollywood"),
    "Pankaj Tripathi":      ("Actor",                   "Bollywood"),
    "Paresh Raawal":        ("Actor",                   "Bollywood"),
    "Prabhas":              ("Actor",                   "Telugu Cinema"),
    "Rahul Dravid":         ("Cricketer",               "Indian Cricket Team"),
    "Rahul Gandhi":         ("Politician",               "Indian National Congress"),
    "Rajkumar Rao":         ("Actor",                   "Bollywood"),
    "Rajnikanth":           ("Actor",                   "Tamil Cinema"),
    "Rajpal Yadav":         ("Actor",                   "Bollywood"),
    "Ram Charan":           ("Actor",                   "Telugu Cinema"),
    "Ranbir Kapoor":        ("Actor",                   "Bollywood"),
    "Ranveer Allahbadia":   ("Content Creator / Podcaster", "BeerBiceps"),
    "Ranveer Singh":        ("Actor",                   "Bollywood"),
    "Ratan Tata":           ("Industrialist / Philanthropist", "Tata Sons"),
    "Ravi Shastri":         ("Cricket Coach / Commentator", "Indian Cricket Team"),
    "Ravichandran Ashwin":  ("Cricketer",               "Indian Cricket Team"),
    "Ravindra Jadeja":      ("Cricketer",               "Indian Cricket Team"),
    "Rohit Sharma":         ("Cricketer",               "Indian Cricket Team"),
    "S Jaishankar":         ("Diplomat / Politician",   "Government of India"),
    "Sachin Tendulkar":     ("Cricketer",               "Indian Cricket Team"),
    "Saif Ali Khan":        ("Actor",                   "Bollywood"),
    "Salman Khan":          ("Actor",                   "Bollywood"),
    "Sanjay Dutt":          ("Actor",                   "Bollywood"),
    "Shaan":                ("Singer",                  "Indian Music Industry"),
    "Shah Rukh Khan":       ("Actor",                   "Bollywood"),
    "Shashi Tharoor":       ("Politician / Author",     "Indian National Congress"),
    "Shikhar Dhawan":       ("Cricketer",               "Indian Cricket Team"),
    "Sonu Nigam":           ("Singer",                  "Indian Music Industry"),
    "Sonu Sood":            ("Actor / Philanthropist",  "Bollywood"),
    "Sunil Chhetri":        ("Footballer",              "Indian Football Team"),
    "Tiger Shroff":         ("Actor",                   "Bollywood"),
    "Varun Dhawan":         ("Actor",                   "Bollywood"),
    "Vidyut Jammwal":       ("Actor",                   "Bollywood"),
    "Vijay Devarakonda":    ("Actor",                   "Telugu Cinema"),
    "Vijay Sethupathi":     ("Actor",                   "Tamil Cinema"),
    "Virat Kholi":          ("Cricketer",               "Indian Cricket Team"),
    "Vishal Dadlani":       ("Singer / Composer",       "Indian Music Industry"),
    "Vivek Oberoi":         ("Actor",                   "Bollywood"),
    "Yash":                 ("Actor",                   "Kannada Cinema"),
    "Yogi Adityanath":      ("Politician",               "BJP / Government of UP"),
    "Yuzvendra Chahal":     ("Cricketer",               "Indian Cricket Team"),
}

FEMALE_PROFESSIONS = {
    "Agatha Sangma":            ("Politician",              "National People's Party"),
    "Alia Bhatt":               ("Actress",                 "Bollywood"),
    "Anushka Sharma":           ("Actress",                 "Bollywood"),
    "Asha Bhosle":              ("Singer",                  "Indian Music Industry"),
    "Athiya Shetty":            ("Actress",                 "Bollywood"),
    "Avneet Kaur":              ("Actress / Content Creator", "Bollywood"),
    "Deepika Padukone":         ("Actress",                 "Bollywood"),
    "Disha Patani":             ("Actress",                 "Bollywood"),
    "Dr Tamilisai Soundararajan": ("Politician / Doctor",  "BJP / Government of India"),
    "Droupadi Murmu":           ("Politician",              "Government of India"),
    "Ileana Dcruz":             ("Actress",                 "Bollywood"),
    "Jacqueline Fernandez":     ("Actress",                 "Bollywood"),
    "Kajal Aggarwal":           ("Actress",                 "Telugu / Tamil Cinema"),
    "Katrina Kaif":             ("Actress",                 "Bollywood"),
    "Kriti Sanon":              ("Actress",                 "Bollywood"),
    "Mamata Banerjee":          ("Politician",              "Trinamool Congress"),
    "Mary Kom":                 ("Boxer",                   "Indian Sports"),
    "Mirabai Chanu":            ("Weightlifter",            "Indian Sports"),
    "Neha Kakkar":              ("Singer",                  "Indian Music Industry"),
    "Nirmala Sitharaman":       ("Politician / Economist",  "BJP / Government of India"),
    "P T Usha":                 ("Athlete",                 "Indian Athletics"),
    "Pooja Hegde":              ("Actress",                 "Bollywood / Telugu Cinema"),
    "Preity Zinta":             ("Actress",                 "Bollywood"),
    "Priyanka Chopra":          ("Actress",                 "Bollywood / Hollywood"),
    "Rani Mukerji":             ("Actress",                 "Bollywood"),
    "Rashmika Mandanna":        ("Actress",                 "Bollywood / Telugu Cinema"),
    "Samantha Ruth Prabhu":     ("Actress",                 "Telugu Cinema"),
    "Sanya Malhotra":           ("Actress",                 "Bollywood"),
    "Sara Ali Khan":            ("Actress",                 "Bollywood"),
    "Shraddha Kapoor":          ("Actress",                 "Bollywood"),
    "Shreya Ghoshal":           ("Singer",                  "Indian Music Industry"),
    "Sonia Gandhi":             ("Politician",              "Indian National Congress"),
    "Sunidhi Chauhan":          ("Singer",                  "Indian Music Industry"),
    "Tara Sutaria":             ("Actress",                 "Bollywood"),
    "Tripti Dimri":             ("Actress",                 "Bollywood"),
}

# Tags to create
TAGS = [
    {"name": "Actor",       "color": "#7C3AED"},
    {"name": "Actress",     "color": "#DB2777"},
    {"name": "Bollywood",   "color": "#D97706"},
    {"name": "South Cinema","color": "#059669"},
    {"name": "Cricketer",   "color": "#2563EB"},
    {"name": "Musician",    "color": "#DC2626"},
    {"name": "Politician",  "color": "#4F46E5"},
    {"name": "Industrialist","color": "#0891B2"},
    {"name": "Athlete",     "color": "#16A34A"},
    {"name": "Celebrity",   "color": "#9333EA"},
]

# Duplicate pairs to create (for testing duplicate detection)
DUPLICATE_PAIRS = [
    ("Aamir Khan",        "Amir Khan",              "male"),
    ("Amitabh Bachchan",  "Amitabh Bachhan",        "male"),
    ("Deepika Padukone",  "Deepika Padukone (Actress)", "female"),
    ("Priyanka Chopra",   "Priyanka Chopra Jonas",  "female"),
    ("Shah Rukh Khan",    "ShahRukh Khan",          "male"),
]


def random_indian_phone():
    prefix = random.choice(["6", "7", "8", "9"])
    return f"+91 {prefix}{random.randint(100000000, 999999999)}"


def name_to_email(name: str) -> str:
    clean = name.lower().replace(" ", ".").replace("(", "").replace(")", "").replace("/", "")
    return f"{clean}@gmail.com"


def get_tags_for(job_title: str, company: str) -> list:
    tags = ["Celebrity"]
    job_lower = job_title.lower()
    comp_lower = company.lower()
    if "actor" in job_lower:
        tags.append("Actor")
    if "actress" in job_lower:
        tags.append("Actress")
    if "bollywood" in comp_lower or "bollywood" in job_lower:
        tags.append("Bollywood")
    if any(x in comp_lower for x in ["telugu", "tamil", "kannada", "malayalam"]):
        tags.append("South Cinema")
    if "cricketer" in job_lower or "cricket" in comp_lower:
        tags.append("Cricketer")
    if any(x in job_lower for x in ["singer", "musician", "rapper", "composer"]):
        tags.append("Musician")
    if "politician" in job_lower:
        tags.append("Politician")
    if "industrialist" in job_lower or "tycoon" in job_lower:
        tags.append("Industrialist")
    if any(x in job_lower for x in ["athlete", "boxer", "weightlifter", "footballer"]):
        tags.append("Athlete")
    return list(set(tags))


def main():
    print("🚀 Starting population script...")

    # ── Login ──────────────────────────────────────────────────────────────────
    print(f"  Logging in as {EMAIL}...")
    try:
        resp = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("❌  Cannot connect to backend at http://localhost:8001 — is it running?")
        sys.exit(1)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  ✅ Logged in")

    # ── Create tags ────────────────────────────────────────────────────────────
    tag_id_map = {}
    print("  Creating tags...")
    for tag in TAGS:
        r = requests.post(f"{API}/contacts/tags", json=tag, headers=headers, timeout=10)
        if r.status_code in (200, 201):
            data = r.json()
            tag_id_map[data["name"]] = data["id"]
        elif r.status_code == 400:
            # Already exists — fetch it
            all_tags = requests.get(f"{API}/contacts/tags", headers=headers, timeout=10).json()
            for t in all_tags:
                if t["name"] == tag["name"]:
                    tag_id_map[t["name"]] = t["id"]
                    break
    print(f"  ✅ Tags ready: {list(tag_id_map.keys())}")

    # ── Dataset root ───────────────────────────────────────────────────────────
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_root = os.path.join(script_dir, "..", "data", "photos", "India_Famous_Person_Dataset")

    if not os.path.isdir(dataset_root):
        print(f"❌  Dataset not found at: {dataset_root}")
        sys.exit(1)

    created = 0
    skipped = 0

    # ── Create contacts ────────────────────────────────────────────────────────
    for gender_folder, profession_map, default_job, default_company in [
        ("male",   MALE_PROFESSIONS,   "Public Figure", "Indian Entertainment"),
        ("female", FEMALE_PROFESSIONS, "Public Figure", "Indian Entertainment"),
    ]:
        folder = os.path.join(dataset_root, gender_folder)
        if not os.path.isdir(folder):
            print(f"  ⚠️  Skipping missing folder: {folder}")
            continue

        for person_name in sorted(os.listdir(folder)):
            person_dir = os.path.join(folder, person_name)
            if not os.path.isdir(person_dir):
                continue

            # Skip encoding-broken names
            try:
                person_name.encode("ascii")
            except UnicodeEncodeError:
                skipped += 1
                continue

            job_title, company = profession_map.get(person_name, (default_job, default_company))
            tag_names = get_tags_for(job_title, company)
            tag_ids = [tag_id_map[t] for t in tag_names if t in tag_id_map]

            payload = {
                "name": person_name,
                "phone": random_indian_phone(),
                "email": name_to_email(person_name),
                "company": company,
                "job_title": job_title,
                "is_favorite": person_name in {"Shah Rukh Khan", "Amitabh Bachchan", "Sachin Tendulkar",
                                                "Ratan Tata", "A R Rahman", "Deepika Padukone"},
                "tag_ids": tag_ids,
            }

            r = requests.post(f"{API}/contacts", json=payload, headers=headers, timeout=10)
            if r.status_code == 201:
                created += 1
                if created % 20 == 0:
                    print(f"    ... {created} contacts created")
            else:
                print(f"  ⚠️  Failed to create {person_name}: {r.status_code} {r.text[:80]}")
                skipped += 1

            time.sleep(0.05)  # be polite to the API

    print(f"\n  ✅ Created {created} contacts, skipped {skipped}")

    # ── Create duplicates ──────────────────────────────────────────────────────
    print("\n  Creating duplicate contacts for testing...")
    dup_created = 0
    for orig_name, dup_name, gender in DUPLICATE_PAIRS:
        pm = MALE_PROFESSIONS if gender == "male" else FEMALE_PROFESSIONS
        job_title, company = pm.get(orig_name, ("Public Figure", "Indian Entertainment"))
        tag_names = get_tags_for(job_title, company)
        tag_ids = [tag_id_map[t] for t in tag_names if t in tag_id_map]

        payload = {
            "name": dup_name,
            "phone": random_indian_phone(),
            "email": name_to_email(orig_name),   # same email as original — strong duplicate signal
            "company": company,
            "job_title": job_title,
            "tag_ids": tag_ids,
            "notes": f"[Duplicate test] Variant of '{orig_name}'",
        }
        r = requests.post(f"{API}/contacts", json=payload, headers=headers, timeout=10)
        if r.status_code == 201:
            dup_created += 1
            print(f"    ✅ Duplicate: {dup_name}")
        else:
            print(f"    ⚠️  {dup_name}: {r.status_code}")

    print(f"\n🎉  Done! {created} celebrities + {dup_created} duplicates added to the database.")


if __name__ == "__main__":
    main()
