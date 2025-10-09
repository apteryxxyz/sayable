import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/runtime.ts', 'src/runtime.macro.d.ts'],
  target: 'es2020',
});
