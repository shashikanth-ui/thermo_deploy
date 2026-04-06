from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    company_name: str = Field(default="", description="Customer / account name")
    requirements_text: str = Field(default="", description="Raw customer requirements")


class AnalyzeResponse(BaseModel):
    company_name: str = ""
    company_exists: bool = False
    summary: str
    tags: list[str]
    constraints: dict[str, str] = {}
    budget: Optional[str] = None
    timeline: Optional[str] = None
    application: Optional[str] = None


class RecommendRequest(BaseModel):
    requirements_text: str
    tags: list[str] = []


class Explainability(BaseModel):
    why_matched: list[str] = []
    evidence: list[str] = []
    confidence: int = 0


class RecommendationItem(BaseModel):
    thermo_product: str
    match_score: float = 0.0
    competitive_analysis: list[Any] = []
    explainability: Explainability


class RecommendResponse(BaseModel):
    recommended_products: list[RecommendationItem]


class QuoteSetupRequest(BaseModel):
    deal_id: str
    company_name: str
    products: list[str]


class QuoteSetupResponse(BaseModel):
    deal_id: str
    company_name: str
    line_items: list[dict[str, Any]]


class PriceQuoteRequest(BaseModel):
    deal_id: str
    company_name: str
    items: list[dict[str, Any]]


class PriceQuoteResponse(BaseModel):
    deal_id: str
    company_name: str
    pricing: dict[str, Any]


class InsightsRequest(BaseModel):
    selected_products: list[dict[str, Any]]


class InsightsResponse(BaseModel):
    market_competition: int
    win_rate: int
    recommendation_confidence: int
    how: str
    advisory: Optional[str] = None
    psychology_advice: list[str] = []
    discount_advice: dict[str, Any] = {}
