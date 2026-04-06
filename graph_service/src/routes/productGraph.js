import express from "express";
import { driver } from "../config/neo4j.js";

const router = express.Router();

router.get("/:name/graph", async (req, res) => {
  const session = driver.session();

  try {
    const productName = req.params.name;

    const result = await session.run(
      `
      MATCH (p:Product {name: $name})
      OPTIONAL MATCH (p)-[:OWNED_BY]->(co:Company)
      OPTIONAL MATCH (p)-[:LOSES_TO]->(cp)
      OPTIONAL MATCH (p)-[:HAS_GROUP]->(g:CapabilityGroup)
      OPTIONAL MATCH (g)-[:CONTAINS]->(item)
      OPTIONAL MATCH (d:Deal)-[:INVOLVES]->(p)
      OPTIONAL MATCH (d)-[:LOST_TO]->(lostTo:Product)
      OPTIONAL MATCH (c:Customer)-[:BOUGHT]->(p)
      OPTIONAL MATCH (p)-[:HAS_STRENGTH]->(s:Strength)
      OPTIONAL MATCH (p)-[:HAS_WEAKNESS]->(w:Weakness)
      OPTIONAL MATCH (p)-[:DECISION_DRIVER]->(dd:DecisionDriver)

      RETURN DISTINCT p, co, cp, g, item, d, lostTo, c, s, w, dd
      `,
      { name: productName }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const nodesMap = new Map();
    const edgesSet = new Set();
    const edges = [];

    const addNode = (node) => {
      if (!node) return;
      const id = node.identity.toString();

      if (!nodesMap.has(id)) {
        nodesMap.set(id, {
          id,
          label: node.properties.name || node.properties.type || "Node",
          type: node.labels[0]
        });
      }
    };

    const addEdge = (source, target, type) => {
      if (!source || !target) return;

      const key = `${source.identity}-${target.identity}-${type}`;
      if (!edgesSet.has(key)) {
        edgesSet.add(key);
        edges.push({
          source: source.identity.toString(),
          target: target.identity.toString(),
          type
        });
      }
    };

    result.records.forEach((record) => {
      const p = record.get("p");
      const co = record.get("co");
      const cp = record.get("cp");
      const g = record.get("g");
      const item = record.get("item");
      const d = record.get("d");
      const lostTo = record.get("lostTo");
      const c = record.get("c");
      const s = record.get("s");
      const w = record.get("w");
      const dd = record.get("dd");

      addNode(p);
      addNode(co);
      addNode(cp);
      addNode(g);
      addNode(item);
      addNode(d);
      addNode(lostTo);
      addNode(c);
      addNode(s);
      addNode(w);
      addNode(dd);

      addEdge(p, co, "OWNED_BY");
      addEdge(p, cp, "COMPETES_WITH");
      addEdge(p, g, "HAS_GROUP");
      addEdge(g, item, "CONTAINS");
      addEdge(d, p, "INVOLVES");
      addEdge(d, lostTo, "LOST_TO");
      addEdge(c, p, "BOUGHT");
      addEdge(p, s, "HAS_STRENGTH");
      addEdge(p, w, "HAS_WEAKNESS");
      addEdge(p, dd, "DECISION_DRIVER");
    });

    return res.json({
      nodes: Array.from(nodesMap.values()),
      edges
    });

  } catch (error) {
    return res.status(500).json({
      error: "Graph retrieval failed",
      details: error.message
    });
  } finally {
    await session.close();
  }
});

export default router;
