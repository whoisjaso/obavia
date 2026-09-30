import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Obavia Desk: the dealership sale desk (Handle A Sale). Its own deploy.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'assets' },
});
