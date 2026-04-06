from __future__ import annotations

from typing import Any


def _base_price_from_name(name: str) -> float:
    # deterministic pseudo-price for demo
    seed = sum(ord(c) for c in (name or ""))
    return float(800 + (seed % 2200))  # 800..2999


class PricingAgent:
    def run(self, line_items: list[dict[str, Any]]) -> dict[str, Any]:
        priced = []
        subtotal = 0.0
        for item in line_items:
            name = item.get("product_name")
            qty = int(item.get("qty", 1))
            qty = max(1, qty)
            unit = float(item.get("unit_price") or _base_price_from_name(name))
            # No automatic discounts — discounts are 100% user-controlled via the UI
            disc = 0.0
            line_total = round(unit * qty, 2)
            subtotal += line_total
            priced.append({
                "product_name": name,
                "qty": qty,
                "unit_price": round(unit, 2),
                "discount": disc,
                "line_total": line_total,
            })

        taxes = round(subtotal * 0.0, 2)  # keep 0 for POC
        total = round(subtotal + taxes, 2)

        return {
            "items": priced,
            "subtotal": round(subtotal, 2),
            "taxes": taxes,
            "total": total,
        }


pricing_agent = PricingAgent()
