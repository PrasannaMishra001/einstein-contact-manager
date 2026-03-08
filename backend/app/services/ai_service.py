"""Gemini 2.0 Flash powered AI features."""
import json
import re
from typing import Optional
import google.generativeai as genai
from app.config import settings

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    _model = genai.GenerativeModel("gemini-2.0-flash")
else:
    _model = None


def _call(prompt: str) -> str:
    if not _model:
        return "{}"
    try:
        resp = _model.generate_content(prompt)
        return resp.text.strip()
    except Exception as e:
        return f"{{\"error\": \"{str(e)}\"}}"


def _extract_json(text: str) -> dict:
    try:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            return json.loads(match.group(1))
        return json.loads(text)
    except Exception:
        return {}


async def natural_language_search(query: str, contacts_summary: list[dict]) -> dict:
    """Translate a natural-language query into filter parameters and explanation."""
    prompt = f"""You are a contact manager assistant. The user wants to find contacts using this query:
"{query}"

Here is a summary of available contacts (id, name, email, company, tags):
{json.dumps(contacts_summary[:50], indent=2)}

Return a JSON object with:
{{
  "matched_ids": ["id1", "id2", ...],
  "explanation": "human-readable explanation of what you found",
  "suggested_filters": {{"tag": "...", "favorites": true/false, "has_email": true/false}}
}}
Only return the JSON, no extra text."""
    result = _extract_json(_call(prompt))
    return result


async def find_duplicates(contacts: list[dict]) -> list[dict]:
    """Find likely duplicate contacts and return groups."""
    if len(contacts) < 2:
        return []
    prompt = f"""Analyze these contacts and find likely duplicates (same person with slightly different data).
Contacts:
{json.dumps(contacts[:100], indent=2)}

Return a JSON array of duplicate groups:
[
  {{
    "ids": ["id1", "id2"],
    "similarity_score": 0.95,
    "reason": "Same name and phone number"
  }}
]
Only return the JSON array, no extra text."""
    result = _call(prompt)
    try:
        match = re.search(r"\[[\s\S]*\]", result)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return []


async def suggest_tags(contact: dict, existing_tags: list[str]) -> list[str]:
    """Auto-suggest tags for a contact based on their data."""
    prompt = f"""Based on this contact's information, suggest 1-4 relevant tags.
Contact: {json.dumps(contact)}
Existing tags in the system: {existing_tags}

Prefer using existing tags when appropriate. Return a JSON array of tag names:
["tag1", "tag2"]
Only return the JSON array."""
    result = _extract_json(_call(prompt))
    if isinstance(result, list):
        return result[:4]
    try:
        match = re.search(r"\[[\s\S]*?\]", _call(prompt))
        if match:
            return json.loads(match.group())[:4]
    except Exception:
        pass
    return []


async def enrich_contact(contact: dict) -> dict:
    """Suggest enriched fields based on name/email/company."""
    prompt = f"""Based on this contact, intelligently suggest missing fields.
Only suggest fields you are reasonably confident about based on the data given.
Contact: {json.dumps(contact)}

Return a JSON object with only the suggested fields (do NOT include fields that already have values):
{{
  "company": "...",
  "job_title": "...",
  "notes": "..."
}}
If you cannot confidently suggest anything, return {{}}.
Only return the JSON."""
    return _extract_json(_call(prompt))


async def parse_business_card(text: str) -> dict:
    """Extract contact fields from raw business card text."""
    prompt = f"""Extract contact information from this business card text.
Text:
{text}

Return a JSON object with any fields you can identify:
{{
  "name": "...",
  "phone": "...",
  "email": "...",
  "company": "...",
  "job_title": "...",
  "address": {{
    "street": "...",
    "city": "...",
    "country": "..."
  }},
  "notes": "..."
}}
Only include fields that are clearly present. Return only the JSON."""
    return _extract_json(_call(prompt))


async def generate_contact_summary(contact: dict) -> str:
    """Generate a human-readable summary of a contact."""
    prompt = f"""Write a 2-3 sentence natural summary of this contact for a CRM system.
Contact: {json.dumps(contact)}
Be concise and professional. Just return the summary text."""
    result = _call(prompt)
    return result if result and "{" not in result[:5] else "No summary available."
