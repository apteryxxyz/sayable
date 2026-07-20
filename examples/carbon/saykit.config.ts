import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr', 'de'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: json(),
      transformer: js(),
    },
  ],
});
