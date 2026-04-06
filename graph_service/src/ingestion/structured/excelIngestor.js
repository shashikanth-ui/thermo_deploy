import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { mergeNode, mergeRelationship } from "../../graph/writers.js";
import { NODE_TYPES } from "../../constants/nodeTypes.js";
import { RELATIONSHIP_TYPES } from "../../constants/relationshipTypes.js";

export async function ingestExcelDirectory(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f =>
    f.endsWith(".xlsx") || f.endsWith(".xls")
  );

  for (const file of files) {
    await ingestExcelFile(path.join(dirPath, file));
  }
}

async function ingestExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {
    await ingestRow(row);
  }
}

async function ingestRow(row) {
  const customerName = row.company_name?.toString().trim();
  const dealId = row.deal_id?.toString().trim();
  const products = row.product_names_purchased
    ? row.product_names_purchased.split(",").map(p => p.trim())
    : [];

  if (customerName) {
    await mergeNode(NODE_TYPES.CUSTOMER, { name: customerName });
  }

  if (dealId) {
    await mergeNode(NODE_TYPES.DEAL, { name: dealId });
  }

  for (const product of products) {
    await mergeNode(NODE_TYPES.PRODUCT, { name: product });

    if (customerName) {
      await mergeRelationship(
        NODE_TYPES.CUSTOMER,
        { name: customerName },
        RELATIONSHIP_TYPES.BOUGHT,
        NODE_TYPES.PRODUCT,
        { name: product }
      );
    }

    if (dealId) {
      await mergeRelationship(
        NODE_TYPES.DEAL,
        { name: dealId },
        RELATIONSHIP_TYPES.INVOLVES,
        NODE_TYPES.PRODUCT,
        { name: product }
      );
    }
  }
}
