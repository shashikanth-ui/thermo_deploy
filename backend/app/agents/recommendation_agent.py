from __future__ import annotations

import json
from typing import Any

from app.core.config import settings
from app.utils.llm import llm_client
from app.utils.products import _flatten_ca_field, product_search


class RecommendationAgent:

    def _heuristic_enrich(self, recs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Build explainability blocks from competitive_analysis data.
        Used when LLM is disabled or as fallback.
        """
        enriched = []
        for r in recs:
            ca_list = r.get("competitive_analysis") or []
            ca = ca_list[0] if isinstance(ca_list, list) and ca_list else {}

            thermo_strengths = [
                s for v in (ca.get("thermo_strengths") or {}).values()
                if isinstance(v, list) for s in v
            ]
            competitor_cons = [
                s for v in (ca.get("competitor_cons") or {}).values()
                if isinstance(v, list) for s in v
            ]
            competitor_strengths = [
                s for v in (ca.get("competitor_strengths") or {}).values()
                if isinstance(v, list) for s in v
            ]

            why = []
            for s in thermo_strengths[:3]:
                why.append(s)
            for c in competitor_cons[:2]:
                why.append("Competitor gap: " + c)

            evidence = []
            for s in thermo_strengths[:2]:
                evidence.append(s)
            for s in competitor_strengths[:1]:
                evidence.append("Competitor capability noted: " + s)

            score = r.get("match_score", 0)
            conf = int(round(min(99, max(30, score))))

            enriched.append({
                **r,
                "explainability": {
                    "why_matched": why[:6],
                    "evidence": evidence[:5],
                    "confidence": conf,
                },
            })
        return enriched

    async def _llm_rank(
        self,
        requirement_text: str,
        tags: list[str],
        candidates: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Use Gemini to re-rank candidates and generate rich explainability.
        Falls back to heuristic enrichment on any error.
        """
        # Build a compact summary of each candidate for the LLM
        product_summaries = []
        for i, p in enumerate(candidates):
            ca_list = p.get("competitive_analysis") or []
            ca = ca_list[0] if isinstance(ca_list, list) and ca_list else {}
            thermo_str = _flatten_ca_field(ca.get("thermo_strengths"))
            product_summaries.append({
                "index": i,
                "product_name": p.get("thermo_product", ""),
                "comparative_position": ca.get("comparative_position", ""),
                "thermo_strengths_excerpt": thermo_str[:300],
                "competitor_cons_excerpt": _flatten_ca_field(ca.get("competitor_cons"))[:200],
            })

        tag_str = ", ".join(tags) if tags else "none"
        prompt = (
            "You are a ThermoFisher Scientific expert product recommendation specialist.\n"
            "Evaluate how well each candidate product fits the customer's requirements.\n\n"
            "Return ONLY a valid JSON object with key 'rankings': an array where each item has:\n"
            "  - 'index': integer (the product index from the list below)\n"
            "  - 'score': integer 0-100 (be strict and accurate:\n"
            "       90-100 = perfect fit, 70-89 = strong fit, 50-69 = partial fit,\n"
            "       30-49 = weak tangential fit, below 30 = not relevant)\n"
            "  - 'why_matched': list of 2-4 specific sentences explaining WHY\n"
            "       this product suits the stated requirements\n"
            "  - 'evidence': list of 1-3 specific strengths from the product data\n\n"
            f"Customer Requirements:\n{requirement_text}\n\n"
            f"Customer Tags / Keywords: {tag_str}\n\n"
            f"Candidate Products:\n{json.dumps(product_summaries, indent=2)}"
        )

        try:
            res = await llm_client._gemini_json(prompt, "Evaluate and rank these products.")
            rankings = res.get("rankings") or [] if isinstance(res, dict) else []

            enriched = []
            for ranking in sorted(rankings, key=lambda x: x.get("score", 0), reverse=True):
                idx = ranking.get("index")
                if idx is None or not isinstance(idx, int) or idx >= len(candidates):
                    continue
                p = candidates[idx]
                llm_score = min(99, max(0, int(ranking.get("score", 0))))

                # Blend: 60% LLM judgment + 40% heuristic signal
                heuristic_score = p.get("match_score", 0)
                final_score = round(0.6 * llm_score + 0.4 * heuristic_score, 1)

                why = ranking.get("why_matched") or []
                evidence = ranking.get("evidence") or []

                # Ensure lists of strings
                why = [str(w) for w in why if w][:6]
                evidence = [str(e) for e in evidence if e][:5]

                if not why:
                    # Fall back to heuristic why_matched
                    heuristic = self._heuristic_enrich([p])
                    why = heuristic[0]["explainability"]["why_matched"]
                    evidence = heuristic[0]["explainability"]["evidence"]

                enriched.append({
                    **p,
                    "match_score": final_score,
                    "explainability": {
                        "why_matched": why,
                        "evidence": evidence,
                        "confidence": int(final_score),
                    },
                })

            # Filter below 20% (genuinely irrelevant per LLM)
            enriched = [e for e in enriched if e["match_score"] >= 20]
            if enriched:
                return enriched

            # If LLM returned nothing useful, fall back
            return self._heuristic_enrich(candidates)

        except Exception:
            return self._heuristic_enrich(candidates)

    async def run(
        self, requirement_text: str, tags: list[str] | None = None
    ) -> dict[str, Any]:
        # Build the query with tags appended
        query = requirement_text
        if tags:
            query = requirement_text + "\n\nTAGS: " + ", ".join(tags)

        # Get heuristic candidates (wider pool so LLM has more to re-rank)
        candidates = product_search(query, limit=8)

        if not candidates:
            return {"recommended_products": []}

        # LLM re-ranking when Gemini is available
        if llm_client.is_enabled():
            enriched = await self._llm_rank(requirement_text, tags or [], candidates)
        else:
            enriched = self._heuristic_enrich(candidates)

        # Return top 5
        return {"recommended_products": enriched[:5]}


recommendation_agent = RecommendationAgent()
