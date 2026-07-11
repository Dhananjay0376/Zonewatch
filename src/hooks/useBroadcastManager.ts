/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useBroadcastManager
 * Manages the megaphone broadcast modal state:
 * the active alert being broadcast, the selected language,
 * and the simulated audio transmission lifecycle.
 */

import { useState, useCallback } from 'react';
import type { Alert } from '../types';

type BroadcastLanguage = 'english' | 'spanish' | 'french';

interface BroadcastManagerCallbacks {
  /** Plays a TTS announcement through the speech synthesis hook. */
  playAnnouncement: (text: string, lang?: string) => void;
  /** Appends a message to the operational console log. */
  addLog: (msg: string) => void;
}

interface BroadcastManagerState {
  activeBroadcastAlert: Alert | null;
  activeBroadcastLanguage: BroadcastLanguage;
  isBroadcasting: boolean;
}

interface BroadcastManagerActions {
  setActiveBroadcastAlert: (alert: Alert | null) => void;
  setActiveBroadcastLanguage: (lang: BroadcastLanguage) => void;
  triggerSimulatedBroadcast: () => void;
}

export type UseBroadcastManagerReturn = BroadcastManagerState & BroadcastManagerActions;

/** Duration in ms that a simulated broadcast transmission plays. */
const BROADCAST_DURATION_MS = 4500;

/**
 * Hook that encapsulates all megaphone broadcast panel state and logic.
 */
export function useBroadcastManager({
  playAnnouncement,
  addLog,
}: BroadcastManagerCallbacks): UseBroadcastManagerReturn {
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState<Alert | null>(null);
  const [activeBroadcastLanguage, setActiveBroadcastLanguage] = useState<BroadcastLanguage>('english');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  /** Selects the correct script text based on the active language. */
  const getActiveScript = useCallback(
    (alert: Alert, language: BroadcastLanguage): string | undefined => {
      const scriptMap: Record<BroadcastLanguage, string | undefined> = {
        english: alert.scriptEnglish,
        spanish: alert.scriptSpanish,
        french:  alert.scriptFrench,
      };
      return scriptMap[language];
    },
    [],
  );

  const triggerSimulatedBroadcast = useCallback(() => {
    if (!activeBroadcastAlert) return;
    const script = getActiveScript(activeBroadcastAlert, activeBroadcastLanguage);
    if (!script) return;

    setIsBroadcasting(true);
    addLog(`Simulated Broadcast triggered in ${activeBroadcastLanguage.toUpperCase()}.`);
    playAnnouncement(script, activeBroadcastLanguage);

    const timer = setTimeout(() => {
      setIsBroadcasting(false);
      addLog('Completed megaphone audio loop play.');
    }, BROADCAST_DURATION_MS);

    // Note: this timeout is fire-and-forget; cleanup is handled via component unmount
    return () => clearTimeout(timer);
  }, [activeBroadcastAlert, activeBroadcastLanguage, getActiveScript, playAnnouncement, addLog]);

  return {
    activeBroadcastAlert,
    activeBroadcastLanguage,
    isBroadcasting,
    setActiveBroadcastAlert,
    setActiveBroadcastLanguage,
    triggerSimulatedBroadcast,
  };
}
