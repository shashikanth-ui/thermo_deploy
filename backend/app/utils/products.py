import json
import os
import re
from typing import Any, Dict, List

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "products.json")
DATA_PATH = os.path.normpath(DATA_PATH)

_PRODUCTS_CACHE: List[Dict[str, Any]] | None = None

# Common English + scientific stop words to skip during tokenization
_STOP_WORDS = {
    # Common English
    'a', 'an', 'the', 'and', 'or', 'for', 'of', 'in', 'on', 'at', 'to', 'is',
    'are', 'was', 'be', 'been', 'with', 'that', 'this', 'it', 'from', 'by',
    'as', 'we', 'our', 'need', 'use', 'used', 'using', 'but', 'not', 'no',
    'also', 'which', 'all', 'any', 'some', 'such', 'more', 'most', 'into',
    'very', 'high', 'low', 'what', 'how', 'its', 'do', 'does', 'has', 'have',
    'will', 'can', 'than', 'each', 'about', 'up', 'they', 'their', 'both',
    'between', 'through', 'during', 'before', 'after', 'without',
    # Business / logistics language (common in customer descriptions but never match products)
    'need', 'needs', 'needed', 'want', 'wants', 'looking', 'require', 'requires',
    'required', 'seeking', 'like', 'would', 'should', 'could', 'please', 'get',
    'budget', 'budgeted', 'limited', 'cost', 'price', 'pricing', 'affordable',
    'delivery', 'deliver', 'ship', 'shipping', 'week', 'weeks', 'month', 'months',
    'day', 'days', 'within', 'asap', 'urgent', 'timeline', 'deadline',
    'sample', 'samples', 'process', 'processing', 'per', 'around', 'approximately',
    'lot', 'lots', 'batch', 'run', 'runs', 'currently', 'currently', 'now',
    'new', 'old', 'existing', 'current', 'plan', 'planning', 'project',
    'lab', 'team', 'group', 'site', 'facility', 'work', 'working',
}


def _normalize_products(raw: Any) -> List[Dict[str, Any]]:
    if raw is None:
        return []

    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict)]

    if isinstance(raw, dict):
        if isinstance(raw.get("products"), list):
            return [x for x in raw["products"] if isinstance(x, dict)]
        if isinstance(raw.get("data"), list):
            return [x for x in raw["data"] if isinstance(x, dict)]

        vals = list(raw.values())
        if vals and all(isinstance(v, dict) for v in vals):
            return vals

        flattened: List[Dict[str, Any]] = []
        for v in vals:
            if isinstance(v, list):
                flattened.extend([x for x in v if isinstance(x, dict)])
        return flattened

    return []


def load_products(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _PRODUCTS_CACHE
    if _PRODUCTS_CACHE is not None and not force_reload:
        return _PRODUCTS_CACHE

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"products.json not found at: {DATA_PATH}")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    _PRODUCTS_CACHE = _normalize_products(raw)
    return _PRODUCTS_CACHE


def _tokenize(text: str) -> List[str]:
    """Extract meaningful tokens, skipping stop words and very short words."""
    words = re.findall(r'[a-z0-9]+', (text or "").lower())
    return [w for w in words if len(w) > 2 and w not in _STOP_WORDS]


def _flatten_ca_field(d: Any) -> str:
    """Flatten a competitive analysis sub-dict (which has technical/workflow/commercial keys)."""
    if not isinstance(d, dict):
        return ""
    out = []
    for v in d.values():
        if isinstance(v, list):
            out.extend([str(x) for x in v])
    return " ".join(out).lower()


