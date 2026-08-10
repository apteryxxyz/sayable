import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/metro/index.ts',
    'src/metro/transformer.ts',
    'src/next/index.ts',
    'src/next/loader.ts',
  ],
  format: 'cjs',
  outputOptions: { comments: { jsdoc: false } },
});
