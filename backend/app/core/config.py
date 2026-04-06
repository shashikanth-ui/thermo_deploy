from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "ThermoFisher Sales Platform")
    cors_origins: str = os.getenv("CORS_ORIGINS", "*")

    # Optional LLM configuration (works if you set keys; otherwise we fall back to heuristic mode)
    llm_provider: str = os.getenv("LLM_PROVIDER", "none").lower()  # none | openai | gemini
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    data_path: str = os.getenv("PRODUCT_DATA_PATH", os.path.join(os.path.dirname(__file__), "..", "data", "products.json"))

    # GraphRAG (optional). If enabled + graph service reachable, UI can show graph-grounded explainability.
    graph_rag_enabled: bool = os.getenv("GRAPH_RAG_ENABLED", "false").lower() in {"1", "true", "yes", "y"}
    graph_service_url: str = os.getenv("GRAPH_SERVICE_URL", "http://127.0.0.1:3000")


settings = Settings()
