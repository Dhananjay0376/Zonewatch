/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const exhaustedModels: Record<string, number> = {};
const EXHAUST_COOLDOWN = 3 * 60 * 1000; // 3 minutes cooldown

/**
 * Runs content generation with model retry list for maximum stability
 */
export async function runWithModelRetry(prompt: string | any[], schema: any, temperature: number): Promise<string> {
  const allModels = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  const now = Date.now();
  let modelsToTry = allModels.filter(m => {
    const lastExhausted = exhaustedModels[m] || 0;
    return now - lastExhausted >= EXHAUST_COOLDOWN;
  });

  // If all models are marked as exhausted, reset and retry all of them
  if (modelsToTry.length === 0) {
    modelsToTry = allModels;
  }

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`Attempting content generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: temperature,
        }
      });
      if (response && response.text) {
        console.log(`Successfully generated content using model: ${model}`);
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err.message || err);
      lastError = err;

      // Check for rate limits or quota exhaustion errors
      const errMsg = (err.message || "").toLowerCase();
      const status = err.status || "";
      const errCode = err.code || (err.error && err.error.code);
      
      if (
        status === "RESOURCE_EXHAUSTED" ||
        errCode === 429 ||
        errMsg.includes("quota") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("exceeded")
      ) {
        console.warn(`Quota exceeded for ${model}. Marking as exhausted for cooldown.`);
        exhaustedModels[model] = Date.now();
      }
    }
  }
  throw lastError || new Error("All Gemini models failed");
}

// Schemas
export const recommendSchema = {
  type: Type.OBJECT,
  properties: {
    whatsHappening: { type: Type.STRING },
    risk: { type: Type.STRING },
    action: { type: Type.STRING },
    scriptEnglish: { type: Type.STRING },
    scriptSpanish: { type: Type.STRING },
    scriptFrench: { type: Type.STRING }
  },
  required: ["whatsHappening", "risk", "action", "scriptEnglish", "scriptSpanish", "scriptFrench"]
};

export const broadcastSchema = {
  type: Type.OBJECT,
  properties: {
    scriptEnglish: { type: Type.STRING },
    scriptSpanish: { type: Type.STRING },
    scriptFrench: { type: Type.STRING }
  },
  required: ["scriptEnglish", "scriptSpanish", "scriptFrench"]
};

export const translateSchema = {
  type: Type.OBJECT,
  properties: {
    originalLanguage: { type: Type.STRING },
    translatedText: { type: Type.STRING },
    urgencyTag: { type: Type.STRING },
    classificationReason: { type: Type.STRING },
    suggestedResponse: { type: Type.STRING },
    suggestedResponseEnglish: { type: Type.STRING },
    detectedTone: { type: Type.STRING }
  },
  required: [
    "originalLanguage",
    "translatedText",
    "urgencyTag",
    "classificationReason",
    "suggestedResponse",
    "suggestedResponseEnglish",
    "detectedTone"
  ]
};

export const parseFileSchema = {
  type: Type.OBJECT,
  properties: {
    success: { type: Type.BOOLEAN },
    gates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          density: { type: Type.NUMBER },
          trend: { type: Type.STRING },
          history: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER }
          }
        },
        required: ["id", "name", "density", "trend"]
      }
    },
    summaryOfChanges: { type: Type.STRING }
  },
  required: ["success", "gates"]
};
