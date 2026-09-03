import react from '@vitejs/plugin-react';
import saykit from 'unplugin-saykit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), saykit()],
});
