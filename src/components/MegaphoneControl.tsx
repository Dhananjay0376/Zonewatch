/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Alert } from '../types';
import { Volume2, Info, Copy, Check } from 'lucide-react';

interface MegaphoneControlProps {
  activeBroadcastAlert: Alert | null;
  setActiveBroadcastAlert: (alert: Alert | null) => void;
  activeBroadcastLanguage: 'english' | 'spanish' | 'french';
  setActiveBroadcastLanguage: (lang: 'english' | 'spanish' | 'french') => void;
  isBroadcasting: boolean;
  triggerSimulatedBroadcast: () => void;
  addLog: (msg: string) => void;
}

export default function MegaphoneControl({
  activeBroadcastAlert,
  setActiveBroadcastAlert,
  activeBroadcastLanguage,
  setActiveBroadcastLanguage,
  isBroadcasting,
  triggerSimulatedBroadcast,
  addLog
}: MegaphoneControlProps) {
  const [copiedText, setCopiedText] = useState<boolean>(false);

  if (!activeBroadcastAlert) return null;

  const currentScript = activeBroadcastLanguage === 'english'
    ? activeBroadcastAlert.scriptEnglish
    : activeBroadcastLanguage === 'spanish'
      ? activeBroadcastAlert.scriptSpanish
      : activeBroadcastLanguage === 'french'
        ? activeBroadcastAlert.scriptFrench
        : '';

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    addLog("Copied broadcast script to clipboard.");
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-pitch-dark border border-moss-dark rounded-xl w-full max-w-lg p-6 relative overflow-hidden shadow-2xl">
        
        {/* Top Close icon */}
        <button
          onClick={() => setActiveBroadcastAlert(null)}
          className="absolute top-4 right-4 text-sage-soft hover:text-pale-mint font-bold text-lg p-1.5 hover:bg-moss-deep rounded cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-moss-dark/30 pb-4 mb-5">
          {/* Custom animated speaker array SVG emitting soundwave concentric circles */}
          <div className="w-11 h-11 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 60 60" className="w-full h-full text-pale-mint select-none pointer-events-none">
              <style>{`
                @keyframes soundwave {
                  0% { r: 10px; opacity: 0; }
                  50% { opacity: 0.8; }
                  100% { r: 26px; opacity: 0; }
                }
                .broadcast-wave-1 {
                  animation: soundwave 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
                }
                .broadcast-wave-2 {
                  animation: soundwave 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
                  animation-delay: 0.6s;
                }
                .broadcast-wave-3 {
                  animation: soundwave 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
                  animation-delay: 1.2s;
                }
              `}</style>
              {/* Speaker Horn Silhouette */}
              <path d="M 18,24 L 28,24 L 38,14 L 38,46 L 28,36 L 18,36 Z" fill="#E3EED4" stroke="#375534" strokeWidth="1" />
              <rect x="14" y="27" width="5" height="6" rx="1" fill="#E3EED4" stroke="#375534" strokeWidth="1" />
              
              {/* Waves radiating from the center of the horn */}
              <circle cx="38" cy="30" r="10" fill="none" stroke="#E3EED4" strokeWidth="1.5" className="broadcast-wave-1" />
              <circle cx="38" cy="30" r="10" fill="none" stroke="#E3EED4" strokeWidth="1.5" className="broadcast-wave-2" />
              <circle cx="38" cy="30" r="10" fill="none" stroke="#E3EED4" strokeWidth="1.5" className="broadcast-wave-3" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-pale-mint uppercase tracking-wider font-display">Megaphone Broadcast Assistant</h3>
            <p className="text-[10.5px] text-sage-soft font-mono">STADIUM OPERATIONS CO-PILOT — {activeBroadcastAlert.gateName}</p>
          </div>
        </div>

        {/* Language Selection Tabs */}
        <div className="flex bg-pitch-black p-1 rounded-lg border border-moss-dark/40 text-xs font-mono mb-4">
          <button
            onClick={() => setActiveBroadcastLanguage('english')}
            className={`flex-1 py-2 rounded-md font-semibold transition-all cursor-pointer ${
              activeBroadcastLanguage === 'english' ? 'bg-pale-mint text-pitch-dark font-extrabold' : 'text-sage-soft hover:text-pale-mint'
            }`}
          >
            ENGLISH (US/CAN)
          </button>
          <button
            onClick={() => setActiveBroadcastLanguage('spanish')}
            className={`flex-1 py-2 rounded-md font-semibold transition-all cursor-pointer ${
              activeBroadcastLanguage === 'spanish' ? 'bg-pale-mint text-pitch-dark font-extrabold' : 'text-sage-soft hover:text-pale-mint'
            }`}
          >
            ESPAÑOL (MEX)
          </button>
          <button
            onClick={() => setActiveBroadcastLanguage('french')}
            className={`flex-1 py-2 rounded-md font-semibold transition-all cursor-pointer ${
              activeBroadcastLanguage === 'french' ? 'bg-pale-mint text-pitch-dark font-extrabold' : 'text-sage-soft hover:text-pale-mint'
            }`}
          >
            FRANÇAIS (CAN)
          </button>
        </div>

        {/* Spoken Style Announcement Script Text Box */}
        <div className="bg-pitch-black p-5 rounded-lg border border-moss-dark italic text-sm leading-relaxed text-pale-mint min-h-[120px] flex flex-col justify-between relative font-display">
          
          {/* Soundwaves active animation if broadcasting */}
          {isBroadcasting && (
            <div className="absolute inset-0 bg-moss-deep/20 flex items-center justify-center backdrop-blur-[0.5px] rounded-lg">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-pale-mint rounded-full animate-bounce" 
                    style={{ 
                      height: `${h * 4}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s'
                    }} 
                  />
                ))}
              </div>
            </div>
          )}

          <p>&ldquo;{currentScript}&rdquo;</p>

          <div className="mt-4 pt-3 border-t border-moss-dark/20 flex items-center justify-between text-[11px] font-mono text-sage-soft/60 not-italic">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-sage-soft/60" />
              Tourist-friendly phrasing
            </span>
            
            <button
              onClick={() => handleCopyToClipboard(currentScript || '')}
              className="flex items-center gap-1 text-pale-mint hover:text-white font-semibold cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedText ? "Copied!" : "Copy Script"}
            </button>
          </div>
        </div>

        {/* Broadcast action button */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setActiveBroadcastAlert(null)}
            className="flex-1 py-3 rounded-lg bg-moss-deep border border-moss-dark text-pale-mint font-bold hover:bg-moss-dark text-xs transition-colors cursor-pointer"
          >
            Close Panel
          </button>
          <button
            onClick={triggerSimulatedBroadcast}
            disabled={isBroadcasting}
            className="flex-1 py-3 rounded-lg bg-pale-mint text-pitch-dark font-extrabold hover:bg-pale-mint/80 text-xs transition-colors cursor-pointer shadow-[0_0_20px_rgba(227,238,212,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            {isBroadcasting ? "TRANSMITTING..." : "TRANSMIT AUDIO"}
          </button>
        </div>

      </div>
    </div>
  );
}
