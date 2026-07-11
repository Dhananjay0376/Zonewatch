/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Gate, Alert } from '../types';
import { getDensityFluctuation } from '../utils/math';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface StadiumGatesProps {
  addLog: (msg: string) => void;
}

export function useStadiumGates({ addLog }: StadiumGatesProps) {
  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

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
  const [isRushing, setIsRushing] = useState<boolean>(false);
  const [rushingStep, setRushingStep] = useState<number>(0);

  const rushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep latest refs to avoid re-triggering effects with outdated state
  const gatesRef = useRef(gates);
  const alertsRef = useRef(alerts);
  const gateHistoryRef = useRef(gateHistory);
  const pendingRequestsRef = useRef(pendingRequests);

  useEffect(() => {
    gatesRef.current = gates;
  }, [gates]);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    gateHistoryRef.current = gateHistory;
  }, [gateHistory]);

  useEffect(() => {
    pendingRequestsRef.current = pendingRequests;
  }, [pendingRequests]);

  // Synchronise alerts in real-time with Firestore (skip in Vitest)
  useEffect(() => {
    if (isTestEnv) return;

    const q = query(collection(db, 'alerts'), orderBy('triggerTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbAlerts: Alert[] = [];
      snapshot.forEach((doc) => {
        fbAlerts.push({ id: doc.id, ...doc.data() } as Alert);
      });
      setAlerts(fbAlerts);
    }, (err) => {
      console.error("Firestore subscription error:", err);
    });
    return () => unsubscribe();
  }, [isTestEnv]);

  // Resolve active alert
  const resolveActiveAlert = useCallback(async (gateId: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (isTestEnv) {
      setAlerts(prev => prev.map(alert => {
        if (alert.gateId === gateId && !alert.resolved) {
          addLog(`System nominals restored on ${alert.gateName}. Resolution logged.`);
          return {
            ...alert,
            resolved: true,
            resolvedTime: timestamp
          };
        }
        return alert;
      }));
      return;
    }

    const alertToResolve = alertsRef.current.find(alert => alert.gateId === gateId && !alert.resolved);
    
    if (alertToResolve) {
      addLog(`System nominals restored on ${alertToResolve.gateName}. Resolution logged to Firestore.`);
      try {
        await updateDoc(doc(db, 'alerts', alertToResolve.id), {
          resolved: true,
          resolvedTime: timestamp
        });
      } catch (err) {
        console.error("Failed to resolve alert in Firestore:", err);
      }
    }
  }, [addLog, isTestEnv]);

  // Execute Gemini reasoning operational recommendation API call
  const triggerGeminiRecommendation = useCallback(async (targetGate: Gate) => {
    setPendingRequests(prev => ({ ...prev, [targetGate.id]: true }));
    addLog(`Density breach detected on ${targetGate.name} (${targetGate.density}%). Querying Gemini...`);

    const tempId = `alert-${Date.now()}-${targetGate.id}`;
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

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

    if (isTestEnv) {
      setAlerts(prev => {
        const nextAlerts = [placeholderAlert, ...prev];
        if (nextAlerts.length > 30) return nextAlerts.slice(0, 30);
        return nextAlerts;
      });
    } else {
      try {
        await setDoc(doc(db, 'alerts', tempId), placeholderAlert);
      } catch (err) {
        console.error("Failed to write initial alert to Firestore:", err);
      }
    }

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate: targetGate,
          gates: gatesRef.current,
          history: gateHistoryRef.current[targetGate.id] || []
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const result = await response.json();

      if (isTestEnv) {
        setAlerts(prev => prev.map(alert => {
          if (alert.id === tempId) {
            return {
              ...alert,
              whatsHappening: result.whatsHappening,
              risk: result.risk,
              action: result.action,
              scriptEnglish: result.scriptEnglish,
              scriptSpanish: result.scriptSpanish,
              scriptFrench: result.scriptFrench,
              isLocalFallback: result.isLocalFallback,
              severity: targetGate.density >= 90 ? 'critical' : 'warning',
            };
          }
          return alert;
        }));
      } else {
        await updateDoc(doc(db, 'alerts', tempId), {
          whatsHappening: result.whatsHappening,
          risk: result.risk,
          action: result.action,
          scriptEnglish: result.scriptEnglish,
          scriptSpanish: result.scriptSpanish,
          scriptFrench: result.scriptFrench,
          isLocalFallback: result.isLocalFallback,
          severity: targetGate.density >= 90 ? 'critical' : 'warning',
        });
      }

      addLog(`Gemini Copilot generated actionable route plan for ${targetGate.name}.`);
    } catch (err: unknown) {
      console.error(err);
      addLog(`CRITICAL: Gemini query failed for ${targetGate.name}. Using fallback directives.`);
      
      const fallbackUpdates = {
        whatsHappening: `Unusual congestion detected at ${targetGate.name} (${targetGate.density}%).`,
        risk: "Risk of high local density causing queuing and delays.",
        action: "Operational copilot advises manually routing arriving fans to adjacent low-density gates.",
        scriptEnglish: `Attention guests: Please move to the other gates to get inside faster. Thank you!`,
        scriptSpanish: `Atención: Por favor diríjase a las otras puertas para ingresar más rápido. ¡Gracias!`,
        scriptFrench: `Attention s'il vous plaît: Veuillez vous diriger vers les autres portes. Merci!`,
        isLocalFallback: true,
      };

      if (isTestEnv) {
        setAlerts(prev => prev.map(alert => {
          if (alert.id === tempId) {
            return { ...alert, ...fallbackUpdates };
          }
          return alert;
        }));
      } else {
        try {
          await updateDoc(doc(db, 'alerts', tempId), fallbackUpdates);
        } catch (fErr) {
          console.error("Failed to write fallback to Firestore:", fErr);
        }
      }
    } finally {
      setPendingRequests(prev => ({ ...prev, [targetGate.id]: false }));
    }
  }, [addLog, isTestEnv]);

  // Fluctuating density simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setGates((prevGates) =>
        prevGates.map((gate) => {
          const fluctuation = getDensityFluctuation();
          let newDensity = gate.density + fluctuation;

          if (newDensity < 10) newDensity = 10;
          if (newDensity > 98) newDensity = 98;

          let newTrend: 'up' | 'down' | 'stable' = 'stable';
          if (fluctuation > 0) newTrend = 'up';
          if (fluctuation < 0) newTrend = 'down';

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
    }, 5000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Reactively audit density thresholds to trigger/resolve alerts
  // Hysteresis implementation: Trigger alert at >= 80%, but only resolve if density falls below 75%
  useEffect(() => {
    gates.forEach((gate) => {
      const activeAlert = alerts.find(alert => alert.gateId === gate.id && !alert.resolved);
      
      if (gate.density >= 80 && !activeAlert && !pendingRequests[gate.id]) {
        triggerGeminiRecommendation(gate);
      }
      
      if (gate.density < 75 && activeAlert) {
        resolveActiveAlert(gate.id);
      }
    });
  }, [gates, alerts, pendingRequests, triggerGeminiRecommendation, resolveActiveAlert]);

  // Force-simulate manual triggers for testing thresholds
  const handleModifyDensity = useCallback((id: string, amount: number) => {
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
  }, []);

  // Restore defaults
  const handleResetToDefault = useCallback(() => {
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
    addLog("Standard Live telemetry feed restored. Clearing custom mock states.");
  }, [addLog]);

  // Smoothly spikes Gates B and E to critical thresholds over 18 seconds (10 steps)
  const triggerSimulatedRush = useCallback(() => {
    if (isRushing) return;
    setIsRushing(true);
    setRushingStep(0);
    setIsSimulating(false); // Pause normal fluctuation
    addLog("🚨 DEMO INITIATED: Ramping Gates B and E to critical capacity!");

    const targetGates = ['gate-b', 'gate-e'];
    let step = 0;
    const totalSteps = 10;
    
    if (rushIntervalRef.current) {
      clearInterval(rushIntervalRef.current);
    }

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
        if (rushIntervalRef.current) {
          clearInterval(rushIntervalRef.current);
          rushIntervalRef.current = null;
        }
        setIsRushing(false);
        setIsSimulating(true); // Resume normal background telemetry
        addLog("🚀 DEMO SUCCESS: Surge simulation complete. Live gates breached critical levels!");
      }
    }, 1800);
    
    rushIntervalRef.current = interval;
  }, [isRushing, addLog]);

  useEffect(() => {
    return () => {
      if (rushIntervalRef.current) {
        clearInterval(rushIntervalRef.current);
      }
    };
  }, []);

  return {
    gates,
    setGates,
    gateHistory,
    setGateHistory,
    alerts,
    setAlerts,
    pendingRequests,
    setPendingRequests,
    isSimulating,
    setIsSimulating,
    isRushing,
    setIsRushing,
    rushingStep,
    setRushingStep,
    handleModifyDensity,
    handleResetToDefault,
    triggerSimulatedRush,
    resolveActiveAlert
  };
}
