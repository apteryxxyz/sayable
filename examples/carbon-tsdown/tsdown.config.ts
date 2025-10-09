import { defineConfig } from 'tsdown';
import sayable from 'unplugin-sayable/rolldown';

export default defineConfig({
  entry: ['src/entry.ts'],
  plugins: [sayable()],
});
