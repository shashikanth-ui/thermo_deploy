from __future__ import annotations

import json
import random
from typing import Any

from app.core.config import settings
from app.utils.llm import llm_client
from app.utils.products import compute_insights, load_products


def _generate_contextual_advice(selected_details: list[dict[str, Any]], insights: dict) -> dict[str, Any]:
    """
    Generate meaningful, product-specific sales advice from competitive analysis data.
    Used when LLM is unavailable or fails — output varies per product set.
    """
    advice_items = []
    discount_should = False
    discount_range = "0%"
    discount_reason = "Products hold strong market positioning."

    comp_adv_count = 0
    thermo_adv_count = 0

    for p in selected_details:
        ca_list = p.get("competitive_analysis") or []
        ca = ca_list[0] if isinstance(ca_list, list) and ca_list else {}
        name = p.get("thermo_product", "this product")
        position = str(ca.get("comparative_position", "")).lower()
        competitor = ca.get("competitor_company", "competitors")

        thermo_strengths = ca.get("thermo_strengths") or {}
        competitor_cons = ca.get("competitor_cons") or {}
        net = str(ca.get("net_assessment_summary", "")).strip()

        # Pull top strengths
        tech_strengths = []
        for v in thermo_strengths.values():
            if isinstance(v, list):
                tech_strengths.extend(v[:2])

        # Pull top competitor weaknesses
        comp_gaps = []
        for v in competitor_cons.values():
            if isinstance(v, list):
                comp_gaps.extend(v[:2])

        if position == "thermo advantage":
            thermo_adv_count += 1
            if tech_strengths:
                advice_items.append(
                    f"Lead with {name}'s key differentiator: {tech_strengths[0].lower()} — "
                    f"this directly addresses gaps in {competitor}'s offering."
                )
            if comp_gaps:
                advice_items.append(
                    f"Highlight {competitor}'s limitation — {comp_gaps[0].lower()} — "
                    f"and position {name} as the validated solution."
                )

        elif position == "competitor advantage":
            comp_adv_count += 1
            advice_items.append(
                f"For {name}, shift the conversation from features to total cost of ownership "
                f"and ThermoFisher's global service network, where {competitor} cannot compete."
            )
            if net:
                advice_items.append(
                    f"Use ThermoFisher's compliance and reproducibility guarantee as the anchor: "
                    f"{net[:120]}."
                )
            discount_should = True
            discount_range = "5-10%"
            discount_reason = (
                f"{competitor} holds a slight edge on this product. "
                "Offer a modest discount paired with a multi-year service commitment to protect margin "
                "while closing the value gap."
            )

        else:  # neutral
            if tech_strengths:
                advice_items.append(
                    f"Differentiate {name} by emphasising workflow integration and validated protocols — "
                    f"areas where ThermoFisher's global support adds tangible value over {competitor}."
                )

    # Add win-rate and market-level tactics
    win_rate = insights.get("win_rate", 70)
    market_comp = insights.get("market_competition", 55)

    if win_rate >= 75:
        advice_items.append(
            f"With an estimated {win_rate}% win rate across these products, "
            "create urgency by referencing limited instrument availability or upcoming price adjustments."
        )
    elif win_rate < 55:
        advice_items.append(
            "Win rate is below average for this portfolio — "
            "bundle products with complimentary application support or pilot programs to reduce switching risk."
        )

    if market_comp >= 70:
        advice_items.append(
            "High competitive pressure detected. Anchor the negotiation on long-term partnership value: "
            "global reagent continuity, regulatory compliance, and dedicated field support."
        )

    # Deduplicate and cap
    seen = set()
    unique_advice = []
    for item in advice_items:
        key = item[:40]
        if key not in seen:
            seen.add(key)
            unique_advice.append(item)

    # Always return at least 4 items
    fallback_pool = [
        "Request multi-year volume commitment upfront — even at modest quantities — to lock in the relationship before competitors engage.",
        "Offer a complimentary protocol review or application support session to demonstrate integration depth that competitors cannot match.",
        "Reference peer institution case studies relevant to this customer's research area to build credibility and reduce decision risk.",
        "Structure the proposal as a phased rollout: starting instrument + 6-month reagent supply, expanding on demonstrated ROI.",
    ]
    random.shuffle(fallback_pool)
    for fb in fallback_pool:
        if len(unique_advice) >= 4:
            break
        unique_advice.append(fb)

    # Strategic discount logic based on competitive position mix
    if thermo_adv_count > comp_adv_count:
        if comp_adv_count == 0:
            discount_should = False
            discount_range = "0–2%"
            discount_reason = (
                "ThermoFisher holds a dominant advantage across this entire product mix. "
                "Instead of leading with price cuts, emphasize our role as a long-term strategic partner "
                "and our unique ability to support their specific research goals."
            )
        else:
            discount_should = True
            discount_range = "2–4%"
            discount_reason = (
                "While we have a broad edge, there are minor competitive gaps for certain items. "
                "Offer a small strategic discount conditioned on an early-bird commitment to lock in the "
                "full portfolio before rivals can respond."
            )
    else:  # Neutral or Competitor heavy
        discount_should = True
        discount_range = "5–12%"
        discount_reason = (
            "This deal faces significant competitive pressure. We recommend a more aggressive discount "
            "strategy, but only if paired with value-add services like free shipping or priority technical support. "
            "Focus on the 'Total Value' to justify why ThermoFisher is worth the premium."
        )

    return {
        "psychology_advice": unique_advice[:5],
        "discount_advice": {
            "should_discount": discount_should,
            "range": discount_range,
            "reason": discount_reason,
        },
    }


