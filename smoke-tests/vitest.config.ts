import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 300000, // 5 minutes for smoke tests
    hookTimeout: 300000,
    teardownTimeout: 60000,
    setupFiles: ['./vitest.setup.ts'], // Global setup file
    pool: 'forks', // Use forks to avoid conflicts with shared workspace
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for all tests to share workspace
      },
    },
    exclude: [
      '**/tmp/**',
      '**/node_modules/**',
      '**/dist/**'
    ],
    onConsoleLog(log) {
      console.log(log);
    }
  },
});
