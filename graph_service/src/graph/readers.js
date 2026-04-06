import { driver } from "../config/neo4j.js";

export async function getProductContext(productName) {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Product { name: $name })

      OPTIONAL MATCH (p)-[:HAS_STRENGTH]->(s:Strength)
      OPTIONAL MATCH (p)-[:HAS_WEAKNESS]->(w:Weakness)

      OPTIONAL MATCH (p)-[:LOSES_TO]->(cp)

      RETURN
        p { .name } AS product,
        collect(DISTINCT s.name) AS strengths,
        collect(DISTINCT w.name) AS weaknesses,
        collect(DISTINCT cp.name) AS competitors
      `,
      { name: productName }
    );

    if (result.records.length === 0) return null;

    const data = result.records[0].toObject();

    return {
      product: data.product,
      strengths: (data.strengths || []).filter(Boolean),
      weaknesses: (data.weaknesses || []).filter(Boolean),
      competitors: data.competitors.filter(Boolean)
    };

  } finally {
    await session.close();
  }
}

export async function getProductIntelligence(productName) {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Product { name: $name })

      OPTIONAL MATCH (c:Customer)-[:BOUGHT]->(p)

      // competitors are stored as LOSES_TO -> (Competitor {name}) by structured ingestion
      OPTIONAL MATCH (p)-[:LOSES_TO]->(cp)

      OPTIONAL MATCH (p)-[:DECISION_DRIVER]->(d:DecisionDriver)

      OPTIONAL MATCH (p)-[:HAS_STRENGTH]->(s:Strength)
      OPTIONAL MATCH (p)-[:HAS_WEAKNESS]->(w:Weakness)

      RETURN
        p.name AS product,
        null AS company,
        collect(DISTINCT c.name) AS customers,
        collect(DISTINCT cp.name) AS competitors,
        collect(DISTINCT d.name) AS decisionDrivers,
        collect(DISTINCT s.name) AS strengths,
        collect(DISTINCT w.name) AS weaknesses
      `,
      { name: productName }
    );

    if (result.records.length === 0) return null;

    const data = result.records[0].toObject();

    return {
      product: data.product,
      company: data.company,
      customers: (data.customers || []).filter(Boolean),
      decisionDrivers: (data.decisionDrivers || []).filter(Boolean),
      competitors: (data.competitors || []).filter(Boolean),
      strengths: (data.strengths || []).filter(Boolean),
      weaknesses: (data.weaknesses || []).filter(Boolean)
    };

  } finally {
    await session.close();
  }
}

