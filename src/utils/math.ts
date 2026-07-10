/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates a fluctuating density step (returns a value between -3 and +4).
 */
export function getDensityFluctuation(): number {
  return Math.floor(Math.random() * 8) - 3;
}

/**
 * Generates an array of randomized volume bar heights.
 */
export function generateRandomVolumeBars(length: number = 12): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 25) + 5);
}
