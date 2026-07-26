import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

export default defineConfig({
  locales: ['en', 'en-GB', 'en-NZ', 'fr'],

  /**
   * Fallback chains, most specific first. The source locale (`en`) is always
   * appended automatically, so this reads as:
   *
   *   en-NZ → en-GB → en
   *   en-GB → en
   *
   * A key left untranslated in `en-NZ.json` resolves from `en-GB.json` when it
   * exists there, and from `en.json` otherwise. The New Zealand catalogue then
   * only has to carry the handful of strings that actually differ — which is
   * the point, since most of it is identical to British English.
   *
   * Chains are resolved at build time by the plugin's `load` hook, so the
   * runtime still receives one flat, fully-populated object per locale.
   */
  fallbackLocales: {
    'en-NZ': ['en-GB'],
  },

  buckets: [
    {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.*.ts', 'src/routeTree.gen.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: json(),
      transformer: [js(), jsx()],
    },
  ],
});
