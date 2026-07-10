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

