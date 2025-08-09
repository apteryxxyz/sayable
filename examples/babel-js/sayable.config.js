import { defineConfig } from '@sayable/config';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  catalogues: [
    {
      include: ['src/**/*.js'],
      output: 'src/locales/{locale}/',
    },
  ],
});
