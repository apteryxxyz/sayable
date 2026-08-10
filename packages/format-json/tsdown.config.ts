import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/formatter.ts'],
  outputOptions: { comments: { jsdoc: false } },
});
