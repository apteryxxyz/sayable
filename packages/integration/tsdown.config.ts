import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/runtime.ts'],
  target: 'es2020',
});
