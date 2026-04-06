// Entity extractor
import axios from "axios";
import { GEMINI_CONFIG } from "../../config/gemini.js";

export async function extractEntities(text) {
  if (!GEMINI_CONFIG.apiKey) return [];

  const prompt = `
Extract ONLY explicit entity names mentioned in the text.
Allowed entity types:
- Product
- Competitor
- Customer

Rules:
- Do NOT infer or guess
- Do NOT summarize
- Return JSON only

Text:
"""${text.slice(0, 3000)}"""
`;

  try {
    const response = await axios.post(
      `${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      { headers: GEMINI_CONFIG.headers }
    );

    const raw =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    return JSON.parse(raw);
  } catch (err) {
    console.warn("⚠️ Entity extraction skipped");
    return [];
  }
}
