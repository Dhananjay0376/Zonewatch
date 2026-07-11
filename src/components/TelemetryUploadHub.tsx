/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, RefreshCw } from 'lucide-react';
import type { ParseMockFileResponse, ParsedGate } from '../types';

interface TelemetryUploadHubProps {
  onUploadSuccess: (gates: ParsedGate[], summary: string) => void;
  onReset: () => void;
  isUsingCustomData: boolean;
  addLog: (msg: string) => void;
}

export default function TelemetryUploadHub({
  onUploadSuccess,
  onReset,
  isUsingCustomData,
  addLog
}: TelemetryUploadHubProps) {
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    const isCsv = file.name.endsWith('.csv');
    const isPdf = file.name.endsWith('.pdf');
    
    if (!isCsv && !isPdf) {
      setUploadErrorMessage("Invalid file type. Please upload a .csv or .pdf file.");
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
        const result = e.target?.result as string;
        if (!result) {
          throw new Error("Could not read file content.");
        }

        const base64Data = result.split(',')[1];
        const fileType = isPdf ? 'pdf' : 'csv';

        const response = await fetch('/api/parse-mock-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileType,
            fileName: file.name
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Server returned status code ${response.status}`);
        }

        const data = await response.json() as ParseMockFileResponse;
        
        if (data.success && data.gates) {
          onUploadSuccess(data.gates, data.summaryOfChanges || `Successfully loaded custom gates.`);
          setUploadSuccessMessage(data.summaryOfChanges || `Successfully loaded ${data.gates.length} custom gates from ${file.name}.`);
        } else {
          throw new Error(data.error || "Failed to extract valid stadium gates.");
        }
      } catch (err: unknown) {
        console.error("Upload error:", err);
        const errorMessage = err instanceof Error ? err.message : "An error occurred while uploading and parsing your file.";
        setUploadErrorMessage(errorMessage);
        addLog(`CRITICAL: File parser error: ${errorMessage}`);
      } finally {
        setIsUploadingFile(false);
      }
    };

    reader.onerror = () => {
      setUploadErrorMessage("Failed to read the file from your local disk.");
      setIsUploadingFile(false);
    };

    reader.readAsDataURL(file);
  };

  const handleResetTelemetry = () => {
    onReset();
    setUploadSuccessMessage(null);
    setUploadErrorMessage(null);
  };

  return (
    <div id="telemetry-upload-hub" className="bg-pitch-dark/80 border border-moss-dark/60 p-5 rounded-lg mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-moss-dark/40 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-pale-mint" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-pale-mint font-display">Judge Mock Telemetry Upload</h3>
          </div>
          <p className="text-[11px] text-sage-soft/80 mt-1 leading-relaxed">
            Upload custom mock stadium crowd counts to trigger live redirection scenarios and Copilot scripts.
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent("Gate Name,Density,Trend\nGate B,88,up\nGate C,52,down\nGate D,94,up\nGate E,15,stable")}`}
            download="stadium_mock_telemetry.csv"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pitch-black border border-moss-dark text-sage-soft hover:text-pale-mint text-[10px] font-mono transition-all"
          >
            <span className="underline">Download Sample CSV</span>
          </a>

          {isUsingCustomData && (
            <button
              onClick={handleResetTelemetry}
              className="px-2.5 py-1 rounded bg-rose-950/30 border border-rose-900 hover:bg-rose-950/60 hover:border-rose-700 text-rose-300 text-[10px] font-mono transition-all cursor-pointer"
            >
              Clear & Reset
            </button>
          )}
        </div>
      </div>

      {/* Drag and Drop Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = e.dataTransfer.files;
          if (files && files.length > 0) {
            handleFileUpload(files[0]);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload custom mock telemetry file (CSV or PDF)"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            const input = document.getElementById("mock-file-input");
            if (input) input.click();
          }
        }}
        className={`border border-dashed p-6 rounded-lg transition-all text-center flex flex-col items-center justify-center cursor-pointer focus:ring-2 focus:ring-pale-mint focus:outline-none ${
          dragOver
            ? "border-pale-mint bg-moss-deep/30 shadow-[0_0_15px_rgba(227,238,212,0.1)]"
            : "border-moss-dark bg-moss-deep/20 hover:border-sage-green hover:bg-moss-deep/40"
        }`}
        onClick={() => {
          const input = document.getElementById("mock-file-input");
          if (input) input.click();
        }}
      >
        <input
          id="mock-file-input"
          type="file"
          accept=".csv,.pdf"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              handleFileUpload(files[0]);
            }
          }}
        />
        
        {isUploadingFile ? (
          <div className="flex flex-col items-center space-y-2">
            <RefreshCw className="w-8 h-8 text-pale-mint animate-spin" />
            <p className="text-xs font-mono text-pale-mint animate-pulse">Processing file via Gemini Intelligence...</p>
            <p className="text-[10px] text-sage-soft/75 font-mono">Parsing documents & building crowd velocity graphs...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative w-16 h-16 flex items-center justify-center mb-1">
              <svg viewBox="0 0 80 80" className="w-full h-full text-sage-soft select-none pointer-events-none">
                <rect x="24" y="12" width="32" height="48" rx="2" fill="none" stroke="#375534" strokeWidth="1.5" />
                <rect x="34" y="8" width="12" height="4" rx="1" fill="#1b3829" stroke="#375534" strokeWidth="1" />
                <line x1="30" y1="22" x2="50" y2="22" stroke="#375534" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="30" y1="28" x2="44" y2="28" stroke="#6B9071" strokeWidth="1.5" opacity="0.6" />
                <line x1="30" y1="34" x2="48" y2="34" stroke="#6B9071" strokeWidth="1" opacity="0.5" />
                <line x1="30" y1="40" x2="38" y2="40" stroke="#6B9071" strokeWidth="1" opacity="0.5" />
                <path d="M 30 50 L 35 45 L 40 48 L 45 42 L 50 46" fill="none" stroke="#E3EED4" strokeWidth="1" opacity="0.75" />
                <line x1="16" y1="12" x2="64" y2="12" stroke="#E3EED4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-pale-mint font-display">
                Drag and drop your <span className="text-pale-mint underline">stadium_telemetry.csv</span> or <span className="text-pale-mint underline font-semibold">report.pdf</span> here
              </p>
              <p className="text-[10px] text-sage-soft/70 mt-1 font-mono">
                Or click to browse files from your computer (CSV or PDF)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Notification Message */}
      <AnimatePresence mode="wait">
        {uploadSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-3.5 bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-lg text-[10.5px] font-mono text-emerald-300 flex items-start gap-2"
          >
            <span className="shrink-0 text-emerald-400 font-bold">✔ TELEMETRY SYNCED:</span>
            <span className="leading-relaxed">{uploadSuccessMessage}</span>
          </motion.div>
        )}
        {uploadErrorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-3.5 bg-rose-950/20 border border-rose-500/30 p-3 rounded-lg text-[10.5px] font-mono text-rose-300 flex items-start gap-2"
          >
            <span className="shrink-0 text-rose-400 font-bold">⚠ SYNC ERROR:</span>
            <span className="leading-relaxed">{uploadErrorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
