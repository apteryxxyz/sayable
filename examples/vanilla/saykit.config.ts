import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr', 'pl', 'ja'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.*.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: po({ includeReferences: true }),
      transformer: js(),
    },
  ],
});
