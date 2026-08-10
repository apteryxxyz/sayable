import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/*.ts', '!src/*.test.ts'],
  outputOptions: { comments: { jsdoc: false } },
});
