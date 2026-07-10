/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Terminal } from 'lucide-react';

interface ConsoleLogsProps {
  systemLogs: string[];
}

export default function ConsoleLogs({ systemLogs }: ConsoleLogsProps) {
  return (
    <div className="bg-pitch-dark/40 border border-moss-dark/60 rounded-xl p-5 flex flex-col justify-between flex-1 min-h-[220px]">
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-pale-mint mb-3 flex items-center gap-1.5 font-mono">
          <Terminal className="w-3.5 h-3.5 text-pale-mint" />
          Specialist Console Logs
        </h3>
        
        <div 
          aria-live="polite"
          className="font-mono text-[10px] text-sage-soft space-y-2 h-[180px] overflow-y-auto bg-pitch-black p-3 rounded border border-moss-dark/40"
        >
          {systemLogs.map((log, index) => (
            <div key={index} className="leading-relaxed border-b border-moss-dark/20 pb-1 last:border-0">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Summary of stats */}
      <div className="pt-4 mt-4 border-t border-moss-dark/30 flex justify-between text-[10px] font-mono text-sage-soft font-semibold">
        <span>LATENCY: 12ms</span>
        <span>ACTIVE COGNITIVE AGENTS: 01</span>
      </div>
    </div>
  );
}
