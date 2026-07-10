import { describe, it, expect } from 'vitest';
import { getSeverityColor } from './gateUtils';

describe('gateUtils - getSeverityColor', () => {
  it('should return pale-mint color for density < 60', () => {
    // Nominal case
    expect(getSeverityColor(40).text).toBe('text-pale-mint');
    // Boundary value
    expect(getSeverityColor(59).text).toBe('text-pale-mint');
  });

  it('should return amber color for density 60 to 80 inclusive', () => {
    // Boundary value 60
    expect(getSeverityColor(60).text).toBe('text-amber-400');
    // Mid point
    expect(getSeverityColor(70).text).toBe('text-amber-400');
    // Boundary value 80
    expect(getSeverityColor(80).text).toBe('text-amber-400');
  });

  it('should return rose color for density > 80', () => {
    // Boundary value 81
    expect(getSeverityColor(81).text).toBe('text-rose-400');
    // Critical case
    expect(getSeverityColor(95).text).toBe('text-rose-400');
  });
});
