import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

export default defineConfig({
  locales: ['en', 'fr', 'pl', 'ja'],
  buckets: [
    {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.*.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: po({ includeReferences: true }),
      // A bucket accepts an array of transformers. Each one declares which files
      // it handles, and they are composed in order: `js()` claims `.ts`, `jsx()`
      // claims `.tsx` (and reuses the JS transformer for the expressions inside).
      transformer: [js(), jsx()],
    },
  ],
});
