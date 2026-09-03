import { defineConfig } from '@saykit/config';
import json from '@saykit/format-json';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr', 'de'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.*.ts'],

      output: '_locales/{locale}/messages.{extension}',

      messages: {
        extensionName: {
          message: 'Reading Time',
          comments: ["The extension's name, shown in the Chrome Web Store and toolbar."],
        },
        extensionDescription: {
          message: 'Estimate how long a page will take to read.',
          comments: ["The extension's one-line store description."],
        },
      },

      formatter: json({ dialect: 'webextension' }),
      transformer: js(),
    },
  ],
});
