import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outputOptions: { comments: { jsdoc: false } },
});
