/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions and constants for stadium gate density management,
 * SVG radar map coordinate calculations, and severity colour theming.
 */

/** Density threshold constants used throughout the application. */
export const DENSITY_THRESHOLDS = {
  /** Below this value a gate is considered nominal (green). */
  NOMINAL_MAX: 60,
  /** Between NOMINAL_MAX and SURGE_MAX the gate is at steady-surge (amber). */
  SURGE_MAX: 80,
  /** Above SURGE_MAX the gate is in breach — alerts are triggered. */
  ALERT_TRIGGER: 80,
  /** Gate density must fall below this before an active alert is resolved. */
  RESOLVE_BELOW: 75,
} as const;

/** SVG coordinate configuration for each gate node on the radar map. */
export interface GateCoord {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
}

/** Maps gate IDs to their SVG positions on the 600×300 radar map canvas. */
export const gateCoords: Record<string, GateCoord> = {
  'gate-b': { x: 160, y: 80,  labelX: 110, labelY: 70  },
  'gate-c': { x: 440, y: 80,  labelX: 490, labelY: 70  },
  'gate-d': { x: 440, y: 220, labelX: 490, labelY: 230 },
  'gate-e': { x: 160, y: 220, labelX: 110, labelY: 230 },
};

/**
 * Returns the IDs of gates physically adjacent to the given gate.
 * Adjacency is based on the stadium's gate layout (B↔C, C↔D, D↔E, E↔B).
 */
export const getAdjacentGates = (id: string): string[] => {
  const adjacencyMap: Record<string, string[]> = {
    'gate-b': ['gate-c', 'gate-e'],
    'gate-c': ['gate-b', 'gate-d'],
    'gate-d': ['gate-c', 'gate-e'],
    'gate-e': ['gate-d', 'gate-b'],
  };
  return adjacencyMap[id] ?? [];
};

/**
 * Returns an SVG quadratic Bézier path string from one gate to another.
 * The control point is positioned to arc around the central pitch.
 */
export const getBezierPath = (fromId: string, toId: string): string => {
  const from = gateCoords[fromId];
  const to = gateCoords[toId];
  if (!from || !to) return '';

  // Control points chosen to arc naturally around the stadium pitch.
  const controlPoints: Record<string, { cx: number; cy: number }> = {
    'gate-b:gate-c': { cx: 300, cy: 40  },
    'gate-c:gate-d': { cx: 480, cy: 150 },
    'gate-d:gate-e': { cx: 300, cy: 260 },
    'gate-e:gate-b': { cx: 120, cy: 150 },
  };

  const key1 = `${fromId}:${toId}`;
  const key2 = `${toId}:${fromId}`;
  const cp = controlPoints[key1] ?? controlPoints[key2] ?? { cx: 300, cy: 150 };

  return `M ${from.x} ${from.y} Q ${cp.cx} ${cp.cy} ${to.x} ${to.y}`;
};

/** Colour configuration for a gate based on its crowd density. */
export interface SeverityColors {
  hex: string;
  rgb: string;
  text: string;
}

/**
 * Returns the appropriate colour theme for a gate's density level.
 * - Nominal (< 60%): pale-mint / green
 * - Steady surge (60–80%): amber
 * - Surge breach (> 80%): rose / red
 */
export const getSeverityColor = (density: number): SeverityColors => {
  if (density < DENSITY_THRESHOLDS.NOMINAL_MAX)
    return { hex: '#E3EED4', rgb: '227, 238, 212', text: 'text-pale-mint' };
  if (density <= DENSITY_THRESHOLDS.SURGE_MAX)
    return { hex: '#fbbf24', rgb: '251, 191, 36',  text: 'text-amber-400' };
  return       { hex: '#f43f5e', rgb: '244, 63, 94',  text: 'text-rose-400'  };
};

/** Visual and label configuration for a gate density status badge. */
export interface DensityConfig {
  textColor: string;
  bg: string;
  border: string;
  label: string;
  glow: string;
  isAlert: boolean;
}

/**
 * Returns the complete visual configuration for a gate card based on density.
 * This is a pure function with no side effects — suitable for use outside React.
 */
export const getDensityConfig = (density: number): DensityConfig => {
  if (density < DENSITY_THRESHOLDS.NOMINAL_MAX) {
    return {
      textColor: 'text-pale-mint',
      bg:        'bg-pale-mint',
      border:    'border-moss-dark/40',
      label:     'NOMINAL',
      glow:      'shadow-[0_0_15px_rgba(227,238,212,0.08)]',
      isAlert:   false,
    };
  }
  if (density <= DENSITY_THRESHOLDS.SURGE_MAX) {
    return {
      textColor: 'text-amber-400',
      bg:        'bg-amber-400',
      border:    'border-amber-400/20',
      label:     'STEADY SURGE',
      glow:      'shadow-[0_0_15px_rgba(245,158,11,0.08)]',
      isAlert:   false,
    };
  }
  return {
    textColor: 'text-rose-400',
    bg:        'bg-rose-400',
    border:    'border-rose-400/50',
    label:     'SURGE BREACH',
    glow:      'shadow-[0_0_20px_rgba(244,63,94,0.18)]',
    isAlert:   true,
  };
};
