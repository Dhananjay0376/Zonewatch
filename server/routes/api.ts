/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { runWithModelRetry, recommendSchema, broadcastSchema, translateSchema, parseFileSchema } from "../services/gemini";
import {
  getRecommendFallback,
  getRecommendUltimateFallback,
  getBroadcastScriptFallback,
  getTranslateFallback,
  getParseFileFallback
} from "../services/fallbacks";
import { ai } from "../services/gemini";

const router = Router();

// 1. API Route for operational gate reasoning and recommendations
router.post("/recommend", async (req, res) => {
  const { gate, gates, history } = req.body;
  try {
    if (!gate || !gates) {
      return res.status(400).json({ error: "Missing required gate context parameters" });
    }

    const otherGatesInfo = gates
      .filter((g: any) => g.id !== gate.id)
      .map((g: any) => `${g.name}: ${g.density}%`)
      .join(", ");

    const historyText = history && history.length > 1
      ? `Density history over the last few tracking intervals: ${history.join("%, ")}%`
      : `Current trend: ${gate.trend}`;

    const prompt = `You are Zonewatch AI Copilot, a specialist real-time reasoning agent for stadium operations volunteers at the FIFA World Cup 2026.
Your role is to analyze a localized gate crowd surge and return a logical, tactical, easy-to-read recommendation.

CONGESTION ALERT METRICS:
- Target Gate: ${gate.name}
- Current Density: ${gate.density}% (Note: anything above 80% is critical)
- Historical Trend: ${historyText}
- Alternative Sector Gates: ${otherGatesInfo}

TASK:
Produce a tactical alert intervention plan in strict JSON. Keep sentences direct, plain, spoken-style, and impactful.
1. "whatsHappening": A 1-sentence description of the exact situation at the gate (e.g., Gate C is under heavy load at ${gate.density}% capacity with incoming supporters arriving steadily).
2. "risk": A 1-sentence risk projection stating what happens if nothing is done, with a rough time estimate (e.g., If unaddressed, crowd pressure may create dangerous crushing risks or turnstile lockups within ~6 minutes).
3. "action": A direct, actionable crowd control action, specifying clear gates for redirection (e.g., Guide arriving crowds via megaphones toward Gate E, which is currently clear).
4. "scriptEnglish": A short, friendly, spoken-style megaphone announcement in English, worded for stressed tourists rather than formal staff (e.g., "Hi folks, to get you in quicker, we are routing everyone to Gate E right now. It's totally clear, just a short walk around the corner. Thank you for your help!").
5. "scriptSpanish": The same spoken-style megaphone announcement translated naturally and warmly into Spanish.
6. "scriptFrench": The same spoken-style megaphone announcement translated naturally and warmly into French.

Respond ONLY with a JSON object containing these exact 6 fields.`;

    let responseText = "";
    try {
      responseText = await runWithModelRetry(prompt, recommendSchema, 0.2);
    } catch (err: any) {
      console.error("All models failed in recommend. Invoking local rule-based heuristic reasoning engine.");
      const fallback = getRecommendFallback(gate, gates);
      return res.json(fallback);
    }

    const parsedRecommendation = JSON.parse(responseText);
    return res.json(parsedRecommendation);
  } catch (error: any) {
    console.error("Gemini API Error (Recommendation Outer Catch):", error);
    const ultimateFallback = getRecommendUltimateFallback(gate, gates);
    return res.json(ultimateFallback);
  }
});

