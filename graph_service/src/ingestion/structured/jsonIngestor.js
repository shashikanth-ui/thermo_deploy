// JSON ingestion
import fs from "fs";
import path from "path";
import { mergeNode, mergeRelationship } from "../../graph/writers.js";
import { NODE_TYPES } from "../../constants/nodeTypes.js";
import { RELATIONSHIP_TYPES } from "../../constants/relationshipTypes.js";

// ✅ MUST be a NAMED export
export async function ingestJsonDirectory(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".json"));

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    await ingestJsonObject(raw);
  }
}

async function ingestJsonObject(data) {
  if (!Array.isArray(data.records)) return;

  for (const record of data.records) {
    const productName = record.thermo_product;
    if (!productName) continue;

    // Product
    await mergeNode(NODE_TYPES.PRODUCT, { name: productName });

    for (const ca of record.competitive_analysis || []) {
      // Competitor
      if (ca.competitor_product) {
        await mergeRelationship(
          NODE_TYPES.PRODUCT,
          { name: productName },
          RELATIONSHIP_TYPES.LOSES_TO,
          NODE_TYPES.COMPETITOR,
          { name: ca.competitor_product }
        );
      }

      // Thermo strengths
      const thermoStrengths = [
        ...(ca.thermo_strengths?.technical || []),
        ...(ca.thermo_strengths?.workflow || []),
        ...(ca.thermo_strengths?.commercial || [])
      ];

      for (const strength of thermoStrengths) {
        await mergeRelationship(
          NODE_TYPES.PRODUCT,
          { name: productName },
          RELATIONSHIP_TYPES.HAS_STRENGTH,
          NODE_TYPES.STRENGTH,
          { name: strength }
        );
      }

      // Thermo weaknesses
      const thermoWeaknesses = [
        ...(ca.thermo_cons?.technical || []),
        ...(ca.thermo_cons?.workflow || []),
        ...(ca.thermo_cons?.commercial || [])
      ];

      for (const weakness of thermoWeaknesses) {
        await mergeRelationship(
          NODE_TYPES.PRODUCT,
          { name: productName },
          RELATIONSHIP_TYPES.HAS_WEAKNESS,
          NODE_TYPES.WEAKNESS,
          { name: weakness }
        );
      }

      // Decision driver
      if (ca.customer_decision_driver) {
        await mergeRelationship(
          NODE_TYPES.PRODUCT,
          { name: productName },
          RELATIONSHIP_TYPES.DECISION_DRIVER,
          NODE_TYPES.DECISION_DRIVER,
          { name: ca.customer_decision_driver }
        );
      }
    }
  }
}
