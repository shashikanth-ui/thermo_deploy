from __future__ import annotations

import re
from typing import Any

from app.utils.llm import llm_client


def _heuristic_extract(text: str) -> dict[str, Any]:
    clean = " ".join(text.split())
    # naive tag extraction
    keywords = set()
    for w in re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", clean):
        lw = w.lower()
        if lw in {"the", "and", "with", "for", "from", "this", "that", "are", "need", "want"}:
            continue
        if len(lw) <= 3:
            continue
        keywords.add(lw)
    tags = sorted(list(keywords))[:12]

    return {
        "summary": clean[:360] + ("…" if len(clean) > 360 else ""),
        "tags": [t.replace("-", " ") for t in tags],
        "constraints": {},
        "budget": None,
        "timeline": None,
        "application": None,
        "deal_id": None,
    }


class RequirementIntakeAgent:
    async def run(self, text: str) -> dict[str, Any]:
        try:
            llm = await llm_client.extract_requirements(text)
            if isinstance(llm, dict) and llm.get("summary"):
                llm.setdefault("tags", [])
                llm.setdefault("constraints", {})
                llm.setdefault("deal_id", None)
                return llm
        except Exception:
            pass  # LLM unavailable or errored — fall back to heuristic
        return _heuristic_extract(text)


intake_agent = RequirementIntakeAgent()