// 2. API Route to specifically generate a volunteer megaphone broadcast announcement script
router.post("/broadcast-script", async (req, res) => {
  let { whatsHappening, risk, action, gateName } = req.body;
  try {
    if (!whatsHappening || !action) {
      return res.status(400).json({ error: "Missing required recommendation parameters" });
    }

    // Input validation and sanitization
    whatsHappening = typeof whatsHappening === 'string' ? whatsHappening.trim().replace(/<[^>]*>/g, "").substring(0, 500) : "";
    risk = typeof risk === 'string' ? risk.trim().replace(/<[^>]*>/g, "").substring(0, 500) : "";
    action = typeof action === 'string' ? action.trim().replace(/<[^>]*>/g, "").substring(0, 500) : "";
    gateName = typeof gateName === 'string' ? gateName.trim().replace(/<[^>]*>/g, "").substring(0, 100) : "";

    if (!whatsHappening || !action) {
      return res.status(400).json({ error: "Invalid or empty parameters after sanitization" });
    }

    const prompt = `You are Zonewatch AI Copilot, a specialist stadium operations reasoning agent for the FIFA World Cup 2026.
Your task is to convert a high-stress operational crowd control recommendation into an empathetic, ultra-clear, spoken megaphone announcement script.
 
OPERATIONAL BACKGROUND:
- Target Gate: ${gateName || "the congested gate"}
- Recommendation What's Happening: ${whatsHappening}
- Proposed Action Plan: ${action}

SCRIPT AUDIENCE AND WRITING REQUIREMENTS:
- The listeners are tourists and fans who are highly stressed, fatigued, may not speak English well, and are waiting in congested crowd lines.
- Write in a warm, calm, spoken, and friendly tone (NOT a formal PA-system announcement, NOT corporate or bureaucratic).
- Keep instructions incredibly direct, simple, and action-oriented. Specify clear directions so that they know exactly what to do.
- Write this in three languages:
  1. English
  2. Spanish (warm Mexican Spanish suitable for stadium visitors)
  3. French (warm Canadian / Parisian French suitable for stadium visitors)

Respond ONLY with a JSON object containing these exact 3 fields:
- "scriptEnglish": A short, supportive, easy-to-understand spoken announcement.
- "scriptSpanish": The Spanish translation, matching the exact same warm, supportive, spoken feel.
- "scriptFrench": The French translation, matching the exact same warm, supportive, spoken feel.`;

    let responseText = "";
    try {
      responseText = await runWithModelRetry(prompt, broadcastSchema, 0.3);
    } catch (err: any) {
      console.error("All models failed in broadcast-script. Returning beautiful local custom spoken announcements.");
      const fallback = getBroadcastScriptFallback(gateName);
      return res.json(fallback);
    }

    const parsedScripts = JSON.parse(responseText);
    return res.json(parsedScripts);
  } catch (error: any) {
    console.error("Gemini API Error (Scripts Outer Catch):", error);
    const fallback = getBroadcastScriptFallback(gateName);
    return res.json(fallback);
  }
});

