import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/__tests__/unit/**/*.test.ts',
      'src/__tests__/unit/**/*.test.tsx',
      'src/__tests__/components/**/*.test.tsx',
    ],
    exclude: ['src/__tests__/db/**', 'e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Coverage is scoped to components renderable in jsdom.
      // lib/actions and lib/queries use Next.js server-only APIs (cookies,
      // revalidatePath, createServerClient) which require the Next.js runtime
      // and cannot execute in a jsdom environment.  Those modules are covered
      // by e2e tests (Playwright) and DB tests (Vitest + Supabase).
      include: [
        'src/components/features/**',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'node_modules/**',
        // Auth component uses the Supabase browser client — requires real env vars
        'src/components/features/auth/**',
        // Form components that call server actions directly — server-action
        // boundary makes them untestable without the Next.js test renderer.
        // These are covered by Playwright e2e tests instead.
        'src/components/features/proposals/ProposeBookForm.tsx',
        'src/components/features/rounds/OpenRoundForm.tsx',
        'src/components/features/rounds/CloseRoundDialog.tsx',
        'src/components/features/rounds/CloseRoundButton.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
