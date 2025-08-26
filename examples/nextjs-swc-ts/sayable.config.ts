import { defineConfig } from '@sayable/config';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  catalogues: [
    {
      include: ['app/**/*.tsx', 'components/**/*.tsx'],
      output: `lib/locales/{locale}/messages.{extension}`,
    },
  ],
});
