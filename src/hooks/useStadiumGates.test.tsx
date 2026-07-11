import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStadiumGates } from './useStadiumGates';
import type { Alert } from '../types';

/** Typed shape of the values returned by the useStadiumGates hook. */
interface StadiumGatesHookResult {
  alerts: Alert[];
  handleModifyDensity: (gateId: string, delta: number) => void;
  gates: unknown[];
}

describe('useStadiumGates Hook', () => {
  const addLogMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    addLogMock.mockClear();

    // Mock global fetch
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            whatsHappening: 'Congestion detected',
            risk: 'Queue pressure',
            action: 'Redirect fans',
            scriptEnglish: 'Go to Gate E',
            scriptSpanish: 'Vaya a la puerta E',
            scriptFrench: 'Allez a la porte E',
            isLocalFallback: false,
          }),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should trigger warning alert for density between 80% and 89%', async () => {
    let hookResult: { current: StadiumGatesHookResult };
    await act(async () => {
      const { result } = renderHook(() => useStadiumGates({ addLog: addLogMock }));
      hookResult = result as { current: StadiumGatesHookResult };
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hookResult!.current.alerts.length).toBeGreaterThan(0);
    const alertC = hookResult!.current.alerts.find((a: Alert) => a.gateId === 'gate-c');
    expect(alertC).toBeDefined();
    expect(alertC?.severity).toBe('warning');
  });

  it('should trigger critical alert for density >= 90%', async () => {
    let hookResult: { current: StadiumGatesHookResult };
    await act(async () => {
      const { result } = renderHook(() => useStadiumGates({ addLog: addLogMock }));
      hookResult = result as { current: StadiumGatesHookResult };
    });

    // Gate B is initially 42%. Spike it to 92% (increase by 50).
    await act(async () => {
      hookResult!.current.handleModifyDensity('gate-b', 50);
    });

    // Allow fetch promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    const alertB = hookResult!.current.alerts.find((a: Alert) => a.gateId === 'gate-b');
    expect(alertB).toBeDefined();
    expect(alertB?.severity).toBe('critical');
  });

  it('should resolve/clear the alert when density drops below 80%', async () => {
    let hookResult: { current: StadiumGatesHookResult };
    await act(async () => {
      const { result } = renderHook(() => useStadiumGates({ addLog: addLogMock }));
      hookResult = result as { current: StadiumGatesHookResult };
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Gate C is initially 84% (alert active). Verify alert is not yet resolved.
    const activeAlert = hookResult!.current.alerts.find((a: Alert) => a.gateId === 'gate-c');
    expect(activeAlert?.resolved).toBe(false);

    // Drop Gate C density below 80% (decrease by 10, to 74%).
    await act(async () => {
      hookResult!.current.handleModifyDensity('gate-c', -10);
    });

    const updatedAlert = hookResult!.current.alerts.find((a: Alert) => a.gateId === 'gate-c');
    expect(updatedAlert?.resolved).toBe(true);
    expect(updatedAlert?.resolvedTime).toBeDefined();
  });
});
