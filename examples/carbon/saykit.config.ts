import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: po(),
      transformer: js(),
    },
  ],
});
