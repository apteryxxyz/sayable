import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

export default defineConfig({
  locales: ['en', 'en-GB', 'en-NZ', 'fr'],

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
