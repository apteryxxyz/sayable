import { defineConfig } from '@saykit/config';
import js from '@saykit/transform-js';
import email from './email-transformer.ts';
import yaml from './yaml-formatter.ts';

export default defineConfig({
  locales: ['en', 'fr', 'de'],
  buckets: [
    {
      include: ['src/**/*.ts', 'src/**/*.email'],
      exclude: ['src/**/*.d.ts'],
      output: 'src/locales/{locale}.{extension}',

      formatter: yaml(),

      transformer: [js(), email()],
    },
  ],
});
