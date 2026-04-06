import express from "express";
import { parseQuestion } from "../rag/questionParser.js";
import { retrieveSubgraph } from "../rag/subgraphRetriever.js";
import { composeAnswer } from "../rag/answerComposer.js";


const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  const parsed = await parseQuestion(question);
  const graphData = await retrieveSubgraph(parsed, question);
  const answer = await composeAnswer(question, graphData);

  res.json({
    question,
    parsed,
    answer
  });
});

export default router;
