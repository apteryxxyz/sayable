import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // `@saykit/react` sources import from `~` (its own `src`).
      '~': fileURLToPath(new URL('./packages/integration-react/src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './.coverage',
      // Measure every package's source, so untested files count against
      // coverage rather than being silently skipped.
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/dist/**'],
    },
  },
});
