from __future__ import annotations

import io
from typing import Optional

from pypdf import PdfReader
from docx import Document


def parse_text_from_upload(filename: str, content: bytes) -> str:
    fn = (filename or "").lower()

    if fn.endswith(".txt"):
        return content.decode("utf-8", errors="ignore")

    if fn.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)

    if fn.endswith(".docx"):
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    # fallback
    return content.decode("utf-8", errors="ignore")
