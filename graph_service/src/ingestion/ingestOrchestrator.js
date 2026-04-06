import { ingestJsonDirectory } from "./structured/jsonIngestor.js";
import { ingestExcelDirectory } from "./structured/excelIngestor.js";
import { loadDocuments } from "./unstructured/documentLoader.js";
import { chunkText } from "./unstructured/chunker.js";
import { extractEntities } from "./unstructured/entityExtractor.js";
import {
  mergeDocument,
  mergeChunk,
  mergeRelationship
} from "../graph/writers.js";
import { NODE_TYPES } from "../constants/nodeTypes.js";
import { RELATIONSHIP_TYPES } from "../constants/relationshipTypes.js";

// ✅ STRUCTURED INGESTION
export async function runStructuredIngestion() {
  console.log("📥 Starting structured ingestion...");

  await ingestJsonDirectory("data/structured/json");
  await ingestExcelDirectory("data/structured/excel");

  console.log("✅ Structured ingestion complete");
}

// ✅ UNSTRUCTURED INGESTION
export async function runUnstructuredIngestion() {
  console.log("📄 Starting unstructured ingestion...");

  const baseDirs = [
    "data/unstructured/pdf",
    "data/unstructured/text",
    "data/unstructured/docs"
  ];

  for (const dir of baseDirs) {
    const documents = await loadDocuments(dir);

    for (const doc of documents) {
      await mergeDocument(doc);

      const chunks = chunkText(doc.text);

      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${doc.source}::${i}`;
        const chunkTextContent = chunks[i];

        await mergeChunk(chunkId, chunkTextContent, doc.source);

        const entities = await extractEntities(chunkTextContent);

        for (const entity of entities) {
          await mergeRelationship(
            NODE_TYPES.CHUNK,
            { chunkId },
            RELATIONSHIP_TYPES.MENTIONS,
            entity.type,
            { name: entity.name }
          );
        }
      }
    }
  }

  console.log("✅ Unstructured ingestion complete");
}
