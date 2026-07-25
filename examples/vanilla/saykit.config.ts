import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';

export default defineConfig({
  // The first locale is the *source* locale: it is the only one `saykit extract`
  // writes translations into. The rest are created as empty placeholders and
  // then filled in by translators (or a TMS).
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
