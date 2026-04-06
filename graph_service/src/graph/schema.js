// Graph schema
import { NODE_TYPES } from "../constants/nodeTypes.js";
import { RELATIONSHIP_TYPES } from "../constants/relationshipTypes.js";

export const GRAPH_SCHEMA = {
  nodes: {
    [NODE_TYPES.PRODUCT]: ["name"],
    [NODE_TYPES.COMPETITOR]: ["name"],
    [NODE_TYPES.CUSTOMER]: ["name"],
    [NODE_TYPES.DEAL]: ["name"],
    [NODE_TYPES.WEAKNESS]: ["name"],
    [NODE_TYPES.STRENGTH]: ["name"],
    [NODE_TYPES.DECISION_DRIVER]: ["name"],
    [NODE_TYPES.DOCUMENT]: ["source", "type"],
    [NODE_TYPES.CHUNK]: ["chunkId"]
  },

  relationships: [
    RELATIONSHIP_TYPES.LOSES_TO,
    RELATIONSHIP_TYPES.HAS_WEAKNESS,
    RELATIONSHIP_TYPES.HAS_STRENGTH,
    RELATIONSHIP_TYPES.DECISION_DRIVER,
    RELATIONSHIP_TYPES.BOUGHT,
    RELATIONSHIP_TYPES.INVOLVES,
    RELATIONSHIP_TYPES.MENTIONS,
    RELATIONSHIP_TYPES.BELONGS_TO
  ]
};
