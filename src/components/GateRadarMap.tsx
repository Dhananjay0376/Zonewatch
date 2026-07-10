/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gate, Alert } from '../types';
import { gateCoords, getAdjacentGates, getBezierPath, getSeverityColor } from '../utils/gateUtils';

interface GateRadarMapProps {
  gates: Gate[];
  alerts: Alert[];
}

export default function GateRadarMap({ gates, alerts }: GateRadarMapProps) {
  return (
    <div className="bg-pitch-dark/80 border border-moss-dark/60 p-5 rounded-lg mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-moss-dark/40 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pale-mint animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-pale-mint font-display">
            Spatial Flow & Perimeter Analytics
          </h3>
        </div>
        <span className="text-[9px] font-mono text-sage-green uppercase tracking-widest font-semibold">
          STADIUM LEVEL 1 HUD // RADAR MAP
        </span>
      </div>

      {/* The Map Stage */}
      <div className="w-full flex justify-center items-center py-4 bg-pitch-black/40 rounded-lg border border-moss-dark/20 relative">
        <svg
          viewBox="0 0 600 300"
          className="w-full max-w-2xl aspect-[2/1] text-sage-soft relative z-10"
        >
          <style>{`
            @keyframes flowDash {
              to {
                stroke-dashoffset: -20;
              }
            }
            .animate-flow-line {
              stroke-dasharray: 6, 4;
              animation: flowDash 1.2s linear infinite;
            }
          `}</style>

          {/* Definition for glows and pitch gradient */}
          <defs>
            <radialGradient id="pitch-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1b3829" />
              <stop offset="100%" stopColor="#0F2A1D" />
            </radialGradient>
            <filter id="glow-nominal" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-warning" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-critical" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Stadium Ellipse / Contour */}
          <ellipse
            cx={300}
            cy={150}
            rx={200}
            ry={115}
            fill="none"
            stroke="#375534"
            strokeWidth={2}
            opacity={0.8}
          />

          {/* Stadium Tier Dividers */}
          <ellipse
            cx={300}
            cy={150}
            rx={165}
            ry={95}
            fill="none"
            stroke="#375534"
            strokeWidth={1}
            strokeDasharray="4,6"
            opacity={0.6}
          />
          <ellipse
            cx={300}
            cy={150}
            rx={130}
            ry={75}
            fill="none"
            stroke="#375534"
            strokeWidth={0.75}
            opacity={0.4}
          />

          {/* Central Soccer Pitch (Football Field) */}
          <g opacity={0.85}>
            {/* The Green Turf */}
            <rect
              x={240}
              y={115}
              width={120}
              height={70}
              rx={3}
              fill="url(#pitch-grad)"
              stroke="#6B9071"
              strokeWidth={1}
              opacity={0.9}
            />
            {/* Halfway Line */}
            <line
              x1={300}
              y1={115}
              x2={300}
              y2={185}
              stroke="#6B9071"
              strokeWidth={0.75}
              opacity={0.6}
            />
            {/* Center Circle */}
            <circle
              cx={300}
              cy={150}
              r={15}
              fill="none"
              stroke="#6B9071"
              strokeWidth={0.75}
              opacity={0.6}
            />
            {/* Goal Area Left */}
            <rect
              x={240}
              y={130}
              width={12}
              height={40}
              fill="none"
              stroke="#6B9071"
              strokeWidth={0.75}
              opacity={0.6}
            />
            {/* Goal Area Right */}
            <rect
              x={348}
              y={130}
              width={12}
              height={40}
              fill="none"
              stroke="#6B9071"
              strokeWidth={0.75}
              opacity={0.6}
            />
          </g>

          {/* Active Redirect Flow Vector Paths */}
          {alerts.filter(alert => !alert.resolved).map((alert) => {
            const adjacents = getAdjacentGates(alert.gateId);
            if (adjacents.length === 0) return null;
            
            // Find adjacent gate with lowest density
            let lowestDensity = 999;
            let targetGateId = adjacents[0];
            adjacents.forEach(adjId => {
              const g = gates.find(gate => gate.id === adjId);
              if (g && g.density < lowestDensity) {
                lowestDensity = g.density;
                targetGateId = adjId;
              }
            });

            const pathStr = getBezierPath(alert.gateId, targetGateId);
            const sourceGate = gates.find(g => g.id === alert.gateId);
            const sourceDensity = sourceGate ? sourceGate.density : 85;
            const colors = getSeverityColor(sourceDensity);

            return (
              <g key={`flow-${alert.id}`}>
                {/* Ambient neon corridor glow underneath */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={colors.hex}
                  strokeWidth={10}
                  className="opacity-15"
                  strokeLinecap="round"
                />
                {/* Interactive flow dashed path */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={colors.hex}
                  strokeWidth={2}
                  className="animate-flow-line"
                  strokeLinecap="round"
                  filter={alert.severity === 'critical' ? 'url(#glow-critical)' : 'url(#glow-warning)'}
                />
              </g>
            );
          })}

          {/* Perimeter Stadium Gates */}
          {gates.map((gate) => {
            const coord = gateCoords[gate.id];
            if (!coord) return null;
            const colors = getSeverityColor(gate.density);
            const isCongested = gate.density > 80;

            return (
              <g key={`node-${gate.id}`}>
                {/* Outer Pulsing Radar Ring */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={18}
                  fill="none"
                  stroke={colors.hex}
                  strokeWidth={1}
                  className="animate-pulse"
                  style={{ opacity: 0.35, animationDuration: isCongested ? '1.5s' : '3s' }}
                />

                {/* Interactive glow backing */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={10}
                  fill={colors.hex}
                  fillOpacity={0.15}
                  stroke={colors.hex}
                  strokeWidth={1}
                  opacity={0.8}
                />

                {/* Solid Inner Terminal Core */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={4.5}
                  fill={colors.hex}
                />

                {/* Beautiful HUD label */}
                <g className="select-none pointer-events-none">
                  <rect
                    x={coord.labelX - 32}
                    y={coord.labelY - 13}
                    width={64}
                    height={26}
                    rx={4}
                    fill="#07160F"
                    fillOpacity={0.9}
                    stroke="#375534"
                    strokeWidth={0.75}
                  />
                  <text
                    x={coord.labelX}
                    y={coord.labelY - 2}
                    textAnchor="middle"
                    fill="#E3EED4"
                    className="font-display font-black text-[9px] tracking-wider uppercase"
                  >
                    {gate.name}
                  </text>
                  <text
                    x={coord.labelX}
                    y={coord.labelY + 9}
                    textAnchor="middle"
                    fill={colors.hex}
                    className="font-mono text-[9px] font-bold"
                  >
                    {gate.density}%
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom analytical telemetry cells */}
      <div className="mt-4 pt-3 border-t border-moss-dark/30 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-mono">
        <div className="bg-pitch-black/50 p-2.5 rounded border border-moss-dark/30">
          <span className="text-sage-soft/50 block text-[8px] uppercase tracking-wider mb-0.5">Perimeter Integrity</span>
          <span className={`font-bold uppercase tracking-wider ${Math.max(...gates.map(g => g.density)) > 80 ? 'text-rose-400 animate-pulse' : 'text-pale-mint'}`}>
            {Math.max(...gates.map(g => g.density)) > 80 ? 'TACTICAL REDIRECTS' : 'NOMINAL STATUS'}
          </span>
        </div>
        <div className="bg-pitch-black/50 p-2.5 rounded border border-moss-dark/30">
          <span className="text-sage-soft/50 block text-[8px] uppercase tracking-wider mb-0.5">Average Sector Load</span>
          <span className="text-pale-mint font-bold">
            {Math.round(gates.reduce((sum, g) => sum + g.density, 0) / gates.length)}% Capacity
          </span>
        </div>
        <div className="bg-pitch-black/50 p-2.5 rounded border border-moss-dark/30">
          <span className="text-sage-soft/50 block text-[8px] uppercase tracking-wider mb-0.5">Active Vector Curvature</span>
          <span className={`font-bold ${alerts.filter(alert => !alert.resolved).length > 0 ? 'text-amber-400' : 'text-sage-soft/50'}`}>
            {alerts.filter(alert => !alert.resolved).length} Active Path{alerts.filter(alert => !alert.resolved).length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="bg-pitch-black/50 p-2.5 rounded border border-moss-dark/30">
          <span className="text-sage-soft/50 block text-[8px] uppercase tracking-wider mb-0.5">Peak Gate Pressure</span>
          <span className={`font-bold ${Math.max(...gates.map(g => g.density)) > 80 ? 'text-rose-400 animate-pulse' : 'text-pale-mint'}`}>
            {Math.max(...gates.map(g => g.density))}%
          </span>
        </div>
      </div>
    </div>
  );
}
