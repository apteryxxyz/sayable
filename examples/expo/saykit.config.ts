import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

export default defineConfig({
  locales: ['en', 'fr', 'ja'],
  buckets: [
    {
      include: ['src/**/*.{ts,tsx}', 'App.tsx'],
      exclude: ['src/**/*.d.*.ts'],
      output: 'src/locales/{locale}.{extension}',
      // Plain flat JSON. No PO parser has to reach a phone, and Metro treats
      // `.json` as a first-class module type.
      formatter: json(),
      transformer: [js(), jsx()],
    },
  ],
});
