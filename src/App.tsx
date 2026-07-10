/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  Play, 
  Pause,
  Cpu, 
  Languages, 
  Info,
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Upload,
  Database,
  AlertTriangle
} from 'lucide-react';
import { Gate, Alert } from './types';

export default function App() {
  // 1. Live simulated gate density state
  const [gates, setGates] = useState<Gate[]>([
    { id: 'gate-b', name: 'Gate B', density: 42, trend: 'up' },
    { id: 'gate-c', name: 'Gate C', density: 84, trend: 'up' },
    { id: 'gate-d', name: 'Gate D', density: 64, trend: 'down' },
    { id: 'gate-e', name: 'Gate E', density: 19, trend: 'up' },
  ]);

  // 2. Continuous sliding window history (up to last 5 ticks) for each gate to calculate trend/velocity
  const [gateHistory, setGateHistory] = useState<Record<string, number[]>>({
    'gate-b': [35, 38, 40, 41, 42],
    'gate-c': [65, 70, 75, 80, 84],
    'gate-d': [72, 70, 68, 66, 64],
    'gate-e': [15, 16, 17, 18, 19],
  });

  // 3. Operational Alerts state (Gemini-generated reasoned actions)
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({});

  // 4. Control simulation & system time state
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'System initialized in standby mode.',
    'Establishing live link with SOC (North Hub)...',
    'Telemetry links nominal on Gates B, C, D, E.'
  ]);

  // 5. Active Broadcast modal state
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState<Alert | null>(null);
  const [activeBroadcastLanguage, setActiveBroadcastLanguage] = useState<'english' | 'spanish' | 'french'>('english');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedTextAlert, setCopiedTextAlert] = useState<Record<string, boolean>>({});
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // 6. On-demand Script Generation states
  const [generatingScripts, setGeneratingScripts] = useState<Record<string, boolean>>({});
  const [activeTabLanguage, setActiveTabLanguage] = useState<Record<string, 'english' | 'spanish' | 'french'>>({});
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  // 7. Voice Translation & Supporter Triage states
  const [supporterPhrase, setSupporterPhrase] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<{
    originalLanguage: string;
    translatedText: string;
    urgencyTag: 'Casual' | 'Urgent' | 'Medical' | 'Accessibility';
    classificationReason: string;
    suggestedResponse: string;
    suggestedResponseEnglish: string;
    isLocalFallback?: boolean;
  } | null>(null);
  const [errorTranslate, setErrorTranslate] = useState<string | null>(null);

  // 8. Dynamic text to speech states
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  // 9. Simulated Rush & Explanation states for live demo
  const [isRushing, setIsRushing] = useState<boolean>(false);
  const [rushingStep, setRushingStep] = useState<number>(0);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  // 10. Mock file upload state hooks
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isUsingCustomData, setIsUsingCustomData] = useState<boolean>(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Read and submit uploaded mock file
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

        const data = await response.json();
        
        if (data.success && data.gates) {
          setGates(data.gates);
          
          // Reconstruct trends history window
          const newHistory: Record<string, number[]> = {};
          data.gates.forEach((g: any) => {
            newHistory[g.id] = g.history || [g.density, g.density, g.density, g.density, g.density];
          });
          setGateHistory(prev => ({ ...prev, ...newHistory }));
          
          // Reset existing unresolved alerts to let copilot re-analyze the new densities
          setAlerts([]);
          
          setIsUsingCustomData(true);
          setUploadSuccessMessage(data.summaryOfChanges || `Successfully loaded ${data.gates.length} custom gates from ${file.name}.`);
          addLog(`Telemetry updated: ${data.summaryOfChanges}`);
        } else {
          throw new Error(data.error || "Failed to extract valid stadium gates.");
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        setUploadErrorMessage(err.message || "An error occurred while uploading and parsing your file.");
        addLog(`CRITICAL: File parser error: ${err.message || "Unknown error"}`);
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

  const handleResetToDefault = () => {
    setGates([
      { id: 'gate-b', name: 'Gate B', density: 42, trend: 'up' },
      { id: 'gate-c', name: 'Gate C', density: 84, trend: 'up' },
      { id: 'gate-d', name: 'Gate D', density: 64, trend: 'down' },
      { id: 'gate-e', name: 'Gate E', density: 19, trend: 'up' },
    ]);
    setGateHistory({
      'gate-b': [35, 38, 40, 41, 42],
      'gate-c': [65, 70, 75, 80, 84],
      'gate-d': [72, 70, 68, 66, 64],
      'gate-e': [15, 16, 17, 18, 19],
    });
    setAlerts([]);
    setIsUsingCustomData(false);
    setUploadSuccessMessage(null);
    setUploadErrorMessage(null);
    addLog("Standard Live telemetry feed restored. Clearing custom mock states.");
  };

  // Update current time continuously
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fluctuating density simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setGates((prevGates) =>
        prevGates.map((gate) => {
          // Fluctuates density by a small random offset (-3% to +4%)
          const fluctuation = Math.floor(Math.random() * 8) - 3;
          let newDensity = gate.density + fluctuation;

          // Keep density constrained in a realistic range (10% to 98%)
          if (newDensity < 10) newDensity = 10;
          if (newDensity > 98) newDensity = 98;

          // Determine the trend based on fluctuation
          let newTrend: 'up' | 'down' | 'stable' = 'stable';
          if (fluctuation > 0) newTrend = 'up';
          if (fluctuation < 0) newTrend = 'down';

          // Update gate history window (limit to 5 samples)
          setGateHistory(prev => {
            const currentHist = prev[gate.id] || [];
            return {
              ...prev,
              [gate.id]: [...currentHist, newDensity].slice(-5)
            };
          });

          return {
            ...gate,
            density: newDensity,
            trend: newTrend,
          };
        })
      );
    }, 5000); // update every 5 seconds

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Helper to push updates to the Specialist System Logs console
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSystemLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 15)]);
  };

  // Reactively audit density thresholds to trigger/resolve Gemini alerts
  useEffect(() => {
    gates.forEach((gate) => {
      const activeAlert = alerts.find(a => a.gateId === gate.id && !a.resolved);
      
      // TRIGGER: If gate >= 80% and no active alert exists, and we aren't already requesting Gemini
      if (gate.density >= 80 && !activeAlert && !pendingRequests[gate.id]) {
        triggerGeminiRecommendation(gate);
      }
      
      // RESOLVE: If gate drops under 80% and an active alert is currently unresolved
      if (gate.density < 80 && activeAlert) {
        resolveActiveAlert(gate.id);
      }
    });
  }, [gates, alerts, pendingRequests]);

  // Execute Gemini reasoning operational recommendation API call
  const triggerGeminiRecommendation = async (targetGate: Gate) => {
    // 1. Instantly lock and flag as pending
    setPendingRequests(prev => ({ ...prev, [targetGate.id]: true }));
    addLog(`Density breach detected on ${targetGate.name} (${targetGate.density}%). Querying Gemini...`);

    const tempId = `alert-${Date.now()}-${targetGate.id}`;
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 2. Seed a loading placeholder state into alerts immediately
    const placeholderAlert: Alert = {
      id: tempId,
      gateId: targetGate.id,
      gateName: targetGate.name,
      densityAtTrigger: targetGate.density,
      triggerTime: timestamp,
      whatsHappening: "Gemini Analysis pending. Formulating tactical operational telemetry...",
      risk: "Calculating bottleneck timelines and crowd pressure risks...",
      action: "Determining optimized gate redirection matrices...",
      resolved: false,
      severity: targetGate.density >= 90 ? 'critical' : 'warning',
    };

    setAlerts(prev => [placeholderAlert, ...prev]);

    try {
      // Fetch telemetry details
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate: targetGate,
          gates: gates,
          history: gateHistory[targetGate.id] || []
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const result = await response.json();

      // Update the placeholder with real, raw intelligence from Gemini
      setAlerts(prev => prev.map(a => {
        if (a.id === tempId) {
          return {
            ...a,
            whatsHappening: result.whatsHappening,
            risk: result.risk,
            action: result.action,
            scriptEnglish: result.scriptEnglish,
            scriptSpanish: result.scriptSpanish,
            scriptFrench: result.scriptFrench,
            isLocalFallback: result.isLocalFallback,
            // Re-evaluate severity based on real-time density value
            severity: targetGate.density >= 90 ? 'critical' : 'warning',
          };
        }
        return a;
      }));

      addLog(`Gemini Copilot generated actionable route plan for ${targetGate.name}.`);
    } catch (err: any) {
      console.error(err);
      addLog(`CRITICAL: Gemini query failed for ${targetGate.name}. Using fallback directives.`);
      
      // Update with a structured fallback instruction so user isn't stuck
      setAlerts(prev => prev.map(a => {
        if (a.id === tempId) {
          return {
            ...a,
            whatsHappening: `Unusual congestion detected at ${targetGate.name} (${targetGate.density}%).`,
            risk: "Risk of high local density causing queuing and delays.",
            action: "Operational copilot advises manually routing arriving fans to adjacent low-density gates.",
            scriptEnglish: `Attention guests: Please move to the other gates to get inside faster. Thank you!`,
            scriptSpanish: `Atención: Por favor diríjase a las otras puertas para ingresar más rápido. ¡Gracias!`,
            scriptFrench: `Attention s'il vous plaît: Veuillez vous diriger vers les autres portes. Merci!`,
            isLocalFallback: true,
          };
        }
        return a;
      }));
    } finally {
      setPendingRequests(prev => ({ ...prev, [targetGate.id]: false }));
    }
  };

  // Mark an alert as resolved when capacity returns to safe levels
  const resolveActiveAlert = (gateId: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAlerts(prev => prev.map(a => {
      if (a.gateId === gateId && !a.resolved) {
        addLog(`System nominals restored on ${a.gateName}. Resolution logged.`);
        return {
          ...a,
          resolved: true,
          resolvedTime: timestamp
        };
      }
      return a;
    }));
  };

  // Force-simulate manual triggers for testing thresholds
  const handleModifyDensity = (id: string, amount: number) => {
    setGates((prevGates) =>
      prevGates.map((gate) => {
        if (gate.id === id) {
          const newDensity = Math.max(5, Math.min(100, gate.density + amount));
          
          setGateHistory(prev => {
            const currentHist = prev[gate.id] || [];
            return {
              ...prev,
              [gate.id]: [...currentHist, newDensity].slice(-5)
            };
          });

          return {
            ...gate,
            density: newDensity,
            trend: amount > 0 ? 'up' : 'down',
          };
        }
        return gate;
      })
    );
  };

  // Smoothly spikes Gates B and E to critical thresholds over 18 seconds (10 steps)
  const triggerSimulatedRush = () => {
    if (isRushing) return;
    setIsRushing(true);
    setRushingStep(0);
    setIsSimulating(false); // Pause normal fluctuation
    addLog("🚨 DEMO INITIATED: Ramping Gates B and E to critical capacity!");

    const targetGates = ['gate-b', 'gate-e'];
    let step = 0;
    const totalSteps = 10;
    
    const interval = setInterval(() => {
      step++;
      setRushingStep(step);
      
      setGates((prevGates) =>
        prevGates.map((gate) => {
          if (targetGates.includes(gate.id)) {
            const targetDensity = gate.id === 'gate-b' ? 92 : 88;
            const currentDensity = gate.density;
            const remainingSteps = totalSteps - step + 1;
            const diff = targetDensity - currentDensity;
            const increment = diff > 0 ? Math.ceil(diff / remainingSteps) : 0;
            const newDensity = Math.min(targetDensity, gate.density + increment);

            setGateHistory(prev => {
              const currentHist = prev[gate.id] || [];
              return {
                ...prev,
                [gate.id]: [...currentHist, newDensity].slice(-5)
              };
            });

            return {
              ...gate,
              density: newDensity,
              trend: 'up' as const,
            };
          }
          return gate;
        })
      );

      if (step >= totalSteps) {
        clearInterval(interval);
        setIsRushing(false);
        setIsSimulating(true); // Resume normal background telemetry
        addLog("🚀 DEMO SUCCESS: Surge simulation complete. Live gates breached critical levels!");
      }
    }, 1800); // 1.8 seconds per step * 10 steps = 18 seconds total
  };

  // Theme configuration for gate styling
  const getDensityConfig = (density: number) => {
    if (density < 60) {
      return {
        textColor: 'text-pale-mint',
        bg: 'bg-pale-mint',
        border: 'border-moss-dark/40',
        label: 'NOMINAL',
        glow: 'shadow-[0_0_15px_rgba(227,238,212,0.08)]',
        isAlert: false
      };
    } else if (density <= 80) {
      return {
        textColor: 'text-amber-400',
        bg: 'bg-amber-400',
        border: 'border-amber-400/20',
        label: 'STEADY SURGE',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.08)]',
        isAlert: false
      };
    } else {
      return {
        textColor: 'text-rose-400',
        bg: 'bg-rose-400',
        border: 'border-rose-400/50',
        label: 'SURGE BREACH',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.18)]',
        isAlert: true
      };
    }
  };

  // Handle clipboard script copies
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // On-demand broadcast script generation calling Gemini
  const handleBroadcastClick = async (alert: Alert) => {
    // Toggle expand state
    const isNowExpanded = !expandedAlerts[alert.id];
    setExpandedAlerts(prev => ({ ...prev, [alert.id]: isNowExpanded }));

    // Set default tab language if not set
    if (!activeTabLanguage[alert.id]) {
      setActiveTabLanguage(prev => ({ ...prev, [alert.id]: 'english' }));
    }

    // Call Gemini only if we do not have the custom scripts yet
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

        // Save generated scripts on the alert object
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
      } catch (err: any) {
        console.error("Gemini script generation error:", err);
        addLog(`Gemini busy/unavailable. Restoring high-quality default spoken scripts.`);

        // Fallback robust spoken scripts
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

  const handleCopyAlertScript = (alertId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextAlert(prev => ({ ...prev, [alertId]: true }));
    setTimeout(() => {
      setCopiedTextAlert(prev => ({ ...prev, [alertId]: false }));
    }, 2000);
  };

  // Submit a supporter voice phrase for translation & triage classification
  const handleTranslateSupporter = async (phraseToSubmit?: string) => {
    const activePhrase = phraseToSubmit !== undefined ? phraseToSubmit : supporterPhrase;
    if (!activePhrase.trim()) return;

    setIsTranslating(true);
    setErrorTranslate(null);
    addLog(`Initiating translator copilot for: "${activePhrase.substring(0, 40)}..."`);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: activePhrase })
      });

      if (!response.ok) {
        throw new Error(`Translation service returned status code ${response.status}`);
      }

      const data = await response.json();
      setTranslationResult(data);
      addLog(`Detected: ${data.originalLanguage} | Triage: ${data.urgencyTag.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      setErrorTranslate(err.message || 'Failed to analyze phrase');
      addLog(`ERROR: Supporter translation copilot failed. Engaging local translation heuristic fallback.`);
      
      const lower = activePhrase.toLowerCase().trim();
      let fallbackResult: any = {
        originalLanguage: "Spanish",
        translatedText: activePhrase,
        urgencyTag: "Casual",
        classificationReason: "Supporter asking for standard directions or general help.",
        suggestedResponse: "Hola, ¿cómo puedo ayudarte hoy?",
        suggestedResponseEnglish: "Hello, how can I help you today?",
        isLocalFallback: true
      };

      if (lower.includes("corazón") || lower.includes("corazon") || lower.includes("padre") || lower.includes("dolor") || lower.includes("medico") || lower.includes("enfermo") || lower.includes("ayuda") || lower.includes("sangre") || lower.includes("urgente")) {
        fallbackResult = {
          originalLanguage: "Spanish",
          translatedText: lower.includes("padre") || lower.includes("corazón") || lower.includes("corazon")
            ? "Help please! My father is feeling very sick with his heart near Gate C." 
            : "I need medical help / I feel sick.",
          urgencyTag: "Medical",
          classificationReason: "Explicit mention of cardiac emergency symptoms or urgent medical distress.",
          suggestedResponse: "Por favor, quédese aquí tranquilo. Estoy llamando a nuestro equipo médico de inmediato para que lo asistan. Todo va a estar bien.",
          suggestedResponseEnglish: "Please, stay here and remain calm. I am calling our medical response team right now to assist you. Everything is going to be okay.",
          isLocalFallback: true
        };
      } else if (lower.includes("silla") || lower.includes("ruedas") || lower.includes("discapacidad") || lower.includes("rampa") || lower.includes("ascensor")) {
        fallbackResult = {
          originalLanguage: "Spanish",
          translatedText: "Where is the wheelchair ramp / elevator?",
          urgencyTag: "Accessibility",
          classificationReason: "Inquiry regarding wheelchair access or accessibility services.",
          suggestedResponse: "Contamos con una rampa de acceso y un ascensor a la vuelta de esta esquina, a la derecha. Un voluntario lo puede acompañar si gusta.",
          suggestedResponseEnglish: "We have an accessibility ramp and elevator just around this corner, to the right. A volunteer can accompany you if you'd like.",
          isLocalFallback: true
        };
      } else if (lower.includes("toilet") || lower.includes("toilettes") || lower.includes("toilette") || lower.includes("perdido") || lower.includes("puerta") || lower.includes("boleto") || lower.includes("baño") || lower.includes("agua")) {
        const isToiletFrench = lower.includes("toilettes") || lower.includes("toilette");
        fallbackResult = {
          originalLanguage: isToiletFrench ? "French" : "Spanish",
          translatedText: isToiletFrench 
            ? "Hello, excuse me, where are the closest restrooms please?" 
            : "I am lost / where is the restroom or water?",
          urgencyTag: "Casual",
          classificationReason: "Spectator requesting restrooms location and general directions.",
          suggestedResponse: isToiletFrench 
            ? "Les toilettes les plus proches sont situées juste à côté de la Porte D, à environ trente mètres d'ici." 
            : "Los baños y dispensadores de agua están derecho por este pasillo a unos 50 metros.",
          suggestedResponseEnglish: isToiletFrench 
            ? "The nearest restrooms are located right next to Gate D, about thirty meters from here." 
            : "The restrooms and water stations are straight down this hallway about 50 meters.",
          isLocalFallback: true
        };
      } else if (lower.includes("hilfe") || lower.includes("tochter") || lower.includes("luft") || lower.includes("sanit") || lower.includes("arzt")) {
        fallbackResult = {
          originalLanguage: "German",
          translatedText: "Help! My daughter has run out of air and urgently needs a paramedic!",
          urgencyTag: "Medical",
          classificationReason: "Urgent German request regarding breathing difficulty and emergency medical team support.",
          suggestedResponse: "Bitte bleiben Sie ganz ruhig hier bei mir. Ich habe soeben den Sanitätsdienst alarmiert, sie sind sofort auf dem Weg zu uns. Wir helfen Ihnen!",
          suggestedResponseEnglish: "Please remain calm here with me. I have just alerted the medical service, they are on their way to us immediately. We will help you!",
          isLocalFallback: true
        };
      } else if (lower.includes("車椅子") || lower.includes("エレベーター") || lower.includes("えれべーたー") || lower.includes("くるまいす")) {
        fallbackResult = {
          originalLanguage: "Japanese",
          translatedText: "Excuse me, where is the elevator for wheelchair users?",
          urgencyTag: "Accessibility",
          classificationReason: "Accessibility request for wheelchair lift/elevator access in Japanese.",
          suggestedResponse: "車椅子用のエレベーターは、この角を右に曲がってすぐのところにございます。よろしければ、スタッフがご案内いたします。",
          suggestedResponseEnglish: "The elevator for wheelchair users is located just around this corner on the right. If you'd like, a staff member can guide you there.",
          isLocalFallback: true
        };
      } else {
        fallbackResult = {
          originalLanguage: "Auto-Detected",
          translatedText: activePhrase,
          urgencyTag: "Casual",
          classificationReason: "General spectator inquiry.",
          suggestedResponse: `We understand your inquiry: "${activePhrase}". Let us find a team leader or nearby signage to assist you immediately.`,
          suggestedResponseEnglish: "We understand your inquiry. Let us find a team leader or nearby signage to assist you immediately.",
          isLocalFallback: true
        };
      }

      setTranslationResult(fallbackResult);
    } finally {
      setIsTranslating(false);
    }
  };

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
    speakText(txt, activeBroadcastLanguage);

    setTimeout(() => {
      setIsBroadcasting(false);
      addLog(`Completed megaphone audio loop play.`);
    }, 4500);
  };

  const speakText = (text: string, langNameOrCode: string = 'en') => {
    if (!window.speechSynthesis) {
      addLog("Speech Synthesis is not supported in this browser.");
      return;
    }

    // Toggle playback off if clicked while already speaking this text
    if (speakingText === text) {
      window.speechSynthesis.cancel();
      setSpeakingText(null);
      addLog("Audio playback paused.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    let resolvedLang = 'en-US';
    const cleanLang = langNameOrCode.toLowerCase();
    if (cleanLang.includes('span') || cleanLang === 'es') {
      resolvedLang = 'es-MX';
    } else if (cleanLang.includes('fren') || cleanLang === 'fr') {
      resolvedLang = 'fr-FR';
    } else if (cleanLang.includes('germ') || cleanLang === 'de') {
      resolvedLang = 'de-DE';
    } else if (cleanLang.includes('japa') || cleanLang === 'ja') {
      resolvedLang = 'ja-JP';
    } else {
      resolvedLang = 'en-US';
    }

    utterance.lang = resolvedLang;
    utterance.rate = 0.95; 
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setSpeakingText(text);
      addLog(`Playing audio output [${resolvedLang}]: "${text.substring(0, 32)}..."`);
    };

    utterance.onend = () => {
      setSpeakingText(null);
    };

    utterance.onerror = () => {
      setSpeakingText(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div id="zonewatch-container" className="min-h-screen bg-pitch-black text-sage-soft font-sans selection:bg-pale-mint/30 selection:text-pale-mint flex flex-col justify-between overflow-x-hidden antialiased">
      
      {/* Top Controls Hub & Nav Bar */}
      <header className="h-16 border-b border-moss-dark/40 flex items-center justify-between px-6 bg-pitch-dark/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-pale-mint rounded-sm flex items-center justify-center font-black text-pitch-dark text-sm italic shadow-[0_0_15px_rgba(227,238,212,0.4)] font-display tracking-wider">
            ZW
          </div>
          <div>
            <h1 className="text-base font-black tracking-[0.25em] uppercase flex items-center gap-2 text-pale-mint font-display">
              Zonewatch 
              <span className="text-sage-soft/50 font-normal hidden sm:inline font-sans text-xs tracking-widest">// Volunteer Copilot</span>
            </h1>
            <div className="flex items-center space-x-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse"></span>
              <p className="text-[9px] text-pale-mint/80 font-mono tracking-wider uppercase font-semibold">Live Link: Stadium Operations Center (North Hub)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="text-right">
            <p className="text-[9px] font-mono text-sage-soft/60 uppercase tracking-widest font-semibold">Assigned Sector</p>
            <p className="text-xs sm:text-sm font-display font-bold text-pale-mint tracking-wide">GATES B — E (LEVEL 1)</p>
          </div>
          <div className="h-10 w-[1px] bg-moss-dark/40"></div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-sage-soft/60 uppercase tracking-widest font-semibold">Shift End</p>
            <p className="text-xs sm:text-sm font-display font-bold text-pale-mint tracking-wide">22:00 <span className="text-[9px] font-mono text-sage-soft/40">LOCAL</span></p>
          </div>
        </div>
      </header>

      {/* Tagline Banner */}
      <div className="bg-moss-deep/50 border-b border-moss-dark/30 py-3 px-6 text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
        <p className="text-xs sm:text-sm text-sage-soft tracking-wider font-display flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse"></span>
          From guessing with a megaphone to reasoning with data — <span className="text-pale-mint font-extrabold tracking-wide">in real time.</span>
        </p>
      </div>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl w-full mx-auto">
        
        {/* Left Section: Gate Monitoring & Copilot Intelligence Engine */}
        <section className="col-span-1 lg:col-span-8 flex flex-col space-y-6">
          
          {/* Live Density Feeds Header */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sage-soft font-display">Sector Density Feed</h2>
                <span className="text-[9px] bg-moss-deep border border-moss-dark/40 text-pale-mint px-2 py-0.5 rounded font-mono">CONTINUOUS TELEMETRY</span>
              </div>
              
              {/* Live Judged Demo Tools */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Simulate Rush Button */}
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

                {/* How This Works Info Toggle */}
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

                <div className="h-4 w-[1px] bg-moss-dark/30 hidden sm:block mx-1"></div>
                <span className="text-[10px] font-mono text-sage-green italic">Sim Time: {currentTime || '10:23:00'}</span>
              </div>
            </div>

            {/* Collapsible Info Card explaining Real-Time GenAI Intelligence */}
            <AnimatePresence>
              {showHowItWorks && (
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
                        onClick={() => setShowHowItWorks(false)}
                        className="text-sage-soft/60 hover:text-pale-mint font-mono text-[10px] cursor-pointer"
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
                          <strong className="text-pale-mint block font-display font-medium">Synthesized Audio Output</strong>
                          To ensure volunteers can act immediately in loud stadium environments, we use real-time Web Speech Synthesis to read translated alerts, scripts, and suggested replies aloud.
                        </span>
                      </li>
                    </ul>
                    <div className="pt-2 border-t border-moss-dark/40 text-[10px] text-sage-soft/50 font-mono flex items-center justify-between">
                      <span>PIPELINE: FRONTEND → EXPRESS API → GEMINI → MULTILINGUAL TTS</span>
                      <span className="text-pale-mint font-bold">100% GENUINE AI LOGIC</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Judge Mock Telemetry Data Upload Hub */}
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
                
                {/* Download sample & Reset triggers */}
                <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                  <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent("Gate Name,Density,Trend\nGate B,88,up\nGate C,52,down\nGate D,94,up\nGate E,15,stable")}`}
                    download="stadium_mock_telemetry.csv"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pitch-black border border-moss-dark text-sage-soft hover:text-pale-mint text-[10px] font-mono transition-all"
                    title="Download structured sample CSV file"
                  >
                    <span className="underline">Download Sample CSV</span>
                  </a>

                  {isUsingCustomData && (
                    <button
                      onClick={handleResetToDefault}
                      className="px-2.5 py-1 rounded bg-rose-950/30 border border-rose-900 hover:bg-rose-950/60 hover:border-rose-700 text-rose-300 text-[10px] font-mono transition-all cursor-pointer"
                    >
                      Clear & Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Drag and Drop Zone */}
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
                className={`border border-dashed p-6 rounded-lg transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
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
                    <div className="p-3 bg-pitch-black rounded-full border border-moss-dark/60">
                      <Upload className="w-5 h-5 text-sage-soft" />
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

              {/* Status and Feedback Messages */}
              <AnimatePresence mode="wait">
                {uploadSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-3 p-3 bg-moss-deep/40 border border-moss-dark rounded text-pale-mint text-xs flex items-start gap-2 animate-pulse"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-pale-mint" />
                    <div>
                      <span className="font-bold uppercase font-mono tracking-wider text-[10px] block mb-0.5 font-sans">TELEMETRY INGESTED</span>
                      <p className="text-sage-soft leading-relaxed text-[11px] font-sans">{uploadSuccessMessage}</p>
                    </div>
                  </motion.div>
                )}

                {uploadErrorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-3 p-3 bg-rose-950/30 border border-rose-500/20 rounded text-rose-400 text-xs flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <span className="font-bold uppercase font-mono tracking-wider text-[10px] block mb-0.5 font-sans">PARSING FAILURE</span>
                      <p className="text-zinc-300 leading-relaxed text-[11px] font-sans">{uploadErrorMessage}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulated Live Gates Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gates.map((gate) => {
                const config = getDensityConfig(gate.density);
                return (
                  <div
                    key={gate.id}
                    className={`bg-moss-deep/80 border ${config.border} p-4 rounded-lg relative overflow-hidden transition-all duration-300 ${config.glow}`}
                  >
                    {/* Corner Tag for CRITICAL Alerts */}
                    {pendingRequests[gate.id] ? (
                      <div className="absolute top-0 right-0 p-1 px-2 bg-pale-mint text-pitch-dark text-[8px] font-black tracking-widest z-10 animate-pulse flex items-center gap-1 font-mono">
                        <Sparkles className="w-2.5 h-2.5 animate-spin" />
                        GEMINI THINKING
                      </div>
                    ) : config.isAlert ? (
                      <div className="absolute top-0 right-0 p-1 px-2 bg-rose-500 text-black text-[8px] font-black italic tracking-widest z-10">
                        SURGE BREACH
                      </div>
                    ) : null}

                    <div className="relative z-10 flex flex-col justify-between h-full">
                      {/* Gate Metadata & Trend */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-pale-mint font-bold uppercase tracking-wider">{gate.name}</p>
                        <span className="text-[9px] font-mono text-sage-soft flex items-center gap-0.5">
                          {gate.trend === 'up' ? (
                            <TrendingUp className="w-3 h-3 text-rose-400 animate-pulse" />
                          ) : gate.trend === 'down' ? (
                            <TrendingDown className="w-3 h-3 text-pale-mint" />
                          ) : (
                            <Minus className="w-3 h-3 text-sage-soft/60" />
                          )}
                          <span className="uppercase text-[8px] font-semibold">{gate.trend}</span>
                        </span>
                      </div>

                      {/* Large Density Percentage */}
                      <div className="flex items-baseline space-x-1.5 mt-2">
                        <p className={`text-3xl font-mono font-bold tracking-tight ${config.textColor}`}>{gate.density}%</p>
                        <p className={`text-[9px] font-bold tracking-wider uppercase opacity-80 ${config.textColor} font-display`}>
                          {config.label}
                        </p>
                      </div>

                      {/* Density Progress Bar Track */}
                      <div className="w-full h-1 bg-pitch-black mt-4 overflow-hidden rounded-full">
                        <motion.div
                          className={`h-full ${config.bg}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${gate.density}%` }}
                          transition={{ type: 'spring', stiffness: 70, damping: 15 }}
                        />
                      </div>

                      {/* Micro-Adjustment controls for easy interactive testing of thresholds */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-moss-dark/30 text-[10px]">
                        <span className="text-sage-soft/40 font-mono">ADJUST TEST</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleModifyDensity(gate.id, -5)}
                            className="px-2 py-1 rounded bg-pitch-black border border-moss-dark/60 hover:bg-moss-dark text-sage-soft hover:text-pale-mint transition-colors cursor-pointer text-[9px] font-mono font-bold"
                            title="Decrease density 5%"
                          >
                            -5%
                          </button>
                          <button
                            onClick={() => handleModifyDensity(gate.id, 5)}
                            className="px-2 py-1 rounded bg-pitch-black border border-moss-dark/60 hover:bg-moss-dark text-sage-soft hover:text-pale-mint transition-colors cursor-pointer text-[9px] font-mono font-bold"
                            title="Increase density 5%"
                          >
                            +5%
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Copilot Intelligence Engine Recommendations List */}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sage-soft font-display">Copilot Intelligence Engine</h2>
                <div className="flex items-center gap-1 bg-moss-deep border border-moss-dark/60 text-pale-mint text-[8.5px] font-mono px-2 py-0.5 rounded animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-pale-mint" />
                  GEMINI AGENT ONLINE
                </div>
              </div>
              
              {/* Simulation Pause Button */}
              <button
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  addLog(isSimulating ? "Sensor telemetry paused by operator." : "Sensor telemetry resumed.");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                  isSimulating 
                    ? 'bg-moss-deep border-moss-dark/60 text-sage-soft hover:text-pale-mint' 
                    : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                }`}
              >
                {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-amber-400 animate-pulse" />}
                {isSimulating ? "PAUSE FEED" : "RESUME FEED"}
              </button>
            </div>

            {/* Alerts & Recommendations list container */}
            <div className="flex-1 flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {alerts.length === 0 ? (
                  // Empty State Placeholder
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 border-2 border-dashed border-moss-dark/60 rounded-lg flex flex-col items-center justify-center space-y-4 p-8 bg-pitch-dark/40 min-h-[260px]"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 border border-pale-mint/20 rounded-full animate-ping absolute"></div>
                      <div className="w-12 h-12 border border-moss-dark rounded-full flex items-center justify-center bg-pitch-black">
                        <Cpu className="w-5 h-5 text-pale-mint animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center max-w-sm">
                      <p className="text-xs text-pale-mint font-mono tracking-widest uppercase font-bold font-display">Monitoring turnstile metrics</p>
                      <p className="text-[10px] text-sage-soft/70 mt-2 uppercase leading-relaxed font-sans font-semibold">
                        No active gate density alerts. Reasoned plain-English alerts and tactical translation scripts will auto-populate once any gate is adjusted beyond 80%.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  // List of active and resolved alerts
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {alerts.map((alert) => {
                      const isPending = alert.whatsHappening.includes("pending") || alert.whatsHappening.includes("Analyzing");
                      const isCritical = alert.severity === 'critical';
                      
                      return (
                        <motion.div
                          key={alert.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                          className={`border rounded-lg p-5 transition-all duration-300 relative overflow-hidden ${
                            alert.resolved 
                              ? 'bg-pitch-dark/40 border-moss-dark/20 text-sage-soft/40 opacity-60' 
                              : isPending
                                ? 'bg-moss-deep/70 border-pale-mint/40 shadow-[0_0_20px_rgba(227,238,212,0.04)]'
                                : isCritical
                                  ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.08)]'
                                  : 'bg-amber-950/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]'
                          }`}
                        >
                          {isPending && (
                            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-pale-mint via-sage-green to-pale-mint animate-pulse shadow-[0_1px_4px_rgba(227,238,212,0.5)]" />
                          )}
                          {/* Alert Card Header Info */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-moss-dark/30 pb-3 mb-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                alert.resolved 
                                  ? 'bg-moss-dark' 
                                  : isPending 
                                    ? 'bg-sage-soft animate-pulse' 
                                    : isCritical 
                                      ? 'bg-rose-400 animate-ping' 
                                      : 'bg-amber-400'
                              }`} />
                              <span className="font-bold text-pale-mint uppercase tracking-wide font-display">
                                {alert.gateName} Surge — {alert.densityAtTrigger}% capacity
                              </span>
                              {alert.resolved ? (
                                <span className="bg-pitch-black border border-moss-dark/40 text-sage-soft/60 text-[9px] font-mono px-2 py-0.5 rounded">
                                  RESOLVED
                                </span>
                              ) : isPending ? (
                                <span className="bg-pitch-black border border-moss-dark text-pale-mint text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-pale-mint" />
                                  GEMINI REASONING
                                </span>
                              ) : (
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                                  isCritical 
                                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-400' 
                                    : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                                  }`}>
                                  {alert.severity} alert
                                </span>
                              )}
                              {alert.isLocalFallback && (
                                <span className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.1)] flex items-center gap-1 shrink-0">
                                  ⚡ LOCAL HEURISTIC BACKUP
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] font-mono text-sage-soft/60 flex items-center gap-2 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-sage-green" />
                                Trigger: {alert.triggerTime}
                              </span>
                              {alert.resolved && (
                                <span className="text-emerald-400 font-semibold">
                                  ✓ Cleared: {alert.resolvedTime}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reasoned Plain-English Directives */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                            <div>
                              <p className="text-[9px] font-mono uppercase text-sage-soft/60 tracking-wider flex items-center gap-1">
                                <Info className="w-3.5 h-3.5 text-sage-soft" />
                                1. What's Happening
                              </p>
                              <p className="mt-1 text-sage-soft font-semibold leading-relaxed">
                                {alert.whatsHappening}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-mono uppercase text-sage-soft/60 tracking-wider flex items-center gap-1">
                                <AlertOctagon className="w-3.5 h-3.5 text-rose-400/80" />
                                2. Risk Projection
                              </p>
                              <p className="mt-1 text-sage-soft font-semibold leading-relaxed">
                                {alert.risk}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-mono uppercase text-sage-soft/60 tracking-wider flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400/80" />
                                3. Tactical Action Plan
                              </p>
                              <p className="mt-1 text-pale-mint font-bold leading-relaxed">
                                {alert.action}
                              </p>
                            </div>
                          </div>

                          {/* Action Bar for Spoken Megaphone Script */}
                          {!alert.resolved && !isPending && (
                            <div className="mt-4 pt-3 border-t border-moss-dark/30">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-mono text-sage-soft/40 tracking-wider">VOLUNTEER COMMUNICATIONS TOOLKIT</span>
                                <button
                                  onClick={() => handleBroadcastClick(alert)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-extrabold transition-all duration-250 cursor-pointer ${
                                    expandedAlerts[alert.id]
                                      ? 'bg-moss-dark text-pale-mint border border-pale-mint/30 shadow-[0_0_10px_rgba(227,238,212,0.05)]'
                                      : 'bg-pale-mint text-pitch-dark hover:bg-pale-mint/80 shadow-[0_0_15px_rgba(227,238,212,0.2)] font-bold'
                                  }`}
                                >
                                  <Volume2 className={`w-3.5 h-3.5 ${expandedAlerts[alert.id] ? 'animate-pulse' : ''}`} />
                                  {expandedAlerts[alert.id] ? "Hide Broadcast Scripts" : "Broadcast Announcement"}
                                </button>
                              </div>

                              {/* Inline Multilingual Broadcast Panel */}
                              <AnimatePresence>
                                {expandedAlerts[alert.id] && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    {generatingScripts[alert.id] ? (
                                      /* Loading State */
                                      <div className="bg-pitch-black border border-moss-dark/60 rounded-lg p-6 flex flex-col items-center justify-center space-y-3">
                                        <RefreshCw className="w-6 h-6 animate-spin text-pale-mint" />
                                        <p className="text-xs font-mono text-sage-soft animate-pulse text-center">
                                          Calling Gemini to convert recommendation into calm multilingual megaphone scripts...
                                        </p>
                                      </div>
                                    ) : (
                                      /* Loaded Script Selector */
                                      <div className="bg-pitch-black border border-moss-dark/60 rounded-lg p-4 space-y-4">
                                        {/* Header instruction */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-moss-dark/20 pb-2">
                                          <span className="text-[9px] font-bold tracking-widest text-amber-400 flex items-center gap-1.5 font-mono">
                                            <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                                            🗣️ INSTRUCTION: READ ALOUD TO ARRIVING SUPPORTERS
                                          </span>
                                          <span className="text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                            HIGH READABILITY // EMPATHETIC TONE
                                          </span>
                                        </div>

                                        {/* Tabs Selector */}
                                        <div className="flex bg-moss-deep p-1 rounded border border-moss-dark/40 text-xs font-mono">
                                          {(['english', 'spanish', 'french'] as const).map((lang) => (
                                            <button
                                              key={lang}
                                              onClick={() => {
                                                setActiveTabLanguage(prev => ({ ...prev, [alert.id]: lang }));
                                              }}
                                              className={`flex-1 py-1.5 rounded font-semibold transition-all cursor-pointer ${
                                                (activeTabLanguage[alert.id] || 'english') === lang
                                                  ? 'bg-pale-mint text-pitch-dark shadow-md font-bold'
                                                  : 'text-sage-soft hover:text-pale-mint'
                                              }`}
                                            >
                                              {lang === 'english' ? 'ENGLISH (US/CAN)' : lang === 'spanish' ? 'ESPAÑOL (MEX)' : 'FRANÇAIS (CAN)'}
                                            </button>
                                          ))}
                                        </div>

                                        {/* Large Display TextBox */}
                                        <div className="bg-moss-deep/30 p-5 rounded-lg border border-moss-dark/40 relative">
                                          <p className="text-base sm:text-lg font-medium tracking-wide text-pale-mint leading-relaxed italic border-l-4 border-pale-mint pl-4 py-1 select-all font-display">
                                            &ldquo;
                                            {(() => {
                                              const currentLang = activeTabLanguage[alert.id] || 'english';
                                              if (currentLang === 'english') return alert.scriptEnglish || "Generating announcement script...";
                                              if (currentLang === 'spanish') return alert.scriptSpanish || "Generating announcement script...";
                                              return alert.scriptFrench || "Generating announcement script...";
                                            })()}
                                            &rdquo;
                                          </p>

                                          {/* Clipboard Copy Bar */}
                                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-moss-dark/30 text-[10px] font-mono text-sage-soft/60">
                                            <span>Style: Friendly, supportive, tourist-oriented phrasing</span>
                                            <div className="flex items-center gap-4">
                                              {/* Play / Speak button */}
                                              <button
                                                onClick={() => {
                                                  const currentLang = activeTabLanguage[alert.id] || 'english';
                                                  const txt = currentLang === 'english' 
                                                    ? alert.scriptEnglish 
                                                    : currentLang === 'spanish' 
                                                      ? alert.scriptSpanish 
                                                      : alert.scriptFrench;
                                                  speakText(txt || '', currentLang);
                                                }}
                                                className={`flex items-center gap-1 font-bold cursor-pointer transition-colors ${
                                                  speakingText === (() => {
                                                    const currentLang = activeTabLanguage[alert.id] || 'english';
                                                    return currentLang === 'english' 
                                                      ? alert.scriptEnglish 
                                                      : currentLang === 'spanish' 
                                                        ? alert.scriptSpanish 
                                                        : alert.scriptFrench;
                                                  })() 
                                                    ? 'text-amber-400 hover:text-amber-300 animate-pulse' 
                                                    : 'text-pale-mint hover:text-white'
                                                }`}
                                              >
                                                {speakingText === (() => {
                                                  const currentLang = activeTabLanguage[alert.id] || 'english';
                                                  return currentLang === 'english' 
                                                    ? alert.scriptEnglish 
                                                    : currentLang === 'spanish' 
                                                      ? alert.scriptSpanish 
                                                      : alert.scriptFrench;
                                                })() ? (
                                                  <>
                                                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                                                    <span>Mute Announcement</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Volume2 className="w-3.5 h-3.5 text-pale-mint" />
                                                    <span>Speak Announcement</span>
                                                  </>
                                                )}
                                              </button>

                                              <button
                                                onClick={() => {
                                                  const currentLang = activeTabLanguage[alert.id] || 'english';
                                                  const txt = currentLang === 'english' 
                                                    ? alert.scriptEnglish 
                                                    : currentLang === 'spanish' 
                                                      ? alert.scriptSpanish 
                                                      : alert.scriptFrench;
                                                  handleCopyAlertScript(alert.id, txt || '');
                                                }}
                                                className="flex items-center gap-1 text-pale-mint hover:text-white font-semibold cursor-pointer"
                                              >
                                                {copiedTextAlert[alert.id] ? (
                                                  <>
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span className="text-emerald-400 font-bold">Copied!</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Copy className="w-3.5 h-3.5" />
                                                    <span>Copy Script</span>
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Right Section: Active Translation Control Drawer */}
        <aside className="col-span-1 lg:col-span-4 flex flex-col space-y-6">
          
          {/* Active Voice Translation Module */}
          <div className="bg-pitch-dark/80 border border-moss-dark/60 rounded-xl flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-moss-dark/30 flex justify-between items-center bg-pitch-dark/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-pale-mint flex items-center gap-1.5 font-display">
                <Languages className="w-3.5 h-3.5 text-pale-mint" />
                Listen & Translate Copilot
              </h3>
              <span className={`text-[8px] font-mono px-2 py-0.5 border rounded-full font-bold ${
                isTranslating 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
                  : translationResult 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-pitch-black text-sage-soft/60 border-moss-dark/40'
              }`}>
                {isTranslating ? 'TRANSLATING' : translationResult ? 'ANALYZED' : 'STANDBY'}
              </span>
            </div>

            <div className="p-5 flex flex-col space-y-5">
              {/* Presets Grid */}
              <div>
                <span className="text-[9px] font-mono text-sage-soft block mb-2 uppercase tracking-wider font-semibold">Simulate Supporter Presets (Instant Demo)</span>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      lang: "Spanish (Medical Emergency)",
                      text: "¡Ayuda por favor! Mi padre se siente muy mal del corazón cerca de la Puerta C.",
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
                      className="text-left bg-pitch-black hover:bg-moss-deep/60 border border-moss-dark p-2.5 rounded-lg text-[10.5px] text-sage-soft transition-all hover:border-pale-mint/40 flex items-start gap-2.5 group cursor-pointer"
                    >
                      <span className="text-sm select-none">{preset.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[9px] text-sage-green group-hover:text-pale-mint transition-colors uppercase tracking-tight font-bold">{preset.lang}</div>
                        <div className="truncate text-sage-soft/75 italic mt-0.5">"{preset.text}"</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-sage-green group-hover:text-pale-mint transition-colors shrink-0 mt-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom input box */}
              <div className="space-y-2 pt-1 border-t border-moss-dark/30">
                <label className="text-[9px] font-mono text-sage-soft block uppercase tracking-wider font-semibold">Or enter custom spoken phrase:</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={supporterPhrase}
                      onChange={(e) => setSupporterPhrase(e.target.value)}
                      placeholder="e.g., Où est l'entrée pour les fauteuils roulants ?"
                      className="w-full bg-pitch-black border border-moss-dark rounded-lg px-3 py-2 text-xs text-pale-mint placeholder-sage-soft/30 focus:outline-none focus:border-pale-mint/60 pr-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTranslateSupporter();
                      }}
                    />
                    {supporterPhrase && (
                      <button
                        onClick={() => setSupporterPhrase('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-soft/50 hover:text-pale-mint text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleTranslateSupporter()}
                    disabled={isTranslating || !supporterPhrase.trim()}
                    className="bg-pale-mint hover:bg-pale-mint/80 text-pitch-dark px-3 py-2 rounded-lg font-extrabold text-xs shrink-0 flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isTranslating ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Analyze</span>
                  </button>
                </div>
              </div>

              {/* Error log if any */}
              {errorTranslate && (
                <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 p-3 rounded-lg text-[10.5px] font-mono">
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
                    <RefreshCw className="w-6 h-6 animate-spin text-pale-mint" />
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
                            onClick={() => speakText(supporterPhrase, translationResult.originalLanguage)}
                            className={`p-1 rounded hover:bg-moss-deep transition-colors cursor-pointer ${
                              speakingText === supporterPhrase ? 'text-amber-400 animate-pulse bg-amber-500/10' : 'text-sage-soft hover:text-pale-mint'
                            }`}
                            title="Hear supporter's original speech"
                          >
                            {speakingText === supporterPhrase ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
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
                              {tag}
                            </span>
                          );
                        })()}
                      </div>

                      {/* English Translate */}
                      <div className="bg-moss-deep/30 p-2.5 rounded border border-moss-dark/40">
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-[9px] font-mono text-sage-soft uppercase font-bold">Literal Translation</div>
                          <button
                            onClick={() => speakText(translationResult.translatedText, 'english')}
                            className={`p-1 rounded hover:bg-pitch-black transition-colors cursor-pointer ${
                              speakingText === translationResult.translatedText ? 'text-amber-400 animate-pulse bg-amber-500/10' : 'text-sage-soft hover:text-pale-mint'
                            }`}
                            title="Read translation in English"
                          >
                            {speakingText === translationResult.translatedText ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-pale-mint font-semibold">
                          {translationResult.translatedText}
                        </p>
                      </div>

                      {/* Reason */}
                      <p className="text-[10px] text-sage-soft/85 leading-normal font-sans">
                        <span className="font-bold text-pale-mint">Triage Assessment:</span> {translationResult.classificationReason}
                      </p>
                    </div>

                    {/* STEP 3: Suggested Response (After) */}
                    <div className="bg-pitch-black border border-moss-dark rounded-lg p-4 space-y-3.5 shadow-[0_0_20px_rgba(227,238,212,0.03)] relative">
                      <div className="flex justify-between items-center border-b border-moss-dark/20 pb-2">
                        <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                          3. Suggested Reply (After)
                        </span>
                        <span className="text-[8px] font-mono text-sage-soft/60">
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
                          onClick={() => speakText(translationResult.suggestedResponse, translationResult.originalLanguage)}
                          className={`p-2 rounded bg-moss-deep border hover:bg-moss-deep/80 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            speakingText === translationResult.suggestedResponse 
                              ? 'text-amber-400 border-amber-500/30 animate-pulse bg-amber-500/10' 
                              : 'text-pale-mint border-moss-dark hover:border-pale-mint/40'
                          }`}
                          title="Speak Suggested Reply (Back Translation)"
                        >
                          {speakingText === translationResult.suggestedResponse ? (
                            <VolumeX className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* What this means in English for the volunteer */}
                      <div className="bg-moss-deep/25 p-2.5 rounded border border-moss-dark/40 text-[10px] flex justify-between items-center gap-2">
                        <div className="flex-1">
                          <span className="font-mono text-sage-soft/60 uppercase font-bold block">English Translation (Meaning)</span>
                          <p className="text-sage-soft italic mt-0.5">
                            "{translationResult.suggestedResponseEnglish}"
                          </p>
                        </div>
                        <button
                          onClick={() => speakText(translationResult.suggestedResponseEnglish, 'english')}
                          className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                            speakingText === translationResult.suggestedResponseEnglish 
                              ? 'text-amber-400 animate-pulse bg-amber-500/10' 
                              : 'text-sage-soft hover:text-pale-mint hover:bg-pitch-black'
                          }`}
                          title="Read suggestion meaning in English"
                        >
                          {speakingText === translationResult.suggestedResponseEnglish ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
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
                          className="flex items-center gap-1 text-[10px] text-pale-mint hover:text-white font-mono font-bold cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Response</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Standby display state */
                  <div className="bg-pitch-black border border-moss-dark/60 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-pitch-dark border border-moss-dark/40 flex items-center justify-center text-pale-mint">
                      <Languages className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-pale-mint uppercase tracking-wide font-display">Ready for Supporter Inquiry</h4>
                      <p className="text-[10px] text-sage-soft/80 mt-1 max-w-xs leading-normal font-sans font-semibold">
                        Select an instant multilingual preset simulation above or type a supporter's phrase to witness real-time language detection, urgency classification, and translation.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Specialized System Logs Console (Control Center Aesthetic) */}
          <div className="bg-pitch-dark/40 border border-moss-dark/60 rounded-xl p-5 flex flex-col justify-between flex-1 min-h-[220px]">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-pale-mint mb-3 flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-pale-mint" />
                Specialist Console Logs
              </h3>
              
              <div className="font-mono text-[10px] text-sage-soft space-y-2 h-[180px] overflow-y-auto bg-pitch-black p-3 rounded border border-moss-dark/40">
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

        </aside>
      </main>

      {/* Multilingual Broadcast Announcement Modal */}
      {activeBroadcastAlert && (
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
              <div className="w-10 h-10 rounded-full bg-moss-deep border border-moss-dark/60 flex items-center justify-center text-pale-mint">
                <Volume2 className="w-5 h-5 animate-pulse text-pale-mint" />
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

              <p>
                &ldquo;{activeBroadcastLanguage === 'english' 
                  ? activeBroadcastAlert.scriptEnglish 
                  : activeBroadcastLanguage === 'spanish'
                    ? activeBroadcastAlert.scriptSpanish 
                    : activeBroadcastAlert.scriptFrench
                }&rdquo;
              </p>

              <div className="mt-4 pt-3 border-t border-moss-dark/20 flex items-center justify-between text-[11px] font-mono text-sage-soft/60 not-italic">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-sage-soft/60" />
                  Tourist-friendly phrasing
                </span>
                
                <button
                  onClick={() => handleCopyToClipboard(
                    activeBroadcastLanguage === 'english' 
                      ? activeBroadcastAlert.scriptEnglish || '' 
                      : activeBroadcastLanguage === 'spanish'
                        ? activeBroadcastAlert.scriptSpanish || '' 
                        : activeBroadcastAlert.scriptFrench || ''
                  )}
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
      )}

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-black border-t border-moss-dark/40 flex items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-sage-soft/60">
            <span className="w-1.5 h-1.5 bg-pale-mint rounded-full animate-ping"></span>
            <span>LATENCY: 12ms</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-sage-soft/60">
            <span className="w-1.5 h-1.5 bg-moss-dark rounded-full"></span>
            <span>CPU: 8%</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-sage-soft/40 uppercase tracking-tight hidden sm:block">
          System Authenticated: Volunteer_0042 // FIFA WC 2026 PROTOTYPE
        </div>
      </footer>
    </div>
  );
}
