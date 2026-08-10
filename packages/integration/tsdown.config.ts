import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/runtime.ts'],
  target: 'es2022',
  outputOptions: { comments: { jsdoc: false } },
});
