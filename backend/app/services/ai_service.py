"""AI features: Groq (Llama 3.3 70B) for text tasks, Gemini 2.5 Flash for photo OCR."""
import io
import json
import re
from groq import Groq
from app.config import settings

# ── Groq client (text AI) ─────────────────────────────────────────────────────
_client: Groq | None = None
_MODEL = "llama-3.3-70b-versatile"

if settings.GROQ_API_KEY:
    _client = Groq(api_key=settings.GROQ_API_KEY)

# ── Gemini client (photo OCR) ─────────────────────────────────────────────────
_gemini_model = None
_GEMINI_MODEL = "gemini-2.5-flash"

if settings.GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(_GEMINI_MODEL)
    except Exception:
        pass


def _call(prompt: str, system: str = "You are a smart contact manager assistant. Always respond with valid JSON only.") -> str:
    if not _client:
        return "{}"
    try:
        resp = _client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"{{\"error\": \"{str(e)[:200]}\"}}"


def _extract_json(text: str) -> dict | list:
    try:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            return json.loads(match.group(1))
        obj_match = re.search(r"\{[\s\S]*\}", text)
        arr_match = re.search(r"\[[\s\S]*\]", text)
        if obj_match:
            return json.loads(obj_match.group())
        if arr_match:
            return json.loads(arr_match.group())
    except Exception:
        pass
    return {}


async def natural_language_search(query: str, contacts_summary: list[dict]) -> dict:
    prompt = f"""The user wants to find contacts using this query: "{query}"

Available contacts (id, name, email, company, tags):
{json.dumps(contacts_summary[:50], indent=2)}

Return a JSON object:
{{
  "matched_ids": ["id1", "id2"],
  "explanation": "human-readable explanation of what you found",
  "suggested_filters": {{"tag": "...", "favorites": true}}
}}"""
    result = _extract_json(_call(prompt))
    return result if isinstance(result, dict) else {}


async def find_duplicates(contacts: list[dict]) -> list[dict]:
    if len(contacts) < 2:
        return []
    prompt = f"""Find likely duplicate contacts (same person, different data entries).
Contacts:
{json.dumps(contacts[:100], indent=2)}

Return a JSON array:
[
  {{
    "ids": ["id1", "id2"],
    "similarity_score": 0.95,
    "reason": "Same name and phone"
  }}
]
Return empty array [] if no duplicates found."""
    result = _extract_json(_call(prompt))
    return result if isinstance(result, list) else []


async def suggest_tags(contact: dict, existing_tags: list[str]) -> list[str]:
    prompt = f"""Suggest 1-4 relevant tags for this contact.
Contact: {json.dumps(contact)}
Existing tags: {existing_tags}

Prefer using existing tags. Return a JSON array of tag names: ["tag1", "tag2"]"""
    result = _extract_json(_call(prompt))
    if isinstance(result, list):
        return [str(t) for t in result[:4]]
    return []


async def enrich_contact(contact: dict) -> dict:
    prompt = f"""Suggest missing fields for this contact based on available data.
Contact: {json.dumps(contact)}

Return a JSON object with ONLY the suggested missing fields:
{{"company": "...", "job_title": "...", "notes": "..."}}
Return {{}} if nothing can be confidently suggested."""
    result = _extract_json(_call(prompt))
    return result if isinstance(result, dict) else {}


async def parse_business_card(text: str) -> dict:
    """Parse business card from plain text using Groq."""
    prompt = f"""Extract contact information from this business card text:
---
{text}
---

Return a JSON object with fields present:
{{
  "name": "...",
  "phone": "...",
  "email": "...",
  "company": "...",
  "job_title": "...",
  "address": {{"street": "...", "city": "...", "country": "..."}},
  "notes": "..."
}}
Only include fields clearly present in the text."""
    result = _extract_json(_call(prompt))
    return result if isinstance(result, dict) else {}


async def parse_business_card_photo(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Parse business card from an image using Gemini 2.5 Flash multimodal OCR."""
    if not _gemini_model:
        # Fallback: tell caller Gemini not configured
        return {"error": "Gemini OCR not configured — set GEMINI_API_KEY in .env"}
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        prompt = (
            "Extract all contact information visible on this business card image. "
            "Return ONLY valid JSON with these fields (include only fields that are clearly visible): "
            '{"name": "...", "phone": "...", "email": "...", "company": "...", '
            '"job_title": "...", "address": {"street": "...", "city": "...", "country": "..."}, "notes": "..."}'
        )
        response = _gemini_model.generate_content([prompt, img])
        result = _extract_json(response.text)
        return result if isinstance(result, dict) else {}
    except Exception as e:
        return {"error": str(e)[:200]}


async def generate_contact_summary(contact: dict) -> str:
    prompt = f"""Write a concise 2-3 sentence professional summary for this contact in a CRM system.
Contact: {json.dumps(contact)}
Return only the summary text, no JSON."""
    result = _call(
        prompt,
        system="You are a professional CRM assistant. Write concise, factual contact summaries."
    )
    if result and not result.startswith("{"):
        return result
    return "No summary available."
