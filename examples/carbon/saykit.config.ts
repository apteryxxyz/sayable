import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';

export default defineConfig({
  /**
   * These are Discord locale codes. Discord reports the invoking user's locale
   * as `interaction.rawData.locale` and the server's as `preferred_locale`,
   * both drawn from a fixed list (`en-US`, `fr`, `de`, `ja`, …). Matching that
   * list here means `say.match` gets an exact hit rather than a prefix guess.
   */
  locales: ['en-US', 'fr', 'de', 'ja'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.*.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: json(),
      transformer: js(),
    },
  ],
});
