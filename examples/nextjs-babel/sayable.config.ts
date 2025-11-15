import { defineConfig } from '@sayable/config';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  buckets: [
    {
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      output: 'src/locales/{locale}/messages.{extension}',
    },
  ],
});
