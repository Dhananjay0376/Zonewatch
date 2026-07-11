import { describe, it, expect } from 'vitest';
import {
  getRecommendFallback,
  getRecommendUltimateFallback,
  getBroadcastScriptFallback,
  getTranslateFallback,
  getParseFileFallback
} from './fallbacks';

describe('fallbacks - getRecommendFallback', () => {
  it('should redirect to the lowest density gate', () => {
    const gate = { id: 'gate-b', name: 'Gate B', density: 85, trend: 'up' as const };
    const gates = [
      gate,
      { id: 'gate-c', name: 'Gate C', density: 40, trend: 'stable' as const },
      { id: 'gate-d', name: 'Gate D', density: 15, trend: 'down' as const }
    ];
    const result = getRecommendFallback(gate, gates);
    expect(result.action).toContain('Gate D');
    expect(result.action).toContain('15%');
    expect(result.isLocalFallback).toBe(true);
  });
});

describe('fallbacks - getRecommendUltimateFallback', () => {
  it('should redirect to the lowest density gate', () => {
    const gate = { id: 'gate-b', name: 'Gate B', density: 85, trend: 'up' as const };
    const gates = [
      gate,
      { id: 'gate-c', name: 'Gate C', density: 50, trend: 'stable' as const },
      { id: 'gate-d', name: 'Gate D', density: 10, trend: 'down' as const }
    ];
    const result = getRecommendUltimateFallback(gate, gates);
    expect(result.action).toContain('Gate D');
    expect(result.isLocalFallback).toBe(true);
  });
});

describe('fallbacks - getBroadcastScriptFallback', () => {
  it('should return script containing gate name or default', () => {
    const scriptWithGateName = getBroadcastScriptFallback('Gate C');
    expect(scriptWithGateName.scriptEnglish).toContain('Gate C');

    const scriptDefault = getBroadcastScriptFallback('');
    expect(scriptDefault.scriptEnglish).toContain('this gate');
  });
});

describe('fallbacks - getTranslateFallback', () => {
  it('should route Medical cases correctly (Spanish)', () => {
    const phrase = 'Me siento enfermo y tengo dolor en el corazón';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Medical');
    expect(result.detectedTone).toBe('Panic-stricken & Distressed');
  });

  it('should route Medical cases correctly (German)', () => {
    const phrase = 'arzt hilfe bitte';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Medical');
    expect(result.originalLanguage).toBe('German');
  });

  it('should route Medical cases correctly (French)', () => {
    const phrase = 'secours medecin s\'il vous plait';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Medical');
    expect(result.originalLanguage).toBe('French');
  });

  it('should route Accessibility cases correctly (Spanish)', () => {
    const phrase = '¿Dónde está la rampa de acceso para la silla de ruedas?';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Accessibility');
    expect(result.detectedTone).toBe('Concerned & Seeking Assistance');
  });

  it('should route Accessibility cases correctly (Japanese)', () => {
    const phrase = 'くるまいす エレベーター';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Accessibility');
    expect(result.originalLanguage).toBe('Japanese');
  });

  it('should route Casual cases correctly (Spanish / French)', () => {
    const phrase = 'où sont les toilettes s\'il vous plaît';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Casual');
    expect(result.originalLanguage).toBe('French');
  });

  it('should fallback to Auto-Detected Casual if no keywords match', () => {
    const phrase = 'Hello can you help me find my seat?';
    const result = getTranslateFallback(phrase);
    expect(result.urgencyTag).toBe('Casual');
    expect(result.originalLanguage).toBe('Auto-Detected');
    expect(result.translatedText).toBe(phrase);
  });
});

describe('fallbacks - getParseFileFallback', () => {
  it('should return a preset array of gates', () => {
    const gates = getParseFileFallback();
    expect(gates).toHaveLength(4);
    expect(gates[0].id).toBe('gate-b');
  });
});
