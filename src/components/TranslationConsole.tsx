/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Activity,
  ChevronRight,
  MicOff,
  AlertTriangle,
  Mic,
  Sparkles,
  RefreshCw,
  VolumeX,
  Volume2,
  Copy
} from 'lucide-react';
import type { TranslationResult, VoiceToneResult } from '../types';

interface TranslationConsoleProps {
  speechInputLang: string;
  setSpeechInputLang: (lang: string) => void;
  supporterPhrase: string;
  setSupporterPhrase: (phrase: string) => void;
  isTranslating: boolean;
  translationResult: TranslationResult | null;
  errorTranslate: string | null;
  voiceToneResult: VoiceToneResult | null;
  setVoiceToneResult: Dispatch<SetStateAction<VoiceToneResult | null>>;
  micPermissionError: string | null;
  isListening: boolean;
  listeningTimer: number;
  liveVolumeBars: number[];
  startVoiceListening: () => void;
  stopVoiceListening: () => void;
  handleTranslateSupporter: (phraseToSubmit?: string, toneObj?: VoiceToneResult) => void;
  playAnnouncement: (text: string, langNameOrCode?: string) => void;
  speakingText: string | null;
  addLog: (msg: string) => void;
}

export default function TranslationConsole({
  speechInputLang,
  setSpeechInputLang,
  supporterPhrase,
  setSupporterPhrase,
  isTranslating,
  translationResult,
  errorTranslate,
  voiceToneResult,
  setVoiceToneResult,
  micPermissionError,
  isListening,
  listeningTimer,
  liveVolumeBars,
  startVoiceListening,
  stopVoiceListening,
  handleTranslateSupporter,
  playAnnouncement,
  speakingText,
  addLog
}: TranslationConsoleProps) {
  return (
    <div className="bg-pitch-dark/80 border border-moss-dark/60 rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative">
      <div className="flex items-center justify-between border-b border-moss-dark/40 px-5 py-3.5 bg-pitch-black/40">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-pale-mint font-display">
            Multilingual Fan Assistant
          </h3>
        </div>
        <span className={`text-[8.5px] font-mono border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
          isTranslating 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
            : translationResult 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-pitch-black text-sage-soft border-moss-dark/40'
        }`}>
          {isTranslating ? 'TRANSLATING' : translationResult ? 'ANALYZED' : 'STANDBY'}
        </span>
      </div>

      <div className="p-5 flex flex-col space-y-5">
        {/* Presets Grid */}
        <div>
          <span className="text-[9px] font-mono text-sage-soft block mb-2 uppercase tracking-wider font-semibold">
            Simulate Supporter Presets (Instant Demo)
          </span>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                lang: "Spanish (Medical Emergency)",
                text: "¡Ayuda por favor! Mi padre se siente muy mal del coração cerca de la Puerta C.",
                flag: "🇪🇸"
              },
              {
                lang: "French (Casual Navigation)",
                text: "Bonjour, excusez-moi, où se trouvent les toilettes les plus proches s'il vous plaît ?",
                flag: "🇫🇷"
              },
              {
                lang: "German (Medical Emergency)",
                text: "Hilfe! Meine Tochter hat keine Luft mehr und braucht dringend einen Sanitäter!",
                flag: "🇩🇪"
              },
              {
                lang: "Japanese (Accessibility Access)",
                text: "すみません、車椅子の人用のエレベーターはどちらですか？",
                flag: "🇯🇵"
              }
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSupporterPhrase(preset.text);
                  handleTranslateSupporter(preset.text);
                }}
                aria-label={`Simulate ${preset.lang} preset: ${preset.text}`}
                className="text-left bg-pitch-black hover:bg-moss-deep/60 border border-moss-dark p-2.5 rounded-lg text-[10.5px] text-sage-soft transition-all hover:border-pale-mint/40 flex items-start gap-2.5 group cursor-pointer"
              >
                <span className="text-sm select-none" aria-hidden="true">{preset.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[9px] text-sage-green group-hover:text-pale-mint transition-colors uppercase tracking-tight font-bold">{preset.lang}</div>
                  <div className="truncate text-sage-soft/90 italic mt-0.5">&quot;{preset.text}&quot;</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-sage-green group-hover:text-pale-mint transition-colors shrink-0 mt-2" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        {/* Live Vocal & Acoustic Tone Analyzer */}
        <div className="bg-pitch-black border border-moss-dark/70 rounded-xl p-4.5 space-y-3.5 relative overflow-hidden shadow-inner">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Activity className={`w-3.5 h-3.5 ${isListening ? 'text-rose-500 animate-pulse' : 'text-pale-mint'}`} aria-hidden="true" />
              <span className="text-[10px] font-mono font-bold text-pale-mint uppercase tracking-wider">
                Vocal & Acoustic Tone Capture
              </span>
            </div>
            {isListening && (
              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8.5px] font-mono px-2 py-0.5 rounded-full animate-pulse font-bold" role="status" aria-live="assertive">
                🔴 RECORDING PITCH: {listeningTimer}s
              </span>
            )}
          </div>

          {isListening ? (
            <div className="flex flex-col items-center justify-center py-4 bg-pitch-dark/50 border border-rose-500/25 rounded-lg space-y-3">
              {/* Live Equalizer/Audio wave bars */}
              <div className="flex items-end justify-center gap-1 h-12" aria-hidden="true">
                {liveVolumeBars.map((height, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-pale-mint transition-all duration-75"
                    style={{ 
                      height: `${Math.max(4, height * 2)}px`,
                      opacity: 0.35 + (height / 35),
                      backgroundColor: height > 18 ? '#f43f5e' : height > 12 ? '#fbbf24' : '#E3EED4'
                    }}
                  />
                ))}
              </div>

              <p className="text-[10.5px] font-mono text-rose-400 font-bold animate-pulse" role="status" aria-live="polite">
                Analyzing speech rate, cadence, & harmonic pitch...
              </p>

              <button
                onClick={stopVoiceListening}
                aria-label="Stop audio capture and translate vocal tone"
                className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-5 py-2 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all flex items-center gap-1.5 cursor-pointer animate-bounce"
              >
                <MicOff className="w-3.5 h-3.5" aria-hidden="true" />
                Stop & Translate Tone
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Speech Language selector dropdown */}
              <div className="flex items-center justify-between gap-2 bg-pitch-dark/50 border border-moss-dark/50 px-2.5 py-1.5 rounded-lg">
                <label htmlFor="speech-input-lang-select" className="text-[9px] font-mono text-sage-soft uppercase font-bold">Input Language:</label>
                <select 
                  id="speech-input-lang-select"
                  value={speechInputLang}
                  onChange={(e) => {
                    setSpeechInputLang(e.target.value);
                    addLog(`Voice speech recognition language changed to: ${e.target.value}`);
                  }}
                  className="bg-pitch-black text-[10px] font-mono text-pale-mint border border-moss-dark rounded px-1.5 py-0.5 focus:outline-none focus:border-pale-mint/40"
                >
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (IN)</option>
                  <option value="es-ES">Spanish (ES)</option>
                  <option value="fr-FR">French (FR)</option>
                  <option value="de-DE">German (DE)</option>
                  <option value="pt-BR">Portuguese (BR)</option>
                  <option value="ja-JP">Japanese (JP)</option>
                  <option value="ar-SA">Arabic (SA)</option>
                  <option value="zh-CN">Chinese (CN)</option>
                </select>
              </div>

              {micPermissionError && (
                <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded-lg text-[10px] font-mono text-rose-300 space-y-1" role="alert">
                  <div className="font-bold flex items-center gap-1 text-rose-400">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" aria-hidden="true" />
                    <span>Mic Sandboxed or Denied</span>
                  </div>
                  <p className="text-[9px] text-rose-300/90 leading-relaxed">
                    {micPermissionError}
                  </p>
                  <p className="text-[8.5px] text-sage-soft italic pt-0.5">
                    Type in the box below or use the &quot;Panic Simulation&quot; button to test with real-time audio analysis!
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={startVoiceListening}
                  aria-label="Start microphone input for live vocal and emotional analysis"
                  className="flex-1 bg-moss-deep/50 hover:bg-moss-deep/80 text-pale-mint border border-moss-dark hover:border-pale-mint/40 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-pale-mint" aria-hidden="true" />
                  Start Mic & Tone Listener
                </button>

                {/* Quick simulation templates for voice tone */}
                <button
                  onClick={() => {
                    const panicText = "¡Por favor, mi hija no respira! ¡Necesito un médico urgente!";
                    setSupporterPhrase(panicText);
                    addLog("Injected simulated high-panic voice file...");
                    const mockTone = {
                      detectedTone: "Panic-stricken & Distressed",
                      pitch: "High (380 Hz spike)",
                      speed: "Rapid (Anxious hyperventilation)",
                      volume: "Shouting (85 dB)",
                      confidence: 98,
                      dbLevel: 85,
                      hzLevel: 380,
                      isSimulated: true
                    } as VoiceToneResult;
                    setVoiceToneResult(mockTone);
                    handleTranslateSupporter(panicText, mockTone);
                  }}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3 py-2 rounded-lg font-bold text-[9.5px] font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="Simulate high-panic distress voice"
                  aria-label="Simulate high-panic distress voice tone input"
                >
                  <Activity className="w-3 h-3 text-rose-400" aria-hidden="true" />
                  Panic Simulation
                </button>
              </div>

              {voiceToneResult && (
                <div className="bg-pitch-dark/80 border border-moss-dark/60 p-3 rounded-lg space-y-2" aria-live="polite">
                  <div className="text-[9px] font-mono text-sage-soft uppercase tracking-wider font-bold border-b border-moss-dark/30 pb-1 flex justify-between items-center">
                    <span>Acoustic Tone Signature</span>
                    {voiceToneResult.isSimulated && (
                      <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-normal">
                        Simulated Demo Mode
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-sage-soft">
                    <div className="bg-moss-deep/20 p-1.5 rounded border border-moss-dark/30">
                      <span className="text-[8px] text-sage-soft block uppercase font-bold flex justify-between">
                        <span>EMOTION</span>
                        {voiceToneResult.isSimulated && <span className="text-amber-500/90 text-[7px] font-normal">(SIMULATED)</span>}
                      </span>
                      <span className="text-pale-mint font-bold">{voiceToneResult.detectedTone}</span>
                    </div>
                    <div className="bg-moss-deep/20 p-1.5 rounded border border-moss-dark/30">
                      <span className="text-[8px] text-sage-soft block uppercase font-bold flex justify-between">
                        <span>LOUDNESS</span>
                        {voiceToneResult.isSimulated && <span className="text-amber-500/90 text-[7px] font-normal">(SIMULATED)</span>}
                      </span>
                      <span className="text-pale-mint font-bold">{voiceToneResult.volume} ({voiceToneResult.dbLevel} dB)</span>
                    </div>
                    <div className="bg-moss-deep/20 p-1.5 rounded border border-moss-dark/30">
                      <span className="text-[8px] text-sage-soft block uppercase font-bold flex justify-between">
                        <span>PITCH / FREQ</span>
                        {voiceToneResult.isSimulated && <span className="text-amber-500/90 text-[7px] font-normal">(SIMULATED)</span>}
                      </span>
                      <span className="text-pale-mint font-bold">{voiceToneResult.pitch} ({voiceToneResult.hzLevel} Hz)</span>
                    </div>
                    <div className="bg-moss-deep/20 p-1.5 rounded border border-moss-dark/30">
                      <span className="text-[8px] text-sage-soft block uppercase font-bold flex justify-between">
                        <span>SPEED / RATE</span>
                        {voiceToneResult.isSimulated && <span className="text-amber-500/90 text-[7px] font-normal">(SIMULATED)</span>}
                      </span>
                      <span className="text-pale-mint font-bold">{voiceToneResult.speed}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[8.5px] text-sage-soft font-mono pt-1">
                    <span>Confidence Factor: {voiceToneResult.confidence}%</span>
                    <span className="text-emerald-400">● Tone Guided Translation Active</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom input box */}
        <div className="space-y-2 pt-1 border-t border-moss-dark/30">
          <label htmlFor="custom-phrase-input" className="text-[9px] font-mono text-sage-soft block uppercase tracking-wider font-semibold">
            Or enter custom spoken phrase:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="custom-phrase-input"
                type="text"
                value={supporterPhrase}
                onChange={(e) => setSupporterPhrase(e.target.value)}
                maxLength={500}
                placeholder="e.g., Où est l'entrée pour les fauteuils roulants ?"
                className="w-full bg-pitch-black border border-moss-dark rounded-lg px-3 py-2 text-xs text-pale-mint placeholder-sage-soft/50 focus:outline-none focus:border-pale-mint/60 pr-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTranslateSupporter();
                }}
              />
              {supporterPhrase && (
                <button
                  onClick={() => setSupporterPhrase('')}
                  aria-label="Clear phrase input"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-soft hover:text-pale-mint text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => handleTranslateSupporter()}
              disabled={isTranslating || !supporterPhrase.trim()}
              aria-label="Analyze entered supporter phrase"
              className="bg-pale-mint hover:bg-pale-mint/80 text-pitch-dark px-3 py-2 rounded-lg font-extrabold text-xs shrink-0 flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isTranslating ? (
                <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3 h-3" aria-hidden="true" />
              )}
              <span>Analyze</span>
            </button>
          </div>
        </div>

        {/* Error log if any */}
        {errorTranslate && (
          <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 p-3 rounded-lg text-[10.5px] font-mono" role="alert">
            ⚠️ {errorTranslate}
          </div>
        )}

        {/* Stacked Outputs (BEFORE -> TRIAGE -> AFTER) */}
        <AnimatePresence mode="wait">
          {isTranslating ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-pitch-black border border-moss-dark/60 rounded-lg p-6 flex flex-col items-center justify-center space-y-3"
            >
              <RefreshCw className="w-6 h-6 animate-spin text-pale-mint" aria-hidden="true" />
              <p className="text-[10.5px] font-mono text-sage-soft text-center animate-pulse">
                Gemini decoding supporter language & evaluating triage severity...
              </p>
            </motion.div>
          ) : translationResult ? (
            <motion.div
              key={translationResult.translatedText}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
              aria-live="polite"
            >
              {/* STEP 1: What they said (Before) */}
              <div className="bg-pitch-black border border-moss-dark rounded-lg p-3.5 space-y-2 relative">
                <div className="flex justify-between items-center">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold text-pale-mint bg-moss-deep border border-moss-dark/60 px-2 py-0.5 rounded uppercase tracking-wider">
                      1. Supporter Speech (Before)
                    </span>
                    {translationResult.isLocalFallback && (
                      <span className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold animate-pulse">
                        ⚡ LOCAL BACKUP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playAnnouncement(supporterPhrase, translationResult.originalLanguage)}
                      className={`p-1 rounded hover:bg-moss-deep transition-colors cursor-pointer ${
                        speakingText === supporterPhrase ? 'text-amber-400 animate-pulse bg-amber-500/10' : 'text-sage-soft hover:text-pale-mint'
                      }`}
                      aria-label={speakingText === supporterPhrase ? "Pause original speech audio" : "Hear supporter's original speech out loud"}
                    >
                      {speakingText === supporterPhrase ? (
                        <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <span className="text-[9.5px] font-bold text-pale-mint font-mono">
                      🌍 {translationResult.originalLanguage.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-sage-soft italic leading-relaxed pl-2 border-l-2 border-pale-mint">
                  &ldquo;{supporterPhrase}&rdquo;
                </p>
              </div>

              {/* STEP 2: Translation & Urgency Triage (Meaning) */}
              <div className="bg-pitch-black border border-moss-dark rounded-lg p-3.5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono font-bold text-sage-soft uppercase tracking-wider">
                    2. English Meaning & Urgency
                  </span>
                  
                  {/* Urgency color-coded badge */}
                  {(() => {
                    const tag = translationResult.urgencyTag;
                    let bg = 'bg-pitch-black text-sage-soft border-moss-dark';
                    if (tag === 'Medical') bg = 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse';
                    else if (tag === 'Urgent') bg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                    else if (tag === 'Accessibility') bg = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
                    else bg = 'bg-moss-deep text-pale-mint border-moss-dark/40';

                    return (
                      <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 border rounded-full uppercase ${bg}`}>
                        Urgency Level: {tag}
                      </span>
                    );
                  })()}
                </div>

                {/* English Translate */}
                <div className="bg-moss-deep/30 p-2.5 rounded border border-moss-dark/40">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-mono text-sage-soft uppercase font-bold">Literal Translation</div>
                    <button
                      onClick={() => playAnnouncement(translationResult.translatedText, 'english')}
                      className={`p-1 rounded hover:bg-pitch-black transition-colors cursor-pointer ${
                        speakingText === translationResult.translatedText ? 'text-amber-400 animate-pulse bg-amber-500/10' : 'text-sage-soft hover:text-pale-mint'
                      }`}
                      aria-label={speakingText === translationResult.translatedText ? "Pause translation speech audio" : "Read English translation out loud"}
                    >
                      {speakingText === translationResult.translatedText ? (
                        <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-pale-mint font-semibold">
                    {translationResult.translatedText}
                  </p>
                </div>

                {/* Reason */}
                <p className="text-[10px] text-sage-soft leading-normal font-sans">
                  <span className="font-bold text-pale-mint">Triage Assessment:</span> {translationResult.classificationReason}
                </p>
              </div>

              {/* STEP 3: Suggested Response (After) */}
              <div className="bg-pitch-black border border-moss-dark rounded-lg p-4 space-y-3.5 shadow-[0_0_20px_rgba(227,238,212,0.03)] relative">
                <div className="flex justify-between items-center border-b border-moss-dark/20 pb-2">
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    3. Suggested Reply (After)
                  </span>
                  <span className="text-[8px] font-mono text-sage-soft">
                    SAY IN THEIR LANGUAGE
                  </span>
                </div>

                {/* Target Language Speech Box */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-pale-mint leading-relaxed italic font-display">
                      &ldquo;{translationResult.suggestedResponse}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={() => playAnnouncement(translationResult.suggestedResponse, translationResult.originalLanguage)}
                    className={`p-2 rounded bg-moss-deep border hover:bg-moss-deep/80 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                      speakingText === translationResult.suggestedResponse 
                        ? 'text-amber-400 border-amber-500/30 animate-pulse bg-amber-500/10' 
                        : 'text-pale-mint border-moss-dark hover:border-pale-mint/40'
                    }`}
                    aria-label={speakingText === translationResult.suggestedResponse ? "Pause suggested reply voice audio" : "Speak suggested reply in target language out loud"}
                  >
                    {speakingText === translationResult.suggestedResponse ? (
                      <VolumeX className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* What this means in English for the volunteer */}
                <div className="bg-moss-deep/25 p-2.5 rounded border border-moss-dark/40 text-[10px] flex justify-between items-center gap-2">
                  <div className="flex-1">
                    <span className="font-mono text-sage-soft uppercase font-bold block">English Translation (Meaning)</span>
                    <p className="text-sage-soft italic mt-0.5">
                      &quot;{translationResult.suggestedResponseEnglish}&quot;
                    </p>
                  </div>
                  <button
                    onClick={() => playAnnouncement(translationResult.suggestedResponseEnglish, 'english')}
                    className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                      speakingText === translationResult.suggestedResponseEnglish 
                        ? 'text-amber-400 animate-pulse bg-amber-500/10' 
                        : 'text-sage-soft hover:text-pale-mint hover:bg-pitch-black'
                    }`}
                    aria-label={speakingText === translationResult.suggestedResponseEnglish ? "Pause english suggestion voice audio" : "Read suggestion meaning in English out loud"}
                  >
                    {speakingText === translationResult.suggestedResponseEnglish ? (
                      <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Clipboard copy helper */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(translationResult.suggestedResponse);
                      addLog(`Copied suggested response to clipboard.`);
                    }}
                    aria-label="Copy suggested response text to clipboard"
                    className="flex items-center gap-1 text-[10px] text-pale-mint hover:text-white font-mono font-bold cursor-pointer"
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    <span>Copy Response</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Standby display state with custom animated voice/language wave SVG */
            <div className="bg-pitch-black border border-moss-dark/60 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
              <div className="relative w-16 h-16 flex items-center justify-center mb-1">
                <svg viewBox="0 0 80 80" className="w-full h-full text-sage-soft select-none pointer-events-none" aria-hidden="true">
                  <style>{`
                    @keyframes voiceWave {
                      0%, 100% { transform: scaleY(0.3); }
                      50% { transform: scaleY(1); }
                    }
                    .wave-bar {
                      transform-origin: center;
                      animation: voiceWave 1.2s ease-in-out infinite;
                    }
                  `}</style>
                  {/* A faint central globe contour representing multilingual coverage */}
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#375534" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                  <ellipse cx="40" cy="40" rx="28" ry="10" fill="none" stroke="#375534" strokeWidth="0.75" opacity="0.3" />
                  <ellipse cx="40" cy="40" rx="10" ry="28" fill="none" stroke="#375534" strokeWidth="0.75" opacity="0.3" />
                  
                  {/* Active voice spectrum visualization bars */}
                  <g transform="translate(18, 40)" className="text-pale-mint">
                    <rect x="0" y="-12" width="3" height="24" rx="1.5" fill="#E3EED4" className="wave-bar" style={{ animationDelay: '0.1s' }} />
                    <rect x="8" y="-18" width="3" height="36" rx="1.5" fill="#6B9071" className="wave-bar" style={{ animationDelay: '0.3s' }} />
                    <rect x="16" y="-24" width="3" height="48" rx="1.5" fill="#E3EED4" className="wave-bar" style={{ animationDelay: '0.5s' }} />
                    <rect x="24" y="-18" width="3" height="36" rx="1.5" fill="#6B9071" className="wave-bar" style={{ animationDelay: '0.2s' }} />
                    <rect x="32" y="-12" width="3" height="24" rx="1.5" fill="#E3EED4" className="wave-bar" style={{ animationDelay: '0.4s' }} />
                    <rect x="40" y="-6" width="3" height="12" rx="1.5" fill="#6B9071" className="wave-bar" style={{ animationDelay: '0s' }} />
                  </g>
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-pale-mint uppercase tracking-wide font-display">Ready for Supporter Inquiry</h4>
                <p className="text-[10px] text-sage-soft mt-1 max-w-xs leading-normal font-sans font-semibold">
                  Select an instant multilingual preset simulation above or type a supporter&apos;s phrase to witness real-time language detection, urgency classification, and translation.
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
