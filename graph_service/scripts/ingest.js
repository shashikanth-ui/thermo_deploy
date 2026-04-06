import {
  runStructuredIngestion,
  runUnstructuredIngestion
} from "../src/ingestion/ingestOrchestrator.js";

async function runAll() {
  await runStructuredIngestion();
  await runUnstructuredIngestion();
}

runAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Ingestion failed", err);
    process.exit(1);
  });
