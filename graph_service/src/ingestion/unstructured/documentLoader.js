import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function loadDocuments(dirPath) {
  const files = fs.readdirSync(dirPath);
  const documents = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const ext = path.extname(file).toLowerCase();

    let text = "";

    if (ext === ".pdf") {
      const buffer = fs.readFileSync(fullPath);
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === ".txt" || ext === ".md") {
      text = fs.readFileSync(fullPath, "utf-8");
    } else {
      continue;
    }

    if (text && text.trim().length > 0) {
      documents.push({
        source: file,
        type: ext.replace(".", ""),
        text
      });
    }
  }

  return documents;
}
