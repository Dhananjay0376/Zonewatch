/**
 * Smoke tests for useAcousticSensor hook.
 *
 * Strategy: stub SpeechRecognition on window so the hook can be instantiated.
 * navigator.mediaDevices.getUserMedia is stubbed to reject (simulating a
 * sandboxed iframe), which is the realistic JSDOM scenario. The hook handles
 * this gracefully by falling back to simulated audio metrics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAcousticSensor } from './useAcousticSensor';

// ----- SpeechRecognition stub ----------------------------------------------

const mockRecognitionStart = vi.fn();
const mockRecognitionStop  = vi.fn();

/** Minimal SpeechRecognitionResultEvent shape used only in tests. */
interface MockSpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

/** Minimal SpeechRecognitionErrorEvent shape used only in tests. */
interface MockSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

class MockSpeechRecognition {
  continuous      = false;
  interimResults  = false;
  lang            = '';
  onresult: ((e: MockSpeechRecognitionEvent) => void) | null = null;
  onerror:  ((e: MockSpeechRecognitionErrorEvent) => void) | null = null;
  start = mockRecognitionStart;
  stop  = mockRecognitionStop;
}

// ---------------------------------------------------------------------------

describe('useAcousticSensor', () => {
  const addLog                  = vi.fn();
  const setSupporterPhrase      = vi.fn();
  const onAcousticCaptureCompleted = vi.fn();

  const defaultProps = {
    speechInputLang: 'en-US',
    supporterPhrase: '',
    setSupporterPhrase,
    addLog,
    onAcousticCaptureCompleted,
  };

  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
    // Simulate mic permission denied (typical in test environments)
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
      writable: true,
      configurable: true,
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    addLog.mockClear();
    setSupporterPhrase.mockClear();
    onAcousticCaptureCompleted.mockClear();
    mockRecognitionStart.mockClear();
    mockRecognitionStop.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initialises with isListening = false and no errors', () => {
    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    expect(result.current.isListening).toBe(false);
    expect(result.current.micPermissionError).toBeNull();
    expect(result.current.voiceToneResult).toBeNull();
  });

  it('sets isListening = true when startVoiceListening is called', async () => {
    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    await act(async () => {
      result.current.startVoiceListening();
    });
    expect(result.current.isListening).toBe(true);
  });

  it('starts speech recognition when the API is available', async () => {
    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    await act(async () => {
      result.current.startVoiceListening();
    });
    expect(mockRecognitionStart).toHaveBeenCalledTimes(1);
  });

  it('sets isListening = false after stopVoiceListening', async () => {
    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    await act(async () => {
      result.current.startVoiceListening();
    });
    act(() => {
      result.current.stopVoiceListening();
    });
    expect(result.current.isListening).toBe(false);
  });

  it('produces a VoiceToneResult after stopVoiceListening (simulated mode)', async () => {
    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    await act(async () => {
      result.current.startVoiceListening();
    });
    act(() => {
      result.current.stopVoiceListening();
    });

    const tone = result.current.voiceToneResult;
    expect(tone).not.toBeNull();
    expect(tone!.isSimulated).toBe(true);
    // Simulated confidence is in the 88-97 range
    expect(tone!.confidence).toBeGreaterThanOrEqual(88);
    expect(tone!.confidence).toBeLessThanOrEqual(99);
  });

  it('fires onAcousticCaptureCompleted with a non-empty phrase', async () => {
    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    await act(async () => {
      result.current.startVoiceListening();
    });
    act(() => {
      result.current.stopVoiceListening();
    });
    expect(onAcousticCaptureCompleted).toHaveBeenCalledTimes(1);
    const [phrase] = onAcousticCaptureCompleted.mock.calls[0] as [string];
    expect(phrase.length).toBeGreaterThan(0);
  });

  it('exposes micPermissionError when SpeechRecognition API is absent', async () => {
    // Remove both SR constructors so the hook takes the "not supported" branch.
    // Cast window to a plain record for test-only property manipulation.
    // The double-cast through `unknown` is required because Window & typeof globalThis
    // does not have an index signature for string keys.
    const win = window as unknown as Window & Record<string, unknown>;
    const origSR  = win['SpeechRecognition'];
    const origWSR = win['webkitSpeechRecognition'];
    delete win.SpeechRecognition;
    delete win.webkitSpeechRecognition;

    // Also nullify mediaDevices so getUserMedia can't run and overwrite the
    // SR-absent error with its own "not granted" message.
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useAcousticSensor(defaultProps));
    await act(async () => {
      result.current.startVoiceListening();
    });

    expect(result.current.micPermissionError).toMatch(/not supported/i);

    // Restore both globals
    if (origSR)  win['SpeechRecognition']  = origSR;
    if (origWSR) win['webkitSpeechRecognition'] = origWSR;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: origMediaDevices,
      writable: true,
      configurable: true,
    });
  });
});
