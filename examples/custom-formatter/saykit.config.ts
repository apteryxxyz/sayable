import yaml from '@example/saykit-yaml/formatter';
import email from '@example/saykit-yaml/transformer';
import { defineConfig } from '@saykit/config';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr', 'de'],
  buckets: [
    {
      include: ['src/**/*.ts', 'src/**/*.email'],
      exclude: ['src/**/*.d.ts'],
      output: 'src/locales/{locale}.{extension}',

      // A hand-written formatter, imported by package name — a config cannot
      // import one relatively, see `saykit-yaml/README.md`. `Formatter` is
      // validated by Zod, so a shape mistake surfaces when the config loads
      // rather than halfway through an extraction run.
      formatter: yaml(),

      // Transformers compose: each declares which files it owns via `match`,
      // and a file is only handed to the ones that claim it. `js()` takes the
      // `.ts` files, `email()` takes the `.email` templates.
      transformer: [js(), email()],
    },
  ],
});
