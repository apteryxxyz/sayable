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

      // A hand-written formatter, sitting right next to this file. `Formatter`
      // is validated by Zod, so a shape mistake surfaces when the config loads
      // rather than halfway through an extraction run.
      formatter: yaml(),

      // Transformers compose: each declares which files it owns via `match`,
      // and a file is only handed to the ones that claim it. `js()` takes the
      // `.ts` files, `email()` takes the `.email` templates.
      transformer: [js(), email()],
    },
  ],
});
