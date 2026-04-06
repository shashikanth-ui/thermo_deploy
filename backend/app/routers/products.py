from __future__ import annotations

import httpx
from fastapi import APIRouter, Query, HTTPException

from app.core.config import settings
from app.utils.llm import llm_client
from app.utils.products import load_products, product_search

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/search")
def search(q: str = Query(..., min_length=1), limit: int = 8):
    return {"results": product_search(q, limit=limit)}


@router.get("/by-name")
def by_name(name: str = Query(..., min_length=1)):
    products = load_products()
    for p in products:
        if (p.get("thermo_product") or "").strip().lower() == name.strip().lower():
            return p
    raise HTTPException(status_code=404, detail="Product not found")


@router.get("/strengths-summary")
async def strengths_summary(name: str = Query(..., min_length=1)):
    """
    Fetch raw strengths & weaknesses from the graph service for a product,
    then use Gemini (or OpenAI) to produce concise bullet-point summaries.
    Falls back to reformatted raw items when LLM is unavailable.
    """
    # 1. Fetch graph intelligence (strengths / weaknesses raw arrays)
    raw_strengths: list[str] = []
    raw_weaknesses: list[str] = []

    if settings.graph_rag_enabled:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(
                    f"{settings.graph_service_url}/api/product/{name}"
                )
                if r.status_code == 200:
                    data = r.json()
                    raw_strengths = data.get("strengths") or []
                    raw_weaknesses = data.get("weaknesses") or []
        except Exception:
            pass  # will fall through to local DB lookup below

    # 2. If graph didn't return data, try local products.json for competitive_analysis
    if not raw_strengths and not raw_weaknesses:
        products = load_products()
        for p in products:
            if (p.get("thermo_product") or "").strip().lower() == name.strip().lower():
                ca_list = p.get("competitive_analysis") or []
                ca = ca_list[0] if isinstance(ca_list, list) and ca_list else ca_list if isinstance(ca_list, dict) else {}
                def _flatten(d):
                    if not isinstance(d, dict):
                        return []
                    out = []
                    for val in d.values():
                        if isinstance(val, list):
                            out.extend([str(v) for v in val])
                    return out
                raw_strengths = _flatten(ca.get("thermo_strengths"))
                raw_weaknesses = _flatten(ca.get("competitor_strengths"))  # areas where competitors are stronger
                break

    # 3. Generate Gemini summaries, or fall back to raw items
    if llm_client.is_enabled() and (raw_strengths or raw_weaknesses):
        system_prompt = (
            "You are a concise sales intelligence assistant for ThermoFisher Scientific. "
            "Given a list of raw product strengths and a list of product improvement areas / weaknesses, "
            "produce two separate JSON arrays:\n"
            "- 'strengths_summary': exactly 3-4 bullet point strings summarizing key market strengths "
            "in clear, professional language. Each bullet should be a complete thought (not just a phrase).\n"
            "- 'improvements_summary': exactly 3-4 bullet point strings summarizing improvement areas "
            "or competitive gaps in clear, professional language.\n"
            "Use ONLY the provided data. Do NOT invent information. "
            "Return valid JSON with keys 'strengths_summary' and 'improvements_summary' (arrays of strings)."
        )
        user_text = (
            f"Product: {name}\n\n"
            f"Raw Strengths:\n" + "\n".join(f"- {s}" for s in raw_strengths) + "\n\n"
            f"Raw Improvement Areas / Weaknesses:\n" + "\n".join(f"- {w}" for w in raw_weaknesses)
        )
        try:
            result = await llm_client._gemini_json(system_prompt, user_text) \
                if settings.llm_provider == "gemini" \
                else await llm_client._openai_json(system_prompt, user_text)

            if isinstance(result, dict):
                return {
                    "strengths_summary": result.get("strengths_summary") or _to_bullets(raw_strengths),
                    "improvements_summary": result.get("improvements_summary") or _to_bullets(raw_weaknesses),
                    "source": "gemini",
                }
        except Exception:
            pass  # fall through to raw fallback

    # 4. Plain fallback — return raw items as bullet strings
    return {
        "strengths_summary": _to_bullets(raw_strengths),
        "improvements_summary": _to_bullets(raw_weaknesses),
        "source": "raw",
    }


def _to_bullets(items: list[str]) -> list[str]:
    """Trim and de-duplicate raw items for display as bullet points."""
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        clean = item.strip().strip("-").strip()
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            out.append(clean)
    return out[:5]
