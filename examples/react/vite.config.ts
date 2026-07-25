import react from '@vitejs/plugin-react';
import saykit from 'unplugin-saykit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // `saykit()` declares `enforce: 'pre'`, so it rewrites the macros before the
  // React plugin compiles the JSX. Order in this array does not matter.
  plugins: [react(), saykit()],
});
