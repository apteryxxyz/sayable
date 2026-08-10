import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/commands/index.ts',
    'src/features/catalogue/index.ts',
    'src/features/loader/index.ts',
    'src/features/messages/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  outputOptions: { comments: { jsdoc: false } },
});
