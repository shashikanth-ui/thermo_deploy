import axios from "axios";
import { GEMINI_CONFIG } from "../config/gemini.js";

export async function parseQuestion(question) {
  if (!GEMINI_CONFIG.apiKey) {
    return {
      intent: "unknown",
      entity: null,
      confidence: "low"
    };
  }

  const prompt = `
You are an intent analyzer for a business knowledge graph.

Your job:
- Understand what the user is asking
- Identify the MAIN entity (Product or Company)
- Do NOT answer the question
- Do NOT invent entities
- If entity is unclear, say null

Allowed intents:
- get_competitors
- analyze_product_loss
- analyze_product_strength
- unknown

Allowed entity types:
- Product
- Company

Return STRICT JSON ONLY in this format:
{
  "intent": "...",
  "entity": { "type": "...", "name": "..." } | null,
  "confidence": "high" | "medium" | "low"
}

Question:
"${question}"
`;

  try {
    const res = await axios.post(
      `${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: GEMINI_CONFIG.headers }
    );

    const text =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return JSON.parse(text);
  } catch (err) {
    return {
      intent: "unknown",
      entity: null,
      confidence: "low"
    };
  }
}
