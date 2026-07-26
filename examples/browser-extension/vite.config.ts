import { resolve } from 'node:path';
import saykit from 'unplugin-saykit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [saykit()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'popup.html'),
        content: resolve(import.meta.dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        // MV3 content scripts cannot be code-split, so keep one file each.
        inlineDynamicImports: false,
        manualChunks: undefined,
      },
    },
  },
});
