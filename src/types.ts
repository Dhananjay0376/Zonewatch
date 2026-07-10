/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Gate {
  id: string;
  name: string;
  density: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ParsedGate extends Gate {
  history?: number[];
}

export interface Alert {
  id: string;
  gateId: string;
  gateName: string;
  densityAtTrigger: number;
  triggerTime: string;
  whatsHappening: string;
  risk: string;
  action: string;
  resolved: boolean;
  resolvedTime?: string;
  severity: 'warning' | 'critical';
  scriptEnglish?: string;
  scriptSpanish?: string;
  scriptFrench?: string;
  isLocalFallback?: boolean;
}

export interface VoiceToneResult {
  detectedTone: string;
  pitch: string;
  speed: string;
  volume: string;
  confidence: number;
  dbLevel: number;
  hzLevel: number;
  isSimulated?: boolean;
}

export interface TranslationResult {
  originalLanguage: string;
  translatedText: string;
  urgencyTag: 'Casual' | 'Urgent' | 'Medical' | 'Accessibility';
  classificationReason: string;
  suggestedResponse: string;
  suggestedResponseEnglish: string;
  detectedTone: string;
  isLocalFallback?: boolean;
}

export interface ParseMockFileResponse {
  success: boolean;
  gates: ParsedGate[];
  summaryOfChanges?: string;
  usedLocalFallback?: boolean;
  error?: string;
}
