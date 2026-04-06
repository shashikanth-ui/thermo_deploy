import express from "express";
import axios from "axios";
import { getProductIntelligence } from "../graph/readers.js";
import { GEMINI_CONFIG } from "../config/gemini.js";

const router = express.Router();

router.get("/:name", async (req, res) => {
  try {
    const productName = req.params.name;

    const context = await getProductIntelligence(productName);

    if (!context) {
      return res.status(404).json({
        error: "Product not found in knowledge graph"
      });
    }

    // If Gemini not configured → return graph-only
    if (!GEMINI_CONFIG.apiKey) {
      return res.json({
        ...context,
        summary: "Gemini not configured. Returning structured graph data only.",
        source: "graph-only"
      });
    }

    const prompt = `
You are a business intelligence assistant.

Using ONLY the provided graph data:

1. Explain what this product is primarily used for.
2. Explain why it may have advantages over its competitors.
3. Mention where it may be losing deals if applicable.

Do NOT invent information.
Do NOT use external knowledge.
If data is insufficient, say so clearly.

Graph Data:
${JSON.stringify(context, null, 2)}
`;

    try {
      const geminiRes = await axios.post(
        `${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: GEMINI_CONFIG.headers }
      );

      const summary =
        geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (summary && summary.trim().length > 0) {
        return res.json({
          ...context,
          summary: summary.trim(),
          source: "graph+gemini"
        });
      }

      // Gemini returned empty
      return res.json({
        ...context,
        summary: "Unable to generate summary. Returning structured graph data.",
        source: "graph-fallback"
      });

    } catch (err) {
      return res.json({
        ...context,
        summary: "Gemini request failed. Returning structured graph data.",
        source: "graph-fallback"
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
});

export default router;
