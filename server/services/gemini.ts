/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gemini AI service layer.
 * Provides a resilient model-retry wrapper and JSON schema definitions
 * for all structured generation endpoints used by Zonewatch.
 */

import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/** Debug logging gate — set DEBUG=true in .env to enable verbose model logs. */
const DEBUG = process.env.DEBUG === 'true';

/** Structured logger that respects the DEBUG flag. */
const log = {
  debug: (msg: string) => { if (DEBUG) console.log(`[Zonewatch:Gemini] ${msg}`); },
  warn: (msg: string) => console.warn(`[Zonewatch:Gemini] ${msg}`),
  error: (msg: string) => console.error(`[Zonewatch:Gemini] ${msg}`),
};

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' },
  },
});

/**
 * Ordered list of Gemini models to try.
 * gemini-2.0-flash is the primary; others are fallbacks if quota is exhausted.
 */
const MODEL_LIST = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const;

/** Cooldown duration (ms) before re-trying a quota-exhausted model. */
const EXHAUST_COOLDOWN_MS = 3 * 60 * 1000;

/** Tracks the timestamp at which each model was last marked as exhausted. */
const exhaustedAt: Partial<Record<string, number>> = {};

/**
 * Returns the subset of models that are currently eligible to try
 * (i.e. not within their cooldown window). If all are exhausted, resets
 * the tracking and returns the full list so the system can self-recover.
 */
function getEligibleModels(): readonly string[] {
  const now = Date.now();
  const eligible = MODEL_LIST.filter(
    (m) => !exhaustedAt[m] || now - exhaustedAt[m]! >= EXHAUST_COOLDOWN_MS,
  );
  if (eligible.length === 0) {
    // Full reset — let all models be retried rather than permanently blocking.
    for (const m of MODEL_LIST) delete exhaustedAt[m];
    return MODEL_LIST;
  }
  return eligible;
}

/**
 * Attempts to generate structured JSON content using a cascade of Gemini models.
 * Moves to the next model automatically when one is rate-limited or fails.
 *
 * @param prompt - Either a plain string prompt or a multipart content array
 *                 (used for file / image inputs).
 * @param schema - A Gemini response schema object that enforces JSON structure.
 * @param temperature - Sampling temperature (0 = deterministic, 1 = creative).
 * @returns The raw JSON string returned by the first successful model.
 * @throws The last encountered error if all eligible models fail.
 */
export async function runWithModelRetry(
  prompt: string | unknown[],
  schema: Record<string, unknown>,
  temperature: number,
): Promise<string> {
  const models = getEligibleModels();
  let lastError: unknown;

  for (const model of models) {
    try {
      log.debug(`Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature,
        },
      });
      if (response?.text) {
        log.debug(`Success with model: ${model}`);
        return response.text;
      }
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      
      // Short-circuit retry loops on developer/semantic errors (invalid credentials, API schema violations, bad requests)
      const isSemanticError =
        msg.includes('api_key_invalid') ||
        msg.includes('invalid api key') ||
        msg.includes('api key not found') ||
        msg.includes('key is invalid') ||
        msg.includes('api key') && msg.includes('invalid') ||
        msg.includes('schema') ||
        msg.includes('400') ||
        msg.includes('bad request');

      if (isSemanticError) {
        log.error(`Semantic configuration error encountered: ${msg}. Bypassing fallback retries.`);
        throw err;
      }

      const isExhausted =
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('exceeded') ||
        msg.includes('resource_exhausted') ||
        (err as Record<string, unknown>)?.status === 'RESOURCE_EXHAUSTED';
      if (isExhausted) {
        log.warn(`Quota exhausted for ${model}. Cooling down for ${EXHAUST_COOLDOWN_MS / 60000} min.`);
        exhaustedAt[model] = Date.now();
      } else {
        log.warn(`Model ${model} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  throw lastError ?? new Error('All Gemini models failed without a specific error.');
}

// ─── Response Schemas ────────────────────────────────────────────────────────

/** Schema for /api/recommend — gate surge tactical recommendation. */
export const recommendSchema = {
  type: Type.OBJECT,
  properties: {
    whatsHappening: { type: Type.STRING },
    risk: { type: Type.STRING },
    action: { type: Type.STRING },
    scriptEnglish: { type: Type.STRING },
    scriptSpanish: { type: Type.STRING },
    scriptFrench: { type: Type.STRING },
  },
  required: ['whatsHappening', 'risk', 'action', 'scriptEnglish', 'scriptSpanish', 'scriptFrench'],
};

/** Schema for /api/broadcast-script — multilingual megaphone announcement. */
export const broadcastSchema = {
  type: Type.OBJECT,
  properties: {
    scriptEnglish: { type: Type.STRING },
    scriptSpanish: { type: Type.STRING },
    scriptFrench: { type: Type.STRING },
  },
  required: ['scriptEnglish', 'scriptSpanish', 'scriptFrench'],
};

/** Schema for /api/translate — supporter phrase triage and translation. */
export const translateSchema = {
  type: Type.OBJECT,
  properties: {
    originalLanguage: { type: Type.STRING },
    translatedText: { type: Type.STRING },
    urgencyTag: { type: Type.STRING },
    classificationReason: { type: Type.STRING },
    suggestedResponse: { type: Type.STRING },
    suggestedResponseEnglish: { type: Type.STRING },
    detectedTone: { type: Type.STRING },
  },
  required: [
    'originalLanguage',
    'translatedText',
    'urgencyTag',
    'classificationReason',
    'suggestedResponse',
    'suggestedResponseEnglish',
    'detectedTone',
  ],
};

/** Schema for /api/parse-mock-file — CSV/PDF telemetry file parsing. */
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
          history: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        },
        required: ['id', 'name', 'density', 'trend'],
      },
    },
    summaryOfChanges: { type: Type.STRING },
  },
  required: ['success', 'gates'],
};

/** Schema for /api/navigation — GenAI stadium wayfinding assistance. */
export const navigationSchema = {
  type: Type.OBJECT,
  properties: {
    route: { type: Type.STRING },
    landmarks: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedWalkMinutes: { type: Type.NUMBER },
    accessibilityNote: { type: Type.STRING },
    inOriginalLanguage: { type: Type.STRING },
  },
  required: ['route', 'landmarks', 'estimatedWalkMinutes', 'inOriginalLanguage'],
};
