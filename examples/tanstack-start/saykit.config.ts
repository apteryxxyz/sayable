import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

export default defineConfig({
  locales: ['en', 'fr'],
  buckets: [
    {
      include: ['src/**/*.{ts,tsx}'],
      output: 'src/locales/{locale}.{extension}',
      formatter: json({ dialect: 'arb' }),
      transformer: [js(), jsx()],
    },
  ],
});
