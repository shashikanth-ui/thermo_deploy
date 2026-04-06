from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def _load_clients() -> set[str]:
    """Loads a small demo client list.

    This is intentionally simple for the POC. Replace with your real CRM source later.
    """
    p = Path(__file__).resolve().parents[1] / "data" / "clients.json"
    if not p.exists():
        return set()
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
        items = payload.get("clients", [])
        return {str(x).strip().lower() for x in items if str(x).strip()}
    except Exception:
        return set()


def company_exists(company_name: str) -> bool:
    import re
    def normalize(text: str) -> str:
        # Remove common suffixes and punctuation for better matching
        t = (text or "").strip().lower()
        t = re.sub(r'[,.\-]', ' ', t)
        t = re.sub(r'\b(inc|ltd|corp|corporation|limited|llc|plc|co|company)\b', '', t)
        return " ".join(t.split())

    name = normalize(company_name)
    if not name:
        return False
    
    clients = _load_clients()
    # Check for direct match or if our normalized input is contained in normalized client names
    for client in clients:
        if name == normalize(client):
            return True
    return False
