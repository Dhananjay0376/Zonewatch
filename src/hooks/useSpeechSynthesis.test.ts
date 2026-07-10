/**
 * Smoke tests for useSpeechSynthesis hook.
 *
 * Strategy: stub window.speechSynthesis and SpeechSynthesisUtterance so that
 * no real browser speech API is required in JSDOM.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechSynthesis } from './useSpeechSynthesis';

// ----- Stubs ---------------------------------------------------------------

const mockCancel = vi.fn();
const mockSpeak  = vi.fn();

// SpeechSynthesisUtterance stub — must be class-shaped for `new` to work
class MockUtterance {
  lang  = '';
  rate  = 1;
  pitch = 1;
  onstart: (() => void) | null = null;
  onend:   (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function stubSpeechSynthesis() {
  vi.stubGlobal('speechSynthesis', { cancel: mockCancel, speak: mockSpeak });
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
}

// ---------------------------------------------------------------------------

describe('useSpeechSynthesis', () => {
  const addLog = vi.fn();

  beforeEach(() => {
    stubSpeechSynthesis();
    addLog.mockClear();
    mockCancel.mockClear();
    mockSpeak.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initialises with speakingText = null', () => {
    const { result } = renderHook(() => useSpeechSynthesis(addLog));
    expect(result.current.speakingText).toBeNull();
  });

  it('calls speechSynthesis.speak() and sets speakingText when playAnnouncement fires onstart', () => {
    const { result } = renderHook(() => useSpeechSynthesis(addLog));

    act(() => {
      result.current.playAnnouncement('Gate B is now open', 'en');
    });

    // speak() should have been called once
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe('Gate B is now open');
    expect(utterance.lang).toBe('en-US');

    // Simulate the browser firing onstart
    act(() => { utterance.onstart?.(); });
    expect(result.current.speakingText).toBe('Gate B is now open');

    // Simulate onend
    act(() => { utterance.onend?.(); });
    expect(result.current.speakingText).toBeNull();
  });

  it('toggles off (cancel) when playAnnouncement is called again with the same text', () => {
    const { result } = renderHook(() => useSpeechSynthesis(addLog));

    act(() => {
      result.current.playAnnouncement('Hello', 'en');
    });
    const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
    act(() => { utterance.onstart?.(); });
    expect(result.current.speakingText).toBe('Hello');

    // Call again with the same text → should cancel
    act(() => {
      result.current.playAnnouncement('Hello', 'en');
    });
    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.speakingText).toBeNull();
  });

  it('resolves language codes correctly — Spanish maps to es-MX', () => {
    const { result } = renderHook(() => useSpeechSynthesis(addLog));
    act(() => { result.current.playAnnouncement('Hola', 'es'); });
    const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
    expect(utterance.lang).toBe('es-MX');
  });

  it('logs a warning and does not call speak() when speechSynthesis is unavailable', () => {
    // Remove the stub so window.speechSynthesis is undefined
    vi.unstubAllGlobals();

    const { result } = renderHook(() => useSpeechSynthesis(addLog));
    act(() => { result.current.playAnnouncement('Test', 'en'); });

    expect(mockSpeak).not.toHaveBeenCalled();
    expect(addLog).toHaveBeenCalledWith(expect.stringContaining('not supported'));
  });

  it('cancels synthesis on hook unmount', () => {
    // Re-stub for this test since afterEach unstubs
    stubSpeechSynthesis();
    const { unmount } = renderHook(() => useSpeechSynthesis(addLog));
    unmount();
    expect(mockCancel).toHaveBeenCalled();
  });
});
