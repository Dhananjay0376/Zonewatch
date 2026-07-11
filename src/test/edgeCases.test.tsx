import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import App from '../App';
import { useStadiumGates } from '../hooks/useStadiumGates';

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
};

describe('Edge Cases', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Empty or whitespace input submitted
  it('does not trigger a fetch or change state if translation input is empty/whitespace', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    render(<App />);

    const input = await screen.findByPlaceholderText(/Où est l'entrée/i, {}, { timeout: 10000 });
    fireEvent.change(input, { target: { value: '   ' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze/i });
    
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    // Fetch should not have been called for translation
    expect(fetchSpy).not.toHaveBeenCalledWith('/api/translate', expect.any(Object));
    // Status should remain STANDBY
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
  });

  // 2. Malformed or missing fields in simulated server response
  it('does not crash when server response is missing optional fields like detectedTone', async () => {
    const malformedResponse = {
      originalLanguage: 'Spanish',
      translatedText: 'Where is the gate?',
      urgencyTag: 'Casual',
      classificationReason: 'Normal inquiry.',
      suggestedResponse: 'Por allí.',
      suggestedResponseEnglish: 'Over there.',
      // detectedTone is missing
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/translate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(malformedResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<App />);

    const input = await screen.findByPlaceholderText(/Où est l'entrée/i, {}, { timeout: 10000 });
    fireEvent.change(input, { target: { value: 'Donde esta la puerta' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze/i });
    
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    // Wait for translation to populate
    await waitFor(() => {
      expect(screen.getByText(/Where is the gate\?/i)).toBeInTheDocument();
    });

    // Make sure it rendered successfully without crash
    expect(screen.getByText(/Por allí/i)).toBeInTheDocument();
  });

  // 3. Two gates crossing 80% threshold in same tick
  it('generates alerts independently for two gates crossing 80% at once', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            whatsHappening: 'Congestion',
            risk: 'Queue pressure',
            action: 'Redirect',
            scriptEnglish: 'Go elsewhere',
            scriptSpanish: 'Vaya a otro lado',
            scriptFrench: 'Allez ailleurs',
            isLocalFallback: false,
          }),
      })
    );

    const addLogMock = vi.fn();
    const { result } = renderHook(() => useStadiumGates({ addLog: addLogMock }));

    await act(async () => {
      // Gate B is 42%, Gate E is 19% initially.
      // Let's modify both to exceed 80% in the same tick.
      result.current.setGates((prev) =>
        prev.map((g) => {
          if (g.id === 'gate-b') return { ...g, density: 85 };
          if (g.id === 'gate-e') return { ...g, density: 88 };
          return g;
        })
      );
    });

    // Wait for the effect and fetches to run
    await act(async () => {
      await Promise.resolve();
    });

    // Check that alerts are generated for both Gate B and Gate E
    const alertB = result.current.alerts.find((a) => a.gateId === 'gate-b');
    const alertE = result.current.alerts.find((a) => a.gateId === 'gate-e');

    expect(alertB).toBeDefined();
    expect(alertE).toBeDefined();
  });

  // 4. Malformed or empty CSV/PDF file upload
  it('displays a clear error state when file parsing fails or is empty', async () => {
    /** Minimal ProgressEvent-like shape fired by our mock FileReader. */
    interface MockProgressEvent {
      target: { result: string };
    }
    // Stub FileReader as a proper class that fires onload asynchronously (matches real FileReader behavior)
    class MockFileReader {
      onload: ((e: MockProgressEvent) => void) | null = null;
      onerror: ((e: ProgressEvent) => void) | null = null;
      readAsDataURL() {
        const handler = this.onload;
        queueMicrotask(() => {
          handler?.({
            target: { result: 'data:text/csv;base64,bWFsZm9ybWVkX2RhdGE=' }
          });
        });
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/parse-mock-file') {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Failed to parse the file.'),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const { container } = render(<App />);

    const file = new File(['bad data'], 'malformed.csv', { type: 'text/csv' });
    const input = container.querySelector('#mock-file-input');
    expect(input).not.toBeNull();

    await act(async () => {
      fireEvent.change(input!, { target: { files: [file] } });
      // Drain microtask queue so queueMicrotask callback runs
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });

    // The onload fires a fetch; wait for the resulting error state to appear.
    // The message appears in both the UI error banner and the log panel, so we use getAllByText.
    await waitFor(
      () => {
        const matches = screen.getAllByText(/Failed to parse the file\./i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );

    vi.unstubAllGlobals();
  });
});
