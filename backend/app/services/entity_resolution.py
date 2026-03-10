"""
Deterministic entity resolution using blocking + string similarity.

Uses only Python stdlib (difflib, unicodedata, re) — no extra dependencies.
Algorithm:
  1. Blocking: group candidates by phonetic name prefix, phone suffix, email
  2. Per-pair scoring: name similarity (SequenceMatcher), phone/email exact match
  3. Threshold >= 0.75 → flagged as potential duplicate
"""
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Optional


# ── Normalisation helpers ─────────────────────────────────────────────────────

def _normalize_name(name: str) -> str:
    """Lowercase, strip accents, collapse whitespace."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", name.lower().strip())


def _normalize_phone(phone: Optional[str]) -> str:
    """Keep digits only."""
    if not phone:
        return ""
    return re.sub(r"\D", "", phone)


def _normalize_email(email: Optional[str]) -> str:
    return (email or "").lower().strip()


def _phonetic_block(name: str) -> str:
    """First 6 chars of normalized name as blocking key.
    Longer prefix avoids false-positive blocks like 'prasa'/'prash'."""
    n = _normalize_name(name)
    return n[:6] if len(n) >= 6 else n


def _name_sim(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize_name(a), _normalize_name(b)).ratio()


# ── Core duplicate detection ──────────────────────────────────────────────────

def find_duplicates_deterministic(contacts: list[dict]) -> list[dict]:
    """
    Find potential duplicate contacts.

    contacts: list of dicts with keys id, name, phone, email, company
    Returns: list sorted by descending similarity_score:
      [{"ids": [...], "similarity_score": float, "reason": str}]
    """
    if len(contacts) < 2:
        return []

    # Build blocking buckets (name prefix, phone suffix, email exact)
    name_buckets: dict[str, list] = {}
    phone_buckets: dict[str, list] = {}
    email_buckets: dict[str, list] = {}

    for c in contacts:
        nkey = _phonetic_block(c.get("name", ""))
        name_buckets.setdefault(nkey, []).append(c)

        phone = _normalize_phone(c.get("phone"))
        if len(phone) >= 7:
            phone_buckets.setdefault(phone[-7:], []).append(c)

        email = _normalize_email(c.get("email"))
        if email:
            email_buckets.setdefault(email, []).append(c)

    seen: set[frozenset] = set()
    groups: list[dict] = []

    def _check_pair(a: dict, b: dict) -> None:
        pair = frozenset([a["id"], b["id"]])
        if pair in seen:
            return
        seen.add(pair)

        reasons: list[str] = []
        score = 0.0

        # Exact email match
        ea = _normalize_email(a.get("email"))
        eb = _normalize_email(b.get("email"))
        if ea and eb and ea == eb:
            score = max(score, 0.98)
            reasons.append("identical email")

        # Phone match (last 7 digits)
        pa = _normalize_phone(a.get("phone"))
        pb = _normalize_phone(b.get("phone"))
        if len(pa) >= 7 and len(pb) >= 7 and pa[-7:] == pb[-7:]:
            score = max(score, 0.92)
            reasons.append("same phone number")

        # Name similarity — high threshold to avoid false positives on shared suffixes
        nsim = _name_sim(a.get("name", ""), b.get("name", ""))
        if nsim >= 0.88:
            score = max(score, nsim * 0.9)
            reasons.append(f"similar name ({nsim:.0%})")

        # Name + company boost
        if nsim >= 0.78 and a.get("company") and b.get("company"):
            csim = _name_sim(a["company"], b["company"])
            if csim >= 0.80:
                score = min(1.0, score + 0.10)
                reasons.append("same company")

        if score >= 0.75:
            groups.append({
                "ids": [a["id"], b["id"]],
                "similarity_score": round(score, 3),
                "reason": "; ".join(reasons) if reasons else "similar contact data",
            })

    # Check pairs within each bucket
    for bucket in (*name_buckets.values(), *phone_buckets.values(), *email_buckets.values()):
        if len(bucket) < 2:
            continue
        for i in range(len(bucket)):
            for j in range(i + 1, len(bucket)):
                _check_pair(bucket[i], bucket[j])

    return sorted(groups, key=lambda x: -x["similarity_score"])


# ── Merge helper ──────────────────────────────────────────────────────────────

def merge_contact_data(primary: dict, secondary: dict, preferences: dict) -> dict:
    """
    Merge two contact data dicts.

    primary: fields from the contact to keep (its ID is preserved)
    secondary: fields from the contact to be deleted
    preferences: {field_name: "primary" | "secondary"} — explicit overrides
                 Unspecified fields default to primary if non-null, else secondary.
    """
    fields = [
        "name", "phone", "email", "company", "job_title",
        "address", "birthday", "anniversary", "notes",
    ]
    result = dict(primary)

    for field in fields:
        pref = preferences.get(field)
        pval = primary.get(field)
        sval = secondary.get(field)

        if pref == "secondary" and sval:
            result[field] = sval
        elif pref == "primary":
            result[field] = pval
        elif not pval and sval:
            # Auto-fill empty primary field from secondary
            result[field] = sval

    return result
