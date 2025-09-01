import { defineConfig } from '@sayable/config';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  catalogues: [
    {
      include: ['src/commands/ping.ts'],
      output: `src/locales/{locale}/messages.{extension}`,
    },
  ],
});
