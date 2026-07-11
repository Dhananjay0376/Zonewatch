/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NavigationPanel
 * GenAI-powered stadium wayfinding assistant.
 * Lets volunteers answer fan navigation queries in any language
 * using Gemini to generate contextual, step-by-step directions.
 * Covers: navigation, transportation connections, accessibility routes.
 */

import { useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Loader2, RefreshCw, Accessibility, Bus } from 'lucide-react';

interface NavigationPanelProps {
  /** The volunteer's currently assigned gate/sector. */
  assignedGate: string;
  /** Appends a message to the operational console log. */
  addLog: (msg: string) => void;
}

/** Quick-access navigation query presets for common fan requests. */
const NAV_PRESETS = [
  { label: '🚻 Restrooms',           query: 'Where are the nearest restrooms?',                    icon: '🚻' },
  { label: '🏥 Medical Station',      query: 'Where is the nearest first-aid medical station?',      icon: '🏥' },
  { label: '♿ Accessibility',        query: 'Where is the wheelchair ramp and elevator access?',    icon: '♿' },
  { label: '🚌 Transportation Hub',   query: 'How do I get to the nearest bus stop or metro station?', icon: '🚌' },
  { label: '🍔 Food & Beverages',     query: 'Where are the nearest food and beverage concessions?', icon: '🍔' },
  { label: '🚗 Parking / Exit',       query: 'What is the quickest route to the parking exit?',      icon: '🚗' },
] as const;

/** Languages available for navigation direction output. */
const NAV_LANGUAGES = [
  { code: 'English',    flag: '🇬🇧' },
  { code: 'Spanish',    flag: '🇪🇸' },
  { code: 'French',     flag: '🇫🇷' },
  { code: 'German',     flag: '🇩🇪' },
  { code: 'Japanese',   flag: '🇯🇵' },
  { code: 'Portuguese', flag: '🇧🇷' },
] as const;

interface NavResult {
  route: string;
  landmarks: string[];
  estimatedWalkMinutes: number;
  accessibilityNote: string;
  inOriginalLanguage: string;
  isLocalFallback?: boolean;
}

