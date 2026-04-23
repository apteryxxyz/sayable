import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  buckets: [
    {
      include: ['src/**/*.{ts,tsx}'],
      output: 'src/locales/{locale}.{extension}',
      formatter: po(),
      transformer: [js(), jsx()],
    },
  ],
});
