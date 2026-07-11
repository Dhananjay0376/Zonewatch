/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mathematical utilities for the Zonewatch simulation engine.
 */

/**
 * Returns a random integer density fluctuation for a single simulation tick.
 * Values are weighted toward small changes (±1–3%) with occasional larger
 * spikes (±4–7%) to mimic real crowd arrival patterns.
 */
export function getDensityFluctuation(): number {
  const roll = Math.random();
  if (roll < 0.6) {
    // 60% chance of small fluctuation (±1–3%)
    return Math.floor(Math.random() * 7) - 3;
  }
  if (roll < 0.85) {
    // 25% chance of medium fluctuation (±4–6%)
    return (Math.floor(Math.random() * 3) + 4) * (Math.random() < 0.5 ? 1 : -1);
  }
  // 15% chance of large spike (±7–10%)
  return (Math.floor(Math.random() * 4) + 7) * (Math.random() < 0.5 ? 1 : -1);
}

/**
 * Generates an array of random bar heights for the live audio visualiser.
 * Heights are in the range [3, 32] pixels, simulating a frequency spectrum.
 *
 * @param count - Number of bars to generate (default: 12).
 */
export function generateRandomVolumeBars(count = 12): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 30) + 3);
}
