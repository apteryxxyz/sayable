import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  target: 'es2022',
  outputOptions: { comments: { jsdoc: false } },
});
