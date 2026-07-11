/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useAlertExpansion
 * Manages the per-alert UI state for the Copilot Intelligence panel:
 * which alerts are expanded, which language tab is active, which are
 * generating scripts, and clipboard copy feedback.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { Alert } from '../types';

type BroadcastLanguage = 'english' | 'spanish' | 'french';

interface AlertExpansionCallbacks {
  /** Updates the alert list in-place (used to populate generated scripts). */
  setAlerts: (updater: (prev: Alert[]) => Alert[]) => void;
  /** Appends a message to the operational console log. */
  addLog: (msg: string) => void;
}

interface AlertExpansionState {
  expandedAlerts: Record<string, boolean>;
  activeTabLanguage: Record<string, BroadcastLanguage>;
  generatingScripts: Record<string, boolean>;
  copiedTextAlert: Record<string, boolean>;
}

interface AlertExpansionActions {
  handleBroadcastClick: (alert: Alert) => Promise<void>;
  handleCopyAlertScript: (alertId: string, text: string) => void;
  setActiveTabLanguage: React.Dispatch<React.SetStateAction<Record<string, BroadcastLanguage>>>;
}

export type UseAlertExpansionReturn = AlertExpansionState & AlertExpansionActions;

/** Default fallback scripts when Gemini is unavailable. */
const FALLBACK_SCRIPTS = {
  scriptEnglish: `Hi everyone! To help you get inside the stadium faster and avoid congestion, please follow our volunteers towards the adjacent gate. It is fully open and there is no queue! Thank you for your cooperation!`,
  scriptSpanish: `¡Hola a todos! Para ingresar al estadio mucho más rápido y evitar la fila, por favor sigan a nuestros voluntarios hacia la puerta de al lado. ¡Está totalmente libre y sin espera! ¡Muchas gracias por su ayuda!`,
  scriptFrench: `Bonjour à tous ! Afin d'entrer plus rapidement et d'éviter l'attente, veuillez suivre nos bénévoles vers la porte juste à côté. Elle est entièrement fluide et sans attente ! Merci de votre collaboration !`,
  isLocalFallback: true,
};

/** Duration in ms before the clipboard "Copied" indicator resets. */
const COPY_FEEDBACK_MS = 2000;

/**
 * Hook that manages all per-alert expansion, language-tab, script-generation,
 * and clipboard-copy state for the Copilot Intelligence panel.
 */
export function useAlertExpansion({
  setAlerts,
  addLog,
}: AlertExpansionCallbacks): UseAlertExpansionReturn {
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [activeTabLanguage, setActiveTabLanguage] = useState<Record<string, BroadcastLanguage>>({});
  const [generatingScripts, setGeneratingScripts] = useState<Record<string, boolean>>({});
  const [copiedTextAlert, setCopiedTextAlert] = useState<Record<string, boolean>>({});

  /** Refs to track clipboard reset timeouts and prevent memory leaks. */
  const copiedTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleBroadcastClick = useCallback(
    async (alert: Alert) => {
      const isNowExpanded = !expandedAlerts[alert.id];
      setExpandedAlerts((prev) => ({ ...prev, [alert.id]: isNowExpanded }));

      // Initialise language tab if not already set.
      if (!activeTabLanguage[alert.id]) {
        setActiveTabLanguage((prev) => ({ ...prev, [alert.id]: 'english' }));
      }

      // Only fetch scripts if expanding and scripts are not yet available.
      if (!isNowExpanded || (alert.scriptEnglish && alert.scriptSpanish && alert.scriptFrench)) {
        return;
      }

      setGeneratingScripts((prev) => ({ ...prev, [alert.id]: true }));
      addLog(`Calling Gemini to design tourist megaphone scripts for ${alert.gateName}...`);

      try {
        const response = await fetch('/api/broadcast-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            whatsHappening: alert.whatsHappening,
            risk: alert.risk,
            action: alert.action,
            gateName: alert.gateName,
          }),
        });

        if (!response.ok) throw new Error(`Script generation failed with status ${response.status}`);

        const data = (await response.json()) as {
          scriptEnglish: string;
          scriptSpanish: string;
          scriptFrench: string;
          isLocalFallback?: boolean;
        };

        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id
              ? {
                  ...a,
                  scriptEnglish: data.scriptEnglish,
                  scriptSpanish: data.scriptSpanish,
                  scriptFrench: data.scriptFrench,
                  isLocalFallback: a.isLocalFallback || data.isLocalFallback,
                }
              : a,
          ),
        );
        addLog('Gemini built high-clarity spoken megaphone announcements in 3 languages.');
      } catch {
        addLog('Gemini busy/unavailable. Restoring high-quality default spoken scripts.');
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, ...FALLBACK_SCRIPTS } : a)),
        );
      } finally {
        setGeneratingScripts((prev) => ({ ...prev, [alert.id]: false }));
      }
    },
    [expandedAlerts, activeTabLanguage, addLog, setAlerts],
  );

  const handleCopyAlertScript = useCallback((alertId: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write can fail in non-secure contexts — fail silently.
    });
    setCopiedTextAlert((prev) => ({ ...prev, [alertId]: true }));

    if (copiedTimeoutsRef.current[alertId]) {
      clearTimeout(copiedTimeoutsRef.current[alertId]);
    }
    copiedTimeoutsRef.current[alertId] = setTimeout(() => {
      setCopiedTextAlert((prev) => ({ ...prev, [alertId]: false }));
      delete copiedTimeoutsRef.current[alertId];
    }, COPY_FEEDBACK_MS);
  }, []);

  return {
    expandedAlerts,
    activeTabLanguage,
    generatingScripts,
    copiedTextAlert,
    handleBroadcastClick,
    handleCopyAlertScript,
    setActiveTabLanguage,
  };
}
