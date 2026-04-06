from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
import httpx

from app.core.config import settings


router = APIRouter(prefix="/api/graph", tags=["graph"])


def _ensure_enabled() -> None:
    if not settings.graph_rag_enabled:
        raise HTTPException(status_code=400, detail="GraphRAG is disabled. Set GRAPH_RAG_ENABLED=true")


@router.get("/health")
async def health():
    _ensure_enabled()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.graph_service_url}/api/health")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Graph service unavailable: {e}")


@router.get("/product")
async def product(name: str = Query(..., min_length=1)):
    """Proxy to GraphRAG product intelligence endpoint."""
    _ensure_enabled()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{settings.graph_service_url}/api/product/{httpx.URL(name).raw_path.decode('utf-8')}")
            if r.status_code == 404:
                raise HTTPException(status_code=404, detail="Product not found in graph")
            r.raise_for_status()
            return r.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Graph service error: {e}")


@router.get("/product/graph")
async def product_graph(name: str = Query(..., min_length=1)):
    """Proxy to GraphRAG product graph structure endpoint (nodes/edges)."""
    _ensure_enabled()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Graph service endpoint is /api/product/:name/graph
            url = f"{settings.graph_service_url}/api/product/{httpx.URL(name).raw_path.decode('utf-8')}/graph"
            r = await client.get(url)
            if r.status_code == 404:
                # Provide an empty graph structure if not found/no graph data
                return {"nodes": [], "edges": []}
            r.raise_for_status()
            return r.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Graph service error: {e}")


@router.post("/ask")
async def ask(payload: dict):
    """Proxy to GraphRAG /ask for graph-grounded answers."""
    _ensure_enabled()
    question = (payload or {}).get("question")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{settings.graph_service_url}/api/ask", json={"question": question})
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Graph service error: {e}")
