/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Info } from 'lucide-react';

interface HowItWorksProps {
  onClose: () => void;
}

export default function HowItWorks({ onClose }: HowItWorksProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mb-4"
    >
      <div className="bg-pitch-dark border border-moss-dark/60 rounded-lg p-4 text-xs space-y-3 shadow-[0_0_20px_rgba(227,238,212,0.05)]">
        <div className="flex items-center justify-between border-b border-moss-dark/40 pb-2">
          <div className="flex items-center gap-1.5 text-pale-mint font-bold uppercase tracking-wider font-mono">
            <Info className="w-4 h-4 text-pale-mint" />
            How ZW Copilot Intelligence Works (Real-time GenAI)
          </div>
          <button 
            onClick={onClose}
            className="text-sage-soft hover:text-pale-mint font-mono text-[10px] cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
        <p className="text-sage-soft leading-relaxed">
          Zonewatch is a fully integrated, real-time full-stack application built for high-stakes stadium operations. Unlike static dashboards relying on predefined rule tables, every recommendation and translation displayed here is generated in <strong className="text-pale-mint">real time by the Gemini model</strong>:
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1 text-[11px] text-sage-soft/80">
          <li className="flex gap-2">
            <span className="text-pale-mint font-bold font-mono shrink-0">1.</span>
            <span>
              <strong className="text-pale-mint block font-display">Dynamic Density Monitoring</strong>
              When any gate breaches <span className="text-amber-300 font-bold">80% capacity</span>, an operational alert is reactively generated. The system submits live crowd counts, trends, and neighboring sector densities to our Express backend.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-pale-mint font-bold font-mono shrink-0">2.</span>
            <span>
              <strong className="text-pale-mint block font-display">Real-time Gemini Reasoning</strong>
              The backend queries Gemini with target metrics. The model executes complex operational reasoning to draft tactical crowd routes and translated megaphone announcements as structured, raw JSON.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-pale-mint font-bold font-mono shrink-0">3.</span>
            <span>
              <strong className="text-pale-mint block font-display font-medium">Listen & Translate Triage</strong>
              When a supporter speaks a non-English phrase, Gemini detects the language, translates it, classifies urgency (Casual, Urgent, Medical, Accessibility), and creates a compassionate spoken response.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-pale-mint font-bold font-mono shrink-0">4.</span>
            <span>
              <strong className="text-pale-mint block font-display">Active Voice Acoustics Analysis</strong>
              The volunteer portal calculates acoustics (pitch, cadence, decibel levels) via Web Audio APIs. If sandboxed, the interface transitions gracefully to simulated mock indicators.
            </span>
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