// 3. API Route for real-time supporter translation, triage classification, and local response generation
router.post("/translate", async (req, res) => {
  let { phrase, vocalTone } = req.body;
  try {
    if (!phrase || typeof phrase !== "string") {
      return res.status(400).json({ error: "Missing required supporter voice phrase" });
    }

    // Server-side input validation & sanitization
    phrase = phrase.trim().replace(/<[^>]*>/g, "");
    if (phrase.length > 500) {
      phrase = phrase.substring(0, 500);
    }

    if (!phrase) {
      return res.status(400).json({ error: "Supporter phrase cannot be empty or contain only unsafe characters" });
    }

    let toneContext = "";
    if (vocalTone) {
      const cleanTone = typeof vocalTone.detectedTone === 'string' ? vocalTone.detectedTone.replace(/<[^>]*>/g, "").substring(0, 100) : "N/A";
      const cleanPitch = typeof vocalTone.pitch === 'string' ? vocalTone.pitch.replace(/<[^>]*>/g, "").substring(0, 100) : "Normal";
      const cleanSpeed = typeof vocalTone.speed === 'string' ? vocalTone.speed.replace(/<[^>]*>/g, "").substring(0, 100) : "Normal";
      const cleanVolume = typeof vocalTone.volume === 'string' ? vocalTone.volume.replace(/<[^>]*>/g, "").substring(0, 100) : "Normal";

      toneContext = `
Additionally, a real-time vocal acoustic detector analyzed the supporter's audio and found:
- Detected Vocal Tone: ${cleanTone} (e.g. Panic, Excited, Agitated, Faint/Fatigued, Polite/Calm)
- Estimated Pitch Level: ${cleanPitch}
- Speech Speed: ${cleanSpeed}
- Average Loudness: ${cleanVolume}

Please factor this acoustic tone and emotional profile into your Triage Assessment reasoning. Adapt your suggested spoken reply to be extremely comforting, reassuring, and responsive to this specific emotional state (e.g. if the supporter is in panic or highly agitated, speak with maximum reassurance and urgency).`;
    }

    const prompt = `You are Zonewatch AI Translation Copilot, a real-time language translation and emergency triage agent for stadium volunteers at the FIFA World Cup 2026.
You are given a phrase spoken by a supporter: "${phrase}"${toneContext}

Your task is to:
1. Identify the original language of the phrase.
2. Translate the phrase accurately and concisely into English.
3. Classify the request's tone/urgency into exactly one of these four categories: "Casual", "Urgent", "Medical", or "Accessibility".
4. Provide a 1-sentence logical, operational reasoning for this classification (factor in their acoustic vocal tone if provided).
5. Generate a short, compassionate, and helpful response spoken directly to the supporter in their ORIGINAL language. Match the tone of the response to the urgency category and their vocal emotion:
   - For Casual: calm, friendly, and efficient.
   - For Urgent/Medical: warm, immediate, reassuring, and directing them to help.
   - For Accessibility: clear, supportive, and accommodating.
6. Provide an English translation of the generated response so the volunteer knows what they are saying back.
7. Classify the supporter's emotional vocal tone based on semantic cues and context. Choose or generate a precise emotional label (e.g., "Panic-stricken & Distressed" for medical/emergency requests, "Concerned & Seeking Assistance" for accessibility or navigation requests, "Calm & Conversational" for standard facilities requests, or other descriptive emotional descriptors).

Respond ONLY with a JSON object containing these exact fields:
- "originalLanguage": The language name identified (e.g., "Spanish", "French", "Japanese", etc.)
- "translatedText": The English translation of what they said.
- "urgencyTag": Exactly one of "Casual" | "Urgent" | "Medical" | "Accessibility"
- "classificationReason": A 1-sentence reason for this classification.
- "suggestedResponse": The spoken suggested response in their original language.
- "suggestedResponseEnglish": The English translation of your suggested response.
- "detectedTone": A descriptive emotional tone matching the supporter's state.`;

    let responseText = "";
    try {
      responseText = await runWithModelRetry(prompt, translateSchema, 0.3);
    } catch (err: any) {
      console.error("All models failed in translate. Invoking custom rule-based translation heuristic engine.");
      const fallback = getTranslateFallback(phrase);
      return res.json({
        ...fallback,
        isLocalFallback: true
      });
    }

    if (!responseText) {
      throw new Error("Empty response received from Gemini for supporter translation service");
    }

    const parsedTranslation = JSON.parse(responseText);
    return res.json(parsedTranslation);
  } catch (error: any) {
    console.error("Gemini API Error (Translate Outer Catch):", error);
    const fallback = getTranslateFallback(phrase);
    return res.json({
      ...fallback,
      isLocalFallback: true
    });
  }
});

