/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared type definitions for Zonewatch server-side API routes.
 * These mirror the client-side types in src/types.ts but are
 * defined independently to keep the server self-contained.
 */

/** Crowd density trend direction at a stadium gate. */
export type GateTrend = 'up' | 'down' | 'stable';

/** A single stadium gate with live density telemetry. */
export interface Gate {
  id: string;
  name: string;
  density: number;
  trend: GateTrend;
}

/** A gate with optional historical density window for trend analysis. */
export interface ParsedGate extends Gate {
  /** Last 5 density readings, oldest first, newest last. */
  history?: number[];
}

/** Sanitised vocal tone context forwarded from the acoustic sensor hook. */
export interface VocalTone {
  detectedTone: string;
  pitch: string;
  speed: string;
  volume: string;
}

/** Request body for POST /api/recommend */
export interface RecommendRequestBody {
  gate: Gate;
  gates: Gate[];
  history: number[];
}

/** Request body for POST /api/broadcast-script */
export interface BroadcastScriptRequestBody {
  whatsHappening: string;
  risk: string;
  action: string;
  gateName: string;
}

/** Request body for POST /api/translate */
export interface TranslateRequestBody {
  phrase: string;
  vocalTone?: VocalTone;
}

/** Request body for POST /api/parse-mock-file */
export interface ParseMockFileRequestBody {
  base64Data: string;
  fileType: 'csv' | 'pdf';
  fileName: string;
}

/** Request body for POST /api/navigation */
export interface NavigationRequestBody {
  query: string;
  assignedGate: string;
  language?: string;
}

/**
 * Strips HTML tags and truncates a string to a maximum byte length.
 * Used for server-side input sanitisation on all API endpoints.
 */
export function sanitise(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '').substring(0, maxLength);
}
