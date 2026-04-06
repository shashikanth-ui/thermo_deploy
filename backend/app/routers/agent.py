from __future__ import annotations
import subprocess
import sys
import os
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, Form

from app.agents.intake_agent import intake_agent
from app.agents.recommendation_agent import recommendation_agent
from app.agents.pricing_agent import pricing_agent
from app.agents.insights_agent import insights_agent
from app.schemas.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    RecommendRequest,
    RecommendResponse,
    QuoteSetupRequest,
    QuoteSetupResponse,
    PriceQuoteRequest,
    PriceQuoteResponse,
    InsightsRequest,
    InsightsResponse,
)
from app.utils.doc_parser import parse_text_from_upload
from app.utils.clients import company_exists

router = APIRouter(prefix="/api", tags=["agent"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    result = await intake_agent.run(req.requirements_text)
    return AnalyzeResponse(
        company_name=req.company_name,
        company_exists=company_exists(req.company_name),
        **result,
    )


@router.post("/analyze-upload", response_model=AnalyzeResponse)
async def analyze_upload(
    file: UploadFile = File(...),
    company_name: str = Form(default=""),
    requirements_text: str = Form(default=""),
):
    content = await file.read()
    text = parse_text_from_upload(file.filename, content)
    merged = (requirements_text or "").strip()
    if merged:
        merged = merged + "\n\n" + text
    else:
        merged = text
    result = await intake_agent.run(merged)
    return AnalyzeResponse(
        company_name=company_name,
        company_exists=company_exists(company_name),
        **result,
    )


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    result = await recommendation_agent.run(req.requirements_text, req.tags)
    return RecommendResponse(**result)


@router.post("/quote/setup", response_model=QuoteSetupResponse)
async def quote_setup(req: QuoteSetupRequest):
    line_items = []
    for p in req.products:
        line_items.append({"product_name": p, "qty": 1, "unit_price": None})
    return QuoteSetupResponse(
        deal_id=req.deal_id,
        company_name=req.company_name,
        line_items=line_items,
    )


@router.post("/quote/price", response_model=PriceQuoteResponse)
async def quote_price(req: PriceQuoteRequest):
    pricing = pricing_agent.run(req.items)
    return PriceQuoteResponse(deal_id=req.deal_id, company_name=req.company_name, pricing=pricing)


@router.post("/insights", response_model=InsightsResponse)
async def insights(req: InsightsRequest):
    data = await insights_agent.run(req.selected_products)
    return InsightsResponse(**data)


from fastapi.responses import StreamingResponse
import json
import asyncio


@router.post("/execute-devv")
async def execute_devv():
    backend_dir = Path(__file__).resolve().parents[2]
    script_path = backend_dir / "devv.py"

    if not script_path.exists():
        return {"status": "error", "message": f"devv.py not found at: {script_path}", "logs": []}

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(backend_dir),
            env=env,
            timeout=60,
        )
        stdout_lines = [l for l in result.stdout.splitlines() if l.strip()]
        if result.returncode == 0:
            return {"status": "success", "message": "Pipeline completed successfully", "logs": stdout_lines}
        else:
            err = result.stderr.strip() or f"Process exited with code {result.returncode}"
            return {"status": "error", "message": err, "logs": stdout_lines}
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Script timed out after 60 seconds", "logs": []}
    except Exception as e:
        import traceback
        return {"status": "error", "message": f"{type(e).__name__}: {e}", "logs": [], "detail": traceback.format_exc()}