function NavigationPanel({ assignedGate, addLog }: NavigationPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NavResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = useCallback(async (queryText: string) => {
    const trimmed = queryText.trim().replace(/<[^>]*>/g, '').substring(0, 300);
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    addLog(`Navigation query submitted: "${trimmed.substring(0, 50)}..." [${selectedLanguage}]`);

    try {
      const response = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          assignedGate,
          language: selectedLanguage,
        }),
      });
      if (!response.ok) throw new Error(`Navigation service returned status ${response.status}`);
      const data = (await response.json()) as NavResult;
      setResult(data);
      addLog(`Navigation route generated in ${selectedLanguage}: ${data.estimatedWalkMinutes} min walk.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Navigation service unavailable.';
      setError(message);
      addLog(`Navigation ERROR: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [assignedGate, selectedLanguage, addLog]);

  const handlePreset = useCallback((preset: typeof NAV_PRESETS[number]) => {
    setQuery(preset.query);
    handleNavigate(preset.query);
  }, [handleNavigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-pitch-dark/80 border border-moss-dark/60 rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-moss-dark/40 px-5 py-3.5 bg-pitch-black/40">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-pale-mint font-display">Fan Navigation Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-pale-mint" aria-hidden="true" />
          <span className="text-[8.5px] font-mono text-sage-soft uppercase tracking-widest">AI WAYFINDING</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Quick Preset Buttons */}
        <div>
          <span className="text-[9px] font-mono text-sage-soft uppercase tracking-wider font-semibold block mb-2">Common Fan Requests</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NAV_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className="text-left bg-pitch-black hover:bg-moss-deep/60 border border-moss-dark p-2.5 rounded-lg text-[10px] text-sage-soft transition-all hover:border-pale-mint/40 cursor-pointer group"
                aria-label={preset.query}
              >
                <span className="text-base block mb-1" aria-hidden="true">{preset.icon}</span>
                <span className="font-mono font-bold text-pale-mint group-hover:text-white transition-colors text-[9px]">{preset.label.replace(/^.+? /, '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-between gap-2 bg-pitch-dark/50 border border-moss-dark/50 px-3 py-2 rounded-lg">
          <label htmlFor="nav-lang-select" className="text-[9px] font-mono text-sage-soft uppercase font-bold shrink-0">Direction Language:</label>
          <select
            id="nav-lang-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-pitch-black text-[10px] font-mono text-pale-mint border border-moss-dark rounded px-1.5 py-0.5 focus:outline-none focus:border-pale-mint/40"
          >
            {NAV_LANGUAGES.map(({ code, flag }) => (
              <option key={code} value={code}>{flag} {code}</option>
            ))}
          </select>
        </div>

        {/* Custom Query Input */}
        <div className="space-y-2">
          <label htmlFor="nav-query-input" className="text-[9px] font-mono text-sage-soft uppercase tracking-wider font-semibold block">
            Or type a custom fan navigation query:
          </label>
          <div className="flex gap-2">
            <input
              id="nav-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={300}
              placeholder="e.g., Where are the wheelchair-accessible restrooms?"
              className="flex-1 bg-pitch-black border border-moss-dark rounded-lg px-3 py-2 text-xs text-pale-mint placeholder-sage-soft/50 focus:outline-none focus:border-pale-mint/60"
              onKeyDown={(e) => { if (e.key === 'Enter') handleNavigate(query); }}
            />
            <button
              onClick={() => handleNavigate(query)}
              disabled={isLoading || !query.trim()}
              aria-label="Get navigation directions"
              className="bg-pale-mint hover:bg-pale-mint/80 text-pitch-dark px-3 py-2 rounded-lg font-extrabold text-xs shrink-0 flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <MapPin className="w-3 h-3" aria-hidden="true" />}
              <span>Navigate</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 p-3 rounded-lg text-[10.5px] font-mono" role="alert">
            ⚠ {error}
          </div>
        )}

        {/* Loading */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-pitch-black border border-moss-dark/60 rounded-lg p-6 flex flex-col items-center space-y-3"
            >
              <RefreshCw className="w-6 h-6 animate-spin text-pale-mint" aria-hidden="true" />
              <p className="text-[10.5px] font-mono text-sage-soft animate-pulse text-center">
                Gemini computing optimal route from {assignedGate}...
              </p>
            </motion.div>
          )}

          {/* Result */}
          {result && !isLoading && (
            <motion.div
              key={result.route}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
              aria-live="polite"
            >
              {result.isLocalFallback && (
                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded text-[9px] font-mono text-amber-400">
                  ⚡ AI unavailable — showing cached navigation data
                </div>
              )}

              {/* Walking time badge */}
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400 font-black font-display text-lg">{result.estimatedWalkMinutes}</span>
                  <span className="text-emerald-400/70 text-[9px] font-mono uppercase">min walk</span>
                </div>
                {result.accessibilityNote && (
                  <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg">
                    <Accessibility className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                    <span className="text-indigo-300 text-[9px] font-mono">{result.accessibilityNote}</span>
                  </div>
                )}
              </div>

              {/* Route Instructions */}
              <div className="bg-pitch-black border border-moss-dark rounded-lg p-4 space-y-2">
                <div className="text-[9px] font-mono text-sage-soft uppercase font-bold mb-2">Route Instructions ({selectedLanguage})</div>
                <p className="text-xs text-pale-mint leading-relaxed border-l-2 border-pale-mint pl-3">{result.inOriginalLanguage}</p>
              </div>

              {/* Landmarks */}
              {result.landmarks && result.landmarks.length > 0 && (
                <div className="bg-pitch-black/60 border border-moss-dark/40 rounded-lg p-3 space-y-1.5">
                  <div className="text-[9px] font-mono text-sage-soft uppercase font-bold">Key Landmarks</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.landmarks.map((lm, i) => (
                      <span key={i} className="bg-moss-deep border border-moss-dark/50 text-pale-mint text-[9px] font-mono px-2 py-0.5 rounded-full">
                        📍 {lm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Transportation Note */}
              <div className="bg-pitch-black/40 border border-moss-dark/30 rounded-lg p-3 flex items-start gap-2">
                <Bus className="w-3.5 h-3.5 text-sage-soft shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[10px] text-sage-soft leading-relaxed">
                  <span className="font-bold text-pale-mint">Transport Hub:</span>{' '}
                  Shuttle buses depart every 15 min from Gate A (North). Metro Line 3 station is a 5-min walk via the East Concourse. Ride-share pickup zone is at Lot C.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default memo(NavigationPanel);
