/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useTelemetryUpload
 * Manages the full lifecycle of mock telemetry file uploads:
 * drag-and-drop state, FileReader invocation, API call to
 * /api/parse-mock-file, and success/error message display.
 */

import { useState, useCallback } from 'react';
import type { ParsedGate, ParseMockFileResponse } from '../types';

interface TelemetryUploadCallbacks {
  /** Replaces the live gate list with newly parsed gates. */
  setGates: (gates: ParsedGate[]) => void;
  /** Merges new gate history windows into the existing history map. */
  setGateHistory: (updater: (prev: Record<string, number[]>) => Record<string, number[]>) => void;
  /** Clears all active alerts so the copilot re-analyses new densities. */
  clearAlerts: () => void;
  /** Appends a message to the operational console log. */
  addLog: (msg: string) => void;
}

interface TelemetryUploadState {
  isUploadingFile: boolean;
  isUsingCustomData: boolean;
  uploadSuccessMessage: string | null;
  uploadErrorMessage: string | null;
  dragOver: boolean;
}

interface TelemetryUploadActions {
  handleFileUpload: (file: File) => void;
  handleResetTelemetry: (resetGates: () => void) => void;
  setDragOver: (val: boolean) => void;
}

export type UseTelemetryUploadReturn = TelemetryUploadState & TelemetryUploadActions;

/**
 * Hook that encapsulates all telemetry file upload logic.
 * Supports CSV and PDF formats. CSV files are parsed server-side via
 * the Gemini-backed /api/parse-mock-file endpoint.
 */
export function useTelemetryUpload({
  setGates,
  setGateHistory,
  clearAlerts,
  addLog,
}: TelemetryUploadCallbacks): UseTelemetryUploadReturn {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUsingCustomData, setIsUsingCustomData] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file) return;

      const isCsv = file.name.endsWith('.csv');
      const isPdf = file.name.endsWith('.pdf');

      if (!isCsv && !isPdf) {
        setUploadErrorMessage('Invalid file type. Please upload a .csv or .pdf file.');
        setUploadSuccessMessage(null);
        addLog(`File upload failed: ${file.name} is not a CSV or PDF.`);
        return;
      }

      setIsUploadingFile(true);
      setUploadErrorMessage(null);
      setUploadSuccessMessage(null);
      addLog(`Uploading telemetry file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string | null;
          if (!result) throw new Error('Could not read file content.');

          const base64Data = result.split(',')[1];
          const fileType = isPdf ? 'pdf' : 'csv';

          const response = await fetch('/api/parse-mock-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, fileType, fileName: file.name }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Server returned status ${response.status}`);
          }

          const data = (await response.json()) as ParseMockFileResponse;

          if (data.success && data.gates) {
            setGates(data.gates as ParsedGate[]);
            setGateHistory((prev) => {
              const updated = { ...prev };
              for (const g of data.gates!) {
                updated[g.id] = g.history ?? [g.density, g.density, g.density, g.density, g.density];
              }
              return updated;
            });
            clearAlerts();
            setIsUsingCustomData(true);
            const msg = data.summaryOfChanges ?? `Loaded ${data.gates.length} custom gates from ${file.name}.`;
            setUploadSuccessMessage(msg);
            addLog(`Telemetry updated: ${msg}`);
          } else {
            throw new Error(data.error ?? 'Failed to extract valid stadium gates.');
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'An error occurred while uploading and parsing your file.';
          setUploadErrorMessage(message);
          addLog(`CRITICAL: File parser error: ${message}`);
        } finally {
          setIsUploadingFile(false);
        }
      };

      reader.onerror = () => {
        setUploadErrorMessage('Failed to read the file from your local disk.');
        setIsUploadingFile(false);
      };

      reader.readAsDataURL(file);
    },
    [setGates, setGateHistory, clearAlerts, addLog],
  );

  const handleResetTelemetry = useCallback(
    (resetGates: () => void) => {
      resetGates();
      setIsUsingCustomData(false);
      setUploadSuccessMessage(null);
      setUploadErrorMessage(null);
    },
    [],
  );

  return {
    isUploadingFile,
    isUsingCustomData,
    uploadSuccessMessage,
    uploadErrorMessage,
    dragOver,
    handleFileUpload,
    handleResetTelemetry,
    setDragOver,
  };
}
