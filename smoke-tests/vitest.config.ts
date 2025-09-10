import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 300000, // 5 minutes for smoke tests
    hookTimeout: 300000,
    teardownTimeout: 60000,
    setupFiles: ['./vitest.setup.ts'], // Global setup file
    // Use threads with strict sequential execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Use single thread to ensure order
        isolate: false, // Don't isolate tests to share workspace
      },
    },
    include: [
      // Sequential file with complete tests 01-06 including app building
      './nx-electron-vite/smoke-tests-sequential.test.ts',
    ],
    exclude: ['**/tmp/**', '**/node_modules/**', '**/dist/**'],
    onConsoleLog(log) {
      console.log(log);
    },
    // Force sequential execution and basic output
    sequence: {
      concurrent: false, // Disable concurrent execution
      shuffle: false, // Don't shuffle test order
      hooks: 'list', // Run hooks in order
    },
    maxConcurrency: 1, // Only run 1 test at a time
    fileParallelism: false, // Don't run test files in parallel
    reporters: process.env.CI ? ['basic', 'json'] : ['basic'],
    // outputFile: process.env.CI ? './test-results.json' : undefined,
    // Force process exit after tests complete
    forceRerunTriggers: [],
    watch: false,
  },
});
