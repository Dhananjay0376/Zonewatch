/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechSynthesis(addLog: (msg: string) => void) {
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const speakingTextRef = useRef<string | null>(null);

  // Keep ref in sync to avoid dependency issues inside callbacks
  useEffect(() => {
    speakingTextRef.current = speakingText;
  }, [speakingText]);

  const playAnnouncement = useCallback((text: string, langNameOrCode: string = 'en') => {
    if (!window.speechSynthesis) {
      addLog("Speech Synthesis is not supported in this browser.");
      return;
    }

    // Toggle playback off if clicked while already speaking this exact text
    if (speakingTextRef.current === text) {
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
    } else if (cleanLang.includes('hind') || cleanLang === 'hi') {
      resolvedLang = 'hi-IN';
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
  }, [addLog]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speakingText,
    setSpeakingText,
    playAnnouncement
  };
}
