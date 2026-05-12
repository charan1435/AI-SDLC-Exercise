import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Separate Vitest config for DB-layer tests.
 * These require SUPABASE_TEST_URL + SUPABASE_TEST_ANON_KEY + SUPABASE_TEST_SERVICE_ROLE_KEY.
 * Run with: npm run test:db
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/db/**/*.test.ts'],
    // Sequential — each test creates/deletes rows; parallelism risks cross-contamination.
    // maxWorkers=1 ensures tests run one-at-a-time.
    pool: 'forks',
    maxWorkers: 1,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
