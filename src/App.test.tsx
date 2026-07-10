import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

// Stub speechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  pause: vi.fn(),
  resume: vi.fn(),
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null,
};

describe('App Client Integration', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true,
    });

    global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
      text,
      lang: '',
      rate: 1,
      pitch: 1,
      volume: 1,
      onstart: null,
      onend: null,
      onerror: null,
    })) as any;

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Blocked')),
        },
        writable: true,
        configurable: true,
      });
    } else {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('Blocked'));
    }
  });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully translates a phrase and merges detectedTone', async () => {
    const translationResult = {
      originalLanguage: 'Spanish',
      translatedText: 'Where is the restroom?',
      urgencyTag: 'Casual',
      classificationReason: 'General inquiry about restrooms.',
      suggestedResponse: 'Los baños están allí.',
      suggestedResponseEnglish: 'Restrooms are there.',
      detectedTone: 'Frustrated'
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/translate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(translationResult),
        });
      }
      // default response for other endpoints (like /api/recommend triggered by Gate C)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<App />);

    // Type a phrase and click analyze
    const input = screen.getByPlaceholderText(/Où est l'entrée/i);
    fireEvent.change(input, { target: { value: 'donde esta el baño' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze/i });
    
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    // Wait for translation to populate
    await waitFor(() => {
      expect(screen.getByText(/Where is the restroom\?/i)).toBeInTheDocument();
    });

    // Verify literal translation details
    expect(screen.getByText(/Los baños están allí./i)).toBeInTheDocument();

    // Verify detectedTone merged into signature section
    expect(screen.getByText(/Frustrated/i)).toBeInTheDocument();
  });

  it('handles translation failures by invoking local offline fallback', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/translate') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<App />);

    // Type accessibility-related phrase to trigger the local offline fallback branch
    const input = screen.getByPlaceholderText(/Où est l'entrée/i);
    fireEvent.change(input, { target: { value: 'silla de ruedas' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze/i });

    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    // Wait for the fallback text to appear
    await waitFor(() => {
      expect(screen.getByText(/Where is the wheelchair ramp \/ elevator\?/i)).toBeInTheDocument();
    });

    // Confirm that it did not crash the UI and clearly annotated that a fallback path occurred
    expect(screen.getByText(/LOCAL BACKUP/i)).toBeInTheDocument();
    expect(screen.getByText(/Concerned & Seeking Assistance \(Offline Fallback\)/i)).toBeInTheDocument();
  });
});
