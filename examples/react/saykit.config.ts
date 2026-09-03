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
      transformer: [js(), jsx()],
    },
  ],
});
