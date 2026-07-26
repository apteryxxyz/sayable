import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr', 'de'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.*.ts'],

      /**
       * `{locale}` does not have to be the filename. Here it is a *directory*,
       * which lands the catalogues exactly where a Chrome extension expects
       * them: `_locales/en/messages.json`, `_locales/fr/messages.json`, …
       */
      output: '_locales/{locale}/messages.{extension}',

      /**
       * The `webextension` dialect writes the `{ key: { message, description } }`
       * shape that `chrome.i18n` reads. Translator comments become `description`
       * — which is what the Chrome Web Store translation tooling shows to
       * translators — while context and source references ride along in
       * `x-saykit-context` / `x-saykit-references`, which Chrome ignores.
       */
      formatter: json({ dialect: 'webextension' }),
      transformer: js(),
    },
  ],
});
