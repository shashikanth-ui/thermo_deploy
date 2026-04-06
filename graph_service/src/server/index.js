// Express bootstrap (filled later)
import express from "express";
import cors from "cors";
import routes from "./routes.js";
import { ENV } from "../config/env.js";
import { verifyNeo4jConnection } from "../config/neo4j.js";
import productRoutes from "../routes/product.js";
import productGraphRoutes from "../routes/productGraph.js";


async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", routes);
  app.use("/api/product", productRoutes);
  app.use("/api/product", productGraphRoutes);
  await verifyNeo4jConnection();

  app.listen(ENV.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${ENV.PORT}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server", err);
  process.exit(1);
});
