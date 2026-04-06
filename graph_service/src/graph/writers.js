// Graph writers
import { driver } from "../config/neo4j.js";

/**
 * Merge a node by label + unique properties
 */
export async function mergeNode(label, properties) {
  const session = driver.session();

  const keys = Object.keys(properties);
  const matchClause = keys.map(k => `${k}: $${k}`).join(", ");

  const query = `
    MERGE (n:${label} { ${matchClause} })
    RETURN n
  `;

  try {
    const result = await session.run(query, properties);
    return result.records[0].get("n").properties;
  } finally {
    await session.close();
  }
}

/**
 * Merge relationship between two nodes
 */
export async function mergeRelationship(
  fromLabel,
  fromProps,
  relType,
  toLabel,
  toProps
) {
  const session = driver.session();

  const fromKeys = Object.keys(fromProps).map(k => `${k}: $from_${k}`).join(", ");
  const toKeys = Object.keys(toProps).map(k => `${k}: $to_${k}`).join(", ");

  const params = {};
  Object.entries(fromProps).forEach(([k, v]) => (params[`from_${k}`] = v));
  Object.entries(toProps).forEach(([k, v]) => (params[`to_${k}`] = v));

  const query = `
    MERGE (a:${fromLabel} { ${fromKeys} })
    MERGE (b:${toLabel} { ${toKeys} })
    MERGE (a)-[r:${relType}]->(b)
    RETURN type(r)
  `;

  try {
    await session.run(query, params);
  } finally {
    await session.close();
  }
}

import { NODE_TYPES } from "../constants/nodeTypes.js";
import { RELATIONSHIP_TYPES } from "../constants/relationshipTypes.js";

export async function mergeDocument({ source, type }) {
  return mergeNode(NODE_TYPES.DOCUMENT, { source, type });
}

export async function mergeChunk(chunkId, text, documentSource) {
  await mergeNode(NODE_TYPES.CHUNK, { chunkId, text });

  await mergeRelationship(
    NODE_TYPES.CHUNK,
    { chunkId },
    RELATIONSHIP_TYPES.BELONGS_TO,
    NODE_TYPES.DOCUMENT,
    { source: documentSource }
  );
}