class InsightsAgent:
    async def run(self, selected_products: list[dict[str, Any]]) -> dict[str, Any]:
        product_names = [p.get("thermo_product") for p in selected_products if p.get("thermo_product")]
        insights = compute_insights(product_names)

        # Load full product details for context
        all_products = load_products()
        selected_details = [
            p for p in all_products
            if p.get("thermo_product") in product_names
        ]

        if llm_client.is_enabled():
            product_briefs = []
            for p in selected_details[:5]:
                ca_list = p.get("competitive_analysis") or []
                ca = ca_list[0] if isinstance(ca_list, list) and ca_list else {}
                thermo_strengths = ca.get("thermo_strengths") or {}
                comp_cons = ca.get("competitor_cons") or {}
                position = ca.get("comparative_position", "neutral")
                product_briefs.append({
                    "product": p.get("thermo_product"),
                    "position": position,
                    "key_strengths": list(thermo_strengths.get("technical", []))[:3],
                    "competitor_gaps": list(comp_cons.get("technical", []))[:2],
                    "competitor": ca.get("competitor_company", ""),
                })

            prompt = (
                "You are an elite ThermoFisher Scientific Sales Negotiator and Strategic Advisor. "
                "Analyze the selected products and competitive data to provide high-stakes sales intelligence.\n\n"
                "Return ONLY a valid JSON object with exactly these keys:\n\n"
                "1. 'advisory': A concise, high-impact summary (1-2 sentences) of the overall strategic position for this account.\n\n"
                "2. 'psychology_advice': A list of EXACTLY 4 tactical items. Each must be a specific 'play':\n"
                "   - Reference a specific product name or competitor limitation from the data\n"
                "   - Use professional, high-impact language (e.g., 'Anchor the value on...', 'Neutralize the rival's...')\n"
                "   - Be directly usable in a high-level negotiation meeting\n\n"
                "3. 'discount_advice': An object that provides a 'Smart Discount' strategy:\n"
                "   - 'should_discount': boolean\n"
                "   - 'range': string (e.g. '3-5%' or '0%')\n"
                "   - 'reason': Provide a 2-3 sentence strategic rationale. "
                "Don't just say 'they are cheaper'. Focus on 'Strategic Concessions' (e.g., 'Discount if they commit to a 3-year reagent contract') "
                "or 'Margin Protection' (e.g., 'Hold price but offer free installation to maintain product value').\n\n"
                f"Product/Competitive Data:\n{json.dumps(product_briefs, indent=2)}\n\n"
                f"Metrics: competition={insights.get('market_competition')}%, win_rate={insights.get('win_rate')}%, confidence={insights.get('recommendation_confidence')}%"
            )

            try:
                if settings.llm_provider == "gemini":
                    res = await llm_client._gemini_json(prompt, "Provide the strategic sales advisory.")
                else:
                    res = await llm_client._openai_json(prompt, "Provide the strategic sales advisory.")

                if isinstance(res, dict) and res.get("psychology_advice"):
                    insights["advisory"] = res.get("advisory", "")
                    insights["psychology_advice"] = res.get("psychology_advice") or []
                    insights["discount_advice"] = res.get("discount_advice") or {}
                    return insights
            except Exception:
                pass  # Fall through to contextual heuristic

        # Contextual heuristic fallback — always meaningful and product-specific
        contextual = _generate_contextual_advice(selected_details, insights)
        insights["advisory"] = (
            f"Analysed {len(selected_details)} product(s). "
            "Review competitive positioning below for tailored negotiation tactics."
        )
        insights["psychology_advice"] = contextual["psychology_advice"]
        insights["discount_advice"] = contextual["discount_advice"]

        return insights


insights_agent = InsightsAgent()
