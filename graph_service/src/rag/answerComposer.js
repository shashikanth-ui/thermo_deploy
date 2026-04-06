import axios from "axios";
import { GEMINI_CONFIG } from "../config/gemini.js";

function hasGraphSignal(ctx) {
  return (
    ctx?.weaknesses?.length > 0 ||
    ctx?.strengths?.length > 0 ||
    ctx?.competitors?.length > 0
  );
}

function deterministicFallback(ctx) {
  if (!ctx || !hasGraphSignal(ctx)) {
    return "There is insufficient data in the knowledge graph to explain why this product is losing deals.";
  }

  const parts = [];

  if (ctx.weaknesses?.length) {
    parts.push(
      `Key weaknesses include ${ctx.weaknesses.slice(0, 3).join(", ")}.`
    );
  }

  if (ctx.competitors?.length) {
    parts.push(
      `Competitors such as ${ctx.competitors.join(", ")} are influencing deal outcomes.`
    );
  }

  return parts.join(" ");
}

export async function composeAnswer(question, graphContext) {
  // 🟥 No graph data at all
  if (!graphContext) {
    return {
      answer:
        "No relevant data was found in the knowledge graph to answer this question.",
      source: "graph"
    };
  }

  // 🟦 Gemini not configured
  if (!GEMINI_CONFIG.apiKey) {
    return {
      answer: deterministicFallback(graphContext),
      source: "graph-only"
    };
  }

  const prompt = `
You are a business intelligence assistant.

STRICT RULES:
- Use ONLY the provided graph data.
- Do NOT repeat raw bullet lists.
- Do NOT mention the graph explicitly.
- Produce a concise executive-style explanation.
- Summarize the key business reasons clearly.
- Be concise and explanatory.
- Avoid unnecessary detail.


Question:
"${question}"

Graph Evidence:
${JSON.stringify(graphContext, null, 2)}

Write a clear, natural-language explanation.
`;

  try {
    const res = await axios.post(
      `${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      { headers: GEMINI_CONFIG.headers }
    );

    const summary =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (summary && summary.trim().length > 0) {
      return {
        answer: summary.trim(),
        source: "graph+llm"
      };
    }

    // Gemini responded but empty → safe deterministic summary
    return {
      answer: deterministicFallback(graphContext),
      source: "graph-fallback"
    };
  } catch (err) {
    // Gemini failed → safe deterministic summary
    return {
      answer: deterministicFallback(graphContext),
      source: "graph-fallback"
    };
  }
}
