import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration for the Zonewatch test suite.
 *
 * Memory constraints on this machine (C: drive is full) require using
 * `pool: 'forks'` with `singleFork: true` and a raised Node.js heap limit
 * to prevent worker OOM crashes. Do not change these settings without
 * testing the full suite first.
 *
 * Note: `poolOptions` and `forks.execArgv` are valid vitest runtime options
 * but are absent from the vitest 4.x TypeScript declaration files.
 * The `@ts-expect-error` directive below acknowledges this known gap.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 15000,
    cache: {
      dir: './.vitest_cache',
    },
    pool: 'forks',
    // @ts-expect-error: Vitest 4.x types mismatch
    forks: {
      singleFork: true,
      isolate: false,
      execArgv: ['--max-old-space-size=4096'],
    },
  },
});
