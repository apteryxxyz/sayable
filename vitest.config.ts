import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { 'server-only': 'data:text/javascript,export {}' },
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './.coverage',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/dist/**', '**/__fixtures__/**'],
    },
  },
});
