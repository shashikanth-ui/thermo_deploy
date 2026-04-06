import { driver } from "../config/neo4j.js";
import { getProductContext } from "../graph/readers.js";

export async function retrieveSubgraph(parsed, originalQuestion) {
  const session = driver.session();

  try {
    // 🟩 1️⃣ Deterministic product match from graph (AUTHORITATIVE)
    const result = await session.run(
      `MATCH (p:Product) RETURN p.name AS name`
    );

    const productNames = result.records.map(r => r.get("name"));

    // 🔥 Pick the MOST SPECIFIC product name (longest match wins)
    const matchedProduct = productNames
      .filter(name =>
        originalQuestion.toLowerCase().includes(name.toLowerCase())
      )
      .sort((a, b) => b.length - a.length)[0];

    if (matchedProduct) {
      // 🔼 Upgrade parsed intent deterministically
      parsed.intent = "analyze_product_loss";
      parsed.entity = {
        type: "Product",
        name: matchedProduct
      };
      parsed.confidence = "derived";

      return await getProductContext(matchedProduct);
    }
  } finally {
    await session.close();
  }

  // 🟦 2️⃣ Fallback: use Gemini-parsed product if deterministic match failed
  if (
    parsed.intent === "analyze_product_loss" &&
    parsed.entity?.type === "Product" &&
    parsed.entity?.name
  ) {
    return await getProductContext(parsed.entity.name);
  }

  // 🟨 3️⃣ Unsupported (future scope)
  if (
    parsed.intent === "get_competitors" &&
    parsed.entity?.type === "Company"
  ) {
    return {
      __unsupported__: true,
      reason:
        "Company-level competitor analysis is not supported yet. The graph currently supports product-level analysis only."
    };
  }

  // 🟥 4️⃣ Nothing matched
  return null;
}