// 4. API Route to parse uploaded mock CSV or PDF file via Gemini or local fallback engine
router.post("/parse-mock-file", async (req, res) => {
  const { base64Data, fileType, fileName } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: "No file content provided" });
  }

  try {
    console.log(`Received mock file upload: ${fileName || "unnamed"} (Type: ${fileType})`);
    let parsedGates: any[] = [];
    let summaryOfChanges = "";
    let usedLocalFallback = false;

    const parseCsvLocally = (csvText: string) => {
      const lines = csvText.split(/\r?\n/);
      const gatesList: any[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/[,\t;]/).map(p => p.trim());
        if (parts.length < 2) continue;
        
        const rawName = parts[0];
        if (["gate", "name", "gate name", "gatename", "gate_name"].includes(rawName.toLowerCase())) {
          continue; // Header row
        }

        let density = 50;
        let foundNumber = false;
        for (let i = 1; i < parts.length; i++) {
          const num = parseInt(parts[i].replace(/%/g, ''), 10);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            density = num;
            foundNumber = true;
            break;
          }
        }

        if (foundNumber || rawName.toLowerCase().startsWith('gate')) {
          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          
          let trend: 'up' | 'down' | 'stable' = 'stable';
          for (const part of parts) {
            const lp = part.toLowerCase();
            if (lp === 'up' || lp === 'rising' || lp === 'increase' || lp === 'upward') trend = 'up';
            else if (lp === 'down' || lp === 'falling' || lp === 'decrease' || lp === 'downward') trend = 'down';
            else if (lp === 'stable' || lp === 'constant' || lp === 'flat') trend = 'stable';
          }

          const history: number[] = [];
          let current = density;
          for (let step = 0; step < 5; step++) {
            history.unshift(Math.max(5, Math.min(100, current)));
            if (trend === 'up') {
              current -= Math.floor(Math.random() * 4) + 2;
            } else if (trend === 'down') {
              current += Math.floor(Math.random() * 4) + 2;
            } else {
              current += Math.floor(Math.random() * 3) - 1;
            }
          }

          gatesList.push({ id, name, density, trend, history });
        }
      }
      return gatesList;
    };

    if (fileType === "csv") {
      try {
        const rawText = Buffer.from(base64Data, "base64").toString("utf-8");
        parsedGates = parseCsvLocally(rawText);
        if (parsedGates.length > 0) {
          summaryOfChanges = `Successfully parsed ${parsedGates.length} gates locally from uploaded CSV file.`;
          console.log("Local CSV parser successfully processed the file.");
        }
      } catch (localErr) {
        console.warn("Local CSV parser failed, proceeding to Gemini:", localErr);
      }
    }

    if (parsedGates.length === 0) {
      const mimeType = fileType === "pdf" ? "application/pdf" : "text/csv";
      const prompt = `You are a specialized telemetry data parser for stadium gate spectator counts.
Analyze the attached file content representing gate status/density values.
Please extract:
1. Every gate's name (e.g., Gate B, Gate C, Gate D, Gate E, or any custom gate).
2. Its current density percentage (between 0 and 100).
3. Its trend (must be one of: 'up', 'down', 'stable').
4. A sliding history array of 5 recent density percentages leading up to the current density, ending with the current density (e.g. if current is 84 and trend is up, the history can be [65, 70, 75, 80, 84]). Generate realistic histories matching the trend if not explicitly in the file.

Generate a unique alphanumeric id for each gate (e.g., 'gate-b', 'gate-custom').
Provide a 1-sentence 'summaryOfChanges' describing the gate statuses you extracted.
Return the output in strict compliance with the requested JSON schema.`;

      try {
        const promptContents = [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ];

        const responseText = await runWithModelRetry(promptContents, parseFileSchema, 0.1);

        if (responseText) {
          const data = JSON.parse(responseText);
          if (data.gates && data.gates.length > 0) {
            parsedGates = data.gates;
            summaryOfChanges = data.summaryOfChanges || `Gemini successfully parsed ${data.gates.length} gates from your uploaded ${fileType.toUpperCase()} file.`;
          }
        }
      } catch (geminiErr: any) {
        console.error("Gemini file parser failed:", geminiErr.message || geminiErr);
        usedLocalFallback = true;
        parsedGates = getParseFileFallback();
        summaryOfChanges = "Using local backup telemetry engine to simulate a localized crowd surge scenario because Gemini API limits are currently reached.";
      }
    }

    const finalizedGates = parsedGates.map((gate: any) => {
      const density = Math.max(0, Math.min(100, typeof gate.density === 'number' ? gate.density : parseInt(gate.density) || 50));
      let trend = (gate.trend || "stable").toLowerCase();
      if (!["up", "down", "stable"].includes(trend)) trend = "stable";
      
      let history = Array.isArray(gate.history) ? gate.history : [];
      if (history.length !== 5) {
        history = [density, density, density, density, density];
      }

      return {
        id: gate.id || `gate-${Math.random().toString(36).substring(2, 7)}`,
        name: gate.name || `Gate ${gate.id ? gate.id.toUpperCase() : 'Custom'}`,
        density: density,
        trend: trend as 'up' | 'down' | 'stable',
        history: history
      };
    });

    return res.json({
      success: finalizedGates.length > 0,
      gates: finalizedGates,
      summaryOfChanges: summaryOfChanges || `Parsed ${finalizedGates.length} gates.`,
      usedLocalFallback
    });

  } catch (err: any) {
    console.error("Parse Mock File Error:", err);
    return res.status(500).json({ error: err.message || "An error occurred while parsing mock data file" });
  }
});

export default router;
