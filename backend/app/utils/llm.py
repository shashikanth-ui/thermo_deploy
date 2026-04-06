from __future__ import annotations

import json
from typing import Any, Optional

import httpx

from app.core.config import settings


class LLMClient:
    """Small wrapper for optional LLM usage.

    If no provider or missing keys, callers should treat responses as unavailable
    and use heuristic fallbacks.
    """

    def is_enabled(self) -> bool:
        if settings.llm_provider == "openai":
            return bool(settings.openai_api_key)
        if settings.llm_provider == "gemini":
            return bool(settings.gemini_api_key)
        return False

    async def extract_requirements(self, text: str) -> Optional[dict[str, Any]]:
        """Try to extract a structured requirement object."""
        if not self.is_enabled():
            return None

        prompt = (
            "You are a sales requirements extraction agent for ThermoFisher. "
            "Extract concise structured fields from the customer's requirements. "
            "IMPORTANT: Focus on specific technical, physical, or regulatory needs. "
            "Return a JSON OBJECT with the following keys: "
            "'summary' (string), 'tags' (array of strings), "
            "'deal_id' (string or null - extract if present in text), "
            "'constraints' (dictionary with keys: 'timeline', 'quantity', 'throughput', 'compliance'). "
            "Map any relevant details to these constraint keys. If a constraint is not found, use null or empty string. "
            "Do NOT add other keys to constraints."
        )

        if settings.llm_provider == "openai":
            return await self._openai_json(prompt, text)
        if settings.llm_provider == "gemini":
            return await self._gemini_json(prompt, text)
        return None

    async def _openai_json(self, system_prompt: str, user_text: str) -> Optional[dict[str, Any]]:
        url = settings.openai_base_url.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        payload = {
            "model": settings.openai_model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

    async def _gemini_json(self, system_prompt: str, user_text: str) -> Optional[dict[str, Any]]:
        # Minimal REST call; users can swap to official SDK if preferred
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        )
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt + "\n\nINPUT:\n" + user_text}]}
            ],
            "generationConfig": {"temperature": 0.2},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Gemini may wrap JSON in markdown fences; strip safely
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0]
            return json.loads(text)


llm_client = LLMClient()