def _score_product(tokens: List[str], p: Dict[str, Any]) -> float:
    """
    Score a product's relevance to query tokens.
    Returns a float in [0, 100].

    Scoring per token hit:
        Product name match      → 20 pts  (very strong signal)
        Thermo strength match   → 15 pts  (strong signal — what Thermo excels at)
        Competitor con match    → 10 pts  (good — customer pain point = Thermo advantage)
        Competitor name/product → 8  pts  (relevant context, maybe comparing)
        Any other field match   → 4  pts  (weak signal)

    Final score = (sum of hits / max possible) × 100, capped at 97.
    """
    if not tokens:
        return 0.0

    name = str(p.get("thermo_product", "")).lower()

    ca_list = p.get("competitive_analysis") or []
    ca = ca_list[0] if isinstance(ca_list, list) and ca_list else {}

    thermo_str = _flatten_ca_field(ca.get("thermo_strengths"))
    comp_cons = _flatten_ca_field(ca.get("competitor_cons"))
    comp_str = _flatten_ca_field(ca.get("competitor_strengths"))
    comp_company = str(ca.get("competitor_company", "")).lower()
    comp_product_name = str(ca.get("competitor_product", "")).lower()
    net_assessment = str(ca.get("net_assessment_summary", "")).lower()
    position = str(ca.get("comparative_position", "")).lower()

    # Full corpus for fallback matching
    full_corpus = (
        f"{name} {thermo_str} {comp_cons} {comp_str} "
        f"{comp_company} {comp_product_name} {net_assessment} {position}"
    )

    raw_score = 0.0
    for t in tokens:
        if t in name:
            raw_score += 20
        elif t in thermo_str:
            raw_score += 15
        elif t in comp_cons:
            raw_score += 10
        elif t in comp_company or t in comp_product_name:
            raw_score += 8
        elif t in full_corpus:
            raw_score += 4

    # Cap the denominator at 6 tokens so that real-world long descriptions
    # (containing many non-product words like budget/delivery/timeline) don't
    # dilute the score. Genuinely matching 3-4 domain terms should score 50-80%.
    effective_token_count = min(len(tokens), 6)
    max_score = effective_token_count * 20

    if max_score == 0:
        return 0.0

    normalized = min(97.0, (raw_score / max_score) * 100)
    return round(normalized, 1)


def product_search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """
    Search products by relevance to the query.
    Returns up to `limit` products ranked by match_score (0-100).
    Products with no meaningful signal are excluded.
    """
    products = load_products()
    tokens = _tokenize(query or "")

    if not tokens:
        return products[:limit]

    scored: List[tuple[float, Dict[str, Any]]] = []
    for p in products:
        s = _score_product(tokens, p)
        if s > 0:
            scored.append((s, p))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Minimum score gate — must have at least a weak, genuine hit
    MIN_SCORE = 10.0
    results = []
    for s, p in scored[:limit]:
        if s < MIN_SCORE:
            break
        p_copy = dict(p)
        p_copy["match_score"] = s
        results.append(p_copy)

    return results


def compute_insights(selected_products: list[str] | None = None) -> dict:
    products = load_products()

    selected_set = set([p.strip().lower() for p in (selected_products or []) if p.strip()])
    if selected_set:
        products = [
            p for p in products
            if str(p.get("thermo_product", "")).strip().lower() in selected_set
        ]

    if not products:
        return {
            "market_competition": 55,
            "win_rate": 72,
            "recommendation_confidence": 70,
            "how": "No matched products were available. Using default baseline metrics.",
        }

    score_map = {
        "thermo advantage": 0.25,
        "neutral": 0.55,
        "competitor advantage": 0.85,
    }

    scores = []
    thermo_adv = neutral = comp_adv = 0

    for p in products:
        ca_list = p.get("competitive_analysis") or []
        ca = ca_list[0] if isinstance(ca_list, list) and ca_list else {}
        pos = str(ca.get("comparative_position", "")).strip().lower()
        scores.append(score_map.get(pos, 0.55))

        if pos == "thermo advantage":
            thermo_adv += 1
        elif pos == "neutral":
            neutral += 1
        elif pos == "competitor advantage":
            comp_adv += 1

    avg = sum(scores) / max(len(scores), 1)

    market_competition = int(round(avg * 100))

    total = len(products)
    win_rate = int(round(((thermo_adv * 1.0 + neutral * 0.6 + comp_adv * 0.25) / total) * 100))
    win_rate = max(5, min(95, win_rate))

    confidence = int(round(min(95, 60 + (total * 3) + (thermo_adv * 4) - (comp_adv * 2))))
    confidence = max(40, min(95, confidence))

    return {
        "market_competition": market_competition,
        "win_rate": win_rate,
        "recommendation_confidence": confidence,
        "counts": {
            "total_products": total,
            "thermo_advantage": thermo_adv,
            "neutral": neutral,
            "competitor_advantage": comp_adv,
        },
        "how": (
            "We map comparative_position to a score (Thermo Advantage=0.25, Neutral=0.55, "
            "Competitor Advantage=0.85), average across selected products, and convert to %. "
            "Win Rate and Confidence are derived from the distribution of comparative positions."
        ),
    }