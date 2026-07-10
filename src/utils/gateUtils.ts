/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const gateCoords: Record<string, { x: number; y: number; labelX: number; labelY: number }> = {
  'gate-b': { x: 160, y: 80, labelX: 110, labelY: 70 },
  'gate-c': { x: 440, y: 80, labelX: 490, labelY: 70 },
  'gate-d': { x: 440, y: 220, labelX: 490, labelY: 230 },
  'gate-e': { x: 160, y: 220, labelX: 110, labelY: 230 },
};

export const getAdjacentGates = (id: string): string[] => {
  if (id === 'gate-b') return ['gate-c', 'gate-e'];
  if (id === 'gate-c') return ['gate-b', 'gate-d'];
  if (id === 'gate-d') return ['gate-c', 'gate-e'];
  if (id === 'gate-e') return ['gate-d', 'gate-b'];
  return [];
};

export const getBezierPath = (fromId: string, toId: string) => {
  const from = gateCoords[fromId];
  const to = gateCoords[toId];
  if (!from || !to) return '';
  
  let cx = 300;
  let cy = 150;
  
  if ((fromId === 'gate-b' && toId === 'gate-c') || (fromId === 'gate-c' && toId === 'gate-b')) {
    cx = 300; cy = 40;
  } else if ((fromId === 'gate-c' && toId === 'gate-d') || (fromId === 'gate-d' && toId === 'gate-c')) {
    cx = 480; cy = 150;
  } else if ((fromId === 'gate-d' && toId === 'gate-e') || (fromId === 'gate-e' && toId === 'gate-d')) {
    cx = 300; cy = 260;
  } else if ((fromId === 'gate-e' && toId === 'gate-b') || (fromId === 'gate-b' && toId === 'gate-e')) {
    cx = 120; cy = 150;
  }
  
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
};

export const getSeverityColor = (density: number) => {
  if (density < 60) return { hex: '#E3EED4', rgb: '227, 238, 212', text: 'text-pale-mint' };
  if (density <= 80) return { hex: '#fbbf24', rgb: '251, 191, 36', text: 'text-amber-400' };
  return { hex: '#f43f5e', rgb: '244, 63, 94', text: 'text-rose-400' };
};
