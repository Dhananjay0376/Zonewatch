/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  Sparkles, 
  Info,
  Database,
  RefreshCw,
  AlertOctagon,
  Languages
} from 'lucide-react';
import type { Alert, ParseMockFileResponse, ParsedGate, TranslationResult, VoiceToneResult } from './types';

// Custom Hooks
import { useStadiumGates } from './hooks/useStadiumGates';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useAcousticSensor } from './hooks/useAcousticSensor';

// Modular Components (Lazy Loaded)
const GateRadarMap = lazy(() => import('./components/GateRadarMap'));
const TranslationConsole = lazy(() => import('./components/TranslationConsole'));
const MegaphoneControl = lazy(() => import('./components/MegaphoneControl'));
const HowItWorks = lazy(() => import('./components/HowItWorks'));
const NavigationPanel = lazy(() => import('./components/NavigationPanel'));
const SustainabilityWidget = lazy(() => import('./components/SustainabilityWidget'));
const TelemetryUploadHub = lazy(() => import('./components/TelemetryUploadHub'));
import ConsoleLogs from './components/ConsoleLogs';
import { getDensityConfig } from './utils/gateUtils';

export default function App() {
  // Operational Time & System Logging states
  const [currentTime, setCurrentTime] = useState<string>('');
  const [systemLogs, setSystemLogs] = useState<{ id: string; text: string }[]>([
    { id: 'init-1', text: 'System initialized in standby mode.' },
    { id: 'init-2', text: 'Establishing live link with SOC (North Hub)...' },
    { id: 'init-3', text: 'Telemetry links nominal on Gates B, C, D, E.' }
  ]);

  // Safe Logger helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSystemLogs(prev => [{ id: logId, text: `[${timestamp}] ${message}` }, ...prev.slice(0, 15)]);
  }, []);

  // 1. Consume Custom Hooks
  const {
    gates,
    setGates,
    setGateHistory,
    alerts,
    setAlerts,
    isRushing,
    rushingStep,
    handleModifyDensity,
    handleResetToDefault,
    triggerSimulatedRush
  } = useStadiumGates({ addLog });

  const {
    speakingText,
    playAnnouncement
  } = useSpeechSynthesis(addLog);

  // Translation & Triage Local State
  const [speechInputLang, setSpeechInputLang] = useState<string>('en-US');
  const [supporterPhrase, setSupporterPhrase] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [errorTranslate, setErrorTranslate] = useState<string | null>(null);

  // Speech and Audio Analysis Logic
  const onAcousticCaptureCompleted = (phrase: string, toneObj: VoiceToneResult) => {
    handleTranslateSupporter(phrase, toneObj);
  };

  const {
    isListening,
    listeningTimer,
    liveVolumeBars,
    micPermissionError,
    voiceToneResult,
    setVoiceToneResult,
    startVoiceListening,
    stopVoiceListening
  } = useAcousticSensor({
    speechInputLang,
    supporterPhrase,
    setSupporterPhrase,
    addLog,
    onAcousticCaptureCompleted
  });

  // Mock File Upload State
  const [isUsingCustomData, setIsUsingCustomData] = useState<boolean>(false);

  // Broadcaster state
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState<Alert | null>(null);
  const [activeBroadcastLanguage, setActiveBroadcastLanguage] = useState<'english' | 'spanish' | 'french'>('english');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // Script Generator state
  const [generatingScripts, setGeneratingScripts] = useState<Record<string, boolean>>({});
  const [activeTabLanguage, setActiveTabLanguage] = useState<Record<string, 'english' | 'spanish' | 'french'>>({});
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [copiedTextAlert, setCopiedTextAlert] = useState<Record<string, boolean>>({});
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const copiedAlertTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Update simulation current time
  useEffect(() => {
    // Capture the ref value at effect-body level so the cleanup closure
    // references the same object snapshot (satisfies react-hooks/exhaustive-deps).
    const alertTimeouts = copiedAlertTimeoutsRef.current;
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => {
      clearInterval(interval);
      Object.values(alertTimeouts).forEach(clearTimeout);
    };
  }, []);

  const handleUploadSuccess = useCallback((parsedGates: ParsedGate[], summary: string) => {
    setGates(parsedGates);
    const newHistory: Record<string, number[]> = {};
    parsedGates.forEach((g) => {
      newHistory[g.id] = g.history || [g.density, g.density, g.density, g.density, g.density];
    });
    setGateHistory(prev => ({ ...prev, ...newHistory }));
    setAlerts([]);
    setIsUsingCustomData(true);
    addLog(`Telemetry updated: ${summary}`);
  }, [setGates, setGateHistory, setAlerts, addLog]);

  const handleResetTelemetry = useCallback(() => {
    handleResetToDefault();
    setIsUsingCustomData(false);
    addLog("Telemetry reset to default simulation variables.");
  }, [handleResetToDefault, addLog]);

  // Helper to sanitize input string
  const sanitizeInput = (text: string): string => {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/<[^>]*>/g, ""); // Strip HTML
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 500); // Enforce size bounds
    }
    return cleaned;
  };

  // Submit supporter vocal phrase for language translation & severity triage
  // The server /api/translate endpoint handles all fallback logic, so the client
  // only needs to handle network-level errors here.
  const handleTranslateSupporter = useCallback(async (phraseToSubmit?: string, vocalToneOverride?: VoiceToneResult) => {
    const rawPhrase = phraseToSubmit !== undefined ? phraseToSubmit : supporterPhrase;
    const activePhrase = sanitizeInput(rawPhrase);
    if (!activePhrase) return;

    setIsTranslating(true);
    setErrorTranslate(null);
    const activeVocalTone = vocalToneOverride !== undefined ? vocalToneOverride : voiceToneResult;

    addLog(`Initiating translator copilot for: "${activePhrase.substring(0, 40)}..."`);
    if (activeVocalTone) {
      addLog(`Acoustic Tone Context: ${activeVocalTone.detectedTone} (Pitch: ${activeVocalTone.pitch}, Speed: ${activeVocalTone.speed}, Vol: ${activeVocalTone.volume})`);
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phrase: activePhrase,
          vocalTone: activeVocalTone
        })
      });

      if (!response.ok) {
        throw new Error(`Translation service returned status code ${response.status}`);
      }

      const data = await response.json() as TranslationResult;
      setTranslationResult(data);
      addLog(`Detected: ${data.originalLanguage} | Triage: ${data.urgencyTag.toUpperCase()}`);

      if (data.detectedTone) {
        setVoiceToneResult((prev) => prev
          ? { ...prev, detectedTone: data.detectedTone }
          : { detectedTone: data.detectedTone, pitch: 'Normal', speed: 'Normal', volume: 'Normal', confidence: 95, dbLevel: 55, hzLevel: 145 }
        );
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze phrase';
      setErrorTranslate(errorMessage);
      addLog(`ERROR: Translation service unavailable. Check network connection.`);
      // The server already returns fallback data on AI failure, so a network error
      // here means we're completely offline. Show a minimal local indicator.
      setTranslationResult({
        originalLanguage: 'Auto-Detected',
        translatedText: activePhrase,
        urgencyTag: 'Casual',
        classificationReason: 'Network error — translation service unreachable.',
        suggestedResponse: 'Please wait while we reconnect to the translation service.',
        suggestedResponseEnglish: 'Please wait while we reconnect to the translation service.',
        detectedTone: 'Calm & Conversational',
        isLocalFallback: true,
      });
    } finally {
      setIsTranslating(false);
    }
  }, [supporterPhrase, voiceToneResult, setVoiceToneResult, addLog]);

  // Trigger simulated voice announcers
  const triggerSimulatedBroadcast = () => {
    if (!activeBroadcastAlert) return;
    const txt = activeBroadcastLanguage === 'english'
      ? activeBroadcastAlert.scriptEnglish
      : activeBroadcastLanguage === 'spanish'
        ? activeBroadcastAlert.scriptSpanish
        : activeBroadcastAlert.scriptFrench;

    if (!txt) return;

    setIsBroadcasting(true);
    addLog(`Simulated Broadcast triggered in ${activeBroadcastLanguage.toUpperCase()}.`);
    playAnnouncement(txt, activeBroadcastLanguage);

    setTimeout(() => {
      setIsBroadcasting(false);
      addLog(`Completed megaphone audio loop play.`);
    }, 4500);
  };

  // On-demand broadcast script generation calling Gemini
  const handleBroadcastClick = async (alert: Alert) => {
    const isNowExpanded = !expandedAlerts[alert.id];
    setExpandedAlerts(prev => ({ ...prev, [alert.id]: isNowExpanded }));

    if (!activeTabLanguage[alert.id]) {
      setActiveTabLanguage(prev => ({ ...prev, [alert.id]: 'english' }));
    }

    if (isNowExpanded && (!alert.scriptEnglish || !alert.scriptSpanish || !alert.scriptFrench)) {
      setGeneratingScripts(prev => ({ ...prev, [alert.id]: true }));
      addLog(`Calling Gemini to design tourist megaphone scripts for ${alert.gateName}...`);

      try {
        const response = await fetch('/api/broadcast-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            whatsHappening: alert.whatsHappening,
            risk: alert.risk,
            action: alert.action,
            gateName: alert.gateName
          })
        });

        if (!response.ok) {
          throw new Error(`Scripts generation failed: status ${response.status}`);
        }

        const data = await response.json();

        setAlerts(prev => prev.map(a => {
          if (a.id === alert.id) {
            return {
              ...a,
              scriptEnglish: data.scriptEnglish,
              scriptSpanish: data.scriptSpanish,
              scriptFrench: data.scriptFrench,
              isLocalFallback: a.isLocalFallback || data.isLocalFallback
            };
          }
          return a;
        }));

        addLog(`Gemini built high-clarity spoken megaphone announcements in 3 languages.`);
      } catch (err: unknown) {
        console.error("Gemini script generation error:", err);
        addLog(`Gemini busy/unavailable. Restoring high-quality default spoken scripts.`);

        setAlerts(prev => prev.map(a => {
          if (a.id === alert.id) {
            return {
              ...a,
              scriptEnglish: `Hi everyone! To help you get inside the stadium faster and avoid congestion, please follow our volunteers towards the adjacent gate. It is fully open and there is no queue! Thank you for your cooperation!`,
              scriptSpanish: `¡Hola a todos! Para ingresar al estadio mucho más rápido y evitar la fila, por favor sigan a nuestros voluntarios hacia la puerta de al lado. ¡Está totalmente libre y sin espera! ¡Muchas gracias por su ayuda!`,
              scriptFrench: `Bonjour à tous ! Afin d'entrer plus rapidement et d'éviter l'attente, veuillez suivre nos bénévoles vers la porte juste à côté. Elle est entièrement fluide et sans attente ! Merci de votre collaboration !`,
              isLocalFallback: true
            };
          }
          return a;
        }));
      } finally {
        setGeneratingScripts(prev => ({ ...prev, [alert.id]: false }));
      }
    }
  };

  const handleCopyAlertScript = useCallback((alertId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextAlert(prev => ({ ...prev, [alertId]: true }));
    if (copiedAlertTimeoutsRef.current[alertId]) {
      clearTimeout(copiedAlertTimeoutsRef.current[alertId]);
    }
    copiedAlertTimeoutsRef.current[alertId] = setTimeout(() => {
      setCopiedTextAlert(prev => ({ ...prev, [alertId]: false }));
      delete copiedAlertTimeoutsRef.current[alertId];
    }, 2000);
  }, []);


  return (
    <div id="zonewatch-container" className="min-h-screen bg-pitch-black text-sage-soft font-sans selection:bg-pale-mint/30 selection:text-pale-mint flex flex-col justify-between overflow-x-hidden antialiased relative">
      
      {/* Ambient background designs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute inset-0 bg-[#080A09]" />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[160px] opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse at center, #E3EED4 0%, #6B9071 50%, transparent 100%)' }}
        />
        <div 
          className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full blur-[180px] opacity-[0.035]"
          style={{ background: 'radial-gradient(circle at center, #00E1D9 0%, #38BDF8 60%, transparent 100%)' }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100,50 Q300,-50 700,50" fill="none" stroke="#AEC3B0" strokeWidth="1" />
          <path d="M-100,80 Q300,-20 700,80" fill="none" stroke="#AEC3B0" strokeWidth="0.5" strokeDasharray="5,10" />
          <path d="M-100,200 Q300,100 700,200" fill="none" stroke="#AEC3B0" strokeWidth="1" />
          <line x1="550" y1="0" x2="650" y2="200" stroke="#AEC3B0" strokeWidth="0.75" />
          <line x1="50" y1="0" x2="-50" y2="200" stroke="#AEC3B0" strokeWidth="0.75" />
        </svg>
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-moss-dark/40 flex items-center justify-between px-6 bg-pitch-dark/70 backdrop-blur-md sticky top-0 z-40 relative">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-pale-mint rounded-sm flex items-center justify-center font-black text-pitch-dark text-sm italic shadow-[0_0_15px_rgba(227,238,212,0.4)] font-display tracking-wider">
            ZW
          </div>
          <div>
            <h1 className="text-base font-black tracking-[0.25em] uppercase flex items-center gap-2 text-pale-mint font-display">
              Zonewatch 
              <span className="text-sage-soft font-normal hidden sm:inline font-sans text-xs tracking-widest">{"// Volunteer Copilot"}</span>
            </h1>
            <div className="flex items-center space-x-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse"></span>
              <p className="text-[9px] text-pale-mint/80 font-mono tracking-wider uppercase font-semibold">Live Link: Stadium Operations Center (North Hub)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="text-right">
            <p className="text-[9px] font-mono text-sage-soft uppercase tracking-widest font-semibold">Assigned Sector</p>
            <p className="text-xs sm:text-sm font-display font-bold text-pale-mint tracking-wide">GATES B — E (LEVEL 1)</p>
          </div>
          <div className="h-10 w-[1px] bg-moss-dark/40"></div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-sage-soft uppercase tracking-widest font-semibold">Shift End</p>
            <p className="text-xs sm:text-sm font-display font-bold text-pale-mint tracking-wide">22:00 <span className="text-[9px] font-mono text-sage-soft/80">LOCAL</span></p>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-moss-deep/50 border-b border-moss-dark/30 py-3 px-6 text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)] relative z-10">
        <p className="text-xs sm:text-sm text-sage-soft tracking-wider font-display flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse"></span>
          From guessing with a megaphone to reasoning with data — <span className="text-pale-mint font-extrabold tracking-wide">in real time.</span>
        </p>
      </div>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl w-full mx-auto relative z-10">
        
        {/* Left Section: Gate Monitoring & Copilot Intelligence Engine */}
        <section className="col-span-1 lg:col-span-8 flex flex-col space-y-6">
          
          {/* Section Header */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sage-soft font-display">Sector Density Feed</h2>
                <span className="text-[9px] bg-moss-deep border border-moss-dark/40 text-pale-mint px-2 py-0.5 rounded font-mono">CONTINUOUS TELEMETRY</span>
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={triggerSimulatedRush}
                  disabled={isRushing}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                    isRushing 
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.15)]' 
                      : 'bg-moss-deep hover:bg-moss-dark border-moss-dark/50 text-pale-mint hover:text-white'
                  }`}
                  title="Simulate a massive spectator arrival spike"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isRushing ? 'animate-spin text-rose-400' : 'text-pale-mint'}`} />
                  {isRushing ? `Rushing: Step ${rushingStep}/10` : 'Simulate Rush'}
                </button>

                <button
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                    showHowItWorks 
                      ? 'bg-moss-dark border-pale-mint/40 text-pale-mint shadow-[0_0_10px_rgba(227,238,212,0.1)]' 
                      : 'bg-moss-deep hover:bg-moss-dark border-moss-dark/50 text-pale-mint hover:text-white'
                  }`}
                  title="Show explanation for judges"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>How This Works</span>
                </button>

                <span className="text-[10px] font-mono text-sage-soft italic">Sim Time: {currentTime || '10:23:00'}</span>
              </div>
            </div>

            {/* Explanatory Banner */}
            <AnimatePresence>
              {showHowItWorks && (
                <Suspense fallback={<div className="h-20 animate-pulse bg-pitch-dark/40 border border-moss-dark/60 rounded-lg" />}>
                  <HowItWorks onClose={() => setShowHowItWorks(false)} />
                </Suspense>
              )}
            </AnimatePresence>

            {/* Judge Mock Telemetry Data Upload Hub */}
            <Suspense fallback={<div className="h-40 animate-pulse bg-pitch-dark/40 border border-moss-dark/60 rounded-lg" />}>
              <TelemetryUploadHub
                onUploadSuccess={handleUploadSuccess}
                onReset={handleResetTelemetry}
                isUsingCustomData={isUsingCustomData}
                addLog={addLog}
              />
            </Suspense>

            {/* Gates Telemetry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {gates.map((gate) => {
                const config = getDensityConfig(gate.density);
                const isStable = gate.trend === 'stable';
                const isTrendUp = gate.trend === 'up';

                return (
                  <div
                    key={gate.id}
                    id={`gate-card-${gate.id}`}
                    className={`bg-pitch-dark/80 border ${config.border} p-4.5 rounded-lg transition-all duration-300 relative overflow-hidden ${config.glow}`}
                  >
                    {/* Top line indices */}
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <div>
                        <span className="text-[9px] font-mono text-sage-soft block uppercase font-bold">STADIUM PORTAL</span>
                        <h3 className="text-sm font-bold text-pale-mint font-display">{gate.name}</h3>
                      </div>
                      <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        config.textColor === 'text-pale-mint' 
                          ? 'bg-moss-deep/50 text-pale-mint border-moss-dark/40' 
                          : config.textColor === 'text-amber-400' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                      }`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Stats details */}
                    <div className="flex items-baseline justify-between mb-3 relative z-10">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black font-display tracking-tight ${config.textColor}`}>
                          {gate.density}%
                        </span>
                        <span className="text-[10px] text-sage-soft font-mono font-bold">CROWD DENSITY</span>
                      </div>

                      {/* Direction and Trend Icon */}
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-sage-soft bg-pitch-black/50 px-2 py-1 rounded border border-moss-dark/30">
                        {isStable ? (
                          <Minus className="w-3 h-3 text-sage-soft" />
                        ) : isTrendUp ? (
                          <TrendingUp className="w-3 h-3 text-rose-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-emerald-400" />
                        )}
                        <span className={isStable ? 'text-sage-soft' : isTrendUp ? 'text-rose-400' : 'text-emerald-400'}>
                          {gate.trend?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Quick Simulation Manual Calibration Buttons */}
                    <div className="flex gap-2 relative z-10 pt-2 border-t border-moss-dark/20">
                      <button
                        onClick={() => handleModifyDensity(gate.id, -5)}
                        aria-label={`Decrease ${gate.name} density by 5%`}
                        className="flex-1 bg-pitch-black hover:bg-moss-deep border border-moss-dark text-sage-soft hover:text-pale-mint py-1 rounded text-[9.5px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Reduce crowd density manually"
                      >
                        <Minus className="w-2.5 h-2.5" aria-hidden="true" />
                        5%
                      </button>
                      <button
                        onClick={() => handleModifyDensity(gate.id, 5)}
                        aria-label={`Increase ${gate.name} density by 5%`}
                        className="flex-1 bg-pitch-black hover:bg-moss-deep border border-moss-dark text-sage-soft hover:text-pale-mint py-1 rounded text-[9.5px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Increase crowd density manually"
                      >
                        <Plus className="w-2.5 h-2.5" aria-hidden="true" />
                        5%
                      </button>
                    </div>

                    {/* Subtle bottom telemetry wire decoration */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-moss-dark/20 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          gate.density < 60 ? 'bg-pale-mint/40' : gate.density <= 80 ? 'bg-amber-400/40' : 'bg-rose-400/80 animate-pulse'
                        }`}
                        style={{ width: `${gate.density}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Gate Radar Map rendering */}
          <Suspense fallback={<div className="h-64 animate-pulse bg-pitch-dark/40 border border-moss-dark/60 rounded-lg" />}>
            <GateRadarMap gates={gates} alerts={alerts} />
          </Suspense>

          {/* Active Copilot Actionable Recommendations Panel */}
          <div id="copilot-intelligence-center" className="bg-pitch-dark/80 border border-moss-dark/60 rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative">
            <div className="flex items-center justify-between border-b border-moss-dark/40 px-5 py-3.5 bg-pitch-black/40">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-pale-mint font-display">
                  Copilot Tactical Intelligence Engine
                </h3>
              </div>
              <span className="text-[8.5px] font-mono bg-moss-deep text-pale-mint border border-moss-dark/60 px-2 py-0.5 rounded uppercase font-semibold">
                ACTIVE ADVISORIES: {alerts.filter(a => !a.resolved).length}
              </span>
            </div>

            <div className="p-5" aria-live="polite">
              {alerts.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-moss-dark/30 rounded-lg bg-pitch-black/30">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center mb-3">
                    <svg viewBox="0 0 60 60" className="w-full h-full text-sage-soft select-none pointer-events-none opacity-40">
                      <circle cx="30" cy="30" r="22" fill="none" stroke="#6B9071" strokeWidth="1.5" strokeDasharray="4 6" />
                      <path d="M22 30 L28 36 L38 24" fill="none" stroke="#E3EED4" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-semibold text-pale-mint font-display uppercase tracking-wider">Perimeter Nominals Confirmed</h4>
                  <p className="text-[10.5px] text-sage-soft/70 mt-1 max-w-sm mx-auto leading-relaxed font-mono">
                    All gates are operating under 80% capacity limit. Telemetry scanner is active. No routing advisories.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => {
                    const isExpanded = expandedAlerts[alert.id] || false;
                    const isGenerating = generatingScripts[alert.id] || false;
                    const selectedLang = activeTabLanguage[alert.id] || 'english';
                    const isCopied = copiedTextAlert[alert.id] || false;

                    const activeScriptText = selectedLang === 'english'
                      ? alert.scriptEnglish
                      : selectedLang === 'spanish'
                        ? alert.scriptSpanish
                        : alert.scriptFrench;

                    return (
                      <div
                        key={alert.id}
                        className={`border rounded-lg transition-all overflow-hidden bg-pitch-black/40 ${
                          alert.resolved 
                            ? 'border-moss-dark/30 opacity-60' 
                            : alert.severity === 'critical' 
                              ? 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.04)]' 
                              : 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.03)]'
                        }`}
                      >
                        {/* Header card info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-pitch-black/60 border-b border-moss-dark/20">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[8px] font-mono font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                alert.resolved 
                                  ? 'bg-moss-deep text-pale-mint border-moss-dark' 
                                  : alert.severity === 'critical' 
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {alert.resolved ? 'RESOLVED' : `${alert.severity?.toUpperCase()} BREACH`}
                              </span>
                              
                              <h4 className="text-xs font-bold text-pale-mint font-display uppercase tracking-wide">
                                Redirect Strategy: {alert.gateName}
                              </h4>
                            </div>
                            <p className="text-[10px] text-sage-soft mt-1 font-mono">
                              Triggered at {alert.triggerTime} @ {alert.densityAtTrigger}% capacity 
                              {alert.resolved && ` • Resolved at ${alert.resolvedTime}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Mega button for active broadcasts */}
                            {!alert.resolved && (
                              <button
                                onClick={() => setActiveBroadcastAlert(alert)}
                                className="px-3 py-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-bold shrink-0 shadow-inner"
                              >
                                <AlertOctagon className="w-3 h-3 text-amber-400" />
                                Open Megaphone
                              </button>
                            )}

                            {/* Scripts designer expand button */}
                            <button
                              onClick={() => handleBroadcastClick(alert)}
                              className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1 ${
                                isExpanded 
                                  ? 'bg-moss-dark border-pale-mint/40 text-pale-mint font-bold' 
                                  : 'bg-moss-deep hover:bg-moss-dark border-moss-dark/50 text-pale-mint hover:text-white'
                              }`}
                            >
                              <Languages className="w-3.5 h-3.5 text-pale-mint" />
                              {isExpanded ? 'Hide Scripts' : 'Design Scripts'}
                            </button>
                          </div>
                        </div>

                        {/* Recommendation fields */}
                        <div className="p-4 space-y-3.5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-pitch-black/60 p-3 rounded border border-moss-dark/30 space-y-1">
                              <span className="text-[8px] font-mono text-sage-soft uppercase font-bold tracking-wider block">1. Operational Telemetry</span>
                              <p className="text-[11px] text-pale-mint leading-relaxed font-sans">{alert.whatsHappening}</p>
                            </div>
                            
                            <div className="bg-pitch-black/60 p-3 rounded border border-moss-dark/30 space-y-1">
                              <span className="text-[8px] font-mono text-sage-soft uppercase font-bold tracking-wider block">2. Risk Matrix</span>
                              <p className="text-[11px] text-rose-300 leading-relaxed font-sans">{alert.risk}</p>
                            </div>
                            
                            <div className="bg-pitch-black/60 p-3 rounded border border-moss-dark/30 space-y-1">
                              <span className="text-[8px] font-mono text-sage-soft uppercase font-bold tracking-wider block">3. Tactical Redirects</span>
                              <p className="text-[11px] text-emerald-300 leading-relaxed font-sans">{alert.action}</p>
                            </div>
                          </div>

                          {/* Copilot Scripts section */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-t border-moss-dark/30 pt-3.5 space-y-3"
                              >
                                <div className="bg-pitch-black p-4 rounded-lg border border-moss-dark/50 relative">
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-moss-dark/30 pb-2 mb-3.5">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-pale-mint animate-pulse" />
                                      <span className="text-[9px] font-mono font-bold text-pale-mint uppercase tracking-wider">
                                        Multi-Language Mega-Script Generator
                                      </span>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex gap-1">
                                      {(['english', 'spanish', 'french'] as const).map((lang) => (
                                        <button
                                          key={lang}
                                          onClick={() => setActiveTabLanguage(prev => ({ ...prev, [alert.id]: lang }))}
                                          className={`px-2.5 py-1 text-[8.5px] font-mono uppercase tracking-wider border rounded cursor-pointer transition-all ${
                                            selectedLang === lang
                                              ? 'bg-pale-mint text-pitch-dark border-pale-mint font-extrabold'
                                              : 'bg-pitch-black hover:bg-moss-deep text-sage-soft border-moss-dark'
                                          }`}
                                        >
                                          {lang}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Generated results rendering */}
                                  {isGenerating ? (
                                    <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                      <RefreshCw className="w-6 h-6 animate-spin text-pale-mint" />
                                      <p className="text-[10px] font-mono text-pale-mint animate-pulse uppercase tracking-widest">
                                        Gemini writing conversational spoke script...
                                      </p>
                                    </div>
                                  ) : activeScriptText ? (
                                    <div className="space-y-3.5">
                                      <p className="text-xs text-pale-mint font-medium leading-relaxed italic border-l-2 border-pale-mint pl-3">
                                        &ldquo;{activeScriptText}&rdquo;
                                      </p>

                                      <div className="flex justify-between items-center text-[9px] font-mono pt-1.5 border-t border-moss-dark/20">
                                        <button
                                          onClick={() => handleCopyAlertScript(alert.id, activeScriptText)}
                                          className="text-sage-soft hover:text-pale-mint flex items-center gap-1 uppercase transition-colors font-bold cursor-pointer"
                                        >
                                          <span>{isCopied ? '✔ Copied Script' : 'Copy Spoken Text'}</span>
                                        </button>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => playAnnouncement(activeScriptText, selectedLang)}
                                            className={`px-2.5 py-1 rounded text-[8.5px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                                              speakingText === activeScriptText 
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' 
                                                : 'bg-moss-deep/50 hover:bg-moss-deep border-moss-dark text-pale-mint hover:border-pale-mint/40'
                                            }`}
                                          >
                                            <span>{speakingText === activeScriptText ? 'Pause Output' : 'Play Audio Output'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Section: Multilingual Supporter Translator & Live Operational Console logs */}
        <section className="col-span-1 lg:col-span-4 flex flex-col space-y-6">
          <Suspense fallback={<div className="h-64 animate-pulse bg-pitch-dark/40 border border-moss-dark/60 rounded-lg" />}>
            <TranslationConsole
              speechInputLang={speechInputLang}
              setSpeechInputLang={setSpeechInputLang}
              supporterPhrase={supporterPhrase}
              setSupporterPhrase={setSupporterPhrase}
              isTranslating={isTranslating}
              translationResult={translationResult}
              errorTranslate={errorTranslate}
              voiceToneResult={voiceToneResult}
              setVoiceToneResult={setVoiceToneResult}
              micPermissionError={micPermissionError}
              isListening={isListening}
              listeningTimer={listeningTimer}
              liveVolumeBars={liveVolumeBars}
              startVoiceListening={startVoiceListening}
              stopVoiceListening={stopVoiceListening}
              handleTranslateSupporter={handleTranslateSupporter}
              playAnnouncement={playAnnouncement}
              speakingText={speakingText}
              addLog={addLog}
            />
          </Suspense>

          <Suspense fallback={<div className="h-40 animate-pulse bg-pitch-dark/40 border border-moss-dark/60 rounded-lg" />}>
            <SustainabilityWidget
              gates={gates}
              activeAlertsCount={alerts.filter(a => !a.resolved).length}
            />
          </Suspense>

          <ConsoleLogs systemLogs={systemLogs} />

          {/* AI-Powered Stadium Navigation Assistant (FIFA World Cup 2026) */}
          <Suspense fallback={<div className="h-40 animate-pulse bg-pitch-dark/40 border border-moss-dark/60 rounded-lg" />}>
            <NavigationPanel
              assignedGate={gates[0]?.name ?? 'Main Concourse'}
              addLog={addLog}
            />
          </Suspense>
        </section>
      </main>

      {/* Broadcast Megaphone Dialog Modal */}
      <Suspense fallback={null}>
        <MegaphoneControl
          activeBroadcastAlert={activeBroadcastAlert}
          setActiveBroadcastAlert={setActiveBroadcastAlert}
          activeBroadcastLanguage={activeBroadcastLanguage}
          setActiveBroadcastLanguage={setActiveBroadcastLanguage}
          isBroadcasting={isBroadcasting}
          triggerSimulatedBroadcast={triggerSimulatedBroadcast}
          addLog={addLog}
        />
      </Suspense>

      {/* Workspace Footer details */}
      <footer className="h-12 border-t border-moss-dark/30 flex items-center justify-between px-6 bg-pitch-black/80 relative z-10 text-[9.5px] font-mono text-sage-soft/80 uppercase">
        <span>ZONEWATCH © 2026 // STADIUM MOBILITY SYSTEMS INC</span>
        <span>Secure HTTPS Connection Nominals Verified</span>
      </footer>

    </div>
  );
}
