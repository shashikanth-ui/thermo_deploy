// Neo4j config
import neo4j from "neo4j-driver";
import { ENV } from "./env.js";

if (!ENV.NEO4J_URI || !ENV.NEO4J_USER || !ENV.NEO4J_PASSWORD) {
  throw new Error("Neo4j environment variables are missing");
}

export const driver = neo4j.driver(
  ENV.NEO4J_URI,
  neo4j.auth.basic(ENV.NEO4J_USER, ENV.NEO4J_PASSWORD),
  {
    disableLosslessIntegers: true
  }
);

export async function verifyNeo4jConnection() {
  const session = driver.session();
  try {
    await session.run("RETURN 1");
    console.log("✅ Neo4j connection verified");
  } finally {
    await session.close();
  }
}
