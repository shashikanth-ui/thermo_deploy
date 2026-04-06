import { ENV } from "./env.js";

export const GEMINI_CONFIG = {
  endpoint:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  apiKey: ENV.GEMINI_API_KEY,
  headers: {
    "Content-Type": "application/json"
  }
};
