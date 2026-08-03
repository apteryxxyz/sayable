import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/metro/index.ts', 'src/metro/transformer.ts', 'src/webpack/index.ts'],
  format: 'cjs',
});
