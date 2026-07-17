import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Absolute path to a package's `src`, used for its `~` self-alias. */
const src = (pkg: string) => fileURLToPath(new URL(`./packages/${pkg}/src`, import.meta.url));

// `server-only` throws when imported outside an RSC bundle; stub it so the
// server runtime can be exercised in tests.
const serverOnly = fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url));

// Packages that alias `~` to their own `src`. Each needs its own project so the
// alias resolves to the right package.
const scoped = ['config', 'integration-carbon', 'integration-react'];

// Everything else shares one project — no `~` alias needed.
const plain = [
  'format-po',
  'integration',
  'transform-js',
  'transform-jsx',
  'plugin-babel',
  'plugin-unplugin',
];

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './.coverage',
      // Measure every package's source, so untested files count against
      // coverage rather than being silently skipped.
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/dist/**', '**/__fixtures__/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          globals: true,
          include: plain.map((p) => `packages/${p}/src/**/*.test.{ts,tsx}`),
        },
      },
      ...scoped.map((pkg) => ({
        extends: true as const,
        resolve: {
          alias: {
            '~': src(pkg),
            ...(pkg === 'integration-react' ? { 'server-only': serverOnly } : {}),
          },
        },
        test: {
          name: pkg,
          globals: true,
          include: [`packages/${pkg}/src/**/*.test.{ts,tsx}`],
        },
      })),
    ],
  },
});
